import { JWTPayload } from './jwt'

const ADMIN_ADDRESSES = (process.env.ADMIN_ADDRESSES ?? '')
  .split(',')
  .map((a) => a.trim().toLowerCase())
  .filter(Boolean)

export function isAdmin(session: JWTPayload): boolean {
  // In DEMO_MODE, all authenticated users can access admin routes
  if (process.env.DEMO_MODE === 'true') return true

  return ADMIN_ADDRESSES.includes(session.address.toLowerCase())
}
