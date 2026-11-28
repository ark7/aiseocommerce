import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { isControlPlaneEnabled, requireSuperAdminOwner } from '@/lib/superAdminAuth';
import { calculatePlanPricing } from '@/lib/licenseBilling';
import { sendEmail } from '@/lib/emailService';
import { logger } from '@/lib/logger';

interface Context {
  params: { id: string };
}

const UpdateOrderSchema = z.object({
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
  customDomain: z.string().max(150).optional(),
  licensePlan: z.enum(['OWNED', 'DEFERRED_6M']).optional(),
  infraTier: z.enum(['SHARED', 'DEDICATED']).optional(),
  adminNotes: z.string().max(2000).optional().nullable(),
  markLiveNotified: z.boolean().optional(),
  sendLiveEmail: z.boolean().optional(),
});

export async function GET(request: Request, { params }: Context) {
  if (!isControlPlaneEnabled(request)) {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }

  const owner = requireSuperAdminOwner(request);
  if (!owner) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const order = await prisma.licenseOrder.findUnique({
    where: { id: params.id },
    include: {
      store: true,
      payments: { orderBy: { createdAt: 'desc' } },
    },
  });

  if (!order) {
    return NextResponse.json({ error: 'Pesanan lisensi tidak ditemukan' }, { status: 404 });
  }

  return NextResponse.json({ success: true, order });
}

export async function PATCH(request: Request, { params }: Context) {
  if (!isControlPlaneEnabled(request)) {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }

  const owner = requireSuperAdminOwner(request);
  if (!owner) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const existing = await prisma.licenseOrder.findUnique({
      where: { id: params.id },
      include: { store: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Pesanan lisensi tidak ditemukan' }, { status: 404 });
    }

    const body = await request.json();
    const parsed = UpdateOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Input pembaruan tidak valid' },
        { status: 400 }
      );
    }

    const d = parsed.data;
    const nextPlan = d.licensePlan ?? existing.licensePlan;
    const nextTier = d.infraTier ?? existing.infraTier;
    const pricing = calculatePlanPricing(nextPlan, nextTier);

    const updateData: any = {};
    if (d.status !== undefined) updateData.status = d.status;
    if (d.customDomain !== undefined) {
      updateData.customDomain = d.customDomain
        .trim()
        .toLowerCase()
        .replace(/^https?:\/\//, '')
        .replace(/\/.*$/, '');
    }
    if (d.licensePlan !== undefined || d.infraTier !== undefined) {
      updateData.licensePlan = pricing.licensePlan;
      updateData.infraTier = pricing.infraTier;
      updateData.licenseFeeAmount = pricing.licenseFeeAmount;
      updateData.monthlyFeeAmount = pricing.monthlyFeeAmount;
      updateData.initialPaymentAmount = pricing.initialPaymentAmount;
    }
    if (d.adminNotes !== undefined) updateData.adminNotes = d.adminNotes;
    if (d.markLiveNotified) updateData.liveNotifiedAt = new Date();

    const updated = await prisma.licenseOrder.update({
      where: { id: params.id },
      data: updateData,
      include: {
        store: {
          select: { id: true, name: true, domain: true, serviceStatus: true, licenseStatus: true },
        },
      },
    });

    let emailResult: { sent: boolean; message?: string } | null = null;
    if (d.sendLiveEmail && updated.email && updated.store?.domain) {
      const portalBase =
        process.env.NEXT_PUBLIC_APP_URL ||
        (request.headers.get('host') ? `https://${request.headers.get('host')}` : 'https://demo.larisdari.web.id');
      const mail = await sendEmail({
        storeId: updated.store.id,
        to: updated.email,
        subject: `Website ${updated.brandName} Resmi Live!`,
        html: `
          <h2>Selamat Kak ${updated.customerName}! 🎉</h2>
          <p>Website komersial <strong>${updated.brandName}</strong> kini resmi aktif di:</p>
          <ul>
            <li>Etalase Toko: <a href="https://${updated.store.domain}">https://${updated.store.domain}</a></li>
            <li>Panel Admin: <a href="https://${updated.store.domain}/login">https://${updated.store.domain}/login</a></li>
            <li>Portal Billing: <a href="${portalBase}/billing/${updated.portalToken}">${portalBase}/billing/${updated.portalToken}</a></li>
          </ul>
          <p>Terima kasih telah mempercayakan infrastruktur toko online Anda bersama LarisDari.web.id.</p>
        `,
      });
      emailResult = { sent: mail.success, message: mail.error || 'Email terkirim' };
      if (mail.success && !updated.liveNotifiedAt) {
        await prisma.licenseOrder.update({
          where: { id: updated.id },
          data: { liveNotifiedAt: new Date() },
        });
      }
    }

    if (updated.storeId && typeof (prisma as any).auditLog?.create === 'function') {
      await prisma.auditLog
        .create({
          data: {
            storeId: updated.storeId,
            action: 'SUPER_ADMIN_UPDATE_LICENSE_ORDER',
            entityType: 'LICENSE_ORDER',
            entityId: updated.id,
            newValue: JSON.stringify({
              updatedBy: owner.email,
              status: updated.status,
              liveNotifiedAt: updated.liveNotifiedAt,
            }),
          },
        })
        .catch(() => {});
    }

    return NextResponse.json({ success: true, order: updated, emailResult });
  } catch (error) {
    logger.error(
      'Failed to update license order',
      {},
      error instanceof Error ? error : new Error(String(error))
    );
    return NextResponse.json({ error: 'Gagal memperbarui pesanan lisensi' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: Context) {
  if (!isControlPlaneEnabled(request)) {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }

  const owner = requireSuperAdminOwner(request);
  if (!owner) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await prisma.licenseOrder.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
