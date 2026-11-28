import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { isControlPlaneEnabled, requireSuperAdminOwner } from '@/lib/superAdminAuth';
import {
  calculatePlanPricing,
  generateBillingPortalToken,
  generateLicenseOrderCode,
} from '@/lib/licenseBilling';
import { logger } from '@/lib/logger';

const CreateManualOrderSchema = z.object({
  customerName: z.string().min(2).max(120),
  whatsapp: z.string().min(6).max(40),
  brandName: z.string().min(2).max(120),
  email: z.string().email().optional().or(z.literal('')).nullable(),
  customDomain: z.string().max(150).optional().nullable(),
  businessCategory: z.string().max(100).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  adminNotes: z.string().max(2000).optional().nullable(),
  licensePlan: z.enum(['OWNED', 'DEFERRED_6M']).default('OWNED'),
  infraTier: z.enum(['SHARED', 'DEDICATED']).default('SHARED'),
  status: z
    .enum([
      'NEW',
      'WAITING_PAYMENT',
      'PAYMENT_SUBMITTED',
      'PAID_READY_SETUP',
      'IN_SETUP',
      'LIVE',
      'CANCELLED',
    ])
    .optional(),
});

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
    const planFilter = url.searchParams.get('licensePlan')?.trim() || '';
    const search = url.searchParams.get('search')?.trim() || '';

    const where: any = {};
    if (statusFilter && statusFilter !== 'ALL') {
      where.status = statusFilter;
    }
    if (planFilter && planFilter !== 'ALL') {
      where.licensePlan = planFilter;
    }
    if (search) {
      where.OR = [
        { orderCode: { contains: search, mode: 'insensitive' } },
        { customerName: { contains: search, mode: 'insensitive' } },
        { brandName: { contains: search, mode: 'insensitive' } },
        { customDomain: { contains: search, mode: 'insensitive' } },
        { whatsapp: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [orders, allCounts] = await Promise.all([
      prisma.licenseOrder.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          store: {
            select: {
              id: true,
              name: true,
              domain: true,
              serviceStatus: true,
              licenseStatus: true,
              infraTier: true,
              subscriptionExpiresAt: true,
              licenseRedemptionDeadlineAt: true,
            },
          },
          payments: {
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: {
              id: true,
              paymentType: true,
              amount: true,
              status: true,
              createdAt: true,
            },
          },
        },
      }),
      prisma.licenseOrder.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
    ]);

    const countsMap = Object.fromEntries(
      allCounts.map((c) => [c.status, c._count._all])
    );

    return NextResponse.json({
      success: true,
      orders,
      summary: {
        total: Object.values(countsMap).reduce((sum, n) => sum + Number(n), 0),
        newCount: (countsMap['NEW'] || 0) + (countsMap['WAITING_PAYMENT'] || 0),
        paymentSubmittedCount: countsMap['PAYMENT_SUBMITTED'] || 0,
        setupQueueCount: (countsMap['PAID_READY_SETUP'] || 0) + (countsMap['IN_SETUP'] || 0),
        liveCount: countsMap['LIVE'] || 0,
      },
    });
  } catch (error) {
    logger.error(
      'Failed to fetch license orders',
      {},
      error instanceof Error ? error : new Error(String(error))
    );
    return NextResponse.json({ error: 'Gagal memuat daftar pesanan lisensi' }, { status: 500 });
  }
}

export async function POST(request: Request) {
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
    const body = await request.json();
    const parsed = CreateManualOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: parsed.error.issues[0]?.message || 'Data pesanan manual tidak valid',
          issues: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const d = parsed.data;
    const pricing = calculatePlanPricing(d.licensePlan, d.infraTier);
    const cleanDomain = (d.customDomain || '')
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/\/.*$/, '');

    const order = await prisma.licenseOrder.create({
      data: {
        orderCode: generateLicenseOrderCode(),
        source: 'MANUAL_ADMIN',
        customerName: d.customerName.trim(),
        whatsapp: d.whatsapp.trim(),
        email: d.email ? d.email.trim().toLowerCase() : null,
        brandName: d.brandName.trim(),
        customDomain: cleanDomain,
        businessCategory: d.businessCategory?.trim() || null,
        notes: d.notes?.trim() || null,
        adminNotes: d.adminNotes?.trim() || null,
        licensePlan: pricing.licensePlan,
        infraTier: pricing.infraTier,
        licenseFeeAmount: pricing.licenseFeeAmount,
        monthlyFeeAmount: pricing.monthlyFeeAmount,
        initialPaymentAmount: pricing.initialPaymentAmount,
        status: d.status || 'NEW',
        portalToken: generateBillingPortalToken(),
      },
    });

    return NextResponse.json({ success: true, order }, { status: 201 });
  } catch (error) {
    logger.error(
      'Failed to create manual license order',
      {},
      error instanceof Error ? error : new Error(String(error))
    );
    return NextResponse.json({ error: 'Gagal membuat pesanan lisensi manual' }, { status: 500 });
  }
}
