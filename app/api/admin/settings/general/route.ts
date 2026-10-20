import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { z } from 'zod';
import { logger } from '@/lib/logger';

const SocialLinksSchema = z.object({
  instagram: z.string().optional().nullable(),
  facebook: z.string().optional().nullable(),
  tiktok: z.string().optional().nullable(),
  youtube: z.string().optional().nullable(),
  whatsapp: z.string().optional().nullable(),
}).optional().nullable();

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

  // Appearance
  primaryColor: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Format hex warna tidak valid').optional().nullable(),
  fontFamily: z.enum(['inter', 'plus-jakarta-sans', 'poppins', 'roboto', 'playfair']).optional().nullable(),
  defaultPageSize: z.coerce.number().int().min(1).max(100).optional(),

  // SEO Defaults
  defaultSeoTitle: z.string().optional().nullable(),
  defaultSeoDescription: z.string().optional().nullable(),
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
        primaryColor: s?.primaryColor ?? '#4F46E5',
        fontFamily: s?.fontFamily ?? 'inter',
        defaultPageSize: s?.defaultPageSize ?? 10,
        socialLinks: (s?.socialLinks as Record<string, string>) ?? {},
        defaultSeoTitle: s?.defaultSeoTitle ?? null,
        defaultSeoDescription: s?.defaultSeoDescription ?? null,
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
    if (data.primaryColor !== undefined) settingsUpdateData.primaryColor = data.primaryColor ? data.primaryColor.trim() : '#4F46E5';
    if (data.fontFamily !== undefined) settingsUpdateData.fontFamily = data.fontFamily || 'inter';
    if (data.defaultPageSize !== undefined) settingsUpdateData.defaultPageSize = data.defaultPageSize;
    if (data.socialLinks !== undefined) settingsUpdateData.socialLinks = data.socialLinks || {};
    if (data.defaultSeoTitle !== undefined) settingsUpdateData.defaultSeoTitle = data.defaultSeoTitle ? data.defaultSeoTitle.trim() : null;
    if (data.defaultSeoDescription !== undefined) settingsUpdateData.defaultSeoDescription = data.defaultSeoDescription ? data.defaultSeoDescription.trim() : null;

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

