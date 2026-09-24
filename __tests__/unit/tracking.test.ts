import {
  buildAddToCartCalls,
  buildPurchaseCalls,
  sendTrackingCalls,
  type TrackingCall,
} from '@/lib/tracking';

const FULL_CONFIG = {
  googleTagId: 'G-ABCDE12345',
  googleAdsConversionId: 'AW-123456789',
  googleAdsPurchaseLabel: 'PURCHASE_LBL',
  googleAdsAddToCartLabel: 'CART_LBL',
  tiktokPixelId: 'C1A2B3D4E5F6G7H8',
  facebookPixelId: '123456789',
};

const PURCHASE = {
  orderId: 'demo-order-001',
  value: 500000,
  items: [{ id: 'prod-1', name: 'Rice Cooker', price: 250000, quantity: 2 }],
};

function targets(calls: TrackingCall[]) {
  return calls.map((call) => call.target);
}

function findCall(calls: TrackingCall[], target: string, event: string) {
  return calls.find((call) => call.target === target && call.args[1] === event);
}

describe('buildPurchaseCalls', () => {
  it('always reports the GA4 purchase with its transaction id', () => {
    const calls = buildPurchaseCalls({}, PURCHASE);

    expect(calls).toHaveLength(1);
    expect(calls[0].target).toBe('gtag');
    expect(calls[0].args).toEqual([
      'event',
      'purchase',
      {
        transaction_id: 'demo-order-001',
        value: 500000,
        currency: 'IDR',
        items: [{ item_id: 'prod-1', item_name: 'Rice Cooker', price: 250000, quantity: 2 }],
      },
    ]);
  });

  it('adds the Google Ads conversion only when an id and label are configured', () => {
    const withoutLabel = buildPurchaseCalls({ googleAdsConversionId: 'AW-123456789' }, PURCHASE);
    expect(findCall(withoutLabel, 'gtag', 'conversion')).toBeUndefined();

    const withLabel = buildPurchaseCalls(FULL_CONFIG, PURCHASE);
    expect(findCall(withLabel, 'gtag', 'conversion')?.args[2]).toEqual({
      send_to: 'AW-123456789/PURCHASE_LBL',
      value: 500000,
      currency: 'IDR',
      transaction_id: 'demo-order-001',
    });
  });

  it('reports TikTok CompletePayment only for a store with a TikTok pixel', () => {
    expect(findCall(buildPurchaseCalls(FULL_CONFIG, PURCHASE), 'ttq', 'CompletePayment')).toEqual({
      target: 'ttq',
      args: [
        'track',
        'CompletePayment',
        {
          value: 500000,
          currency: 'IDR',
          contents: [
            { content_id: 'prod-1', content_name: 'Rice Cooker', price: 250000, quantity: 2 },
          ],
        },
      ],
    });
    expect(findCall(buildPurchaseCalls({}, PURCHASE), 'ttq', 'CompletePayment')).toBeUndefined();
  });

  it('reports the Meta Purchase with the order id as its dedupe key', () => {
    const call = findCall(buildPurchaseCalls(FULL_CONFIG, PURCHASE), 'fbq', 'Purchase');

    expect(call?.args[2]).toMatchObject({ value: 500000, currency: 'IDR' });
    expect(call?.args[3]).toEqual({ eventID: 'demo-order-001' });
  });

  it('fires all four platforms for a fully configured store', () => {
    expect(targets(buildPurchaseCalls(FULL_CONFIG, PURCHASE))).toEqual(['gtag', 'gtag', 'ttq', 'fbq']);
  });
});

describe('buildAddToCartCalls', () => {
  const item = { id: 'prod-1', name: 'Rice Cooker', price: 250000, quantity: 2 };

  it('values the line as price times quantity', () => {
    const call = findCall(buildAddToCartCalls({}, { item }), 'gtag', 'add_to_cart');

    expect(call?.args[2]).toMatchObject({ value: 500000, currency: 'IDR' });
  });

  it('uses the add-to-cart conversion label, not the purchase one', () => {
    const call = findCall(buildAddToCartCalls(FULL_CONFIG, { item }), 'gtag', 'conversion');

    expect(call?.args[2]).toMatchObject({ send_to: 'AW-123456789/CART_LBL' });
  });

  it('maps one item onto the TikTok and Meta shapes', () => {
    const calls = buildAddToCartCalls(FULL_CONFIG, { item });

    expect(findCall(calls, 'ttq', 'AddToCart')?.args[2]).toMatchObject({ value: 500000 });
    expect(findCall(calls, 'fbq', 'AddToCart')?.args[2]).toMatchObject({
      contents: [{ id: 'prod-1', quantity: 2, item_price: 250000 }],
    });
  });
});

describe('sendTrackingCalls', () => {
  const calls: TrackingCall[] = [
    { target: 'gtag', args: ['event', 'purchase'] },
    { target: 'ttq', args: ['track', 'CompletePayment'] },
    { target: 'fbq', args: ['track', 'Purchase'] },
  ];

  // Jest runs in the node environment here, so a window is faked per test rather
  // than switching the whole project to jsdom for one suite.
  const globals = globalThis as unknown as Record<string, unknown>;

  afterEach(() => {
    delete globals.window;
  });

  it('calls the globals the page actually loaded', () => {
    const gtag = jest.fn();
    const fbq = jest.fn();
    globals.window = { gtag, fbq };

    sendTrackingCalls(calls);

    expect(gtag).toHaveBeenCalledWith('event', 'purchase');
    expect(fbq).toHaveBeenCalledWith('track', 'Purchase');
  });

  it('skips a platform whose tag was never installed, without throwing', () => {
    const gtag = jest.fn();
    globals.window = { gtag };

    expect(() => sendTrackingCalls(calls)).not.toThrow();
    expect(gtag).toHaveBeenCalledTimes(1);
  });

  it('does nothing when there is no browser at all', () => {
    expect(() => sendTrackingCalls(calls)).not.toThrow();
  });
});
