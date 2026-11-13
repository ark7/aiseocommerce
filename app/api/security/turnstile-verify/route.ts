import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getActiveStore } from '@/lib/store';
import { getIPAddress } from '@/lib/ip';
import { allow } from '@/lib/rateLimit';
import { logger } from '@/lib/logger';
import {
  TURNSTILE_PASS_COOKIE,
  TURNSTILE_PASS_MAX_AGE,
  createTurnstilePassToken,
  isTurnstileRequired,
  resolveTurnstileConfig,
  verifyTurnstile,
} from '@/lib/turnstile';

const TurnstileVerifySchema = z.object({
  token: z.string().min(1),
  storeDomain: z.string().optional(),
});

/**
 * Verifies a Cloudflare Turnstile token from public storefront pages (/products, /product/[slug])
 * and issues a 2-hour signed HttpOnly session cookie so verified human shoppers can browse
 * without repeated CAPTCHA prompts.
 */
export async function POST(request: NextRequest) {
  try {
    const ip = getIPAddress(request);
    if (!allow(`turnstile-verify:${ip}`, 30)) {
      return NextResponse.json(
        { error: 'Terlalu banyak percobaan verifikasi. Silakan tunggu sebentar.' },
        { status: 429 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Format JSON tidak valid' }, { status: 400 });
    }

    const parsed = TurnstileVerifySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Token keamanan Cloudflare Turnstile wajib diisi' },
        { status: 400 }
      );
    }

    const store = await getActiveStore(parsed.data.storeDomain);
    const config = resolveTurnstileConfig(store?.settings);

    if (!config.enabled) {
      return NextResponse.json({ verified: true, bypassed: true });
    }

    const { error: configError } = isTurnstileRequired(config.enabled, config.secretKey);
    if (configError) {
      logger.warn('Turnstile configuration incomplete during storefront verify', {
        storeDomain: parsed.data.storeDomain,
      });
      return NextResponse.json({ error: configError }, { status: 500 });
    }

    const ok = await verifyTurnstile(config.secretKey || '', parsed.data.token, ip);
    if (!ok) {
      return NextResponse.json(
        { error: 'Verifikasi keamanan Cloudflare Turnstile gagal. Silakan coba lagi.' },
        { status: 400 }
      );
    }

    const passToken = createTurnstilePassToken(ip);
    const response = NextResponse.json({ verified: true });
    response.cookies.set(TURNSTILE_PASS_COOKIE, passToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: TURNSTILE_PASS_MAX_AGE,
    });

    return response;
  } catch (error) {
    logger.error(
      'Storefront Turnstile verification failed',
      {},
      error instanceof Error ? error : String(error)
    );
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat memverifikasi keamanan.' },
      { status: 500 }
    );
  }
}
