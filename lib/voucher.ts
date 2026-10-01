/**
 * Aturan kelayakan dan perhitungan potongan voucher.
 *
 * Murni dan bebas impor Prisma, supaya form klaim di storefront, validasi di
 * keranjang, dan pemotongan sebenarnya di `createOrder` memakai aturan yang
 * sama persis. Kalau ketiganya punya salinan sendiri, cepat atau lambat salah
 * satu akan mengizinkan yang dua lainnya tolak.
 */

export type VoucherTypeName = 'FIXED' | 'PERCENT';

export interface VoucherRules {
  type: VoucherTypeName;
  /** Rupiah untuk FIXED, persen penuh (10 = 10%) untuk PERCENT. */
  value: number;
  maxDiscount: number | null;
  minPurchase: number | null;
  startsAt: Date | null;
  endsAt: Date | null;
  /** Berapa kali boleh diklaim; null = tak terbatas. */
  quota: number | null;
  claimed: number;
  isActive: boolean;
}

export type VoucherRejection =
  | 'NOT_FOUND'
  | 'INACTIVE'
  | 'NOT_STARTED'
  | 'EXPIRED'
  | 'QUOTA_FULL'
  | 'MIN_PURCHASE'
  | 'ALREADY_USED'
  | 'NOT_CLAIMED';

export type VoucherEligibility = { ok: true } | { ok: false; reason: VoucherRejection };

/** Kalimat yang boleh dibaca pelanggan. Yang lain tidak pernah sampai ke UI. */
export const VOUCHER_REJECTION_LABELS: Record<VoucherRejection, string> = {
  NOT_FOUND: 'Kode voucher tidak ditemukan',
  INACTIVE: 'Voucher sedang tidak aktif',
  NOT_STARTED: 'Voucher belum mulai berlaku',
  EXPIRED: 'Voucher sudah kedaluwarsa',
  QUOTA_FULL: 'Kuota voucher sudah habis',
  MIN_PURCHASE: 'Belanja belum mencapai minimum untuk voucher ini',
  ALREADY_USED: 'Voucher ini sudah pernah dipakai',
  NOT_CLAIMED: 'Klaim dulu voucher ini sebelum dipakai',
};

/** Jendela aktif + tombol on/off admin. Dipakai jalur klaim maupun jalur pakai. */
function checkVoucherWindow(voucher: VoucherRules, now: Date): VoucherEligibility {
  if (!voucher.isActive) return { ok: false, reason: 'INACTIVE' };
  if (voucher.startsAt && now < voucher.startsAt) return { ok: false, reason: 'NOT_STARTED' };
  if (voucher.endsAt && now >= voucher.endsAt) return { ok: false, reason: 'EXPIRED' };
  return { ok: true };
}

/** Boleh diklaim sekarang? Kuota dihitung dari yang sudah diklaim. */
export function checkVoucherClaimable(
  voucher: VoucherRules,
  now: Date = new Date()
): VoucherEligibility {
  const window = checkVoucherWindow(voucher, now);
  if (!window.ok) return window;

  if (voucher.quota != null && voucher.claimed >= voucher.quota) {
    return { ok: false, reason: 'QUOTA_FULL' };
  }

  return { ok: true };
}

/** Boleh dipakai di keranjang senilai `subtotal`? */
export function checkVoucherUsable(
  voucher: VoucherRules,
  claim: { usedAt: Date | null } | null,
  subtotal: number,
  now: Date = new Date()
): VoucherEligibility {
  const window = checkVoucherWindow(voucher, now);
  if (!window.ok) return window;

  if (!claim) return { ok: false, reason: 'NOT_CLAIMED' };
  if (claim.usedAt) return { ok: false, reason: 'ALREADY_USED' };

  if (voucher.minPurchase != null && subtotal < voucher.minPurchase) {
    return { ok: false, reason: 'MIN_PURCHASE' };
  }

  return { ok: true };
}

/**
 * Potongan dalam rupiah. Tidak memeriksa kelayakan — panggil
 * `checkVoucherUsable` lebih dulu.
 *
 * Selalu di-clamp ke `subtotal`. Tanpa ini, voucher Rp50.000 di keranjang
 * Rp10.000 menghasilkan total negatif, dan toko yang membayar pelanggan.
 * Dibulatkan ke bawah supaya pembulatan tidak pernah melewati batas potongan.
 */
export function resolveVoucherDiscount(voucher: VoucherRules, subtotal: number): number {
  if (subtotal <= 0) return 0;

  const raw = voucher.type === 'FIXED' ? voucher.value : (subtotal * voucher.value) / 100;
  const capped = voucher.maxDiscount != null ? Math.min(raw, voucher.maxDiscount) : raw;

  return Math.max(0, Math.min(Math.floor(capped), Math.floor(subtotal)));
}
