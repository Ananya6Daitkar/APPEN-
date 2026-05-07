import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth/session'
import { writeAuditLog } from '@/lib/audit'
import {
  computeHash,
  uploadProof,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
} from '@/lib/storage'
import { ocrService } from '@/lib/ocr/OCRService'
import { riskService } from '@/lib/risk/RiskService'
import type { UserRiskProfile } from '@/lib/risk/types'
import { VerificationStatus } from '@prisma/client'
import { send as sendNotification } from '@/lib/notifications/notificationService'
import { onTradeReleased } from '@/lib/reputation/reputationService'

const verificationStatusMap: Record<string, VerificationStatus> = {
  verified: VerificationStatus.VERIFIED,
  needs_review: VerificationStatus.NEEDS_REVIEW,
  suspicious: VerificationStatus.SUSPICIOUS,
}

type Params = { params: Promise<{ id: string }> }

// ─── POST /api/trades/:id/proof ───────────────────────────────────────────────
// Buyer uploads payment receipt (jpeg/png/pdf ≤10MB)
// SHA-256 hash computed BEFORE any transform, stored to S3, Proof persisted
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await requireSession(req)
    const { id } = await params

    const trade = await prisma.trade.findUnique({ where: { id } })
    if (!trade) {
      return NextResponse.json({ error: 'Trade not found' }, { status: 404 })
    }

    // Only the buyer may upload proof
    if (trade.buyerId !== session.sub) {
      return NextResponse.json({ error: 'Only the buyer can upload proof' }, { status: 403 })
    }

    // Trade must be in a state that accepts proof
    const acceptableStates = ['FUNDED', 'MARKED_PAID', 'UNDER_REVIEW']
    if (!acceptableStates.includes(trade.state)) {
      return NextResponse.json(
        { error: `Cannot upload proof for trade in ${trade.state} state` },
        { status: 409 }
      )
    }

    // Parse multipart form
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'file field is required' }, { status: 400 })
    }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type: ${file.type}. Allowed: jpeg, png, pdf` },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large: ${file.size} bytes. Maximum is 10 MB` },
        { status: 400 }
      )
    }

    // Read raw bytes
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Compute SHA-256 hash BEFORE any transform (Req 4.2, 13.4)
    const evidenceHash = computeHash(buffer)

    // In DEMO_MODE skip actual S3 upload
    let storageKey: string
    if (process.env.DEMO_MODE === 'true') {
      storageKey = `demo/proofs/${trade.id}/${Date.now()}-${file.name}`
    } else {
      storageKey = await uploadProof(trade.id, file.name, buffer, file.type)
    }

    // Persist Proof record
    const proof = await prisma.proof.create({
      data: {
        tradeId: trade.id,
        uploaderId: session.sub,
        evidenceHash,
        storageKey,
        mimeType: file.type,
        fileSizeBytes: file.size,
      },
    })

    await writeAuditLog({
      actorId: session.sub,
      actorAddress: session.address,
      actionType: 'PROOF_UPLOADED',
      entityType: 'Proof',
      entityId: proof.id,
      afterState: {
        tradeId: trade.id,
        evidenceHash,
        storageKey,
        mimeType: file.type,
        fileSizeBytes: file.size,
      },
    })

    // ── OCR extraction ────────────────────────────────────────────────────────
    let riskResult = null
    try {
      const tradeAmount =
        typeof trade.amount === 'object' && 'toNumber' in trade.amount
          ? (trade.amount as { toNumber(): number }).toNumber()
          : Number(trade.amount)

      const { extraction, routeToUnderReview } = await ocrService.extract(buffer, {
        tradeId: trade.id,
        proofId: proof.id,
        expectedAmount: tradeAmount,
        expectedCurrency: trade.fiatCurrency,
        tradeCreatedAt: trade.createdAt,
      })

      // Persist OCRResult
      await prisma.oCRResult.create({
        data: {
          proofId: proof.id,
          amount: extraction.amount ?? undefined,
          currency: extraction.currency ?? undefined,
          timestamp: extraction.timestamp ? new Date(extraction.timestamp) : undefined,
          transactionId: extraction.transactionId ?? undefined,
          payerName: extraction.payerName ?? undefined,
          payeeName: extraction.payeeName ?? undefined,
          paymentRail: extraction.paymentRail ?? undefined,
          bankName: extraction.bankName ?? undefined,
          fieldConfidences: extraction.fieldConfidences,
          overallConfidence: extraction.overallConfidence,
          verificationStatus: verificationStatusMap[extraction.verificationStatus] ?? VerificationStatus.NEEDS_REVIEW,
          explanation: extraction.explanation,
          resolverSummary: extraction.resolverSummary,
        },
      })

      await writeAuditLog({
        actorId: session.sub,
        actionType: 'OCR_COMPLETED',
        entityType: 'Proof',
        entityId: proof.id,
        afterState: {
          overallConfidence: extraction.overallConfidence,
          verificationStatus: extraction.verificationStatus,
          routeToUnderReview,
        },
      })

      // If OCR confidence is too low, route directly to UNDER_REVIEW (Req 4.6)
      if (routeToUnderReview) {
        const prevState = trade.state
        await prisma.trade.update({
          where: { id: trade.id },
          data: { state: 'UNDER_REVIEW' },
        })
        await writeAuditLog({
          actorId: session.sub,
          actionType: 'TRADE_STATE_CHANGED',
          entityType: 'Trade',
          entityId: trade.id,
          beforeState: { state: prevState },
          afterState: { state: 'UNDER_REVIEW', reason: 'low_ocr_confidence' },
        })
        return NextResponse.json(
          { proofId: proof.id, evidenceHash, storageKey, tradeState: 'UNDER_REVIEW', riskResult: null },
          { status: 201 }
        )
      }

      // ── Risk scoring (Req 5.3–5.5) ─────────────────────────────────────────
      const [buyerUser, sellerUser] = await Promise.all([
        prisma.user.findUnique({
          where: { id: trade.buyerId },
          include: { reputation: true },
        }),
        prisma.user.findUnique({
          where: { id: trade.sellerId },
          include: { reputation: true },
        }),
      ])

      const buyerProfile: UserRiskProfile = {
        userId: trade.buyerId,
        kycTier: buyerUser?.kycTier ?? 0,
        totalTrades: buyerUser?.reputation?.totalTrades ?? 0,
        disputeCount: buyerUser?.reputation?.disputeCount ?? 0,
      }
      const sellerProfile: UserRiskProfile = {
        userId: trade.sellerId,
        kycTier: sellerUser?.kycTier ?? 0,
        totalTrades: sellerUser?.reputation?.totalTrades ?? 0,
        disputeCount: sellerUser?.reputation?.disputeCount ?? 0,
      }

      riskResult = await riskService.score({
        extraction,
        trade: {
          id: trade.id,
          amount: tradeAmount,
          createdAt: trade.createdAt,
          buyerId: trade.buyerId,
          sellerId: trade.sellerId,
        },
        buyerProfile,
        sellerProfile,
        evidenceHash,
        proofId: proof.id,
      })

      // ── Apply recommendation → trade state transition ──────────────────────
      const prevState = trade.state
      if (riskResult.recommendation === 'auto_release') {
        // Req 5.3: Trust_Score >= 80 → RELEASED
        const now = new Date()
        await prisma.trade.update({
          where: { id: trade.id },
          data: { state: 'RELEASED', releasedAt: now },
        })
        await writeAuditLog({
          actorId: session.sub,
          actionType: 'TRADE_STATE_CHANGED',
          entityType: 'Trade',
          entityId: trade.id,
          beforeState: { state: prevState },
          afterState: { state: 'RELEASED', releasedAt: now, trustScore: riskResult.trustScore },
        })
        await onTradeReleased(trade.id)
        await Promise.all([
          sendNotification(trade.buyerId, 'trade_released', { tradeId: trade.id }),
          sendNotification(trade.sellerId, 'trade_released', { tradeId: trade.id }),
        ])
      } else if (riskResult.recommendation === 'challenge_window') {
        // Req 5.4: Trust_Score 50–79 → keep in MARKED_PAID (challenge window already active)
        // No state change needed
      } else {
        // Req 5.5: Trust_Score < 50 → UNDER_REVIEW
        await prisma.trade.update({
          where: { id: trade.id },
          data: { state: 'UNDER_REVIEW' },
        })
        await writeAuditLog({
          actorId: session.sub,
          actionType: 'TRADE_STATE_CHANGED',
          entityType: 'Trade',
          entityId: trade.id,
          beforeState: { state: prevState },
          afterState: { state: 'UNDER_REVIEW', trustScore: riskResult.trustScore },
        })
      }
    } catch (riskErr) {
      // Risk scoring failure is non-fatal — log and continue
      console.error('[proof/route] Risk scoring error:', riskErr)
    }

    const finalTrade = await prisma.trade.findUnique({ where: { id: trade.id } })

    return NextResponse.json(
      {
        proofId: proof.id,
        evidenceHash,
        storageKey,
        tradeState: finalTrade?.state ?? trade.state,
        riskResult,
      },
      { status: 201 }
    )
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const message = err instanceof Error ? err.message : 'Failed to upload proof'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
