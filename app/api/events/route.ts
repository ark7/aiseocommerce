import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { getIPAddress } from '@/lib/ip';
import { allow } from '@/lib/rateLimit';
import { FunnelEventSchema } from '@/lib/funnelEvents';

/** A browser legitimately emits a handful of these per product page. */
const LIMIT_PER_MINUTE = 60;

/** Larger than any funnel event; refuse it before parsing the body. */
const MAX_BODY_BYTES = 4 * 1024;

/**
 * Collects the upper half of the product funnel.
 *
 * Public by necessity — a product page is read by visitors with no account, so
 * there is no token to authenticate. The write is bounded instead: rate limited
 * per address, size capped, every field schema-checked, and the store is
 * resolved from the domain rather than trusted from the body.
 */
export async function POST(request: Request) {
  try {
    if (!allow(`events:${getIPAddress(request)}`, LIMIT_PER_MINUTE)) {
      return NextResponse.json({ error: 'Too many events' }, { status: 429 });
    }

    // Measured on the bytes that actually arrived rather than on a
    // content-length header: a chunked request sends none, and the header is the
    // caller's to lie about.
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
    }

    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: 'Malformed JSON' }, { status: 400 });
    }

    const parsed = FunnelEventSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid event' }, { status: 400 });
    }
    const { storeDomain, productId, step, sessionId, attribution } = parsed.data;

    // One query answers both questions that matter: does this product exist, and
    // does it belong to the store the visitor was actually browsing. An event
    // naming a store it did not happen in is worse than no event at all.
    const product = await prisma.product.findFirst({
      where: { id: productId, store: { domain: storeDomain } },
      select: { id: true, storeId: true },
    });
    if (!product) {
      return NextResponse.json({ error: 'Unknown product' }, { status: 404 });
    }

    await prisma.productEvent.create({
      data: {
        storeId: product.storeId,
        productId: product.id,
        type: step,
        sessionId,
        attribution: attribution ?? undefined,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error(
      'Failed to record funnel event',
      undefined,
      error instanceof Error ? error : String(error)
    );
    return NextResponse.json({ error: 'Failed to record event' }, { status: 500 });
  }
}
