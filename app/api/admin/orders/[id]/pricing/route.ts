import { NextResponse } from 'next/server';
import { Prisma, LedgerType, type OrderStatus } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/rbacServer';
import { getIPAddress } from '@/lib/ip';
import { logger } from '@/lib/logger';
import { canTransition, REVENUE_STATUSES } from '@/lib/orderStatus';
import { calculateOrderPricing, sendOrderInvoiceEmail } from '@/lib/invoiceService';
import { recordOrderIncome } from '@/services/transactionService';
import { auditOrderUpdated } from '@/services/auditService';

const CustomFeeLineSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Nama biaya wajib diisi').max(100),
  type: z.enum(['FIXED', 'PERCENT']),
  amount: z.coerce.number().min(0, 'Nominal biaya tidak boleh negatif'),
  enabled: z.boolean().default(true),
  showOnInvoice: z.boolean().default(true),
});

const PricingRevisionSchema = z.object({
  shippingCost: z.coerce.number().min(0, 'Ongkos kirim tidak boleh negatif'),
  shippingZone: z.enum(['MANUAL', 'INNER', 'OUTER', 'FREE', 'DIGITAL', 'BITESHIP']).optional(),
  courierServiceName: z.string().max(120).optional().nullable(),
  taxEnabled: z.boolean().optional(),
  taxLabel: z.string().max(60).optional().nullable(),
  taxRate: z.coerce.number().min(0).max(100).optional(),
  invoiceShowTax: z.boolean().optional(),
  invoiceShowCustomFees: z.boolean().optional(),
  customFees: z.array(CustomFeeLineSchema).max(20).optional(),
  newStatus: z
    .enum(['PENDING', 'MANUAL_VERIFICATION', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'])
    .optional(),
  adjustmentNote: z.string().max(500).optional().nullable(),
  resendInvoiceEmail: z.boolean().optional(),
});

const TERMINAL_ORDER_STATUSES: OrderStatus[] = ['CANCELLED', 'REFUNDED', 'COMPLETED'];

interface RouteContext {
  params: { id: string };
}

/**
 * Allows Admin / Staff to manually adjust shipping cost, PPN, custom fees,
 * invoice display toggles, and optionally update order status & resend invoice email.
 */
export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        storeId: true,
        orderNumber: true,
        status: true,
        subtotal: true,
        discount: true,
        shippingCost: true,
        shippingZone: true,
        courierServiceName: true,
        taxAmount: true,
        taxLabel: true,
        taxRate: true,
        customFeesAmount: true,
        customFeesSnapshot: true,
        invoiceShowTax: true,
        invoiceShowCustomFees: true,
        totalAmount: true,
        invoiceRevision: true,
        notes: true,
        isSandbox: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Pesanan tidak ditemukan' }, { status: 404 });
    }

    const auth = await requirePermission(request, 'orders', {
      unauthenticatedStatus: 403,
      storeId: order.storeId,
    });
    if (!auth.authorized) return auth.response;
    const { user } = auth;
    if (user.storeId !== order.storeId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (TERMINAL_ORDER_STATUSES.includes(order.status)) {
      return NextResponse.json(
        { error: `Pesanan berstatus ${order.status} tidak dapat direvisi harganya.` },
        { status: 400 }
      );
    }

    const body = await request.json();
    const parsed = PricingRevisionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Input revisi harga tidak valid', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const targetStatus: OrderStatus = (data.newStatus as OrderStatus | undefined) || order.status;

    if (targetStatus !== order.status) {
      const canReopenForPayment =
        targetStatus === 'PENDING' &&
        ['MANUAL_VERIFICATION', 'PAID', 'PROCESSING'].includes(order.status);

      if (!canReopenForPayment && !canTransition(order.status as any, targetStatus as any)) {
        return NextResponse.json(
          { error: `Transisi status dari ${order.status} ke ${targetStatus} tidak diizinkan.` },
          { status: 400 }
        );
      }
    }

    const effectiveTaxEnabled =
      data.taxEnabled !== undefined
        ? data.taxEnabled
        : Number(order.taxRate || 0) > 0 || Number(order.taxAmount || 0) > 0;

    const effectiveTaxRate =
      data.taxRate !== undefined ? data.taxRate : Number(order.taxRate || 0);

    const effectiveTaxLabel =
      data.taxLabel !== undefined ? data.taxLabel : order.taxLabel || 'PPN';

    const pricing = calculateOrderPricing({
      subtotal: order.subtotal,
      discount: order.discount || 0,
      shippingCost: data.shippingCost,
      taxEnabled: effectiveTaxEnabled,
      taxLabel: effectiveTaxLabel,
      taxRate: effectiveTaxRate,
      customFees: data.customFees ?? [],
    });

    const nextRevision = (order.invoiceRevision || 1) + 1;
    const trimmedNote = data.adjustmentNote?.trim() || '';
    const updatedNotes = trimmedNote
      ? [order.notes?.trim(), `[Revisi #${nextRevision}] ${trimmedNote}`]
          .filter(Boolean)
          .join('\n')
      : order.notes;

    const updatedOrder = await prisma.$transaction(async (tx) => {
      const saved = await tx.order.update({
        where: { id: order.id },
        data: {
          shippingCost: pricing.shippingCost,
          shippingZone: data.shippingZone || order.shippingZone || 'MANUAL',
          courierServiceName:
            data.courierServiceName !== undefined
              ? data.courierServiceName?.trim() || null
              : order.courierServiceName,
          taxAmount: pricing.taxAmount,
          taxLabel: pricing.taxLabel,
          taxRate: pricing.taxRate,
          customFeesAmount: pricing.customFeesAmount,
          customFeesSnapshot: pricing.customFees as unknown as Prisma.InputJsonValue,
          invoiceShowTax:
            data.invoiceShowTax !== undefined ? data.invoiceShowTax : order.invoiceShowTax,
          invoiceShowCustomFees:
            data.invoiceShowCustomFees !== undefined
              ? data.invoiceShowCustomFees
              : order.invoiceShowCustomFees,
          totalAmount: pricing.totalAmount,
          invoiceRevision: nextRevision,
          status: targetStatus,
          notes: updatedNotes,
        },
        include: {
          orderItems: {
            include: {
              product: {
                select: { id: true, name: true, slug: true, productType: true },
              },
            },
          },
          payments: {
            select: {
              id: true,
              method: true,
              status: true,
              amount: true,
              proofFile: true,
              proofUrl: true,
              verifiedAt: true,
            },
          },
        },
      });

      // Keep pending payments synchronized with the revised invoice total
      await tx.payment.updateMany({
        where: { orderId: order.id, status: 'PENDING' },
        data: { amount: pricing.totalAmount },
      });

      // Keep INCOME ledger accurate with status & revised total
      const isNowRevenue = (REVENUE_STATUSES as string[]).includes(targetStatus);
      const existingIncome = await tx.ledger.findFirst({
        where: { referenceId: order.id, referenceType: 'ORDER', type: LedgerType.INCOME },
        select: { id: true },
      });

      if (isNowRevenue) {
        if (existingIncome) {
          await tx.ledger.update({
            where: { id: existingIncome.id },
            data: { amount: pricing.totalAmount },
          });
        } else if (targetStatus === 'PAID') {
          await recordOrderIncome(tx, {
            id: order.id,
            storeId: order.storeId,
            orderNumber: order.orderNumber,
            totalAmount: pricing.totalAmount,
            isSandbox: order.isSandbox,
          });
        }
      } else if (existingIncome && targetStatus === 'PENDING') {
        await tx.ledger.deleteMany({
          where: { referenceId: order.id, referenceType: 'ORDER', type: LedgerType.INCOME },
        });
      }

      return saved;
    });

    await auditOrderUpdated(
      order.id,
      user.id,
      order.storeId,
      {
        shippingCost: order.shippingCost,
        taxAmount: order.taxAmount,
        customFeesAmount: order.customFeesAmount,
        totalAmount: order.totalAmount,
        status: order.status,
      },
      {
        shippingCost: pricing.shippingCost,
        taxAmount: pricing.taxAmount,
        customFeesAmount: pricing.customFeesAmount,
        totalAmount: pricing.totalAmount,
        status: targetStatus,
        invoiceRevision: nextRevision,
        note: trimmedNote || undefined,
      },
      getIPAddress(request)
    );

    let emailResult: Awaited<ReturnType<typeof sendOrderInvoiceEmail>> | null = null;
    if (data.resendInvoiceEmail) {
      emailResult = await sendOrderInvoiceEmail({
        orderId: order.id,
        adjustmentNote: trimmedNote || null,
      });
    }

    return NextResponse.json({
      success: true,
      order: updatedOrder,
      priceDiff: pricing.totalAmount - order.totalAmount,
      emailResult,
    });
  } catch (error) {
    logger.error(
      'Failed to revise order pricing',
      { orderId: params.id },
      error instanceof Error ? error : String(error)
    );
    return NextResponse.json(
      { error: 'Gagal menyimpan pembaruan ongkir & invoice pesanan' },
      { status: 500 }
    );
  }
}
