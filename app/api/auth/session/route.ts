import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { writeAuditLog } from '@/lib/audit'

export async function DELETE(req: NextRequest) {
  try {
    const session = await requireSession(req)

    await writeAuditLog({
      actorId: session.sub,
      actorAddress: session.address,
      actionType: 'SESSION_INVALIDATED',
      entityType: 'User',
      entityId: session.sub,
    })

    const response = NextResponse.json({ success: true })
    response.cookies.set('appen_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    })

    return response
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to invalidate session'
    const status = message === 'Unauthorized' ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
