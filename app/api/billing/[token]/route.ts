import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { savePaymentProofFile } from '@/lib/paymentStorage';
import {
  evaluateStoreSuspensionState,
  getPlatformBankInfo,
  LICENSE_PRICE_IDR,
} from '@/lib/licenseBilling';
import { logger } from '@/lib/logger';

interface Context {
  params: { token: string };
}

const ALLOWED_PROOF_MIMES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'application/pdf',
]);
const MAX_PROOF_BYTES = 5 * 1024 * 1024;

async function resolveBillingContext(token: string) {
  const cleanToken = String(token || '').trim();
  if (!cleanToken || cleanToken.length < 8) {
    return null;
  }

  const [store, order] = await Promise.all([
    prisma.store.findFirst({
      where: { billingPortalToken: cleanToken },
      include: {
        licenseOrders: { orderBy: { createdAt: 'desc' }, take: 1 },
        subscriptionPayments: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    }),
    prisma.licenseOrder.findUnique({
      where: { portalToken: cleanToken },
      include: {
        store: true,
        payments: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    }),
  ]);

  if (!store && !order) {
    return null;
  }

  const resolvedStore = store || order?.store || null;
  const resolvedOrder = order || store?.licenseOrders?.[0] || null;
  const payments = store?.subscriptionPayments || order?.payments || [];

  return { store: resolvedStore, order: resolvedOrder, payments };
}

export async function GET(_request: Request, { params }: Context) {
  try {
    const ctx = await resolveBillingContext(params.token);
    if (!ctx) {
      return NextResponse.json(
        { error: 'Portal billing tidak ditemukan atau token tidak valid.' },
        { status: 404 }
      );
    }

    const { store, order, payments } = ctx;
    const evaluation = store ? evaluateStoreSuspensionState(store) : null;

    return NextResponse.json({
      success: true,
      entityType: store ? 'STORE' : 'ORDER',
      brandName: store?.name || order?.brandName || '',
      customerName: order?.customerName || '',
      domain: store?.domain || order?.customDomain || '',
      orderCode: order?.orderCode || null,
      orderStatus: order?.status || null,
      licensePlan: store?.licenseStatus || order?.licensePlan || 'OWNED',
      infraTier: store?.infraTier || order?.infraTier || 'SHARED',
      licensePriceAmount: store?.licensePriceAmount ?? order?.licenseFeeAmount ?? LICENSE_PRICE_IDR,
      monthlyFeeAmount: store?.monthlyFeeAmount ?? order?.monthlyFeeAmount ?? 150_000,
      initialPaymentAmount: order?.initialPaymentAmount ?? 3_150_000,
      serviceStatus: evaluation?.effectiveStatus || 'ACTIVE',
      isSuspended: evaluation?.isSuspended || false,
      suspensionReason: evaluation?.reason || store?.suspendedReason || null,
      subscriptionExpiresAt: store?.subscriptionExpiresAt || null,
      licenseRedeemedAt: store?.licenseRedeemedAt || null,
      licenseRedemptionDeadlineAt: store?.licenseRedemptionDeadlineAt || null,
      daysUntilLicenseDeadline: evaluation?.daysUntilLicenseDeadline ?? null,
      daysUntilSubscriptionExpiry: evaluation?.daysUntilSubscriptionExpiry ?? null,
      platformBank: getPlatformBankInfo(),
      payments: payments.map((p) => ({
        id: p.id,
        paymentType: p.paymentType,
        billingMonths: p.billingMonths,
        amount: p.amount,
        status: p.status,
        transferSenderName: p.transferSenderName,
        transferBank: p.transferBank,
        periodStartAt: p.periodStartAt,
        periodEndAt: p.periodEndAt,
        rejectionReason: p.rejectionReason,
        createdAt: p.createdAt,
        reviewedAt: p.reviewedAt,
        hasProof: Boolean(p.proofRelativePath),
      })),
    });
  } catch (error) {
    logger.error(
      'Failed to load client billing portal',
      {},
      error instanceof Error ? error : new Error(String(error))
    );
    return NextResponse.json({ error: 'Gagal memuat data portal billing' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: Context) {
  try {
    const ctx = await resolveBillingContext(params.token);
    if (!ctx) {
      return NextResponse.json(
        { error: 'Portal billing tidak ditemukan atau token tidak valid.' },
        { status: 404 }
      );
    }

    const formData = await request.formData();
    const paymentTypeRaw = String(formData.get('paymentType') || 'MONTHLY_RENEWAL').toUpperCase();
    const paymentType = ['INITIAL_ORDER', 'MONTHLY_RENEWAL', 'LICENSE_REDEMPTION'].includes(
      paymentTypeRaw
    )
      ? paymentTypeRaw
      : 'MONTHLY_RENEWAL';

    const billingMonths = Math.max(
      1,
      Math.min(24, Number.parseInt(String(formData.get('billingMonths') || '1'), 10) || 1)
    );
    const amountRaw = Number(formData.get('amount') || 0);
    const transferSenderName = String(formData.get('transferSenderName') || '').trim();
    const transferBank = String(formData.get('transferBank') || '').trim();
    const clientNotes = String(formData.get('clientNotes') || '').trim();
    const proofFile = formData.get('proof');

    if (!transferSenderName) {
      return NextResponse.json(
        { error: 'Nama pemilik rekening pengirim wajib diisi.' },
        { status: 400 }
      );
    }

    if (!(proofFile instanceof File) || proofFile.size === 0) {
      return NextResponse.json(
        { error: 'File bukti transfer wajib diunggah (JPG/PNG/WebP/PDF).' },
        { status: 400 }
      );
    }

    if (proofFile.size > MAX_PROOF_BYTES) {
      return NextResponse.json(
        { error: 'Ukuran file bukti transfer maksimal 5 MB.' },
        { status: 400 }
      );
    }

    const mimeType = (proofFile.type || 'image/jpeg').toLowerCase();
    if (!ALLOWED_PROOF_MIMES.has(mimeType)) {
      return NextResponse.json(
        { error: 'Format file harus JPG, PNG, WebP, atau PDF.' },
        { status: 400 }
      );
    }

    const { store, order } = ctx;
    const expectedMonthly = store?.monthlyFeeAmount ?? order?.monthlyFeeAmount ?? 150_000;
    const expectedLicense = store?.licensePriceAmount ?? order?.licenseFeeAmount ?? LICENSE_PRICE_IDR;

    let finalAmount = amountRaw;
    if (!finalAmount || finalAmount <= 0) {
      if (paymentType === 'LICENSE_REDEMPTION') {
        finalAmount = expectedLicense;
      } else if (paymentType === 'INITIAL_ORDER' && order) {
        finalAmount = order.initialPaymentAmount;
      } else {
        finalAmount = expectedMonthly * billingMonths;
      }
    }

    const buffer = Buffer.from(await proofFile.arrayBuffer());
    const storageBucket = store?.id || 'license-orders';
    const tempRefId = `sub-${Date.now()}`;
    const savedFile = await savePaymentProofFile({
      storeId: storageBucket,
      paymentId: tempRefId,
      buffer,
      originalFilename: proofFile.name || 'bukti-transfer.jpg',
      mimeType,
    });

    const created = await prisma.$transaction(async (tx) => {
      const payment = await tx.subscriptionPayment.create({
        data: {
          storeId: store?.id || null,
          licenseOrderId: order?.id || null,
          paymentType,
          billingMonths: paymentType === 'MONTHLY_RENEWAL' ? billingMonths : 1,
          amount: finalAmount,
          status: 'PENDING_REVIEW',
          proofRelativePath: savedFile.relativePath,
          proofMimeType: savedFile.mimeType,
          transferSenderName,
          transferBank: transferBank || null,
          clientNotes: clientNotes || null,
        },
      });

      if (
        paymentType === 'INITIAL_ORDER' &&
        order &&
        ['NEW', 'WAITING_PAYMENT'].includes(order.status)
      ) {
        await tx.licenseOrder.update({
          where: { id: order.id },
          data: { status: 'PAYMENT_SUBMITTED' },
        });
      }

      return payment;
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Bukti pembayaran berhasil dikirim dan menunggu persetujuan admin.',
        paymentId: created.id,
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error(
      'Failed to upload client billing proof',
      {},
      error instanceof Error ? error : new Error(String(error))
    );
    return NextResponse.json(
      { error: 'Gagal mengunggah bukti pembayaran' },
      { status: 500 }
    );
  }
}
