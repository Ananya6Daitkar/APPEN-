import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifySiweMessage } from '@/lib/auth/siwe'
import { signJWT } from '@/lib/auth/jwt'
import { writeAuditLog } from '@/lib/audit'

export async function POST(req: NextRequest) {
  try {
    const { message, signature } = await req.json()

    if (!message || !signature) {
      return NextResponse.json({ error: 'message and signature are required' }, { status: 400 })
    }

    const address = await verifySiweMessage(message, signature)
    const walletAddressLower = address.toLowerCase()

    // Find existing user case-insensitively (handles mixed-case seeded addresses)
    const existing = await prisma.user.findFirst({
      where: { walletAddress: { equals: walletAddressLower, mode: 'insensitive' } },
    })

    // Use the canonical stored address if found, otherwise use lowercase
    const walletAddress = existing?.walletAddress ?? walletAddressLower

    // Upsert user
    const isNew = !existing
    const user = await prisma.user.upsert({
      where: { walletAddress },
      create: { walletAddress, kycTier: 0 },
      update: {},
    })

    // Upsert reputation
    await prisma.reputation.upsert({
      where: { userId: user.id },
      create: { userId: user.id, score: 500 },
      update: {},
    })

    // Sign JWT
    const token = await signJWT({ sub: user.id, address: walletAddress, kycTier: user.kycTier })

    // Audit log
    await writeAuditLog({
      actorId: user.id,
      actorAddress: walletAddress,
      actionType: isNew ? 'USER_CREATED' : 'SESSION_CREATED',
      entityType: 'User',
      entityId: user.id,
    })

    const response = NextResponse.json({
      user: { id: user.id, walletAddress: user.walletAddress, kycTier: user.kycTier },
      token,
    })

    response.cookies.set('appen_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })

    return response
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Verification failed'
    return NextResponse.json({ error: message }, { status: 401 })
  }
}
