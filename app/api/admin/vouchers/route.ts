import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { logger } from '@/lib/logger';

import { UNIQUE_VIOLATION, VoucherInputSchema } from './schema';

/** Read the store's vouchers plus how many got claimed and used. */
export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const vouchers = await prisma.voucher.findMany({
      where: { storeId: user.storeId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { claims: true } } },
    });

    return NextResponse.json({ success: true, vouchers });
  } catch (error) {
    logger.error(
      'Failed to read vouchers',
      {},
      error instanceof Error ? error : String(error)
    );
    return NextResponse.json({ error: 'Failed to read vouchers' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const input = VoucherInputSchema.parse(await request.json());

    const voucher = await prisma.voucher.create({
      // storeId comes from the token, never from the body: a body-supplied
      // storeId would let one tenant write into another tenant's vouchers.
      data: { ...input, storeId: user.storeId },
    });

    logger.info('Voucher created', {
      storeId: user.storeId,
      userId: user.id,
      voucherId: voucher.id,
      code: voucher.code,
    });

    return NextResponse.json({ success: true, voucher }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }

    if ((error as { code?: string } | null)?.code === UNIQUE_VIOLATION) {
      return NextResponse.json({ error: 'Kode voucher sudah dipakai' }, { status: 400 });
    }

    logger.error(
      'Failed to create voucher',
      {},
      error instanceof Error ? error : String(error)
    );
    return NextResponse.json({ error: 'Failed to create voucher' }, { status: 500 });
  }
}
