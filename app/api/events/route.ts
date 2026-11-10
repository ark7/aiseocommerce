import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { getIPAddress } from '@/lib/ip';
import { allow } from '@/lib/rateLimit';
import { FunnelEventSchema } from '@/lib/funnelEvents';
import { verifyGuestToken } from '@/lib/guestSession';
import { verifyToken } from '@/lib/auth';

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
export async function POST(request: NextRequest) {
  try {
    if (!allow(`events:${getIPAddress(request)}`, LIMIT_PER_MINUTE)) {
      return NextResponse.json({ error: 'Too many events' }, { status: 429 });
    }

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
    const { storeDomain, productId, step, attribution } = parsed.data;

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

    // Resolve Session ID from Token
    const token = request.cookies?.get('token')?.value;
    let finalSessionId = 'anonymous';

    if (token) {
      const user = await verifyToken(token);
      if (user) {
        finalSessionId = user.id;
      } else {
        const guest = await verifyGuestToken(token);
        if (guest) {
          finalSessionId = guest.sub;
        }
      }
    }

    await prisma.productEvent.create({
      data: {
        storeId: product.storeId,
        productId: product.id,
        type: step,
        sessionId: finalSessionId,
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
