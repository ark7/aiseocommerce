import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { recordPageView } from '@/services/telemetryService';
import { getIPAddress } from '@/lib/ip';
import { allow } from '@/lib/rateLimit';
import { prisma } from '@/lib/prisma';

const MAX_BODY_BYTES = 4 * 1024;
const LIMIT_PER_MINUTE = 120;

const PageViewSchema = z.object({
  storeDomain: z.string().min(1),
  path: z.string().min(1).max(500),
  referrer: z.string().max(500).optional().nullable(),
  deviceType: z.string().max(50).optional().nullable(),
  browser: z.string().max(50).optional().nullable(),
  sessionId: z.string().min(1).max(100),
});

export async function POST(request: NextRequest) {
  try {
    const ip = getIPAddress(request);
    if (!allow(`telemetry:pv:${ip}`, LIMIT_PER_MINUTE)) {
      return NextResponse.json({ error: 'Too many pageview reports' }, { status: 429 });
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

    const parsed = PageViewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid pageview payload' }, { status: 400 });
    }

    const { storeDomain, path, referrer, deviceType, browser, sessionId } = parsed.data;

    const store = await prisma.store.findUnique({
      where: { domain: storeDomain },
      select: { id: true },
    });

    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    await recordPageView({
      storeId: store.id,
      path,
      referrer,
      deviceType,
      browser,
      sessionId,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[API /telemetry/pageview] Failure:', err);
    return NextResponse.json({ error: 'Failed to record pageview' }, { status: 500 });
  }
}

