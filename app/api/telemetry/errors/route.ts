import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { recordSystemError } from '@/services/telemetryService';
import { getIPAddress } from '@/lib/ip';
import { allow } from '@/lib/rateLimit';
import { prisma } from '@/lib/prisma';

const MAX_BODY_BYTES = 16 * 1024;
const LIMIT_PER_MINUTE = 30;

const ErrorTelemetrySchema = z.object({
  storeDomain: z.string().optional(),
  storeId: z.string().optional(),
  message: z.string().min(1).max(2000),
  stack: z.string().max(10000).optional(),
  path: z.string().max(500).optional(),
  source: z.enum(['CLIENT_FRONTEND', 'SERVER_API', 'PAYMENT_WEBHOOK', 'DATABASE', 'BACKGROUND_JOB']).default('CLIENT_FRONTEND'),
  severity: z.enum(['INFO', 'WARN', 'ERROR', 'CRITICAL']).default('ERROR'),
  context: z.record(z.unknown()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const ip = getIPAddress(request);
    if (!allow(`telemetry:err:${ip}`, LIMIT_PER_MINUTE)) {
      return NextResponse.json({ error: 'Too many error reports' }, { status: 429 });
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

    const parsed = ErrorTelemetrySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid telemetry payload', details: parsed.error.issues }, { status: 400 });
    }

    const data = parsed.data;
    let resolvedStoreId = data.storeId;

    if (!resolvedStoreId && data.storeDomain) {
      const store = await prisma.store.findUnique({
        where: { domain: data.storeDomain },
        select: { id: true },
      });
      if (store) {
        resolvedStoreId = store.id;
      }
    }

    await recordSystemError({
      severity: data.severity,
      source: data.source,
      message: data.message,
      stack: data.stack,
      path: data.path,
      storeId: resolvedStoreId,
      ipAddress: ip,
      userAgent: request.headers.get('user-agent'),
      context: data.context,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[API /telemetry/errors] Failure:', err);
    return NextResponse.json({ error: 'Failed to record telemetry' }, { status: 500 });
  }
}

