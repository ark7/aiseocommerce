import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { isDemoStore, createDemoReadOnlyResponse } from '@/lib/demoGuard';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import {
  extractPublicSocialLinks,
  mergeHeroSlidesIntoSocialLinks,
  resolveStoreHeroSlides,
} from '@/lib/heroSlides';

const SocialLinksSchema = z.object({
  instagram: z.string().optional().nullable(),
  facebook: z.string().optional().nullable(),
  tiktok: z.string().optional().nullable(),
  youtube: z.string().optional().nullable(),
  whatsapp: z.string().optional().nullable(),
}).optional().nullable();

const HeroSlideSchema = z.object({
  id: z.string().optional().nullable(),
  badge: z.string().optional().nullable(),
  title: z.string().min(1, 'Judul slide hero tidak boleh kosong'),
  subtitle: z.string().optional().nullable(),
  ctaText: z.string().optional().nullable(),
  ctaLink: z.string().optional().nullable(),
  ctaSecondaryText: z.string().optional().nullable(),
  ctaSecondaryLink: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
});

const GeneralSettingsUpdateSchema = z.object({
  // Store profile
  name: z.string().min(1, 'Nama toko tidak boleh kosong').optional(),
  logo: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email('Format email tidak valid').optional().nullable().or(z.literal('')),

  // Brand & Identity
  tagline: z.string().optional().nullable(),
  favicon: z.string().optional().nullable(),
  socialLinks: SocialLinksSchema,

  // Hero Section
  heroBadge: z.string().optional().nullable(),
  heroTitle: z.string().optional().nullable(),
  heroSubtitle: z.string().optional().nullable(),
  heroCtaText: z.string().optional().nullable(),
  heroCtaLink: z.string().optional().nullable(),
  heroCtaSecondaryText: z.string().optional().nullable(),
  heroCtaSecondaryLink: z.string().optional().nullable(),
  heroImageUrl: z.string().optional().nullable(),
  heroSlides: z.array(HeroSlideSchema).max(10).optional().nullable(),

  // Appearance
  primaryColor: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Format hex warna tidak valid').optional().nullable(),
  fontFamily: z.enum(['inter', 'plus-jakarta-sans', 'poppins', 'roboto', 'playfair']).optional().nullable(),
  defaultPageSize: z.coerce.number().int().min(1).max(100).optional(),

  // SEO Defaults
  defaultSeoTitle: z.string().optional().nullable(),
  defaultSeoDescription: z.string().optional().nullable(),

  // Payment Gateway & Sandbox
  sandboxPaymentEnabled: z.boolean().optional(),
  midtransMerchantId: z.string().optional().nullable(),
  midtransClientKey: z.string().optional().nullable(),
  midtransServerKey: z.string().optional().nullable(),
  flipApiKey: z.string().optional().nullable(),
  midtransSandboxMerchantId: z.string().optional().nullable(),
  midtransSandboxClientKey: z.string().optional().nullable(),
  midtransSandboxServerKey: z.string().optional().nullable(),
  flipSandboxApiKey: z.string().optional().nullable(),

  // AI Assistant (BYOK)
  aiProvider: z.enum(['GEMINI', 'OPENAI']).optional().nullable(),
  aiApiKey: z.string().optional().nullable(),
  aiModel: z.string().optional().nullable(),
  aiCustomPrompt: z.string().optional().nullable(),

  // Order Notifications (Telegram & WhatsApp)
  notifyTelegramEnabled: z.boolean().optional(),
  notifyTelegramBotToken: z.string().optional().nullable(),
  notifyTelegramChatId: z.string().optional().nullable(),
  notifyWhatsappEnabled: z.boolean().optional(),
  notifyWhatsappProvider: z.enum(['FONNTE', 'GENERIC_WEBHOOK']).optional().nullable(),
  notifyWhatsappToken: z.string().optional().nullable(),
  notifyWhatsappTargetPhone: z.string().optional().nullable(),
  notifyLowStockThreshold: z.coerce.number().int().min(1).max(100).optional(),
  notifyOnNewOrder: z.boolean().optional(),
  notifyOnPaymentProof: z.boolean().optional(),
  notifyOnPaymentSuccess: z.boolean().optional(),
  notifyOnLowStock: z.boolean().optional(),

  // Manual Shipping Flat Rates (Dalam & Luar Kota)
  shippingOriginCity: z.string().max(100).optional().nullable(),
  shippingFlatRateInner: z.coerce.number().min(0, 'Tarif dalam kota tidak boleh negatif').optional(),
  shippingFlatRateOuter: z.coerce.number().min(0, 'Tarif luar kota tidak boleh negatif').optional(),
  shippingFreeThreshold: z.coerce.number().min(0).optional().nullable(),

  // Ekspedisi & Kurir Otomatis (Biteship API)
  biteshipEnabled: z.boolean().optional(),
  biteshipApiKey: z.string().optional().nullable(),
  biteshipSandbox: z.boolean().optional(),
  biteshipOriginAreaId: z.string().optional().nullable(),
  biteshipOriginAddress: z.string().optional().nullable(),
  biteshipOriginPostalCode: z.string().optional().nullable(),
  biteshipOriginContactName: z.string().optional().nullable(),
  biteshipOriginContactPhone: z.string().optional().nullable(),
  biteshipEnabledCouriers: z.union([
    z.string(),
    z.array(z.string()).transform((arr) => arr.join(',')),
  ]).optional().nullable(),

  // SMTP & Email Notifications
  smtpEnabled: z.boolean().optional(),
  smtpHost: z.string().optional().nullable(),
  smtpPort: z.coerce.number().int().min(1).max(65535).optional(),
  smtpSecure: z.boolean().optional(),
  smtpUser: z.string().optional().nullable(),
  smtpPass: z.string().optional().nullable(),
  smtpFromName: z.string().optional().nullable(),
  smtpFromEmail: z.string().email('Format email pengirim tidak valid').optional().nullable().or(z.literal('')),
  smtpReplyTo: z.string().email('Format email reply-to tidak valid').optional().nullable().or(z.literal('')),
});

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const store = await prisma.store.findUnique({
      where: { id: user.storeId },
      include: { settings: true },
    });

    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    const s = store.settings;

    return NextResponse.json({
      success: true,
      store: {
        id: store.id,
        name: store.name,
        domain: store.domain,
        logo: store.logo,
        address: store.address,
        phone: store.phone,
        email: store.email,
      },
      settings: {
        tagline: s?.tagline ?? null,
        favicon: s?.favicon ?? null,
        heroBadge: s?.heroBadge ?? null,
        heroTitle: s?.heroTitle ?? null,
        heroSubtitle: s?.heroSubtitle ?? null,
        heroCtaText: s?.heroCtaText ?? null,
        heroCtaLink: s?.heroCtaLink ?? null,
        heroCtaSecondaryText: s?.heroCtaSecondaryText ?? null,
        heroCtaSecondaryLink: s?.heroCtaSecondaryLink ?? null,
        heroImageUrl: s?.heroImageUrl ?? null,
        heroSlides: resolveStoreHeroSlides({
          storeName: store.name,
          tagline: s?.tagline,
          settings: s,
        }),
        primaryColor: s?.primaryColor ?? '#4F46E5',
        fontFamily: s?.fontFamily ?? 'inter',
        defaultPageSize: s?.defaultPageSize ?? 10,
        socialLinks: extractPublicSocialLinks(s?.socialLinks),
        defaultSeoTitle: s?.defaultSeoTitle ?? null,
        defaultSeoDescription: s?.defaultSeoDescription ?? null,
        sandboxPaymentEnabled: s?.sandboxPaymentEnabled ?? false,
        midtransMerchantId: s?.midtransMerchantId ?? null,
        midtransClientKey: s?.midtransClientKey ?? null,
        midtransServerKey: s?.midtransServerKey ? '********' : null,
        flipApiKey: s?.flipApiKey ? '********' : null,
        midtransSandboxMerchantId: s?.midtransSandboxMerchantId ?? null,
        midtransSandboxClientKey: s?.midtransSandboxClientKey ?? null,
        midtransSandboxServerKey: s?.midtransSandboxServerKey ? '********' : null,
        flipSandboxApiKey: s?.flipSandboxApiKey ? '********' : null,

        // AI Assistant (BYOK)
        aiProvider: s?.aiProvider ?? 'GEMINI',
        aiApiKey: s?.aiApiKey ? '********' : null,
        aiModel: s?.aiModel ?? 'gemini-2.5-flash',
        aiCustomPrompt: s?.aiCustomPrompt ?? null,

        // Order Notifications (Telegram & WhatsApp)
        notifyTelegramEnabled: s?.notifyTelegramEnabled ?? false,
        notifyTelegramBotToken: s?.notifyTelegramBotToken ? '********' : null,
        notifyTelegramChatId: s?.notifyTelegramChatId ?? null,
        notifyWhatsappEnabled: s?.notifyWhatsappEnabled ?? false,
        notifyWhatsappProvider: s?.notifyWhatsappProvider ?? 'FONNTE',
        notifyWhatsappToken: s?.notifyWhatsappToken ? '********' : null,
        notifyWhatsappTargetPhone: s?.notifyWhatsappTargetPhone ?? null,
        notifyLowStockThreshold: s?.notifyLowStockThreshold ?? 3,
        notifyOnNewOrder: s?.notifyOnNewOrder ?? true,
        notifyOnPaymentProof: s?.notifyOnPaymentProof ?? true,
        notifyOnPaymentSuccess: s?.notifyOnPaymentSuccess ?? true,
        notifyOnLowStock: s?.notifyOnLowStock ?? true,

        // Manual Shipping Flat Rates
        shippingOriginCity: s?.shippingOriginCity ?? null,
        shippingFlatRateInner: s?.shippingFlatRateInner ?? 0,
        shippingFlatRateOuter: s?.shippingFlatRateOuter ?? 0,
        shippingFreeThreshold: s?.shippingFreeThreshold ?? null,

        // Ekspedisi & Kurir Otomatis (Biteship API)
        biteshipEnabled: s?.biteshipEnabled ?? false,
        biteshipApiKey: s?.biteshipApiKey ? '********' : null,
        biteshipSandbox: s?.biteshipSandbox ?? true,
        biteshipOriginAreaId: s?.biteshipOriginAreaId ?? null,
        biteshipOriginAddress: s?.biteshipOriginAddress ?? null,
        biteshipOriginPostalCode: s?.biteshipOriginPostalCode ?? null,
        biteshipOriginContactName: s?.biteshipOriginContactName ?? null,
        biteshipOriginContactPhone: s?.biteshipOriginContactPhone ?? null,
        biteshipEnabledCouriers: s?.biteshipEnabledCouriers ?? 'jne,sicepat,jnt,anteraja,tiki,pos',

        // SMTP & Email Notifications
        smtpEnabled: s?.smtpEnabled ?? false,
        smtpHost: s?.smtpHost ?? null,
        smtpPort: s?.smtpPort ?? 587,
        smtpSecure: s?.smtpSecure ?? false,
        smtpUser: s?.smtpUser ?? null,
        smtpPass: s?.smtpPass ? '********' : null,
        smtpFromName: s?.smtpFromName ?? null,
        smtpFromEmail: s?.smtpFromEmail ?? null,
        smtpReplyTo: s?.smtpReplyTo ?? null,
        smtpVerified: s?.smtpVerified ?? false,
        smtpVerifiedAt: s?.smtpVerifiedAt ?? null,
      },
    });
  } catch (error) {
    logger.error('Fetch general store settings failed', {}, error instanceof Error ? error : String(error));
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await requireUser(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (await isDemoStore(user.storeId)) {
      return createDemoReadOnlyResponse();
    }

    const body = await request.json();
    const parsed = GeneralSettingsUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;

    // 1. Update Store table fields
    const storeUpdateData: any = {};
    if (data.name !== undefined) storeUpdateData.name = data.name.trim();
    if (data.logo !== undefined) storeUpdateData.logo = data.logo ? data.logo.trim() : null;
    if (data.address !== undefined) storeUpdateData.address = data.address ? data.address.trim() : null;
    if (data.phone !== undefined) storeUpdateData.phone = data.phone ? data.phone.trim() : null;
    if (data.email !== undefined) storeUpdateData.email = data.email && data.email.trim() !== '' ? data.email.trim() : null;

    if (Object.keys(storeUpdateData).length > 0) {
      await prisma.store.update({
        where: { id: user.storeId },
        data: storeUpdateData,
      });
    }

    // 2. Update StoreSettings table fields
    const settingsUpdateData: any = {};
    if (data.tagline !== undefined) settingsUpdateData.tagline = data.tagline ? data.tagline.trim() : null;
    if (data.favicon !== undefined) settingsUpdateData.favicon = data.favicon ? data.favicon.trim() : null;
    if (data.heroBadge !== undefined) settingsUpdateData.heroBadge = data.heroBadge ? data.heroBadge.trim() : null;
    if (data.heroTitle !== undefined) settingsUpdateData.heroTitle = data.heroTitle ? data.heroTitle.trim() : null;
    if (data.heroSubtitle !== undefined) settingsUpdateData.heroSubtitle = data.heroSubtitle ? data.heroSubtitle.trim() : null;
    if (data.heroCtaText !== undefined) settingsUpdateData.heroCtaText = data.heroCtaText ? data.heroCtaText.trim() : null;
    if (data.heroCtaLink !== undefined) settingsUpdateData.heroCtaLink = data.heroCtaLink ? data.heroCtaLink.trim() : null;
    if (data.heroCtaSecondaryText !== undefined) settingsUpdateData.heroCtaSecondaryText = data.heroCtaSecondaryText ? data.heroCtaSecondaryText.trim() : null;
    if (data.heroCtaSecondaryLink !== undefined) settingsUpdateData.heroCtaSecondaryLink = data.heroCtaSecondaryLink ? data.heroCtaSecondaryLink.trim() : null;
    if (data.heroImageUrl !== undefined) settingsUpdateData.heroImageUrl = data.heroImageUrl ? data.heroImageUrl.trim() : null;
    if (Array.isArray(data.heroSlides) && data.heroSlides.length > 0) {
      const firstSlide = data.heroSlides[0];
      if (data.heroBadge === undefined) settingsUpdateData.heroBadge = firstSlide.badge ? firstSlide.badge.trim() : null;
      if (data.heroTitle === undefined) settingsUpdateData.heroTitle = firstSlide.title.trim();
      if (data.heroSubtitle === undefined) settingsUpdateData.heroSubtitle = firstSlide.subtitle ? firstSlide.subtitle.trim() : null;
      if (data.heroCtaText === undefined) settingsUpdateData.heroCtaText = firstSlide.ctaText ? firstSlide.ctaText.trim() : null;
      if (data.heroCtaLink === undefined) settingsUpdateData.heroCtaLink = firstSlide.ctaLink ? firstSlide.ctaLink.trim() : null;
      if (data.heroCtaSecondaryText === undefined) settingsUpdateData.heroCtaSecondaryText = firstSlide.ctaSecondaryText ? firstSlide.ctaSecondaryText.trim() : null;
      if (data.heroCtaSecondaryLink === undefined) settingsUpdateData.heroCtaSecondaryLink = firstSlide.ctaSecondaryLink ? firstSlide.ctaSecondaryLink.trim() : null;
      if (data.heroImageUrl === undefined) settingsUpdateData.heroImageUrl = firstSlide.imageUrl ? firstSlide.imageUrl.trim() : null;
    }
    if (data.primaryColor !== undefined) settingsUpdateData.primaryColor = data.primaryColor ? data.primaryColor.trim() : '#4F46E5';
    if (data.fontFamily !== undefined) settingsUpdateData.fontFamily = data.fontFamily || 'inter';
    if (data.defaultPageSize !== undefined) settingsUpdateData.defaultPageSize = data.defaultPageSize;
    if (data.socialLinks !== undefined || data.heroSlides !== undefined) {
      let existingSocialLinks: unknown = null;
      try {
        const existingStore = await prisma.store.findUnique({
          where: { id: user.storeId },
          include: { settings: true },
        });
        existingSocialLinks = existingStore?.settings?.socialLinks ?? null;
      } catch {
        existingSocialLinks = null;
      }

      if (data.heroSlides !== undefined) {
        const normalizedSlides = (data.heroSlides || []).map((slide, idx) => ({
          id: slide.id?.trim() || `slide-${idx + 1}`,
          badge: slide.badge?.trim() || '',
          title: slide.title.trim(),
          subtitle: slide.subtitle?.trim() || '',
          ctaText: slide.ctaText?.trim() || 'Mulai Belanja',
          ctaLink: slide.ctaLink?.trim() || '/products',
          ctaSecondaryText: slide.ctaSecondaryText?.trim() || '',
          ctaSecondaryLink: slide.ctaSecondaryLink?.trim() || '/articles',
          imageUrl: slide.imageUrl?.trim() || '',
        }));
        settingsUpdateData.socialLinks = mergeHeroSlidesIntoSocialLinks(
          existingSocialLinks,
          data.socialLinks,
          normalizedSlides
        );
      } else {
        const merged = mergeHeroSlidesIntoSocialLinks(existingSocialLinks, data.socialLinks, undefined);
        settingsUpdateData.socialLinks = Object.keys(merged).length > 0 ? merged : (data.socialLinks || {});
      }
    }
    if (data.defaultSeoTitle !== undefined) settingsUpdateData.defaultSeoTitle = data.defaultSeoTitle ? data.defaultSeoTitle.trim() : null;
    if (data.defaultSeoDescription !== undefined) settingsUpdateData.defaultSeoDescription = data.defaultSeoDescription ? data.defaultSeoDescription.trim() : null;
    if (data.sandboxPaymentEnabled !== undefined) settingsUpdateData.sandboxPaymentEnabled = data.sandboxPaymentEnabled;
    if (data.midtransMerchantId !== undefined) settingsUpdateData.midtransMerchantId = data.midtransMerchantId ? data.midtransMerchantId.trim() : null;
    if (data.midtransClientKey !== undefined) settingsUpdateData.midtransClientKey = data.midtransClientKey ? data.midtransClientKey.trim() : null;
    if (data.midtransServerKey !== undefined && data.midtransServerKey !== '********') {
      settingsUpdateData.midtransServerKey = data.midtransServerKey ? data.midtransServerKey.trim() : null;
    }
    if (data.flipApiKey !== undefined && data.flipApiKey !== '********') {
      settingsUpdateData.flipApiKey = data.flipApiKey ? data.flipApiKey.trim() : null;
    }
    if (data.midtransSandboxMerchantId !== undefined) settingsUpdateData.midtransSandboxMerchantId = data.midtransSandboxMerchantId ? data.midtransSandboxMerchantId.trim() : null;
    if (data.midtransSandboxClientKey !== undefined) settingsUpdateData.midtransSandboxClientKey = data.midtransSandboxClientKey ? data.midtransSandboxClientKey.trim() : null;
    if (data.midtransSandboxServerKey !== undefined && data.midtransSandboxServerKey !== '********') {
      settingsUpdateData.midtransSandboxServerKey = data.midtransSandboxServerKey ? data.midtransSandboxServerKey.trim() : null;
    }
    if (data.flipSandboxApiKey !== undefined && data.flipSandboxApiKey !== '********') {
      settingsUpdateData.flipSandboxApiKey = data.flipSandboxApiKey ? data.flipSandboxApiKey.trim() : null;
    }

    // AI Assistant (BYOK)
    if (data.aiProvider !== undefined) settingsUpdateData.aiProvider = data.aiProvider;
    if (data.aiApiKey !== undefined && data.aiApiKey !== '********') {
      settingsUpdateData.aiApiKey = data.aiApiKey ? data.aiApiKey.trim() : null;
    }
    if (data.aiModel !== undefined) settingsUpdateData.aiModel = data.aiModel ? data.aiModel.trim() : 'gemini-2.5-flash';
    if (data.aiCustomPrompt !== undefined) settingsUpdateData.aiCustomPrompt = data.aiCustomPrompt ? data.aiCustomPrompt.trim() : null;

    // Order Notifications (Telegram & WhatsApp)
    if (data.notifyTelegramEnabled !== undefined) settingsUpdateData.notifyTelegramEnabled = data.notifyTelegramEnabled;
    if (data.notifyTelegramBotToken !== undefined && data.notifyTelegramBotToken !== '********') {
      settingsUpdateData.notifyTelegramBotToken = data.notifyTelegramBotToken ? data.notifyTelegramBotToken.trim() : null;
    }
    if (data.notifyTelegramChatId !== undefined) settingsUpdateData.notifyTelegramChatId = data.notifyTelegramChatId ? data.notifyTelegramChatId.trim() : null;
    if (data.notifyWhatsappEnabled !== undefined) settingsUpdateData.notifyWhatsappEnabled = data.notifyWhatsappEnabled;
    if (data.notifyWhatsappProvider !== undefined) settingsUpdateData.notifyWhatsappProvider = data.notifyWhatsappProvider;
    if (data.notifyWhatsappToken !== undefined && data.notifyWhatsappToken !== '********') {
      settingsUpdateData.notifyWhatsappToken = data.notifyWhatsappToken ? data.notifyWhatsappToken.trim() : null;
    }
    if (data.notifyWhatsappTargetPhone !== undefined) settingsUpdateData.notifyWhatsappTargetPhone = data.notifyWhatsappTargetPhone ? data.notifyWhatsappTargetPhone.trim() : null;
    if (data.notifyLowStockThreshold !== undefined) settingsUpdateData.notifyLowStockThreshold = data.notifyLowStockThreshold;
    if (data.notifyOnNewOrder !== undefined) settingsUpdateData.notifyOnNewOrder = data.notifyOnNewOrder;
    if (data.notifyOnPaymentProof !== undefined) settingsUpdateData.notifyOnPaymentProof = data.notifyOnPaymentProof;
    if (data.notifyOnPaymentSuccess !== undefined) settingsUpdateData.notifyOnPaymentSuccess = data.notifyOnPaymentSuccess;
    if (data.notifyOnLowStock !== undefined) settingsUpdateData.notifyOnLowStock = data.notifyOnLowStock;

    // Manual Shipping Flat Rates
    if (data.shippingOriginCity !== undefined) settingsUpdateData.shippingOriginCity = data.shippingOriginCity ? data.shippingOriginCity.trim() : null;
    if (data.shippingFlatRateInner !== undefined) settingsUpdateData.shippingFlatRateInner = data.shippingFlatRateInner;
    if (data.shippingFlatRateOuter !== undefined) settingsUpdateData.shippingFlatRateOuter = data.shippingFlatRateOuter;
    if (data.shippingFreeThreshold !== undefined) settingsUpdateData.shippingFreeThreshold = data.shippingFreeThreshold;

    // Ekspedisi & Kurir Otomatis (Biteship API)
    if (data.biteshipEnabled !== undefined) settingsUpdateData.biteshipEnabled = data.biteshipEnabled;
    if (data.biteshipApiKey !== undefined && data.biteshipApiKey !== '********') {
      settingsUpdateData.biteshipApiKey = data.biteshipApiKey ? data.biteshipApiKey.trim() : null;
    }
    if (data.biteshipSandbox !== undefined) settingsUpdateData.biteshipSandbox = data.biteshipSandbox;
    if (data.biteshipOriginAreaId !== undefined) settingsUpdateData.biteshipOriginAreaId = data.biteshipOriginAreaId ? data.biteshipOriginAreaId.trim() : null;
    if (data.biteshipOriginAddress !== undefined) settingsUpdateData.biteshipOriginAddress = data.biteshipOriginAddress ? data.biteshipOriginAddress.trim() : null;
    if (data.biteshipOriginPostalCode !== undefined) settingsUpdateData.biteshipOriginPostalCode = data.biteshipOriginPostalCode ? data.biteshipOriginPostalCode.trim() : null;
    if (data.biteshipOriginContactName !== undefined) settingsUpdateData.biteshipOriginContactName = data.biteshipOriginContactName ? data.biteshipOriginContactName.trim() : null;
    if (data.biteshipOriginContactPhone !== undefined) settingsUpdateData.biteshipOriginContactPhone = data.biteshipOriginContactPhone ? data.biteshipOriginContactPhone.trim() : null;
    if (data.biteshipEnabledCouriers !== undefined) settingsUpdateData.biteshipEnabledCouriers = data.biteshipEnabledCouriers ? data.biteshipEnabledCouriers.trim() : null;

    // SMTP & Email Notifications
    if (data.smtpEnabled !== undefined) settingsUpdateData.smtpEnabled = data.smtpEnabled;
    if (data.smtpHost !== undefined) settingsUpdateData.smtpHost = data.smtpHost ? data.smtpHost.trim() : null;
    if (data.smtpPort !== undefined) settingsUpdateData.smtpPort = data.smtpPort;
    if (data.smtpSecure !== undefined) settingsUpdateData.smtpSecure = data.smtpSecure;
    if (data.smtpUser !== undefined) settingsUpdateData.smtpUser = data.smtpUser ? data.smtpUser.trim() : null;
    if (data.smtpPass !== undefined && data.smtpPass !== '********') {
      settingsUpdateData.smtpPass = data.smtpPass ? data.smtpPass.trim() : null;
    }
    if (data.smtpFromName !== undefined) settingsUpdateData.smtpFromName = data.smtpFromName ? data.smtpFromName.trim() : null;
    if (data.smtpFromEmail !== undefined) {
      const trimmedEmail = data.smtpFromEmail ? data.smtpFromEmail.trim() : null;
      settingsUpdateData.smtpFromEmail = trimmedEmail;
      const currentStore = await prisma.store.findUnique({
        where: { id: user.storeId },
        include: { settings: true },
      });
      if (currentStore?.settings?.smtpFromEmail !== trimmedEmail) {
        settingsUpdateData.smtpVerified = false;
        settingsUpdateData.smtpVerifiedAt = null;
      }
    }
    if (data.smtpReplyTo !== undefined) settingsUpdateData.smtpReplyTo = data.smtpReplyTo ? data.smtpReplyTo.trim() : null;

    if (Object.keys(settingsUpdateData).length > 0) {
      await prisma.storeSettings.upsert({
        where: { storeId: user.storeId },
        update: settingsUpdateData,
        create: {
          storeId: user.storeId,
          ...settingsUpdateData,
        },
      });
    }

    return NextResponse.json({ success: true, message: 'Pengaturan berhasil disimpan' });
  } catch (error) {
    logger.error('Update general store settings failed', {}, error instanceof Error ? error : String(error));
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

