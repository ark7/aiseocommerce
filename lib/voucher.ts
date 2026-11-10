import { z } from 'zod';

export type VoucherRules = {
  type: 'FIXED' | 'PERCENT';
  value: number;
  maxDiscount: number | null;
  minPurchase: number | null;
  startsAt: Date | null;
  endsAt: Date | null;
  quota: number | null;
  claimed: number;
  isActive: boolean;
};

export type VoucherClaim = {
  id?: string;
  usedAt: Date | null;
};

export type VoucherRejection =
  | 'NOT_FOUND'
  | 'INACTIVE'
  | 'NOT_STARTED'
  | 'EXPIRED'
  | 'QUOTA_FULL'
  | 'MIN_PURCHASE'
  | 'ALREADY_USED'
  | 'NOT_CLAIMED';

export const VOUCHER_REJECTION_LABELS: Record<VoucherRejection, string> = {
  NOT_FOUND: 'Kode voucher tidak ditemukan',
  INACTIVE: 'Voucher tidak aktif',
  NOT_STARTED: 'Voucher belum dimulai',
  EXPIRED: 'Voucher sudah berakhir',
  QUOTA_FULL: 'Kuota voucher sudah habis',
  MIN_PURCHASE: 'Belanja minimum belum terpenuhi',
  ALREADY_USED: 'Voucher sudah digunakan',
  NOT_CLAIMED: 'Voucher belum diklaim',
};

export function checkVoucherClaimable(voucher: VoucherRules, now: Date = new Date()): { ok: true } | { ok: false; reason: VoucherRejection } {
  if (!voucher.isActive) return { ok: false, reason: 'INACTIVE' };
  if (voucher.startsAt && now < voucher.startsAt) return { ok: false, reason: 'NOT_STARTED' };
  if (voucher.endsAt && now >= voucher.endsAt) return { ok: false, reason: 'EXPIRED' };
  if (voucher.quota !== null && voucher.claimed >= voucher.quota) return { ok: false, reason: 'QUOTA_FULL' };

  return { ok: true };
}

export function checkVoucherUsable(voucher: VoucherRules, claim: VoucherClaim | null, subtotal: number, now: Date = new Date()): { ok: true } | { ok: false; reason: VoucherRejection } {
  if (!claim) return { ok: false, reason: 'NOT_CLAIMED' };
  if (claim.usedAt) return { ok: false, reason: 'ALREADY_USED' };

  const claimable = checkVoucherClaimable(voucher, now);
  if (!claimable.ok) return claimable;

  if (voucher.minPurchase !== null && subtotal < voucher.minPurchase) {
    return { ok: false, reason: 'MIN_PURCHASE' };
  }

  return { ok: true };
}

export function resolveVoucherDiscount(voucher: VoucherRules, subtotal: number): number {
  const safeSubtotal = Math.max(0, subtotal);
  const discount = Math.floor(
    voucher.type === 'FIXED'
      ? voucher.value
      : safeSubtotal * (voucher.value / 100)
  );

  if (voucher.maxDiscount !== null) {
    return Math.min(discount, voucher.maxDiscount, safeSubtotal);
  }

  return Math.min(discount, safeSubtotal);
}