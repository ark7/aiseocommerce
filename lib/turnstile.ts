import { logger } from '@/lib/logger';

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
