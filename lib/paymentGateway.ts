export class SandboxModeDisabledError extends Error {
  constructor(message = 'Mode sandbox sedang dinonaktifkan. Produk uji coba tidak dapat dipesan saat ini.') {
    super(message);
    this.name = 'SandboxModeDisabledError';
  }
}

export class MixedCartSandboxError extends Error {
  constructor(message = 'Produk uji coba sandbox tidak dapat digabung dengan produk reguler dalam satu pesanan.') {
    super(message);
    this.name = 'MixedCartSandboxError';
  }
}

export interface StoreSettingsPaymentConfig {
  sandboxPaymentEnabled?: boolean | null;
  midtransMerchantId?: string | null;
  midtransClientKey?: string | null;
  midtransServerKey?: string | null;
  flipApiKey?: string | null;
  midtransSandboxMerchantId?: string | null;
  midtransSandboxClientKey?: string | null;
  midtransSandboxServerKey?: string | null;
  flipSandboxApiKey?: string | null;
}

/**
 * Determines whether sandbox mode is active for a given store.
 * Active if store settings has sandboxPaymentEnabled = true OR global ENABLE_PAYMENT_SANDBOX = 'true'.
 */
export function isSandboxMode(settings?: StoreSettingsPaymentConfig | null): boolean {
  if (settings?.sandboxPaymentEnabled) return true;
  return process.env.ENABLE_PAYMENT_SANDBOX === 'true';
}

/**
 * Validates that an order does not mix sandbox test products with regular real products.
 * Prevents accidental sandbox checkout for real inventory.
 */
export function validateCartSandboxSeparation<T extends { sandboxEnabled?: boolean | null }>(
  items: T[]
): { isSandbox: boolean } {
  if (!items || items.length === 0) {
    return { isSandbox: false };
  }

  const hasSandbox = items.some((item) => Boolean(item.sandboxEnabled));
  const hasRegular = items.some((item) => !item.sandboxEnabled);

  if (hasSandbox && hasRegular) {
    throw new MixedCartSandboxError();
  }

  return { isSandbox: hasSandbox };
}

/**
 * Validates order sandbox integrity:
 * If an order contains sandbox products, sandbox mode MUST be enabled.
 */
export function validateOrderSandboxIntegrity(
  hasSandboxProduct: boolean,
  settings?: StoreSettingsPaymentConfig | null
): boolean {
  if (hasSandboxProduct) {
    if (!isSandboxMode(settings)) {
      throw new SandboxModeDisabledError();
    }
    return true;
  }
  return false;
}

export interface GatewayCredentials {
  isSandbox: boolean;
  midtrans: {
    merchantId: string;
    clientKey: string;
    serverKey: string;
    snapUrl: string;
  };
  flip: {
    apiKey: string;
    baseUrl: string;
  };
}

/**
 * Resolves gateway keys and endpoints based on whether sandbox mode is used.
 *
 * Sandbox never falls back to production keys: a sandbox order with no sandbox
 * key configured must fail to authenticate, not quietly talk to the live
 * gateway with real credentials.
 */
export function resolveGatewayCredentials(
  settings?: StoreSettingsPaymentConfig | null,
  isSandbox: boolean = false
): GatewayCredentials {
  if (isSandbox) {
    return {
      isSandbox: true,
      midtrans: {
        merchantId:
          settings?.midtransSandboxMerchantId || process.env.MIDTRANS_SANDBOX_MERCHANT_ID || '',
        clientKey:
          settings?.midtransSandboxClientKey || process.env.MIDTRANS_SANDBOX_CLIENT_KEY || '',
        serverKey:
          settings?.midtransSandboxServerKey || process.env.MIDTRANS_SANDBOX_SERVER_KEY || '',
        snapUrl: 'https://app.sandbox.midtrans.com/snap/v2/vtweb/',
      },
      flip: {
        apiKey: settings?.flipSandboxApiKey || process.env.FLIP_SANDBOX_API_KEY || '',
        baseUrl: 'https://bigflip.id/api/v2',
      },
    };
  }

  return {
    isSandbox: false,
    midtrans: {
      merchantId: settings?.midtransMerchantId || process.env.MIDTRANS_MERCHANT_ID || '',
      clientKey: settings?.midtransClientKey || process.env.MIDTRANS_CLIENT_KEY || '',
      serverKey: settings?.midtransServerKey || process.env.MIDTRANS_SERVER_KEY || '',
      snapUrl: 'https://app.midtrans.com/snap/v2/vtweb/',
    },
    flip: {
      apiKey: settings?.flipApiKey || process.env.FLIP_API_KEY || '',
      baseUrl: 'https://bigflip.id/api/v2',
    },
  };
}

/**
 * Resolves checkout redirect URL for payment methods.
 */
export function resolvePaymentRedirectUrl(params: {
  paymentMethod: string;
  paymentId: string;
  orderId: string;
  isSandbox: boolean;
}): string {
  const { paymentMethod, paymentId, orderId, isSandbox } = params;

  if (paymentMethod === 'MIDTRANS' || paymentMethod === 'FLIP') {
    if (isSandbox) {
      return `https://simulator.payment-gateway.example.com/sandbox/pay/${paymentId}`;
    }
    return `https://simulator.payment-gateway.example.com/pay/${paymentId}`;
  }

  return `/checkout/success?orderId=${orderId}${isSandbox ? '&sandbox=1' : ''}`;
}
