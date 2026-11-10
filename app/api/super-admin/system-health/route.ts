import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isControlPlaneEnabled, requireSuperAdminOwner } from '@/lib/superAdminAuth';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!isControlPlaneEnabled(request)) {
    return NextResponse.json(
      { error: 'Portal Super-Admin Control Plane dinonaktifkan pada instance ini.' },
      { status: 404 }
    );
  }

  const owner = requireSuperAdminOwner(request);
  if (!owner) {
    return NextResponse.json(
      { error: 'Akses Ditolak (403): Hanya akun pemilik Super-Admin yang diizinkan.' },
      { status: 403 }
    );
  }

  try {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const [
      totalErrorsToday,
      criticalErrorsToday,
      unresolvedErrors,
      recentErrors,
      totalPageviewsToday,
    ] = await Promise.all([
      prisma.systemErrorLog.count({
        where: { createdAt: { gte: today } },
      }),
      prisma.systemErrorLog.count({
        where: {
          severity: 'CRITICAL',
          createdAt: { gte: today },
        },
      }),
      prisma.systemErrorLog.count({
        where: { isResolved: false },
      }),
      prisma.systemErrorLog.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          store: {
            select: { id: true, name: true, domain: true },
          },
        },
      }),
      prisma.pageViewLog.count({
        where: { createdAt: { gte: today } },
      }),
    ]);

    return NextResponse.json({
      status: criticalErrorsToday > 0 ? 'warning' : 'healthy',
      metrics: {
        totalErrorsToday,
        criticalErrorsToday,
        unresolvedErrors,
        totalPageviewsToday,
      },
      recentErrors,
    });
  } catch (error) {
    logger.error('Failed to get super-admin system health', undefined, error instanceof Error ? error : String(error));
    return NextResponse.json({ error: 'Failed to retrieve system health' }, { status: 500 });
  }
}

