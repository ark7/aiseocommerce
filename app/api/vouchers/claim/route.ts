import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { VOUCHER_REJECTION_LABELS, checkVoucherClaimable } from '@/lib/voucher';

const ClaimSchema = z.object({ voucherId: z.string().min(1) });

/** Prisma's code for "a unique constraint rejected this write". */
const UNIQUE_VIOLATION = 'P2002';

/**
 * Claim a voucher for the signed-in customer.
 *
 * Idempotent on purpose: `@@unique([voucherId, userId])` means a double click
 * lands on the same row, and the second call answers with the existing claim
 * instead of an error. The customer asked for the voucher and they have it.
 */
export async function POST(request: Request) {
  // Hoisted so the catch block can still say who was claiming what.
  let storeId: string | undefined;
  let userId: string | undefined;
  let voucherId: string | undefined;

  try {
    const user = await requireUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'CUSTOMER') {
      return NextResponse.json({ error: 'Hanya pelanggan yang bisa klaim voucher' }, { status: 403 });
    }

    storeId = user.storeId;
    userId = user.id;

    const parsed = ClaimSchema.parse(await request.json());
    voucherId = parsed.voucherId;

    const voucher = await prisma.voucher.findUnique({ where: { id: parsed.voucherId } });
    if (!voucher) return NextResponse.json({ error: 'Voucher not found' }, { status: 404 });
    // A voucher from another store must look like it does not exist.
    if (voucher.storeId !== user.storeId) {
      return NextResponse.json({ error: 'Voucher not found' }, { status: 404 });
    }

    const existing = await prisma.voucherClaim.findUnique({
      where: { voucherId_userId: { voucherId: parsed.voucherId, userId: user.id } },
    });
    if (existing) {
      return NextResponse.json({
        success: true,
        alreadyClaimed: true,
        claim: { ...existing, code: voucher.code },
      });
    }

    const eligibility = checkVoucherClaimable(voucher);
    if (!eligibility.ok) {
      return NextResponse.json(
        { error: VOUCHER_REJECTION_LABELS[eligibility.reason], reason: eligibility.reason },
        { status: 409 }
      );
    }

    const claim = await prisma.$transaction(async (tx) => {
      const created = await tx.voucherClaim.create({
        data: { voucherId: parsed.voucherId, userId: user.id },
      });

      // The quota check happens in the WHERE, at write time, so two people
      // claiming the last slot cannot both read "1 left" and both take it.
      // `lt` uses the value read above; the comparison itself is atomic.
      const reserved = await tx.voucher.updateMany({
        where: {
          id: parsed.voucherId,
          storeId: user.storeId,
          OR: [{ quota: null }, { claimed: { lt: voucher.quota ?? 0 } }],
        },
        data: { claimed: { increment: 1 } },
      });

      // Quota filled between the read and the write: undo the claim by
      // throwing, which rolls the whole transaction back.
      if (reserved.count === 0) throw new Error('VOUCHER_QUOTA_FULL');

      return created;
    });

    logger.info('Voucher claimed', {
      storeId: user.storeId,
      userId: user.id,
      voucherId,
      claimId: claim.id,
    });

    return NextResponse.json(
      { success: true, claim: { ...claim, code: voucher.code } },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }

    if (error instanceof Error && error.message === 'VOUCHER_QUOTA_FULL') {
      return NextResponse.json(
        { error: VOUCHER_REJECTION_LABELS.QUOTA_FULL, reason: 'QUOTA_FULL' },
        { status: 409 }
      );
    }

    // Lost the race to another claim by the same person: their claim exists,
    // and that is the outcome they wanted.
    if ((error as { code?: string } | null)?.code === UNIQUE_VIOLATION) {
      return NextResponse.json({ error: 'Voucher ini sudah Anda klaim' }, { status: 409 });
    }

    logger.error(
      'Failed to claim voucher',
      { storeId, userId, voucherId },
      error instanceof Error ? error : String(error)
    );
    return NextResponse.json({ error: 'Failed to claim voucher' }, { status: 500 });
  }
}
