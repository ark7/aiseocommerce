import { NextRequest } from 'next/server';
import { POST } from '@/app/api/security/turnstile-verify/route';
import { getActiveStore } from '@/lib/store';
import { reset as resetRateLimit } from '@/lib/rateLimit';
import {
  TURNSTILE_PASS_COOKIE,
  verifyTurnstile,
  verifyTurnstilePassToken,
} from '@/lib/turnstile';

jest.mock('@/lib/store', () => ({
  getActiveStore: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

jest.mock('@/lib/turnstile', () => {
  const actual = jest.requireActual('@/lib/turnstile');
  return {
    ...actual,
    verifyTurnstile: jest.fn(),
  };
});

describe('POST /api/security/turnstile-verify', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetRateLimit();
  });

  function makeReq(body: unknown, ip = '203.0.113.9') {
    return new NextRequest('http://localhost/api/security/turnstile-verify', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': ip,
      },
      body: JSON.stringify(body),
    });
  }

  it('returns 400 when Turnstile token is missing', async () => {
    const res = await POST(makeReq({ storeDomain: 'demo.larismanis.online' }));
    expect(res.status).toBe(400);
  });

  it('returns 200 with bypassed: true when Turnstile is disabled on the store', async () => {
    (getActiveStore as jest.Mock).mockResolvedValue({
      id: 'store-1',
      domain: 'demo.larismanis.online',
      settings: {
        turnstileEnabled: false,
        turnstileSiteKey: null,
        turnstileSecretKey: null,
      },
    });

    const res = await POST(makeReq({ token: 'cf-token-123', storeDomain: 'demo.larismanis.online' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ verified: true, bypassed: true });
    expect(res.cookies.get(TURNSTILE_PASS_COOKIE)).toBeUndefined();
  });

  it('returns 400 when Cloudflare siteverify rejects the token', async () => {
    (getActiveStore as jest.Mock).mockResolvedValue({
      id: 'store-1',
      domain: 'demo.larismanis.online',
      settings: {
        turnstileEnabled: true,
        turnstileSiteKey: '0xSITE',
        turnstileSecretKey: '0xSECRET',
      },
    });
    (verifyTurnstile as jest.Mock).mockResolvedValue(false);

    const res = await POST(makeReq({ token: 'bad-token' }));
    expect(res.status).toBe(400);
    expect(verifyTurnstile).toHaveBeenCalledWith('0xSECRET', 'bad-token', '203.0.113.9');
  });

  it('returns 200 and sets HttpOnly signed cf_turnstile_pass cookie when Turnstile succeeds', async () => {
    (getActiveStore as jest.Mock).mockResolvedValue({
      id: 'store-1',
      domain: 'demo.larismanis.online',
      settings: {
        turnstileEnabled: true,
        turnstileSiteKey: '0xSITE',
        turnstileSecretKey: '0xSECRET',
      },
    });
    (verifyTurnstile as jest.Mock).mockResolvedValue(true);

    const res = await POST(makeReq({ token: 'good-token', storeDomain: 'demo.larismanis.online' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ verified: true });

    const cookie = res.cookies.get(TURNSTILE_PASS_COOKIE);
    expect(cookie).toBeDefined();
    expect(cookie?.httpOnly).toBe(true);
    expect(verifyTurnstilePassToken(cookie?.value, '203.0.113.9')).toBe(true);
  });
});
