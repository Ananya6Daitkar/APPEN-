import { SignJWT, jwtVerify } from 'jose'

export interface JWTPayload {
  sub: string       // userId
  address: string   // walletAddress
  kycTier: number
}

const secret = new TextEncoder().encode(process.env.JWT_SECRET ?? 'dev-secret-min-32-chars-long!!!')

export async function signJWT(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(process.env.JWT_EXPIRES_IN ?? '7d')
    .sign(secret)
}

export async function verifyJWT(token: string): Promise<JWTPayload> {
  const { payload } = await jwtVerify(token, secret)
  return payload as unknown as JWTPayload
}
