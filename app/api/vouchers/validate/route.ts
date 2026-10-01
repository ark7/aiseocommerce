import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { getIPAddress } from '@/lib/ip';
import { allow } from '@/lib/rateLimit';
import {
  VOUCHER_REJECTION_LABELS,
  checkVoucherUsable,
  resolveVoucherDiscount,
} from '@/lib/voucher';

const ValidateSchema = z.object({
  storeId: z.string().min(1),
  code: z.string().trim().min(1).max(32),
  subtotal: z.number().nonnegative(),
});

/** A short code is guessable; 20 tries a minute still leaves 20 every minute forever. */
const ATTEMPTS_PER_WINDOW = 20;

/**
 * Check a code against a cart total and report what it would take off.
 *
 * Nothing is written here — the discount is only real once `createOrder`
 * applies it inside its own transaction. This endpoint just lets the cart show
 * the number before the buyer commits.
 */
export async function POST(request: Request) {
  try {
    const ip = getIPAddress(request);
    if (!allow(`voucher-validate:${ip}`, ATTEMPTS_PER_WINDOW)) {
      return NextResponse.json(
        { error: 'Terlalu banyak percobaan. Coba lagi sebentar lagi.' },
        { status: 429 }
      );
    }

    const { storeId, code, subtotal } = ValidateSchema.parse(await request.json());

    // A guest may type a code; they just cannot have a claim, and the answer
    // says so rather than pretending the code is wrong.
    const user = await requireUser(request);

    const voucher = await prisma.voucher.findUnique({
      where: { storeId_code: { storeId, code: code.toUpperCase() } },
      select: {
        id: true,
        code: true,
        name: true,
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
    if (!voucher) {
      return NextResponse.json(
        { error: VOUCHER_REJECTION_LABELS.NOT_FOUND, reason: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Scoped to the token's store: a customer of one store must not be able to
    // probe another store's vouchers by passing its id.
    if (user && user.storeId !== storeId) {
      return NextResponse.json(
        { error: VOUCHER_REJECTION_LABELS.NOT_FOUND, reason: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const claim = user
      ? await prisma.voucherClaim.findUnique({
          where: { voucherId_userId: { voucherId: voucher.id, userId: user.id } },
          select: { usedAt: true },
        })
      : null;

    const eligibility = checkVoucherUsable(voucher, claim, subtotal);
    if (!eligibility.ok) {
      return NextResponse.json(
        { error: VOUCHER_REJECTION_LABELS[eligibility.reason], reason: eligibility.reason },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      discount: resolveVoucherDiscount(voucher, subtotal),
      voucher: { code: voucher.code, name: voucher.name },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }

    return NextResponse.json({ error: 'Gagal memeriksa voucher' }, { status: 500 });
  }
}
