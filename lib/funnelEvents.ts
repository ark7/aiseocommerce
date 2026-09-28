import { z } from 'zod';
import { AttributionSchema } from '@/lib/attribution';

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
