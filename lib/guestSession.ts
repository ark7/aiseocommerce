import { SignJWT, jwtVerify } from 'jose';
import { Tier } from '@/lib/tiers';

const GUEST_SECRET_STRING = process.env.GUEST_SESSION_SECRET || 'guest-secret-fallback-change-in-prod';
const GUEST_SECRET = new TextEncoder().encode(GUEST_SECRET_STRING);

export interface GuestPayload {
  type: 'guest';
  sub: string;
  storeId: string;
  role: Tier;
}

/**
 * Generates a signed JWT for a guest session using Edge-compatible Web Crypto.
 */
export async function generateGuestToken(storeId: string): Promise<string> {
  const sub = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).substring(2) + Date.now().toString(36);

  return new SignJWT({
    type: 'guest',
    sub,
    storeId,
    role: 'GUEST' as Tier,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(GUEST_SECRET);
}

/**
 * Verifies a guest token and returns the payload using Edge-compatible Web Crypto.
 */
export async function verifyGuestToken(token: string): Promise<GuestPayload | null> {
  try {
    const { payload } = await jwtVerify(token, GUEST_SECRET);
    if (payload.type !== 'guest') return null;
    return payload as unknown as GuestPayload;
  } catch {
    return null;
  }
}
