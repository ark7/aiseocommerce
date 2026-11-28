import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { isControlPlaneEnabled, requireSuperAdminOwner } from '@/lib/superAdminAuth';
import {
  calculatePlanPricing,
  generateBillingPortalToken,
} from '@/lib/licenseBilling';
import { logger } from '@/lib/logger';

interface Context {
  params: { id: string };
}

const UpdateTenantSubscriptionSchema = z.object({
  serviceStatus: z
    .enum(['ACTIVE', 'GRACE_PERIOD', 'SUSPENDED', 'LICENSE_OVERDUE'])
    .optional(),
  suspendedReason: z.string().max(1000).optional().nullable(),
  infraTier: z.enum(['SHARED', 'DEDICATED']).optional(),
  licenseStatus: z.enum(['OWNED', 'DEFERRED_6M', 'OVERDUE']).optional(),
  monthlyFeeAmount: z.coerce.number().min(0).max(50_000_000).optional(),
  subscriptionExpiresAt: z.string().optional().nullable(),
  licenseRedemptionDeadlineAt: z.string().optional().nullable(),
  recalculateRateFromMatrix: z.boolean().optional(),
  regenerateBillingToken: z.boolean().optional(),
  forceDemo: z.boolean().optional(),
});

export async function PATCH(request: Request, { params }: Context) {
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
    const store = await prisma.store.findUnique({ where: { id: params.id } });
    if (!store) {
      return NextResponse.json({ error: 'Toko pelanggan tidak ditemukan' }, { status: 404 });
    }

    const body = await request.json();
    const parsed = UpdateTenantSubscriptionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Input langganan tidak valid' },
        { status: 400 }
      );
    }

    const d = parsed.data;

    if (
      store.isDemo &&
      (d.serviceStatus === 'SUSPENDED' || d.serviceStatus === 'LICENSE_OVERDUE') &&
      !d.forceDemo
    ) {
      return NextResponse.json(
        {
          error:
            'Store demo utama tidak dapat dinonaktifkan secara tidak sengaja.',
        },
        { status: 400 }
      );
    }

    const updateData: any = {};
    const nextTier = d.infraTier ?? store.infraTier;
    const nextLicenseStatus = d.licenseStatus ?? store.licenseStatus;

    if (d.infraTier !== undefined) updateData.infraTier = d.infraTier;
    if (d.licenseStatus !== undefined) {
      updateData.licenseStatus = d.licenseStatus;
      if (d.licenseStatus === 'OWNED' && !store.licenseRedeemedAt) {
        updateData.licenseRedeemedAt = new Date();
      }
    }

    if (d.monthlyFeeAmount !== undefined) {
      updateData.monthlyFeeAmount = d.monthlyFeeAmount;
    } else if (
      d.recalculateRateFromMatrix ||
      d.infraTier !== undefined ||
      d.licenseStatus !== undefined
    ) {
      const effectivePlan = nextLicenseStatus === 'OWNED' ? 'OWNED' : 'DEFERRED_6M';
      updateData.monthlyFeeAmount = calculatePlanPricing(
        effectivePlan,
        nextTier
      ).monthlyFeeAmount;
    }

    if (d.subscriptionExpiresAt !== undefined) {
      updateData.subscriptionExpiresAt = d.subscriptionExpiresAt
        ? new Date(d.subscriptionExpiresAt)
        : null;
    }

    if (d.licenseRedemptionDeadlineAt !== undefined) {
      updateData.licenseRedemptionDeadlineAt = d.licenseRedemptionDeadlineAt
        ? new Date(d.licenseRedemptionDeadlineAt)
        : null;
    }

    if (d.serviceStatus !== undefined) {
      updateData.serviceStatus = d.serviceStatus;
      if (d.serviceStatus === 'SUSPENDED' || d.serviceStatus === 'LICENSE_OVERDUE') {
        updateData.suspendedAt = store.suspendedAt || new Date();
        if (d.suspendedReason !== undefined) {
          updateData.suspendedReason = d.suspendedReason;
        } else if (!store.suspendedReason) {
          updateData.suspendedReason =
            d.serviceStatus === 'LICENSE_OVERDUE'
              ? 'Batas waktu penebusan lisensi 6 bulan terlampaui. Silakan tebus lisensi untuk mengaktifkan layanan kembali.'
              : 'Layanan dinonaktifkan sementara oleh pengelola. Silakan perbarui pembayaran langganan bulanan Anda.';
        }
      } else if (d.serviceStatus === 'ACTIVE') {
        updateData.suspendedAt = null;
        updateData.suspendedReason = d.suspendedReason === undefined ? null : d.suspendedReason;
      }
    } else if (d.suspendedReason !== undefined) {
      updateData.suspendedReason = d.suspendedReason;
    }

    if (d.regenerateBillingToken || !store.billingPortalToken) {
      updateData.billingPortalToken = generateBillingPortalToken();
    }

    const updated = await prisma.store.update({
      where: { id: store.id },
      data: updateData,
    });

    if (typeof (prisma as any).auditLog?.create === 'function') {
      await prisma.auditLog
        .create({
          data: {
            storeId: store.id,
            action: 'SUPER_ADMIN_UPDATE_SUBSCRIPTION',
            entityType: 'STORE',
            entityId: store.id,
            newValue: JSON.stringify({
              updatedBy: owner.email,
              serviceStatus: updated.serviceStatus,
              licenseStatus: updated.licenseStatus,
              infraTier: updated.infraTier,
              monthlyFeeAmount: updated.monthlyFeeAmount,
              subscriptionExpiresAt: updated.subscriptionExpiresAt,
            }),
          },
        })
        .catch(() => {});
    }

    return NextResponse.json({ success: true, store: updated });
  } catch (error) {
    logger.error(
      'Failed to update tenant subscription',
      {},
      error instanceof Error ? error : new Error(String(error))
    );
    return NextResponse.json(
      { error: 'Gagal memperbarui pengaturan langganan toko' },
      { status: 500 }
    );
  }
}
