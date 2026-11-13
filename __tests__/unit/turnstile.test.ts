import {
  verifyTurnstile,
  isTurnstileRequired,
  resolveTurnstileConfig,
  createTurnstilePassToken,
  verifyTurnstilePassToken,
  extractCookieValue,
  verifyRequestTurnstileOrPass,
  TURNSTILE_PASS_COOKIE,
} from '@/lib/turnstile';
import {
  isMaliciousScannerRequest,
  checkCatalogAndSearchRateLimit,
} from '@/middleware';

jest.mock('@/lib/prisma', () => ({ prisma: {} }));
jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

describe('Turnstile Verification & Requirement', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  describe('isTurnstileRequired', () => {
    it('returns not required when enabled is false', () => {
      expect(isTurnstileRequired(false, null)).toEqual({ required: false, error: null });
      expect(isTurnstileRequired(false, 'some-secret')).toEqual({ required: false, error: null });
    });

    it('returns required with error when enabled is true but secret is missing or empty', () => {
      const resNull = isTurnstileRequired(true, null);
      expect(resNull.required).toBe(true);
      expect(resNull.error).toBeTruthy();

      const resEmpty = isTurnstileRequired(true, '   ');
      expect(resEmpty.required).toBe(true);
      expect(resEmpty.error).toBeTruthy();
    });

    it('returns required without error when enabled is true and secret is provided', () => {
      const res = isTurnstileRequired(true, 'valid-secret-key');
      expect(res).toEqual({ required: true, error: null });
    });
  });

  describe('verifyTurnstile', () => {
    it('returns true when Cloudflare API responds with success: true', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      } as any);

      const result = await verifyTurnstile('secret-key', 'valid-token', '127.0.0.1');
      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('returns false when Cloudflare API responds with success: false', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: false }),
      } as any);

      const result = await verifyTurnstile('secret-key', 'bad-token', '127.0.0.1');
      expect(result).toBe(false);
    });

    it('returns false when Cloudflare API returns non-200 HTTP status', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
      } as any);

      const result = await verifyTurnstile('secret-key', 'any-token', '127.0.0.1');
      expect(result).toBe(false);
    });

    it('returns false when network throws an exception (fail-closed)', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network offline'));

      const result = await verifyTurnstile('secret-key', 'any-token', '127.0.0.1');
      expect(result).toBe(false);
    });
  });

  describe('resolveTurnstileConfig', () => {
    const origSite = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    const origSecret = process.env.TURNSTILE_SECRET_KEY;

    afterEach(() => {
      if (origSite === undefined) delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
      else process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = origSite;

      if (origSecret === undefined) delete process.env.TURNSTILE_SECRET_KEY;
      else process.env.TURNSTILE_SECRET_KEY = origSecret;
    });

    it('returns disabled when store settings disable turnstile even if keys exist', () => {
      const cfg = resolveTurnstileConfig({
        turnstileEnabled: false,
        turnstileSiteKey: '0xSITE',
        turnstileSecretKey: '0xSECRET',
      });
      expect(cfg.enabled).toBe(false);
      expect(cfg.siteKey).toBeNull();
    });

    it('falls back to environment variables when settings keys are null and enabled flag is omitted', () => {
      process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = '0xENVSITE';
      process.env.TURNSTILE_SECRET_KEY = '0xENVSECRET';

      const cfg = resolveTurnstileConfig(undefined);
      expect(cfg).toEqual({
        enabled: true,
        siteKey: '0xENVSITE',
        secretKey: '0xENVSECRET',
      });
    });

    it('prefers trimmed store settings over env variables when enabled', () => {
      process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = '0xENVSITE';
      const cfg = resolveTurnstileConfig({
        turnstileEnabled: true,
        turnstileSiteKey: '  0xSTORESITE  ',
        turnstileSecretKey: '  0xSTORESECRET ',
      });
      expect(cfg).toEqual({
        enabled: true,
        siteKey: '0xSTORESITE',
        secretKey: '0xSTORESECRET',
      });
    });
  });

  describe('Signed Turnstile Pass Cookie Token', () => {
    it('creates and verifies a valid token for the same IP before expiry', () => {
      const now = 1_700_000_000_000;
      const token = createTurnstilePassToken('203.0.113.10', now);

      expect(verifyTurnstilePassToken(token, '203.0.113.10', now + 60_000)).toBe(true);
      expect(verifyTurnstilePassToken(token, undefined, now + 60_000)).toBe(true);
    });

    it('rejects expired, tampered, or mismatched-IP tokens', () => {
      const now = 1_700_000_000_000;
      const token = createTurnstilePassToken('203.0.113.10', now);

      expect(verifyTurnstilePassToken(token, '198.51.100.7', now + 60_000)).toBe(false);
      expect(verifyTurnstilePassToken(token, '203.0.113.10', now + 3 * 60 * 60 * 1000)).toBe(false);
      expect(verifyTurnstilePassToken(`${token}tamper`, '203.0.113.10', now + 1_000)).toBe(false);
      expect(verifyTurnstilePassToken(null, '203.0.113.10', now)).toBe(false);
    });
  });

  describe('Anti-DDoS & Scanner Middleware Helpers', () => {
    it('flags malicious scanners and sensitive probes while allowing Googlebot and real browsers', () => {
      expect(isMaliciousScannerRequest('/products', 'sqlmap/1.7.2')).toBe(true);
      expect(isMaliciousScannerRequest('/.env', 'Mozilla/5.0')).toBe(true);
      expect(isMaliciousScannerRequest('/wp-config.php', 'curl/8.0')).toBe(true);

      expect(
        isMaliciousScannerRequest(
          '/product/cetak-id-card-pvc-custom',
          'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
        )
      ).toBe(false);
      expect(
        isMaliciousScannerRequest('/products', 'WhatsApp/2.23.20 A')
      ).toBe(false);
    });

    it('caps unverified search bursts at 15 req/min while verified Turnstile sessions get 60 req/min', () => {
      const now = 1_700_000_000_000;
      for (let i = 0; i < 15; i++) {
        expect(checkCatalogAndSearchRateLimit('192.0.2.50', '/products', 'kartu', false, now).allowed).toBe(true);
      }
      const blocked = checkCatalogAndSearchRateLimit('192.0.2.50', '/products', 'kartu', false, now);
      expect(blocked.allowed).toBe(false);
      expect(blocked.retryAfterSec).toBeGreaterThan(0);

      for (let i = 0; i < 60; i++) {
        expect(checkCatalogAndSearchRateLimit('192.0.2.51', '/products', 'kartu', true, now).allowed).toBe(true);
      }
      expect(checkCatalogAndSearchRateLimit('192.0.2.51', '/products', 'kartu', true, now).allowed).toBe(false);
    });

    it('blocks newly added probe paths (/wp-login.php, /xmlrpc.php, /actuator, /config.json)', () => {
      expect(isMaliciousScannerRequest('/wp-login.php', 'Mozilla/5.0')).toBe(true);
      expect(isMaliciousScannerRequest('/xmlrpc.php', 'Mozilla/5.0')).toBe(true);
      expect(isMaliciousScannerRequest('/actuator', 'Mozilla/5.0')).toBe(true);
      expect(isMaliciousScannerRequest('/config.json', 'Mozilla/5.0')).toBe(true);
    });

    it('protects all public pages and public APIs with adaptive rate limits', () => {
      const now = 1_700_000_000_000;
      for (let i = 0; i < 30; i++) {
        expect(checkCatalogAndSearchRateLimit('192.0.2.70', '/api/products', '', false, now).allowed).toBe(true);
      }
      expect(checkCatalogAndSearchRateLimit('192.0.2.70', '/api/products', '', false, now).allowed).toBe(false);

      for (let i = 0; i < 45; i++) {
        expect(checkCatalogAndSearchRateLimit('192.0.2.71', '/articles/panduan', '', false, now).allowed).toBe(true);
      }
      expect(checkCatalogAndSearchRateLimit('192.0.2.71', '/articles/panduan', '', false, now).allowed).toBe(false);
    });
  });

  describe('extractCookieValue & verifyRequestTurnstileOrPass', () => {
    it('extracts cookie values from both Request Cookie header and NextRequest cookies map', () => {
      const webReq = new Request('http://localhost:3000/api/shipping/rates', {
        headers: {
          cookie: `foo=bar; ${TURNSTILE_PASS_COOKIE}=abc.123.sig; theme=dark`,
        },
      });
      expect(extractCookieValue(webReq, TURNSTILE_PASS_COOKIE)).toBe('abc.123.sig');
      expect(extractCookieValue(webReq, 'missing')).toBeNull();

      const nextLikeReq = {
        cookies: {
          get: (name: string) => (name === TURNSTILE_PASS_COOKIE ? { value: 'next-val' } : undefined),
        },
        headers: new Headers(),
      } as unknown as Request;
      expect(extractCookieValue(nextLikeReq, TURNSTILE_PASS_COOKIE)).toBe('next-val');
    });

    it('allows requests immediately when Turnstile is disabled', async () => {
      const req = new Request('http://localhost:3000/api/auth/forgot-password', { method: 'POST' });
      const res = await verifyRequestTurnstileOrPass(req, { turnstileEnabled: false });
      expect(res).toEqual({ allowed: true, status: 200, error: null });
    });

    it('allows requests with valid cf_turnstile_pass cookie or valid body token when enabled', async () => {
      const passToken = createTurnstilePassToken('203.0.113.88');
      const cookieReq = new Request('http://localhost:3000/api/shipping/rates', {
        method: 'POST',
        headers: {
          'x-forwarded-for': '203.0.113.88',
          cookie: `${TURNSTILE_PASS_COOKIE}=${encodeURIComponent(passToken)}`,
        },
      });
      const settings = {
        turnstileEnabled: true,
        turnstileSiteKey: '0xSITE',
        turnstileSecretKey: '0xSECRET',
      };

      const cookieRes = await verifyRequestTurnstileOrPass(cookieReq, settings, undefined);
      expect(cookieRes).toEqual({ allowed: true, status: 200, error: null });

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      } as any);
      const tokenReq = new Request('http://localhost:3000/api/shipping/rates', {
        method: 'POST',
        headers: { 'x-forwarded-for': '203.0.113.88' },
      });
      const tokenRes = await verifyRequestTurnstileOrPass(tokenReq, settings, 'valid-turnstile-token');
      expect(tokenRes).toEqual({ allowed: true, status: 200, error: null });
    });

    it('rejects requests lacking both valid pass cookie and valid token with status 400', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: false }),
      } as any);
      const req = new Request('http://localhost:3000/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'x-forwarded-for': '203.0.113.99' },
      });
      const settings = {
        turnstileEnabled: true,
        turnstileSiteKey: '0xSITE',
        turnstileSecretKey: '0xSECRET',
      };

      const res = await verifyRequestTurnstileOrPass(req, settings, 'invalid-token');
      expect(res.allowed).toBe(false);
      expect(res.status).toBe(400);
      expect(res.error).toContain('Cloudflare Turnstile');
    });
  });
});

