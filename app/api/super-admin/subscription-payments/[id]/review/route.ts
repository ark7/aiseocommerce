import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { isControlPlaneEnabled, requireSuperAdminOwner } from '@/lib/superAdminAuth';
import {
  calculatePlanPricing,
  computeRenewalExtension,
} from '@/lib/licenseBilling';
import { logger } from '@/lib/logger';

interface Context {
  params: { id: string };
}

const ReviewPaymentSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT']),
  rejectionReason: z.string().max(1000).optional().nullable(),
  overrideBillingMonths: z.coerce.number().int().min(1).max(24).optional(),
});

export async function POST(request: Request, { params }: Context) {
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
    const parsed = ReviewPaymentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Aksi review tidak valid' },
        { status: 400 }
      );
    }

    const payment = await prisma.subscriptionPayment.findUnique({
      where: { id: params.id },
      include: { store: true, licenseOrder: true },
    });

    if (!payment) {
      return NextResponse.json({ error: 'Data pembayaran tidak ditemukan' }, { status: 404 });
    }

    if (payment.status === 'APPROVED') {
      return NextResponse.json(
        { error: 'Bukti pembayaran ini sudah pernah disetujui sebelumnya.' },
        { status: 409 }
      );
    }

    const now = new Date();
    const { action, rejectionReason, overrideBillingMonths } = parsed.data;

    if (action === 'REJECT') {
      const reason =
        rejectionReason?.trim() || 'Bukti transfer tidak terbaca atau nominal tidak sesuai.';
      const rejected = await prisma.subscriptionPayment.update({
        where: { id: payment.id },
        data: {
          status: 'REJECTED',
          rejectionReason: reason,
          reviewedBy: owner.email,
          reviewedAt: now,
        },
      });
      return NextResponse.json({ success: true, payment: rejected });
    }

    const result = await prisma.$transaction(async (tx) => {
      let periodStartAt: Date | null = payment.periodStartAt;
      let periodEndAt: Date | null = payment.periodEndAt;
      let updatedStore: any = null;
      let updatedOrder: any = null;

      if (payment.paymentType === 'INITIAL_ORDER' && payment.licenseOrderId) {
        const order = await tx.licenseOrder.findUnique({
          where: { id: payment.licenseOrderId },
        });
        if (
          order &&
          ['NEW', 'WAITING_PAYMENT', 'PAYMENT_SUBMITTED'].includes(order.status)
        ) {
          updatedOrder = await tx.licenseOrder.update({
            where: { id: order.id },
            data: { status: 'PAID_READY_SETUP' },
          });
        }
      }

      if (payment.paymentType === 'MONTHLY_RENEWAL' && payment.storeId) {
        const store = await tx.store.findUnique({ where: { id: payment.storeId } });
        if (store) {
          const months = overrideBillingMonths || payment.billingMonths || 1;
          const extension = computeRenewalExtension(
            store.subscriptionExpiresAt,
            months,
            now
          );
          periodStartAt = extension.periodStartAt;
          periodEndAt = extension.periodEndAt;

          const canReactivate = store.licenseStatus !== 'OVERDUE';
          updatedStore = await tx.store.update({
            where: { id: store.id },
            data: {
              subscriptionExpiresAt: extension.periodEndAt,
              ...(canReactivate
                ? {
                    serviceStatus: 'ACTIVE',
                    suspendedAt: null,
                    suspendedReason: null,
                  }
                : {}),
            },
          });
        }
      }

      if (payment.paymentType === 'LICENSE_REDEMPTION' && payment.storeId) {
        const store = await tx.store.findUnique({ where: { id: payment.storeId } });
        if (store) {
          const downgradedMonthly = calculatePlanPricing(
            'OWNED',
            store.infraTier
          ).monthlyFeeAmount;

          updatedStore = await tx.store.update({
            where: { id: store.id },
            data: {
              licenseStatus: 'OWNED',
              licenseRedeemedAt: now,
              monthlyFeeAmount: downgradedMonthly,
              serviceStatus: 'ACTIVE',
              suspendedAt: null,
              suspendedReason: null,
            },
          });
        }
      }

      const approvedPayment = await tx.subscriptionPayment.update({
        where: { id: payment.id },
        data: {
          status: 'APPROVED',
          rejectionReason: null,
          reviewedBy: owner.email,
          reviewedAt: now,
          periodStartAt,
          periodEndAt,
        },
      });

      return { approvedPayment, updatedStore, updatedOrder };
    });

    if (payment.storeId && typeof (prisma as any).auditLog?.create === 'function') {
      await prisma.auditLog
        .create({
          data: {
            storeId: payment.storeId,
            action: 'SUPER_ADMIN_APPROVE_SUBSCRIPTION_PAYMENT',
            entityType: 'SUBSCRIPTION_PAYMENT',
            entityId: payment.id,
            newValue: JSON.stringify({
              approvedBy: owner.email,
              paymentType: payment.paymentType,
              amount: payment.amount,
              billingMonths: payment.billingMonths,
            }),
          },
        })
        .catch(() => {});
    }

    return NextResponse.json({
      success: true,
      payment: result.approvedPayment,
      store: result.updatedStore,
      order: result.updatedOrder,
    });
  } catch (error) {
    logger.error(
      'Failed to review subscription payment',
      {},
      error instanceof Error ? error : new Error(String(error))
    );
    return NextResponse.json(
      { error: 'Gagal memverifikasi bukti pembayaran' },
      { status: 500 }
    );
  }
}
