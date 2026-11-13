import { createHmac, timingSafeEqual } from 'crypto';
import { logger } from '@/lib/logger';
import { getIPAddress } from '@/lib/ip';

export const TURNSTILE_PASS_COOKIE = 'cf_turnstile_pass';
export const TURNSTILE_PASS_MAX_AGE = 60 * 60 * 2; // 2 hours (seconds)

export interface ResolvedTurnstileConfig {
  enabled: boolean;
  siteKey: string | null;
  secretKey: string | null;
}

/**
 * Resolves Cloudflare Turnstile settings from StoreSettings with optional
 * environment variable fallback so keys can be managed in Admin Settings or env.
 */
export function resolveTurnstileConfig(
  settings?: {
    turnstileEnabled?: boolean | null;
    turnstileSiteKey?: string | null;
    turnstileSecretKey?: string | null;
  } | null
): ResolvedTurnstileConfig {
  const siteKey =
    settings?.turnstileSiteKey?.trim() ||
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ||
    null;
  const secretKey =
    settings?.turnstileSecretKey?.trim() ||
    process.env.TURNSTILE_SECRET_KEY?.trim() ||
    null;
  const enabled =
    settings?.turnstileEnabled !== undefined && settings?.turnstileEnabled !== null
      ? Boolean(settings.turnstileEnabled)
      : Boolean(siteKey && secretKey);

  return {
    enabled,
    siteKey: enabled ? siteKey : null,
    secretKey,
  };
}

function getTurnstilePassSecret(): string {
  return process.env.JWT_SECRET || 'dev-turnstile-pass-secret';
}

function hashIpForTurnstilePass(ip: string, secret: string): string {
  return createHmac('sha256', secret)
    .update((ip || 'unknown').trim())
    .digest('hex')
    .slice(0, 16);
}

/**
 * Creates an HMAC-signed short-lived pass token (default 2h) bound to the client IP
 * so verified human shoppers can browse listing and product pages seamlessly.
 */
export function createTurnstilePassToken(
  ip: string = 'unknown',
  nowMs: number = Date.now()
): string {
  const secret = getTurnstilePassSecret();
  const expMs = nowMs + TURNSTILE_PASS_MAX_AGE * 1000;
  const ipHash = hashIpForTurnstilePass(ip, secret);
  const payload = `${expMs}.${ipHash}`;
  const sig = createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

/**
 * Validates the signed Turnstile session pass cookie.
 */
export function verifyTurnstilePassToken(
  token: string | undefined | null,
  ip?: string,
  nowMs: number = Date.now()
): boolean {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;

  const [expStr, tokenIpHash, sig] = parts;
  const expMs = Number(expStr);
  if (!Number.isFinite(expMs) || expMs <= nowMs) return false;
  if (!tokenIpHash || !sig) return false;

  try {
    const secret = getTurnstilePassSecret();
    const payload = `${expStr}.${tokenIpHash}`;
    const expectedSig = createHmac('sha256', secret).update(payload).digest('base64url');
    const sigBuf = Buffer.from(sig);
    const expectedBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
      return false;
    }

    if (ip && ip !== 'unknown') {
      const expectedIpHash = hashIpForTurnstilePass(ip, secret);
      if (tokenIpHash !== expectedIpHash) {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Verifies a Cloudflare Turnstile token.
 * @param secret The store's Turnstile secret key.
 * @param token The token provided by the client.
 * @param ip The user's IP address.
 */
export async function verifyTurnstile(
  secret: string,
  token: string,
  ip: string
): Promise<boolean> {
  try {
    const response = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          secret,
          response: token,
          remoteip: ip,
        }),
      }
    );

    if (!response.ok) {
      logger.warn('Turnstile verification API request failed', { status: response.status });
      return false;
    }

    const data = await response.json();
    return data.success === true;
  } catch (error) {
    logger.error('Turnstile verification error', {}, error instanceof Error ? error : String(error));
    return false;
  }
}

/**
 * Determines if Turnstile verification is mandatory for the store.
 * Fail-closed: if enabled is true but secret is missing, it returns true (mandatory)
 * to prevent bypassing security when configuration is incomplete.
 */
export function isTurnstileRequired(enabled: boolean, secret: string | null | undefined): {
  required: boolean;
  error: string | null
} {
  if (!enabled) return { required: false, error: null };

  if (!secret || secret.trim() === '') {
    return {
      required: true,
      error: 'Turnstile is enabled but the secret key is not configured.'
    };
  }

  return { required: true, error: null };
}

/**
 * Extracts a named cookie from either a NextRequest-like `.cookies` map
 * or a standard Web `Request` Cookie header.
 */
export function extractCookieValue(request: Request, cookieName: string): string | null {
  try {
    const reqWithCookies = request as {
      cookies?: { get?: (name: string) => { value?: string } | undefined };
    };
    const nextCookieVal = reqWithCookies?.cookies?.get?.(cookieName)?.value;
    if (nextCookieVal) return nextCookieVal;

    const rawHeader = request.headers?.get?.('cookie') || '';
    if (!rawHeader) return null;

    const prefix = `${cookieName}=`;
    for (const part of rawHeader.split(';')) {
      const trimmed = part.trim();
      if (trimmed.startsWith(prefix)) {
        return decodeURIComponent(trimmed.slice(prefix.length));
      }
    }
  } catch {
    // ignore malformed cookie header
  }
  return null;
}

/**
 * Enforces Cloudflare Turnstile verification for public API requests when enabled,
 * accepting either a valid signed `cf_turnstile_pass` cookie or a one-time body token.
 */
export async function verifyRequestTurnstileOrPass(
  request: Request,
  settings?: {
    turnstileEnabled?: boolean | null;
    turnstileSiteKey?: string | null;
    turnstileSecretKey?: string | null;
  } | null,
  bodyToken?: string | null
): Promise<{ allowed: boolean; status: number; error: string | null }> {
  const config = resolveTurnstileConfig(settings);
  if (!config.enabled) {
    return { allowed: true, status: 200, error: null };
  }

  const { error: configError } = isTurnstileRequired(config.enabled, config.secretKey);
  if (configError) {
    return { allowed: false, status: 500, error: configError };
  }

  const ip = getIPAddress(request);
  const passCookie = extractCookieValue(request, TURNSTILE_PASS_COOKIE);
  if (verifyTurnstilePassToken(passCookie, ip)) {
    return { allowed: true, status: 200, error: null };
  }

  const cleanToken = typeof bodyToken === 'string' ? bodyToken.trim() : '';
  if (cleanToken) {
    const isValid = await verifyTurnstile(config.secretKey || '', cleanToken, ip);
    if (isValid) {
      return { allowed: true, status: 200, error: null };
    }
  }

  return {
    allowed: false,
    status: 400,
    error:
      'Verifikasi keamanan Cloudflare Turnstile diperlukan. Silakan muat ulang halaman dan selesaikan verifikasi anti-bot.',
  };
}
