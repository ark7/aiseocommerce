import { verifyTurnstile, isTurnstileRequired } from '@/lib/turnstile';

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
});

