import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { logger } from '@/lib/logger';

/** Prisma's code for "a unique constraint rejected this write". */
const UNIQUE_VIOLATION = 'P2002';

/**
 * Kode ditulis huruf besar supaya "hemat10" dan "HEMAT10" tidak jadi dua
 * voucher berbeda. Karakter dibatasi ke yang aman ditempel di URL dan dibaca
 * ulang tanpa salah ketik.
 */
export const VoucherInputSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(3, 'Kode minimal 3 karakter')
      .max(32, 'Kode maksimal 32 karakter')
      .regex(/^[A-Za-z0-9_-]+$/, 'Kode hanya boleh huruf, angka, - dan _')
      .transform((code) => code.toUpperCase()),
    name: z.string().trim().min(1, 'Nama wajib diisi').max(120),
    description: z.string().trim().max(500).nullish(),
    type: z.enum(['FIXED', 'PERCENT']),
    value: z.number().positive('Nilai potongan harus lebih dari 0'),
    maxDiscount: z.number().min(0).nullish(),
    minPurchase: z.number().min(0).nullish(),
    startsAt: z.coerce.date().nullish(),
    endsAt: z.coerce.date().nullish(),
    quota: z.number().int().positive().nullish(),
    isActive: z.boolean().optional(),
  })
  // Persen di atas 100 adalah salah ketik, bukan niat: potongannya toh tetap
  // dibatasi subtotal, jadi membiarkannya lolos hanya menyembunyikan kesalahan.
  .superRefine((voucher, ctx) => {
    if (voucher.type === 'PERCENT' && voucher.value > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['value'],
        message: 'Potongan persen tidak boleh lebih dari 100',
      });
    }
    if (voucher.startsAt && voucher.endsAt && voucher.endsAt <= voucher.startsAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endsAt'],
        message: 'Waktu berakhir harus setelah waktu mulai',
      });
    }
  });

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
