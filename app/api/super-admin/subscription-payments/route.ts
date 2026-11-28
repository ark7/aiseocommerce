import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isControlPlaneEnabled, requireSuperAdminOwner } from '@/lib/superAdminAuth';
import { logger } from '@/lib/logger';

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
      { error: 'Akses Ditolak (403): Hanya Super-Admin yang diizinkan.' },
      { status: 403 }
    );
  }

  try {
    const url = new URL(request.url);
    const statusFilter = url.searchParams.get('status')?.trim() || '';

    const where: any = {};
    if (statusFilter && statusFilter !== 'ALL') {
      where.status = statusFilter;
    }

    const [payments, pendingCount] = await Promise.all([
      prisma.subscriptionPayment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          store: {
            select: {
              id: true,
              name: true,
              domain: true,
              infraTier: true,
              licenseStatus: true,
              monthlyFeeAmount: true,
              serviceStatus: true,
              subscriptionExpiresAt: true,
            },
          },
          licenseOrder: {
            select: {
              id: true,
              orderCode: true,
              customerName: true,
              brandName: true,
              customDomain: true,
              licensePlan: true,
              infraTier: true,
              status: true,
            },
          },
        },
      }),
      prisma.subscriptionPayment.count({
        where: { status: 'PENDING_REVIEW' },
      }),
    ]);

    return NextResponse.json({
      success: true,
      pendingCount,
      payments,
    });
  } catch (error) {
    logger.error(
      'Failed to list subscription payments',
      {},
      error instanceof Error ? error : new Error(String(error))
    );
    return NextResponse.json({ error: 'Gagal memuat antrean bukti pembayaran' }, { status: 500 });
  }
}
