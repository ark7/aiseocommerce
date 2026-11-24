import { NextResponse } from 'next/server';
import { LedgerType, type OrderStatus } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/rbacServer';
import { REVENUE_STATUSES } from '@/lib/orderStatus';
import { TAX_PAYMENT_CATEGORY } from '@/lib/ledgerCategory';
import { auditLedgerCreated } from '@/services/auditService';
import { getIPAddress } from '@/lib/ip';
import { logger } from '@/lib/logger';

const TaxPaymentSchema = z.object({
  amount: z.coerce.number().positive('Nominal setoran PPN harus lebih dari 0'),
  taxPeriodLabel: z.string().min(1, 'Masa pajak wajib diisi').max(80),
  referenceNumber: z.string().max(100).optional().nullable(),
  notes: z.string().max(300).optional().nullable(),
  paidAt: z.string().optional().nullable(),
});

function resolveTaxPeriodRange(
  period: string,
  startDateParam?: string | null,
  endDateParam?: string | null
): { start: Date; end: Date } {
  const now = new Date();

  if (period === 'custom' && (startDateParam || endDateParam)) {
    const start = startDateParam
      ? new Date(startDateParam)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const end = endDateParam
      ? new Date(endDateParam)
      : new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const safeStart = isNaN(start.getTime())
      ? new Date(now.getFullYear(), now.getMonth(), 1)
      : start;
    const safeEnd = isNaN(end.getTime())
      ? new Date(now.getFullYear(), now.getMonth() + 1, 0)
      : end;

    safeStart.setHours(0, 0, 0, 0);
    safeEnd.setHours(23, 59, 59, 999);
    return { start: safeStart, end: safeEnd };
  }

  switch (period) {
    case 'last_month': {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return { start, end };
    }
    case 'quarter': {
      const qStartMonth = Math.floor(now.getMonth() / 3) * 3;
      const start = new Date(now.getFullYear(), qStartMonth, 1, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), qStartMonth + 3, 0, 23, 59, 59, 999);
      return { start, end };
    }
    case 'year': {
      const start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      return { start, end };
    }
    case 'day': {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      return { start, end };
    }
    case 'week': {
      const diff = now.getDate() - now.getDay();
      const start = new Date(now.getFullYear(), now.getMonth(), diff, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), diff + 6, 23, 59, 59, 999);
      return { start, end };
    }
    case 'month':
    default: {
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      return { start, end };
    }
  }
}

/**
 * Computes periodic PPN Keluaran (VAT output), DPP, already remitted tax,
 * and remaining payable PPN for the requested period.
 */
export async function GET(request: Request) {
  try {
    const auth = await requirePermission(request, 'finance');
    if (!auth.authorized) return auth.response;
    const { user } = auth;

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'month';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const includeSandbox = searchParams.get('includeSandbox') === 'true';

    const { start, end } = resolveTaxPeriodRange(period, startDate, endDate);

    const [orders, taxPayments] = await Promise.all([
      prisma.order.findMany({
        where: {
          storeId: user.storeId,
          status: { in: REVENUE_STATUSES as OrderStatus[] },
          createdAt: { gte: start, lte: end },
          ...(includeSandbox ? {} : { isSandbox: false }),
        },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          orderNumber: true,
          invoiceRevision: true,
          createdAt: true,
          customerName: true,
          status: true,
          subtotal: true,
          discount: true,
          shippingCost: true,
          taxLabel: true,
          taxRate: true,
          taxAmount: true,
          customFeesAmount: true,
          totalAmount: true,
        },
      }),
      prisma.ledger.findMany({
        where: {
          storeId: user.storeId,
          type: LedgerType.EXPENSE,
          category: TAX_PAYMENT_CATEGORY,
          createdAt: { gte: start, lte: end },
          ...(includeSandbox ? {} : { isSandbox: false }),
        },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          amount: true,
          description: true,
          referenceId: true,
          createdAt: true,
        },
      }),
    ]);

    let totalDpp = 0;
    let totalTaxCollected = 0;
    let totalCustomFees = 0;
    let totalShippingCollected = 0;
    const taxOrders: Array<{
      id: string;
      orderNumber: string;
      invoiceRevision: number;
      createdAt: string;
      customerName: string | null;
      status: string;
      dpp: number;
      taxLabel: string;
      taxRate: number;
      taxAmount: number;
      customFeesAmount: number;
      shippingCost: number;
      totalAmount: number;
    }> = [];

    for (const order of orders) {
      const orderTax = Math.round(order.taxAmount || 0);
      const orderFees = Math.round(order.customFeesAmount || 0);
      const orderShipping = Math.round(order.shippingCost || 0);
      const dpp = Math.max(0, Math.round(order.subtotal || 0) - Math.round(order.discount || 0));

      totalCustomFees += orderFees;
      totalShippingCollected += orderShipping;

      if (orderTax > 0) {
        totalDpp += dpp;
        totalTaxCollected += orderTax;
        taxOrders.push({
          id: order.id,
          orderNumber: order.orderNumber,
          invoiceRevision: order.invoiceRevision || 1,
          createdAt: order.createdAt.toISOString(),
          customerName: order.customerName,
          status: order.status,
          dpp,
          taxLabel: order.taxLabel || 'PPN',
          taxRate: order.taxRate || 0,
          taxAmount: orderTax,
          customFeesAmount: orderFees,
          shippingCost: orderShipping,
          totalAmount: Math.round(order.totalAmount || 0),
        });
      }
    }

    const totalTaxPaid = taxPayments.reduce(
      (sum, entry) => sum + Math.round(Math.abs(entry.amount || 0)),
      0
    );
    const taxPayable = Math.max(0, totalTaxCollected - totalTaxPaid);
    const taxOverpaid = Math.max(0, totalTaxPaid - totalTaxCollected);

    return NextResponse.json({
      success: true,
      period: {
        key: period,
        start: start.toISOString(),
        end: end.toISOString(),
      },
      summary: {
        taxableOrderCount: taxOrders.length,
        totalDpp,
        totalTaxCollected,
        totalTaxPaid,
        taxPayable,
        taxOverpaid,
        totalCustomFees,
        totalShippingCollected,
      },
      taxOrders,
      taxPayments: taxPayments.map((p) => ({
        id: p.id,
        amount: Math.round(Math.abs(p.amount || 0)),
        description: p.description || 'Setoran PPN',
        referenceId: p.referenceId,
        createdAt: p.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    logger.error(
      'Failed to compute PPN tax report',
      {},
      error instanceof Error ? error : String(error)
    );
    return NextResponse.json({ error: 'Gagal memuat pembukuan PPN' }, { status: 500 });
  }
}

/**
 * Records a PPN tax remittance (EXPENSE / "Setoran PPN") into the store ledger.
 */
export async function POST(request: Request) {
  try {
    const auth = await requirePermission(request, 'finance');
    if (!auth.authorized) return auth.response;
    const { user } = auth;

    const raw = await request.json();
    const parsed = TaxPaymentSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Input setoran PPN tidak valid', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { amount, taxPeriodLabel, referenceNumber, notes, paidAt } = parsed.data;
    const roundedAmount = Math.round(amount);

    await prisma.ledgerCategory.upsert({
      where: {
        storeId_type_name: {
          storeId: user.storeId,
          type: LedgerType.EXPENSE,
          name: TAX_PAYMENT_CATEGORY,
        },
      },
      update: { isActive: true },
      create: {
        storeId: user.storeId,
        type: LedgerType.EXPENSE,
        name: TAX_PAYMENT_CATEGORY,
        isActive: true,
      },
    });

    const parts = [`Setoran PPN (${taxPeriodLabel.trim()})`];
    if (referenceNumber?.trim()) parts.push(`NTPN/Ref: ${referenceNumber.trim()}`);
    if (notes?.trim()) parts.push(notes.trim());

    const paidDate = paidAt ? new Date(paidAt) : new Date();
    const createdAt = isNaN(paidDate.getTime()) ? new Date() : paidDate;

    const ledger = await prisma.ledger.create({
      data: {
        storeId: user.storeId,
        type: LedgerType.EXPENSE,
        amount: -Math.abs(roundedAmount),
        category: TAX_PAYMENT_CATEGORY,
        referenceType: 'TAX_PAYMENT',
        referenceId: referenceNumber?.trim() || null,
        description: parts.join(' • '),
        createdAt,
      },
    });

    await auditLedgerCreated(
      ledger.id,
      user.id,
      user.storeId,
      ledger.type,
      ledger.amount,
      ledger.description || TAX_PAYMENT_CATEGORY,
      getIPAddress(request)
    );

    return NextResponse.json({ success: true, ledger });
  } catch (error) {
    logger.error(
      'Failed to record PPN remittance',
      {},
      error instanceof Error ? error : String(error)
    );
    return NextResponse.json({ error: 'Gagal mencatat setoran PPN' }, { status: 500 });
  }
}
