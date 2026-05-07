/**
 * Auth-aware fetch wrapper.
 * Reads JWT from localStorage (set by demo login) and sends as Authorization header.
 * Falls back to cookie-based auth for production.
 */

export class AuthError extends Error {
  constructor() {
    super('Please connect your wallet to continue.')
    this.name = 'AuthError'
  }
}

function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('appen_token')
}

export function setStoredToken(token: string) {
  if (typeof window !== 'undefined') localStorage.setItem('appen_token', token)
}

export function clearStoredToken() {
  if (typeof window !== 'undefined') localStorage.removeItem('appen_token')
}

export async function authFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const token = getStoredToken()
  const headers: Record<string, string> = {
    ...(init?.headers as Record<string, string> ?? {}),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(input, { ...init, headers })

  if (res.status === 401) {
    throw new AuthError()
  }

  return res
}

export async function authFetchJson<T = unknown>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<T> {
  const res = await authFetch(input, init)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { error?: string }).error ?? `Server error ${res.status}`)
  }
  return res.json() as Promise<T>
}
