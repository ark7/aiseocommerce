import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getStoreUsageMetrics } from '@/services/telemetryService';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const STAFF_ROLES = ['ADMIN', 'STAFF', 'OWNER'];
const DEFAULT_DAYS = 7;
const MAX_DAYS = 90;

export async function GET(request: Request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await verifyToken(token);
    if (!user || !STAFF_ROLES.includes(user.role)) {
      return NextResponse.json({ error: 'Admin/Staff access required' }, { status: 403 });
    }

    if (!user.storeId) {
      return NextResponse.json({ error: 'User does not belong to any store' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const parsedDays = parseInt(searchParams.get('days') || String(DEFAULT_DAYS), 10);
    const days = Math.min(MAX_DAYS, Math.max(1, isNaN(parsedDays) ? DEFAULT_DAYS : parsedDays));

    const metrics = await getStoreUsageMetrics(user.storeId, days);

    return NextResponse.json(metrics);
  } catch (error) {
    logger.error('Failed to load store usage analytics', undefined, error instanceof Error ? error : String(error));
    return NextResponse.json({ error: 'Failed to load usage analytics' }, { status: 500 });
  }
}

