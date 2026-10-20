import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { z } from 'zod';
import { logger } from '@/lib/logger';

const LegalSettingsUpdateSchema = z.object({
  termsContent: z.string().optional().nullable(),
  privacyContent: z.string().optional().nullable(),
  cookieConsentEnabled: z.boolean().optional(),
  cookieConsentTitle: z.string().optional().nullable(),
  cookieConsentText: z.string().optional().nullable(),
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
      settings: {
        termsContent: s?.termsContent ?? null,
        privacyContent: s?.privacyContent ?? null,
        cookieConsentEnabled: s?.cookieConsentEnabled ?? true,
        cookieConsentTitle: s?.cookieConsentTitle ?? 'Pemberitahuan & Izin Cookie',
        cookieConsentText: s?.cookieConsentText ?? null,
      },
    });
  } catch (error) {
    logger.error('Fetch legal store settings failed', {}, error instanceof Error ? error : String(error));
    return NextResponse.json({ error: 'Failed to fetch legal settings' }, { status: 500 });
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
    const parsed = LegalSettingsUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;

    const settingsUpdateData: any = {};
    if (data.termsContent !== undefined) settingsUpdateData.termsContent = data.termsContent ? data.termsContent.trim() : null;
    if (data.privacyContent !== undefined) settingsUpdateData.privacyContent = data.privacyContent ? data.privacyContent.trim() : null;
    if (data.cookieConsentEnabled !== undefined) settingsUpdateData.cookieConsentEnabled = data.cookieConsentEnabled;
    if (data.cookieConsentTitle !== undefined) settingsUpdateData.cookieConsentTitle = data.cookieConsentTitle ? data.cookieConsentTitle.trim() : 'Pemberitahuan & Izin Cookie';
    if (data.cookieConsentText !== undefined) settingsUpdateData.cookieConsentText = data.cookieConsentText ? data.cookieConsentText.trim() : null;

    await prisma.storeSettings.upsert({
      where: { storeId: user.storeId },
      update: settingsUpdateData,
      create: {
        storeId: user.storeId,
        ...settingsUpdateData,
      },
    });

    return NextResponse.json({ success: true, message: 'Pengaturan legal dan cookie berhasil disimpan' });
  } catch (error) {
    logger.error('Update legal store settings failed', {}, error instanceof Error ? error : String(error));
    return NextResponse.json({ error: 'Failed to update legal settings' }, { status: 500 });
  }
}

