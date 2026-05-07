import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth/session'
import { writeAuditLog } from '@/lib/audit'
import { isAdmin } from '@/lib/auth/admin'

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession(req)
    if (!isAdmin(session)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const config = await prisma.riskConfig.findFirst({ orderBy: { createdAt: 'desc' } })
    return NextResponse.json(config ?? {
      autoReleaseCutoff: 80,
      challengeWindowCutoff: 50,
      manualReviewCutoff: 50,
      challengeWindowSeconds: 1800,
    })
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Failed to fetch config' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession(req)
    if (!isAdmin(session)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { autoReleaseCutoff, challengeWindowCutoff, manualReviewCutoff, challengeWindowSeconds } = body

    // Validate all thresholds are integers in [0, 100]
    const fields = { autoReleaseCutoff, challengeWindowCutoff, manualReviewCutoff }
    for (const [key, val] of Object.entries(fields)) {
      if (val !== undefined && (typeof val !== 'number' || val < 0 || val > 100 || !Number.isInteger(val))) {
        return NextResponse.json({ error: `${key} must be an integer between 0 and 100` }, { status: 400 })
      }
    }

    const existing = await prisma.riskConfig.findFirst({ orderBy: { createdAt: 'desc' } })

    const newConfig = await prisma.riskConfig.create({
      data: {
        autoReleaseCutoff: autoReleaseCutoff ?? existing?.autoReleaseCutoff ?? 80,
        challengeWindowCutoff: challengeWindowCutoff ?? existing?.challengeWindowCutoff ?? 50,
        manualReviewCutoff: manualReviewCutoff ?? existing?.manualReviewCutoff ?? 50,
        challengeWindowSeconds: challengeWindowSeconds ?? existing?.challengeWindowSeconds ?? 1800,
        updatedBy: session.address,
      },
    })

    await writeAuditLog({
      actorId: session.sub,
      actorAddress: session.address,
      actionType: 'RISK_CONFIG_CHANGED',
      entityType: 'RiskConfig',
      entityId: newConfig.id,
      beforeState: existing ?? undefined,
      afterState: newConfig,
    })

    return NextResponse.json(newConfig)
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const message = err instanceof Error ? err.message : 'Failed to update risk config'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
