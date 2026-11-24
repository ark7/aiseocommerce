import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/rbacServer';
import { z } from 'zod';
import { logger } from '@/lib/logger';

const TurnstileUpdateSchema = z.object({
  turnstileSiteKey: z.string().optional(),
  turnstileSecretKey: z.string().optional(),
  turnstileEnabled: z.boolean().optional(),
});

export async function GET(request: Request) {
  try {
    const auth = await requirePermission(request, 'settings');
    if (!auth.authorized) return auth.response;
    const { user } = auth;

    const settings = await prisma.storeSettings.findUnique({
      where: { storeId: user.storeId },
    });

    return NextResponse.json({
      success: true,
      settings: {
        turnstileSiteKey: settings?.turnstileSiteKey || null,
        turnstileEnabled: settings?.turnstileEnabled ?? false,
        hasSecret: !!settings?.turnstileSecretKey,
      },
    });
  } catch (error) {
    logger.error('Fetch Turnstile settings failed', {}, error instanceof Error ? error : String(error));
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const auth = await requirePermission(request, 'settings');
    if (!auth.authorized) return auth.response;
    const { user } = auth;

    const body = await request.json();
    const parsed = TurnstileUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;

    const updateData: any = {};
    if (data.turnstileSiteKey !== undefined) updateData.turnstileSiteKey = data.turnstileSiteKey;
    if (data.turnstileEnabled !== undefined) updateData.turnstileEnabled = data.turnstileEnabled;
    // Only update secret if it is provided, non-empty, and not masked with asterisks
    if (
      data.turnstileSecretKey &&
      data.turnstileSecretKey.trim() !== '' &&
      !data.turnstileSecretKey.includes('*')
    ) {
      updateData.turnstileSecretKey = data.turnstileSecretKey.trim();
    }

    await prisma.storeSettings.upsert({
      where: { storeId: user.storeId },
      update: updateData,
      create: {
        storeId: user.storeId,
        ...updateData,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Update Turnstile settings failed', {}, error instanceof Error ? error : String(error));
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
