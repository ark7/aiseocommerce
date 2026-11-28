import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { isControlPlaneEnabled, requireSuperAdminOwner } from '@/lib/superAdminAuth';
import { provisionTenantStore } from '@/lib/tenantProvisioner';
import {
  addMonthsSafe,
  buildWhatsAppLiveMessage,
  normalizeInfraTier,
  normalizeLicensePlan,
} from '@/lib/licenseBilling';
import { logger } from '@/lib/logger';

interface Context {
  params: { id: string };
}

const ProvisionFromOrderSchema = z.object({
  domain: z.string().max(150).optional(),
  adminEmail: z.string().email().optional(),
  adminPassword: z.string().min(8).max(100).optional(),
  seedPreset: z
    .enum(['CLEAN', 'STARTER_FASHION', 'STARTER_FNB', 'STARTER_ELECTRONICS', 'STARTER_GENERAL'])
    .optional()
    .default('CLEAN'),
  primaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional()
    .default('#4F46E5'),
  customDatabaseUrl: z.string().optional().nullable(),
});

function toSafeSlug(value: string): string {
  const cleaned = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned.length >= 2 ? cleaned.slice(0, 50) : `toko-${Date.now().toString(36)}`;
}

function generateRandomPassword(): string {
  return `Laris#${Math.random().toString(36).slice(2, 8)}9`;
}

export async function POST(request: Request, { params }: Context) {
  if (!isControlPlaneEnabled(request)) {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }

  const owner = requireSuperAdminOwner(request);
  if (!owner) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const order = await prisma.licenseOrder.findUnique({ where: { id: params.id } });
    if (!order) {
      return NextResponse.json({ error: 'Pesanan lisensi tidak ditemukan' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = ProvisionFromOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Input setup toko tidak valid' },
        { status: 400 }
      );
    }

    const d = parsed.data;
    const tenantSlug = toSafeSlug(order.brandName || order.customerName);
    const resolvedDomain = (
      d.domain ||
      order.customDomain ||
      `${tenantSlug}.larisdari.web.id`
    )
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/\/.*$/, '');

    const adminEmail = (d.adminEmail || order.email || `admin@${resolvedDomain}`)
      .trim()
      .toLowerCase();
    const adminPassword = d.adminPassword || generateRandomPassword();
    const licensePlan = normalizeLicensePlan(order.licensePlan);
    const infraTier = normalizeInfraTier(order.infraTier);

    const dbMode = d.customDatabaseUrl?.trim() ? 'CUSTOM_DB_URL' : 'CURRENT_DB';

    const provisionResult = await provisionTenantStore({
      storeName: order.brandName,
      tenantSlug,
      domain: resolvedDomain,
      tagline: `Toko Resmi ${order.brandName}`,
      storeEmail: order.email || adminEmail,
      storePhone: order.whatsapp,
      adminName: order.customerName,
      adminEmail,
      adminPassword,
      primaryColor: d.primaryColor,
      seedPreset: d.seedPreset,
      dbMode,
      customDatabaseUrl: d.customDatabaseUrl || null,
      subscriptionPlan: infraTier === 'DEDICATED' ? 'ENTERPRISE' : 'BUSINESS',
    });

    const now = new Date();
    const expiresAt = addMonthsSafe(now, 1);
    const deadlineAt = licensePlan === 'DEFERRED_6M' ? addMonthsSafe(now, 6) : null;

    const updatedStore = await prisma.store.update({
      where: { id: provisionResult.store.id },
      data: {
        infraTier,
        licenseStatus: licensePlan,
        licensePriceAmount: order.licenseFeeAmount,
        licenseRedeemedAt: licensePlan === 'OWNED' ? now : null,
        licenseRedemptionDeadlineAt: deadlineAt,
        monthlyFeeAmount: order.monthlyFeeAmount,
        serviceStatus: 'ACTIVE',
        subscriptionExpiresAt: expiresAt,
        billingPortalToken: order.portalToken,
      },
    });

    const [updatedOrder] = await Promise.all([
      prisma.licenseOrder.update({
        where: { id: order.id },
        data: {
          customDomain: resolvedDomain,
          storeId: updatedStore.id,
          status: 'LIVE',
        },
        include: { store: true },
      }),
      prisma.subscriptionPayment.updateMany({
        where: { licenseOrderId: order.id, storeId: null },
        data: { storeId: updatedStore.id },
      }),
    ]);

    if (typeof (prisma as any).auditLog?.create === 'function') {
      await prisma.auditLog
        .create({
          data: {
            storeId: updatedStore.id,
            action: 'SUPER_ADMIN_PROVISION_FROM_ORDER',
            entityType: 'LICENSE_ORDER',
            entityId: order.id,
            newValue: JSON.stringify({
              provisionedBy: owner.email,
              domain: resolvedDomain,
              licensePlan,
              infraTier,
              monthlyFeeAmount: order.monthlyFeeAmount,
              subscriptionExpiresAt: expiresAt.toISOString(),
              licenseRedemptionDeadlineAt: deadlineAt?.toISOString() || null,
            }),
          },
        })
        .catch(() => {});
    }

    const requestOrigin = (() => {
      const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
      const proto = request.headers.get('x-forwarded-proto') || 'https';
      return host ? `${proto}://${host}` : process.env.NEXT_PUBLIC_APP_URL || 'https://demo.larisdari.web.id';
    })();
    const billingUrl = `${requestOrigin}/billing/${order.portalToken}`;

    const liveWhatsAppMessage = buildWhatsAppLiveMessage({
      customerName: order.customerName,
      brandName: order.brandName,
      domain: resolvedDomain,
      adminEmail,
      initialPassword: adminPassword,
      licensePlan,
      infraTier,
      monthlyFeeAmount: order.monthlyFeeAmount,
      billingUrl,
      licenseRedemptionDeadlineAt: deadlineAt,
    });

    return NextResponse.json(
      {
        success: true,
        order: updatedOrder,
        store: updatedStore,
        result: provisionResult,
        billingUrl,
        liveWhatsAppMessage,
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error(
      'Failed to provision store from license order',
      {},
      error instanceof Error ? error : new Error(String(error))
    );
    return NextResponse.json(
      { error: 'Gagal menyiapkan website pelanggan dari pesanan ini' },
      { status: 500 }
    );
  }
}
