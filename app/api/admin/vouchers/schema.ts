import { z } from 'zod';

/**
 * The input contract for the admin voucher endpoints.
 *
 * In its own module rather than beside the handlers: a Next.js `route.ts` may
 * export handlers and route config and nothing else, so a schema exported from
 * there fails the build ("not a valid Route export field").
 */

/** Prisma's code for "a unique constraint rejected this write". */
export const UNIQUE_VIOLATION = 'P2002';

/**
 * Kode ditulis huruf besar supaya "hemat10" dan "HEMAT10" tidak jadi dua
 * voucher berbeda. Karakter dibatasi ke yang aman ditempel di URL dan dibaca
 * ulang tanpa salah ketik.
 */
export const VoucherInputSchema = z
  .object({
    // Six, not three: the code is the only secret a voucher has, and the
    // validate endpoint answers whether a code exists. Three characters is
    // about 46.000 possibilities — a minute of guessing, not a secret.
    code: z
      .string()
      .trim()
      .min(6, 'Kode minimal 6 karakter')
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
