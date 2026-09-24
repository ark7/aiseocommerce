import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { AnalyticsConfigSchema, parseAnalyticsConfig } from '@/lib/analytics';
import { revalidateStoreSettings } from '@/lib/revalidate';

/** Read the store's analytics ids so the admin form can prefill. */
export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const settings = await prisma.storeSettings.findUnique({ where: { storeId: user.storeId } });

    return NextResponse.json({
      success: true,
      analytics: parseAnalyticsConfig(settings?.analyticsConfig),
    });
  } catch (error) {
    logger.error(
      'Failed to read analytics settings',
      {},
      error instanceof Error ? error : String(error)
    );
    return NextResponse.json({ error: 'Failed to read analytics settings' }, { status: 500 });
  }
}

/** Replace the store's analytics ids. Only schema-validated ids are persisted. */
export async function PUT(request: Request) {
  try {
    const user = await requireUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const analytics = AnalyticsConfigSchema.parse(await request.json());

    await prisma.storeSettings.upsert({
      where: { storeId: user.storeId },
      update: { analyticsConfig: analytics },
      create: { storeId: user.storeId, analyticsConfig: analytics },
    });

    // The storefront layout reads these ids, so its cached HTML has to be rebuilt.
    await revalidateStoreSettings(user.storeId);

    logger.info('Analytics settings updated', {
      storeId: user.storeId,
      userId: user.id,
      configured: Object.keys(analytics),
    });

    return NextResponse.json({ success: true, analytics });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }

    logger.error(
      'Failed to update analytics settings',
      {},
      error instanceof Error ? error : String(error)
    );
    return NextResponse.json({ error: 'Failed to update analytics settings' }, { status: 500 });
  }
}
