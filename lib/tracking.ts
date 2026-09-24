import type { AnalyticsConfig } from '@/lib/analytics';

/**
 * Conversion tracking for ad campaigns.
 *
 * Every platform wants the same event, told four different ways: GA4 takes
 * `gtag('event', …)`, Google Ads hangs a conversion off the same `gtag`, TikTok
 * queues onto `ttq`, Meta onto `fbq`. So the payloads are built here as plain
 * data — no globals, no browser — and one thin dispatcher hands them to whichever
 * tags the store actually installed.
 */

export type TrackingTarget = 'gtag' | 'ttq' | 'fbq';

export interface TrackingCall {
  target: TrackingTarget;
  args: unknown[];
}

export interface TrackingItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface PurchasePayload {
  orderId: string;
  /** Order total in the store currency. */
  value: number;
  items: TrackingItem[];
  currency?: string;
}

export interface AddToCartPayload {
  item: TrackingItem;
  currency?: string;
}

const DEFAULT_CURRENCY = 'IDR';

function itemTotal(item: TrackingItem): number {
  return item.price * item.quantity;
}

function toGa4Items(items: TrackingItem[]) {
  return items.map((item) => ({
    item_id: item.id,
    item_name: item.name,
    price: item.price,
    quantity: item.quantity,
  }));
}

function toTikTokContents(items: TrackingItem[]) {
  return items.map((item) => ({
    content_id: item.id,
    content_name: item.name,
    price: item.price,
    quantity: item.quantity,
  }));
}

function toMetaContents(items: TrackingItem[]) {
  return items.map((item) => ({ id: item.id, quantity: item.quantity, item_price: item.price }));
}

/** `AW-123456789/AbC-D_ef` — the shape Google Ads `send_to` expects. */
function adsSendTo(config: AnalyticsConfig, label?: string): string | null {
  if (!config.googleAdsConversionId || !label) return null;
  return `${config.googleAdsConversionId}/${label}`;
}

/**
 * A completed purchase: GA4 `purchase`, the Google Ads conversion, and the
 * matching TikTok / Meta pixel events.
 */
export function buildPurchaseCalls(
  config: AnalyticsConfig,
  payload: PurchasePayload
): TrackingCall[] {
  const currency = payload.currency ?? DEFAULT_CURRENCY;
  const calls: TrackingCall[] = [];

  calls.push({
    target: 'gtag',
    args: [
      'event',
      'purchase',
      {
        transaction_id: payload.orderId,
        value: payload.value,
        currency,
        items: toGa4Items(payload.items),
      },
    ],
  });

  const purchaseSendTo = adsSendTo(config, config.googleAdsPurchaseLabel);
  if (purchaseSendTo) {
    calls.push({
      target: 'gtag',
      args: [
        'event',
        'conversion',
        {
          send_to: purchaseSendTo,
          value: payload.value,
          currency,
          transaction_id: payload.orderId,
        },
      ],
    });
  }

  if (config.tiktokPixelId) {
    calls.push({
      target: 'ttq',
      args: [
        'track',
        'CompletePayment',
        { value: payload.value, currency, contents: toTikTokContents(payload.items) },
      ],
    });
  }

  if (config.facebookPixelId) {
    calls.push({
      target: 'fbq',
      args: [
        'track',
        'Purchase',
        { value: payload.value, currency, contents: toMetaContents(payload.items) },
        { eventID: payload.orderId },
      ],
    });
  }

  return calls;
}

/** Add to cart: GA4 `add_to_cart` plus the Ads / TikTok / Meta equivalents. */
export function buildAddToCartCalls(
  config: AnalyticsConfig,
  payload: AddToCartPayload
): TrackingCall[] {
  const currency = payload.currency ?? DEFAULT_CURRENCY;
  const items = [payload.item];
  const value = itemTotal(payload.item);
  const calls: TrackingCall[] = [];

  calls.push({
    target: 'gtag',
    args: ['event', 'add_to_cart', { value, currency, items: toGa4Items(items) }],
  });

  const addToCartSendTo = adsSendTo(config, config.googleAdsAddToCartLabel);
  if (addToCartSendTo) {
    calls.push({
      target: 'gtag',
      args: ['event', 'conversion', { send_to: addToCartSendTo, value, currency }],
    });
  }

  if (config.tiktokPixelId) {
    calls.push({
      target: 'ttq',
      args: ['track', 'AddToCart', { value, currency, contents: toTikTokContents(items) }],
    });
  }

  if (config.facebookPixelId) {
    calls.push({
      target: 'fbq',
      args: ['track', 'AddToCart', { value, currency, contents: toMetaContents(items) }],
    });
  }

  return calls;
}

type TrackingGlobal = ((...args: unknown[]) => void) | undefined;

/**
 * Hand the built calls to the tag globals. A page that never loaded a given tag
 * simply has no global for it, so the call is skipped — no guard code at the
 * call site.
 */
export function sendTrackingCalls(calls: TrackingCall[]): void {
  if (typeof window === 'undefined') return;

  const globals = window as unknown as Record<string, TrackingGlobal>;

  for (const call of calls) {
    const fn = globals[call.target];
    if (typeof fn === 'function') {
      fn(...call.args);
    }
  }
}

/* ------------------------------------------------------------------ */
/* Page-level helpers                                                  */
/* ------------------------------------------------------------------ */

/**
 * The store's tag config, published to the client once by <StoreTracking />.
 * Held in a module variable so any component can build events without the
 * config being threaded through props from a server layout.
 */
let activeConfig: AnalyticsConfig = {};

export function setTrackingConfig(config: AnalyticsConfig): void {
  activeConfig = config;
}

export function getTrackingConfig(): AnalyticsConfig {
  return activeConfig;
}

/**
 * Google Tag has to be on the page before a conversion call lands, or the event
 * is dropped. The layout injects tags with `afterInteractive`, so wait for load.
 */
export function fireTracking(calls: TrackingCall[]): void {
  if (typeof window === 'undefined') return;

  if (document.readyState === 'complete') {
    sendTrackingCalls(calls);
    return;
  }

  window.addEventListener('load', () => sendTrackingCalls(calls), { once: true });
}

/** Conversion events must not double-count when a page is revisited. */
export function fireOnce(key: string, calls: TrackingCall[]): void {
  if (typeof window === 'undefined') return;

  const storageKey = `tracked:${key}`;
  try {
    if (window.localStorage.getItem(storageKey)) return;
    window.localStorage.setItem(storageKey, new Date().toISOString());
  } catch {
    // Storage blocked: fall through and report, rather than silently dropping.
  }

  fireTracking(calls);
}
