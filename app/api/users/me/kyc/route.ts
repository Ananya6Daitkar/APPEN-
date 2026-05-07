import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth/session'
import { writeAuditLog } from '@/lib/audit'
import crypto from 'crypto'

// Encrypt doc reference with AES-256-GCM (Req 9.5 — no raw doc in DB)
function encryptDocRef(docRef: string): string {
  const key = Buffer.from(process.env.KYC_ENCRYPTION_KEY ?? 'dev-kyc-key-32-chars-long!!!!!!', 'utf8').slice(0, 32)
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(docRef, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, encrypted]).toString('base64')
}

// POST /api/users/me/kyc — submit KYC document reference, set kycTier=2
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession(req)
    const { docRef } = await req.json()

    if (!docRef || typeof docRef !== 'string' || docRef.trim().length === 0) {
      return NextResponse.json({ error: 'docRef is required' }, { status: 400 })
    }

    const encryptedRef = encryptDocRef(docRef.trim())

    const user = await prisma.user.update({
      where: { id: session.sub },
      data: { kycDocRef: encryptedRef, kycTier: 2 },
    })

    await writeAuditLog({
      actorId: session.sub,
      actorAddress: session.address,
      actionType: 'KYC_SUBMITTED',
      entityType: 'User',
      entityId: session.sub,
      beforeState: { kycTier: session.kycTier },
      afterState: { kycTier: 2, kycDocRef: '[encrypted]' },
    })

    return NextResponse.json({ kycTier: user.kycTier })
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const message = err instanceof Error ? err.message : 'Failed to submit KYC'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
