import { z } from 'zod';
import { AttributionSchema, readStoredAttribution } from '@/lib/attribution';

/**
 * The funnel steps a storefront reports, in order.
 *
 * Shared by the browser that sends them and the route that validates them, so
 * the two lists cannot drift apart.
 *
 * A purchase is deliberately absent. Order already records that, and a second
 * row here would give the same number two sources of truth that can disagree.
 */
export const FUNNEL_STEPS = ['VIEW', 'ADD_TO_CART', 'CHECKOUT_START'] as const;

export type FunnelStep = (typeof FUNNEL_STEPS)[number];

export const FunnelEventSchema = z
  .object({
    /** The domain the visitor browsed to. The server resolves the store from it. */
    storeDomain: z.string().trim().min(1).max(255),
    productId: z.string().trim().min(1).max(64),
    step: z.enum(FUNNEL_STEPS),
    /** Anonymous and client-generated. Bounded so it cannot be used as storage. */
    sessionId: z.string().trim().min(8).max(64),
    attribution: AttributionSchema.nullish(),
  })
  .strict();

export type FunnelEvent = z.infer<typeof FunnelEventSchema>;

/* ------------------------------------------------------------------ */
/* Browser glue — mirrors lib/attribution.ts: thin, and never throws.  */
/* ------------------------------------------------------------------ */

const SESSION_KEY = 'storefront:funnel-session';
const SEEN_PREFIX = 'storefront:funnel-seen:';

/**
 * Fallbacks for blocked storage, plus the hook tests use to reset them.
 *
 * Without them a visitor with storage denied gets a new session id per call and
 * the report counts one visit as several, while the dedupe marker stops working
 * and the same step is recorded on every render.
 */
let memorySessionId: string | null = null;
const memorySeen = new Set<string>();

export function resetFunnelState(): void {
  memorySessionId = null;
  memorySeen.clear();
}

/** One row per (product, step, session) — the key the ProductEvent model describes. */
export function funnelDedupeKey(step: FunnelStep, productId: string): string {
  return `${SEEN_PREFIX}${step}:${productId}`;
}

/** Anonymous, client-generated, stable for the tab. Never a user id. */
function sessionId(): string {
  try {
    const existing = window.sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;

    const created = crypto.randomUUID();
    window.sessionStorage.setItem(SESSION_KEY, created);
    return created;
  } catch {
    if (!memorySessionId) memorySessionId = crypto.randomUUID();
    return memorySessionId;
  }
}

function alreadySent(key: string): boolean {
  try {
    return window.sessionStorage.getItem(key) !== null;
  } catch {
    return memorySeen.has(key);
  }
}

function markSent(key: string): void {
  try {
    window.sessionStorage.setItem(key, '1');
  } catch {
    memorySeen.add(key);
  }
}

/**
 * Report one funnel step. Fire-and-forget: the browser sends it on its way even
 * if the visitor navigates in the same tick, which a `fetch` would not survive.
 *
 * The marker is written before the send, so a re-render cannot double-count the
 * step. A beacon the browser drops is simply a row that never arrives.
 */
export function trackFunnelEvent(
  step: FunnelStep,
  target: { storeDomain: string; productId: string }
): void {
  try {
    const key = funnelDedupeKey(step, target.productId);
    if (alreadySent(key)) return;
    markSent(key);

    const parsed = FunnelEventSchema.safeParse({
      ...target,
      step,
      sessionId: sessionId(),
      attribution: readStoredAttribution() ?? undefined,
    });
    if (!parsed.success) return;

    navigator.sendBeacon(
      '/api/events',
      new Blob([JSON.stringify(parsed.data)], { type: 'application/json' })
    );
  } catch {
    // A lost funnel row is not worth a broken product page.
  }
}
