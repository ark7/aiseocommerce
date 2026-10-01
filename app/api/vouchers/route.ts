import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkVoucherClaimable } from '@/lib/voucher';

/**
 * The storefront's list of vouchers that can still be claimed.
 *
 * `code` is deliberately absent: the kode is what a claim hands over, and a
 * list that already showed it would make the claim button a decoration. The
 * fields are listed one by one rather than returning the row — the row carries
 * counters and storeId that no anonymous visitor needs.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');

    if (!storeId) {
      return NextResponse.json({ error: 'storeId is required' }, { status: 400 });
    }

    const now = new Date();
    const vouchers = await prisma.voucher.findMany({
      where: { storeId, isActive: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        name: true,
        description: true,
        type: true,
        value: true,
        maxDiscount: true,
        minPurchase: true,
        startsAt: true,
        endsAt: true,
        quota: true,
        claimed: true,
        isActive: true,
      },
    });

    // Filtered in memory rather than in SQL: the window and quota rules already
    // live in `lib/voucher`, and a second copy in the query would be one more
    // place for the two to disagree.
    const claimable = vouchers
      .filter((voucher) => checkVoucherClaimable(voucher, now).ok)
      .map((voucher) => ({
        id: voucher.id,
        name: voucher.name,
        description: voucher.description,
        type: voucher.type,
        value: voucher.value,
        maxDiscount: voucher.maxDiscount,
        minPurchase: voucher.minPurchase,
        startsAt: voucher.startsAt,
        endsAt: voucher.endsAt,
        remaining: voucher.quota == null ? null : Math.max(0, voucher.quota - voucher.claimed),
      }));

    return NextResponse.json({ success: true, vouchers: claimable });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch vouchers' }, { status: 500 });
  }
}
