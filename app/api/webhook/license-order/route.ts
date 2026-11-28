import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import {
  calculatePlanPricing,
  generateBillingPortalToken,
  generateLicenseOrderCode,
} from '@/lib/licenseBilling';
import { logger } from '@/lib/logger';

const WebhookLicenseOrderSchema = z.object({
  customerName: z.string().min(2, 'Nama lengkap wajib diisi').max(120),
  whatsapp: z.string().min(6, 'Nomor WhatsApp aktif wajib diisi').max(40),
  brandName: z.string().min(2, 'Nama brand/toko wajib diisi').max(120),
  email: z.string().email().optional().or(z.literal('')).nullable(),
  customDomain: z.string().max(150).optional().nullable(),
  businessCategory: z.string().max(100).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  licensePlan: z.enum(['OWNED', 'DEFERRED_6M']).default('OWNED'),
  infraTier: z.enum(['SHARED', 'DEDICATED']).default('SHARED'),
  utmSource: z.string().max(100).optional().nullable(),
  utmMedium: z.string().max(100).optional().nullable(),
  utmCampaign: z.string().max(100).optional().nullable(),
});

export async function POST(request: Request) {
  try {
    const expectedSecret = process.env.LICENSE_WEBHOOK_SECRET;
    const providedSecret = request.headers.get('x-license-webhook-secret') || '';

    if (expectedSecret) {
      if (providedSecret !== expectedSecret) {
        logger.warn('Rejected license-order webhook due to invalid secret');
        return NextResponse.json({ error: 'Unauthorized webhook secret' }, { status: 401 });
      }
    } else if (process.env.NODE_ENV === 'production') {
      logger.error('LICENSE_WEBHOOK_SECRET is missing in production');
      return NextResponse.json({ error: 'Webhook is not configured' }, { status: 503 });
    }

    const body = await request.json();
    const parsed = WebhookLicenseOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: parsed.error.issues[0]?.message || 'Payload pesanan lisensi tidak valid',
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
        source: 'WORDPRESS',
        customerName: d.customerName.trim(),
        whatsapp: d.whatsapp.trim(),
        email: d.email ? d.email.trim().toLowerCase() : null,
        brandName: d.brandName.trim(),
        customDomain: cleanDomain,
        businessCategory: d.businessCategory?.trim() || null,
        notes: d.notes?.trim() || null,
        licensePlan: pricing.licensePlan,
        infraTier: pricing.infraTier,
        licenseFeeAmount: pricing.licenseFeeAmount,
        monthlyFeeAmount: pricing.monthlyFeeAmount,
        initialPaymentAmount: pricing.initialPaymentAmount,
        status: 'NEW',
        portalToken: generateBillingPortalToken(),
        utmSource: d.utmSource?.trim() || null,
        utmMedium: d.utmMedium?.trim() || null,
        utmCampaign: d.utmCampaign?.trim() || null,
      },
    });

    const requestOrigin = (() => {
      const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
      const proto = request.headers.get('x-forwarded-proto') || 'https';
      return host ? `${proto}://${host}` : process.env.NEXT_PUBLIC_APP_URL || 'https://demo.larisdari.web.id';
    })();

    return NextResponse.json(
      {
        success: true,
        orderId: order.id,
        orderCode: order.orderCode,
        portalToken: order.portalToken,
        billingUrl: `${requestOrigin}/billing/${order.portalToken}`,
        initialPaymentAmount: order.initialPaymentAmount,
        monthlyFeeAmount: order.monthlyFeeAmount,
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error(
      'Failed to process license-order webhook',
      {},
      error instanceof Error ? error : new Error(String(error))
    );
    return NextResponse.json({ error: 'Gagal menyimpan pesanan lisensi' }, { status: 500 });
  }
}
