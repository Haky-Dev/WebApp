import { SignJWT, jwtVerify } from 'jose'

function getSecret() {
  return new TextEncoder().encode(process.env.ADMIN_JWT_SECRET!)
}

export async function signAdminToken(eventId: string): Promise<string> {
  return new SignJWT({ eventId, role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('24h')
    .sign(getSecret())
}

export async function verifyAdminToken(
  token: string
): Promise<{ eventId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    if (payload.role !== 'admin' || typeof payload.eventId !== 'string') return null
    return { eventId: payload.eventId }
  } catch {
    return null
  }
}

export async function signMasterToken(): Promise<string> {
  return new SignJWT({ role: 'master' })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('24h')
    .sign(getSecret())
}

export async function verifyMasterToken(token: string): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    return payload.role === 'master'
  } catch {
    return false
  }
}

export async function resolveEventId(
  token: string,
  fallbackEventId?: string
): Promise<string | null> {
  const payload = await verifyAdminToken(token)
  if (payload) return payload.eventId
  if (await verifyMasterToken(token)) return fallbackEventId ?? null
  return null
}
