import {
  FunnelEventSchema,
  funnelDedupeKey,
  resetFunnelState,
  trackFunnelEvent,
} from '@/lib/funnelEvents';

/** Minimal Storage, with a switch for the blocked-storage case. */
class FakeStorage {
  private store = new Map<string, string>();

  constructor(private readonly blocked = false) {}

  getItem(key: string): string | null {
    if (this.blocked) throw new Error('blocked');
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    if (this.blocked) throw new Error('blocked');
    this.store.set(key, value);
  }
}

const TARGET = { storeDomain: 'demo-store.local', productId: 'product-1' };

/**
 * Installs just enough browser for the emitter, and returns what it sent.
 *
 * The storage is injectable, so a case can write to it and then install again —
 * the way a second page view reuses the same tab storage.
 */
function installBrowser(blocked = false, storage = new FakeStorage(blocked)) {
  const sent: Blob[] = [];

  Object.defineProperty(global, 'window', {
    value: { sessionStorage: storage, localStorage: storage },
    configurable: true,
    writable: true,
  });
  Object.defineProperty(global, 'navigator', {
    value: {
      sendBeacon: jest.fn((_url: string, body: Blob) => {
        sent.push(body);
        return true;
      }),
    },
    configurable: true,
    writable: true,
  });

  return {
    sent,
    storage,
    /** The parsed bodies, in the order the page sent them. */
    bodies: async () =>
      Promise.all(
        sent.map(async (blob) => FunnelEventSchema.parse(JSON.parse(await blob.text())))
      ),
  };
}

describe('funnelDedupeKey', () => {
  test('distinguishes a step and a product from any other pair', () => {
    expect(funnelDedupeKey('VIEW', 'a')).not.toBe(funnelDedupeKey('VIEW', 'b'));
    expect(funnelDedupeKey('VIEW', 'a')).not.toBe(funnelDedupeKey('ADD_TO_CART', 'a'));
  });
});

describe('trackFunnelEvent', () => {
  beforeEach(() => {
    resetFunnelState();
  });

  test('sends one row per product and step, however often the page renders', async () => {
    const { bodies } = installBrowser();

    trackFunnelEvent('VIEW', TARGET);
    trackFunnelEvent('VIEW', TARGET);
    trackFunnelEvent('VIEW', TARGET);

    const parsed = await bodies();
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toMatchObject({ step: 'VIEW', ...TARGET });
  });

  test('still sends when the step is a different one on the same product', async () => {
    const { bodies } = installBrowser();

    trackFunnelEvent('VIEW', TARGET);
    trackFunnelEvent('ADD_TO_CART', TARGET);

    expect(await bodies()).toHaveLength(2);
  });

  test('keeps one session id for the visit, so steps can be joined', async () => {
    const { bodies } = installBrowser();

    trackFunnelEvent('VIEW', TARGET);
    trackFunnelEvent('ADD_TO_CART', TARGET);

    const [view, addToCart] = await bodies();
    expect(view.sessionId).toBe(addToCart.sessionId);
    expect(view.sessionId.length).toBeGreaterThanOrEqual(8);
  });

  test('carries the stored campaign when there is one', async () => {
    const first = installBrowser();
    first.storage.setItem(
      'storefront:attribution',
      JSON.stringify({ source: 'google', campaign: 'lebaran' })
    );

    // Same tab storage, fresh page: the campaign outlives the navigation.
    const { bodies } = installBrowser(false, first.storage);
    trackFunnelEvent('VIEW', TARGET);

    const [view] = await bodies();
    expect(view.attribution).toMatchObject({ source: 'google', campaign: 'lebaran' });
  });

  test('counts the step even with storage blocked, without throwing', async () => {
    const { bodies } = installBrowser(true);

    expect(() => trackFunnelEvent('VIEW', TARGET)).not.toThrow();
    expect(await bodies()).toHaveLength(1);
  });

  test('swallows a transport that throws', () => {
    installBrowser();
    Object.defineProperty(global, 'navigator', {
      value: {
        sendBeacon: () => {
          throw new Error('beacon unavailable');
        },
      },
      configurable: true,
      writable: true,
    });

    expect(() => trackFunnelEvent('VIEW', TARGET)).not.toThrow();
  });
});
