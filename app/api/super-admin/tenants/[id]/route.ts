import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { isControlPlaneEnabled, requireSuperAdminOwner } from '@/lib/superAdminAuth';
import {
  TenantUpdateInputSchema,
  splitFullName,
} from '@/lib/tenantProvisioner';
import { hashPassword } from '@/lib/auth';
import { logger } from '@/lib/logger';

interface Context {
  params: { id: string };
}

export async function GET(request: Request, { params }: Context) {
  if (!isControlPlaneEnabled(request)) {
    return NextResponse.json(
      { error: 'Portal Super-Admin Control Plane dinonaktifkan pada instance ini.' },
      { status: 404 }
    );
  }

  const owner = requireSuperAdminOwner(request);
  if (!owner) {
    return NextResponse.json(
      { error: 'Akses Ditolak (403): Hanya akun tunggal pemilik (Super-Admin) yang diizinkan.' },
      { status: 403 }
    );
  }

  try {
    const store = await prisma.store.findUnique({
      where: { id: params.id },
      include: {
        settings: true,
        users: {
          where: { role: 'ADMIN' },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            isActive: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            products: true,
            orders: true,
            users: true,
            categories: true,
            landingPages: true,
          },
        },
      },
    });

    if (!store) {
      return NextResponse.json({ error: 'Toko pelanggan tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      store,
    });
  } catch (error) {
    logger.error('Failed to get tenant detail in Super-Admin', {}, error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json({ error: 'Gagal mengambil data toko pelanggan' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: Context) {
  if (!isControlPlaneEnabled(request)) {
    return NextResponse.json(
      { error: 'Portal Super-Admin Control Plane dinonaktifkan pada instance ini.' },
      { status: 404 }
    );
  }

  const owner = requireSuperAdminOwner(request);
  if (!owner) {
    return NextResponse.json(
      { error: 'Akses Ditolak (403): Hanya akun tunggal pemilik (Super-Admin) yang diizinkan.' },
      { status: 403 }
    );
  }

  try {
    const existingStore = await prisma.store.findUnique({
      where: { id: params.id },
      include: {
        settings: true,
        users: {
          where: { role: 'ADMIN' },
          take: 1,
        },
      },
    });

    if (!existingStore) {
      return NextResponse.json({ error: 'Toko pelanggan tidak ditemukan' }, { status: 404 });
    }

    const body = await request.json();
    const parsed = TenantUpdateInputSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: parsed.error.issues[0]?.message || 'Data form pembaruan tidak valid',
          issues: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Check domain collision if domain is changed
    if (data.domain && data.domain !== existingStore.domain) {
      const collision = await prisma.store.findUnique({
        where: { domain: data.domain },
      });
      if (collision && collision.id !== existingStore.id) {
        return NextResponse.json(
          { error: `Domain "${data.domain}" sudah digunakan oleh toko lain.` },
          { status: 400 }
        );
      }
    }

    // 1. Update Store base information
    const updatedStore = await prisma.store.update({
      where: { id: existingStore.id },
      data: {
        ...(data.storeName ? { name: data.storeName } : {}),
        ...(data.domain ? { domain: data.domain } : {}),
        ...(data.storeEmail ? { email: data.storeEmail } : {}),
        ...(data.storePhone ? { phone: data.storePhone } : {}),
        ...(data.storeAddress !== undefined ? { address: data.storeAddress } : {}),
        ...(data.logoUrl !== undefined ? { logo: data.logoUrl } : {}),
      },
    });

    // 2. Prepare Settings Update
    const settingsUpdateData: any = {};
    if (data.storeName) settingsUpdateData.businessName = data.storeName;
    if (data.storePhone) settingsUpdateData.businessPhone = data.storePhone;
    if (data.storeAddress !== undefined) settingsUpdateData.businessAddress = data.storeAddress;
    if (data.tagline !== undefined) settingsUpdateData.tagline = data.tagline;
    if (data.primaryColor) settingsUpdateData.primaryColor = data.primaryColor;
    if (data.fontFamily) settingsUpdateData.fontFamily = data.fontFamily;
    if (data.defaultPageSize) settingsUpdateData.defaultPageSize = data.defaultPageSize;
    if (data.faviconUrl !== undefined) settingsUpdateData.favicon = data.faviconUrl;
    if (data.heroBadge !== undefined) settingsUpdateData.heroBadge = data.heroBadge;
    if (data.heroTitle !== undefined) settingsUpdateData.heroTitle = data.heroTitle;
    if (data.heroSubtitle !== undefined) settingsUpdateData.heroSubtitle = data.heroSubtitle;
    if (data.heroCtaText !== undefined) settingsUpdateData.heroCtaText = data.heroCtaText;
    if (data.heroCtaLink !== undefined) settingsUpdateData.heroCtaLink = data.heroCtaLink;
    if (data.heroImageUrl !== undefined) settingsUpdateData.heroImageUrl = data.heroImageUrl;
    if (data.defaultSeoTitle !== undefined) settingsUpdateData.defaultSeoTitle = data.defaultSeoTitle;
    if (data.defaultSeoDescription !== undefined) settingsUpdateData.defaultSeoDescription = data.defaultSeoDescription;
    if (data.ga4Id !== undefined) settingsUpdateData.googleTagId = data.ga4Id?.trim() || null;
    if (data.midtransMerchantId !== undefined) settingsUpdateData.midtransMerchantId = data.midtransMerchantId?.trim() || null;
    if (data.midtransClientKey !== undefined) settingsUpdateData.midtransClientKey = data.midtransClientKey?.trim() || null;
    if (data.midtransServerKey !== undefined) settingsUpdateData.midtransServerKey = data.midtransServerKey?.trim() || null;
    if (data.flipApiKey !== undefined) settingsUpdateData.flipApiKey = data.flipApiKey?.trim() || null;
    if (data.sandboxPaymentEnabled !== undefined) settingsUpdateData.sandboxPaymentEnabled = data.sandboxPaymentEnabled;
    if (data.midtransSandboxMerchantId !== undefined) settingsUpdateData.midtransSandboxMerchantId = data.midtransSandboxMerchantId?.trim() || null;
    if (data.midtransSandboxClientKey !== undefined) settingsUpdateData.midtransSandboxClientKey = data.midtransSandboxClientKey?.trim() || null;
    if (data.midtransSandboxServerKey !== undefined) settingsUpdateData.midtransSandboxServerKey = data.midtransSandboxServerKey?.trim() || null;
    if (data.flipSandboxApiKey !== undefined) settingsUpdateData.flipSandboxApiKey = data.flipSandboxApiKey?.trim() || null;
    if (data.turnstileEnabled !== undefined) settingsUpdateData.turnstileEnabled = data.turnstileEnabled;
    if (data.turnstileSiteKey !== undefined) settingsUpdateData.turnstileSiteKey = data.turnstileSiteKey?.trim() || null;
    if (data.turnstileSecretKey !== undefined) settingsUpdateData.turnstileSecretKey = data.turnstileSecretKey?.trim() || null;
    if (data.cookieConsentEnabled !== undefined) settingsUpdateData.cookieConsentEnabled = data.cookieConsentEnabled;

    if (data.metaPixelId !== undefined || data.tiktokPixelId !== undefined || data.ga4Id !== undefined) {
      const currentConfig = (existingStore.settings?.analyticsConfig as Record<string, string>) || {};
      const newConfig = { ...currentConfig };
      if (data.ga4Id !== undefined) {
        if (data.ga4Id?.trim()) newConfig.ga4MeasurementId = data.ga4Id.trim();
        else delete newConfig.ga4MeasurementId;
      }
      if (data.metaPixelId !== undefined) {
        if (data.metaPixelId?.trim()) newConfig.metaPixelId = data.metaPixelId.trim();
        else delete newConfig.metaPixelId;
      }
      if (data.tiktokPixelId !== undefined) {
        if (data.tiktokPixelId?.trim()) newConfig.tiktokPixelId = data.tiktokPixelId.trim();
        else delete newConfig.tiktokPixelId;
      }
      settingsUpdateData.analyticsConfig = newConfig;
    }

    if (data.socialLinks !== undefined) {
      settingsUpdateData.socialLinks = data.socialLinks;
    }

    if (Object.keys(settingsUpdateData).length > 0) {
      await prisma.storeSettings.upsert({
        where: { storeId: existingStore.id },
        update: settingsUpdateData,
        create: {
          storeId: existingStore.id,
          ...settingsUpdateData,
        },
      });
    }

    // 3. Admin User Profile & Password Reset
    let adminUpdated = false;
    let resetPasswordMessage: string | null = null;
    let effectiveAdmin = existingStore.users[0] || null;

    if (data.adminUserId) {
      const foundUser = await prisma.user.findFirst({
        where: { id: data.adminUserId, storeId: existingStore.id },
      });
      if (foundUser) effectiveAdmin = foundUser;
    }

    if (effectiveAdmin) {
      const userUpdateData: any = {};

      if (data.adminName) {
        const { firstName, lastName } = splitFullName(data.adminName);
        userUpdateData.firstName = firstName;
        userUpdateData.lastName = lastName || null;
      }

      if (data.adminEmail && data.adminEmail.toLowerCase().trim() !== effectiveAdmin.email.toLowerCase()) {
        const targetEmail = data.adminEmail.toLowerCase().trim();
        const emailCollision = await prisma.user.findUnique({
          where: {
            storeId_email: {
              storeId: existingStore.id,
              email: targetEmail,
            },
          },
        });
        if (emailCollision && emailCollision.id !== effectiveAdmin.id) {
          return NextResponse.json(
            { error: `Email "${targetEmail}" sudah terdaftar pada toko ini.` },
            { status: 400 }
          );
        }
        userUpdateData.email = targetEmail;
      }

      if (data.isAdminActive !== undefined) {
        userUpdateData.isActive = data.isAdminActive;
      }

      if (data.newAdminPassword && data.newAdminPassword.trim()) {
        const rawPassword = data.newAdminPassword.trim();
        userUpdateData.passwordHash = await hashPassword(rawPassword);

        const currentDomain = data.domain || existingStore.domain;
        const siteUrl = currentDomain.startsWith('localhost')
          ? `http://${currentDomain}`
          : `https://${currentDomain}`;
        const targetAdminName = data.adminName || [effectiveAdmin.firstName, effectiveAdmin.lastName].filter(Boolean).join(' ') || 'Pelanggan';
        const finalEmail = userUpdateData.email || effectiveAdmin.email;
        const currentStoreName = data.storeName || existingStore.name;

        resetPasswordMessage = [
          `🔑 *Reset Password Akun Toko ${currentStoreName}*`,
          ``,
          `Halo *${targetAdminName}*,`,
          `Password akun admin Anda telah berhasil diperbarui oleh tim Super-Admin:`,
          ``,
          `🌐 *Alamat Toko:* ${siteUrl}`,
          `🔐 *Halaman Login:* ${siteUrl}/login`,
          `📧 *Email Login:* ${finalEmail}`,
          `🔑 *Password Baru:* ${rawPassword}`,
          ``,
          `📌 *Catatan:* Silakan login dengan password baru di atas. Demi keamanan akun, Anda dapat memperbarui password Anda sewaktu-waktu di panel admin.`,
        ].join('\n');
      }

      if (Object.keys(userUpdateData).length > 0) {
        await prisma.user.update({
          where: { id: effectiveAdmin.id },
          data: userUpdateData,
        });
        adminUpdated = true;
      }
    }

    // 4. Audit Log
    if (typeof (prisma as any).auditLog?.create === 'function') {
      await prisma.auditLog.create({
        data: {
          storeId: existingStore.id,
          action: 'SUPER_ADMIN_UPDATE_STORE',
          entityType: 'STORE',
          entityId: existingStore.id,
          newValue: JSON.stringify({
            updatedByOwner: owner.email,
            storeName: updatedStore.name,
            domain: updatedStore.domain,
            passwordReset: Boolean(data.newAdminPassword),
            adminUpdated,
          }),
        },
      }).catch(() => {});
    }

    // 5. Invalidate page cache so updates reflect immediately on the storefront
    try {
      revalidatePath('/', 'page');
      revalidatePath('/products', 'page');
      revalidatePath('/categories', 'page');
    } catch {
      // ignore
    }

    return NextResponse.json({
      success: true,
      message: `Data website pelanggan "${updatedStore.name}" (${updatedStore.domain}) berhasil diperbarui!`,
      store: updatedStore,
      adminUpdated,
      resetPasswordMessage,
    });
  } catch (error) {
    logger.error('Failed to update tenant store in Super-Admin', {}, error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Terjadi kesalahan saat memperbarui data toko pelanggan',
      },
      { status: 500 }
    );
  }
}

