import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { UNIQUE_VIOLATION, VoucherInputSchema } from '../schema';

/** Change a voucher. The admin form always sends the whole row, so no partial patch. */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const input = VoucherInputSchema.parse(await request.json());

    const existing = await prisma.voucher.findUnique({
      where: { id: params.id },
      select: { id: true, storeId: true },
    });
    if (!existing) return NextResponse.json({ error: 'Voucher not found' }, { status: 404 });
    if (existing.storeId !== user.storeId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const voucher = await prisma.voucher.update({
      // storeId is repeated here on purpose: the check above is the explicit
      // 403, this is the write itself refusing to cross tenants.
      where: { id: params.id, storeId: user.storeId },
      data: input,
    });

    logger.info('Voucher updated', {
      storeId: user.storeId,
      userId: user.id,
      voucherId: voucher.id,
    });

    return NextResponse.json({ success: true, voucher });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }

    if ((error as { code?: string } | null)?.code === UNIQUE_VIOLATION) {
      return NextResponse.json({ error: 'Kode voucher sudah dipakai' }, { status: 400 });
    }

    logger.error(
      'Failed to update voucher',
      { voucherId: params.id },
      error instanceof Error ? error : String(error)
    );
    return NextResponse.json({ error: 'Failed to update voucher' }, { status: 500 });
  }
}

/**
 * Remove a voucher that has never been used.
 *
 * A voucher that already discounted a paid order is refused: deleting it would
 * take the claim rows with it and leave the order's discount with nothing
 * explaining where it came from. Deactivating keeps the books readable.
 */
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const voucher = await prisma.voucher.findUnique({
      where: { id: params.id },
      select: { id: true, storeId: true, used: true },
    });
    if (!voucher) return NextResponse.json({ error: 'Voucher not found' }, { status: 404 });
    if (voucher.storeId !== user.storeId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (voucher.used > 0) {
      return NextResponse.json(
        { error: 'Voucher sudah pernah dipakai. Nonaktifkan saja, jangan dihapus.' },
        { status: 409 }
      );
    }

    await prisma.voucher.delete({ where: { id: params.id, storeId: user.storeId } });

    logger.info('Voucher deleted', {
      storeId: user.storeId,
      userId: user.id,
      voucherId: params.id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error(
      'Failed to delete voucher',
      { voucherId: params.id },
      error instanceof Error ? error : String(error)
    );
    return NextResponse.json({ error: 'Failed to delete voucher' }, { status: 500 });
  }
}
