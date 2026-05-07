import { NextRequest } from 'next/server'
import { verifyJWT, type JWTPayload } from './jwt'

export async function getSession(req: NextRequest): Promise<JWTPayload | null> {
  // Try cookie first
  const cookieToken = req.cookies.get('appen_token')?.value
  if (cookieToken) {
    try { return await verifyJWT(cookieToken) } catch { /* fall through */ }
  }
  // Fallback: Authorization: Bearer <token> header
  const authHeader = req.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const headerToken = authHeader.slice(7)
    try { return await verifyJWT(headerToken) } catch { /* fall through */ }
  }
  return null
}

export async function requireSession(req: NextRequest): Promise<JWTPayload> {
  const session = await getSession(req)
  if (!session) throw new Error('Unauthorized')
  return session
}
