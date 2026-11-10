import {
  isSandboxMode,
  validateCartSandboxSeparation,
  validateOrderSandboxIntegrity,
  resolveGatewayCredentials,
  resolvePaymentRedirectUrl,
  MixedCartSandboxError,
  SandboxModeDisabledError,
} from '@/lib/paymentGateway';

describe('Payment Gateway Sandbox Mode Utilities', () => {
  const originalEnv = process.env.ENABLE_PAYMENT_SANDBOX;

  afterEach(() => {
    process.env.ENABLE_PAYMENT_SANDBOX = originalEnv;
  });

  describe('isSandboxMode', () => {
    it('returns true when store setting sandboxPaymentEnabled is true', () => {
      delete process.env.ENABLE_PAYMENT_SANDBOX;
      expect(isSandboxMode({ sandboxPaymentEnabled: true })).toBe(true);
    });

    it('returns true when process.env.ENABLE_PAYMENT_SANDBOX is "true"', () => {
      process.env.ENABLE_PAYMENT_SANDBOX = 'true';
      expect(isSandboxMode({ sandboxPaymentEnabled: false })).toBe(true);
      expect(isSandboxMode(null)).toBe(true);
    });

    it('returns false when neither store setting nor env var is enabled', () => {
      delete process.env.ENABLE_PAYMENT_SANDBOX;
      expect(isSandboxMode({ sandboxPaymentEnabled: false })).toBe(false);
      expect(isSandboxMode(null)).toBe(false);
      expect(isSandboxMode(undefined)).toBe(false);
    });
  });

  describe('validateCartSandboxSeparation', () => {
    it('allows an empty cart', () => {
      expect(validateCartSandboxSeparation([])).toEqual({ isSandbox: false });
    });

    it('identifies purely non-sandbox products', () => {
      const items = [
        { id: 'p1', sandboxEnabled: false },
        { id: 'p2', sandboxEnabled: null },
      ];
      expect(validateCartSandboxSeparation(items)).toEqual({ isSandbox: false });
    });

    it('identifies purely sandbox products', () => {
      const items = [
        { id: 'p1', sandboxEnabled: true },
        { id: 'p2', sandboxEnabled: true },
      ];
      expect(validateCartSandboxSeparation(items)).toEqual({ isSandbox: true });
    });

    it('throws MixedCartSandboxError when mixing sandbox and regular products', () => {
      const items = [
        { id: 'p1', sandboxEnabled: true },
        { id: 'p2', sandboxEnabled: false },
      ];
      expect(() => validateCartSandboxSeparation(items)).toThrow(MixedCartSandboxError);
      expect(() => validateCartSandboxSeparation(items)).toThrow(
        'Produk uji coba sandbox tidak dapat digabung dengan produk reguler dalam satu pesanan.'
      );
    });
  });

  describe('validateOrderSandboxIntegrity', () => {
    it('passes for non-sandbox products even if sandbox mode is off', () => {
      expect(validateOrderSandboxIntegrity(false, { sandboxPaymentEnabled: false })).toBe(false);
    });

    it('passes and returns true for sandbox products when store sandbox is enabled', () => {
      expect(validateOrderSandboxIntegrity(true, { sandboxPaymentEnabled: true })).toBe(true);
    });

    it('throws SandboxModeDisabledError when ordering sandbox products while sandbox mode is off', () => {
      delete process.env.ENABLE_PAYMENT_SANDBOX;
      expect(() => validateOrderSandboxIntegrity(true, { sandboxPaymentEnabled: false })).toThrow(
        SandboxModeDisabledError
      );
      expect(() => validateOrderSandboxIntegrity(true, null)).toThrow(SandboxModeDisabledError);
    });
  });

  describe('resolveGatewayCredentials', () => {
    it('resolves sandbox credentials and snap URL when isSandbox is true', () => {
      const settings = {
        midtransMerchantId: 'M-PROD',
        midtransClientKey: 'Mid-client-prod',
        midtransServerKey: 'Mid-server-prod',
        flipApiKey: 'flip-prod',
        midtransSandboxMerchantId: 'M-SANDBOX',
        midtransSandboxClientKey: 'SB-Mid-client-test',
        midtransSandboxServerKey: 'SB-Mid-server-test',
        flipSandboxApiKey: 'flip-sandbox-key',
      };

      const result = resolveGatewayCredentials(settings, true);
      expect(result.isSandbox).toBe(true);
      expect(result.midtrans.merchantId).toBe('M-SANDBOX');
      expect(result.midtrans.clientKey).toBe('SB-Mid-client-test');
      expect(result.midtrans.serverKey).toBe('SB-Mid-server-test');
      expect(result.midtrans.snapUrl).toBe('https://app.sandbox.midtrans.com/snap/v2/vtweb/');
      expect(result.flip.apiKey).toBe('flip-sandbox-key');
    });

    it('never falls back to production keys for a sandbox order', () => {
      process.env.MIDTRANS_SERVER_KEY = 'env-live-key';
      const result = resolveGatewayCredentials(
        {
          midtransServerKey: 'store-live-key',
          midtransClientKey: 'store-live-client',
          midtransMerchantId: 'store-live-merchant',
          flipApiKey: 'store-live-flip',
        },
        true
      );

      expect(result.midtrans.serverKey).toBe('');
      expect(result.midtrans.clientKey).toBe('');
      expect(result.midtrans.merchantId).toBe('');
      expect(result.flip.apiKey).toBe('');
    });

    it('resolves production credentials and snap URL when isSandbox is false', () => {
      const settings = {
        midtransMerchantId: 'M-PROD',
        midtransClientKey: 'Mid-client-prod',
        midtransServerKey: 'Mid-server-prod',
        flipApiKey: 'flip-prod',
        midtransSandboxMerchantId: 'M-SANDBOX',
        midtransSandboxClientKey: 'SB-Mid-client-test',
        midtransSandboxServerKey: 'SB-Mid-server-test',
        flipSandboxApiKey: 'flip-sandbox-key',
      };

      const result = resolveGatewayCredentials(settings, false);
      expect(result.isSandbox).toBe(false);
      expect(result.midtrans.merchantId).toBe('M-PROD');
      expect(result.midtrans.clientKey).toBe('Mid-client-prod');
      expect(result.midtrans.serverKey).toBe('Mid-server-prod');
      expect(result.midtrans.snapUrl).toBe('https://app.midtrans.com/snap/v2/vtweb/');
      expect(result.flip.apiKey).toBe('flip-prod');
    });
  });

  describe('resolvePaymentRedirectUrl', () => {
    it('returns sandbox simulator URL for sandbox payment gateway requests', () => {
      const url = resolvePaymentRedirectUrl({
        paymentMethod: 'MIDTRANS',
        paymentId: 'pay-123',
        orderId: 'ord-456',
        isSandbox: true,
      });
      expect(url).toBe('https://simulator.payment-gateway.example.com/sandbox/pay/pay-123');
    });

    it('returns standard production simulator URL for non-sandbox requests', () => {
      const url = resolvePaymentRedirectUrl({
        paymentMethod: 'MIDTRANS',
        paymentId: 'pay-123',
        orderId: 'ord-456',
        isSandbox: false,
      });
      expect(url).toBe('https://simulator.payment-gateway.example.com/pay/pay-123');
    });

    it('returns success checkout page with sandbox indicator for manual/cod payments', () => {
      const url = resolvePaymentRedirectUrl({
        paymentMethod: 'MANUAL',
        paymentId: 'pay-123',
        orderId: 'ord-456',
        isSandbox: true,
      });
      expect(url).toBe('/checkout/success?orderId=ord-456&sandbox=1');
    });
  });
});

