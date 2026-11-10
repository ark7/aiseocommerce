import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { checkVoucherClaimable } from '@/lib/voucher';

export const dynamic = 'force-dynamic';

const storeIdSchema = z.object({
  storeId: z.string().min(1, 'Store ID harus diisi'),
});

function formatVoucher(voucher: any, now: Date) {
  const claimable = checkVoucherClaimable(voucher, now);
  return {
    id: voucher.id,
    name: voucher.name,
    description: voucher.description,
    type: voucher.type,
    value: voucher.value,
    maxDiscount: voucher.maxDiscount,
    minPurchase: voucher.minPurchase,
    endsAt: voucher.endsAt,
    remaining: voucher.quota !== null ? Math.max(0, voucher.quota - voucher.claimed) : null,
    isClaimable: claimable.ok,
    claimReason: claimable.ok ? undefined : claimable.reason,
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');

    const validation = storeIdSchema.safeParse({ storeId });
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.format() }, { status: 400 });
    }

    const now = new Date();
    const vouchers = await prisma.voucher.findMany({
      where: {
        storeId: validation.data.storeId,
        isActive: true,
        AND: [
          {
            OR: [
              { startsAt: null },
              { startsAt: { lte: now } },
            ],
          },
          {
            OR: [
              { endsAt: null },
              { endsAt: { gt: now } },
            ],
          },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      vouchers: vouchers.map((v) => formatVoucher(v, now)),
    });
  } catch (error) {
    logger.error(
      'Failed to fetch vouchers',
      {},
      error instanceof Error ? error : String(error)
    );
    return NextResponse.json({ error: 'Failed to fetch vouchers' }, { status: 500 });
  }
}