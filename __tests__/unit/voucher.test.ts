import {
  VOUCHER_REJECTION_LABELS,
  checkVoucherClaimable,
  checkVoucherUsable,
  resolveVoucherDiscount,
} from '@/lib/voucher';
import type { VoucherRejection, VoucherRules } from '@/lib/voucher';

const NOW = new Date('2026-10-01T12:00:00.000Z');
const UNUSED = { usedAt: null };

function voucher(overrides: Partial<VoucherRules> = {}): VoucherRules {
  return {
    type: 'PERCENT',
    value: 10,
    maxDiscount: null,
    minPurchase: null,
    startsAt: null,
    endsAt: null,
    quota: null,
    claimed: 0,
    isActive: true,
    ...overrides,
  };
}

describe('kelayakan klaim voucher', () => {
  it('boleh diklaim saat aktif dan berkuota tersisa', () => {
    expect(checkVoucherClaimable(voucher({ quota: 100, claimed: 12 }), NOW)).toEqual({ ok: true });
  });

  it('ditolak saat kuota klaim sudah penuh', () => {
    expect(checkVoucherClaimable(voucher({ quota: 100, claimed: 100 }), NOW)).toEqual({
      ok: false,
      reason: 'QUOTA_FULL',
    });
  });

  it('ditolak sebelum jendela mulai', () => {
    const v = voucher({ startsAt: new Date('2026-10-02T00:00:00.000Z') });

    expect(checkVoucherClaimable(v, NOW)).toEqual({ ok: false, reason: 'NOT_STARTED' });
  });

  it('ditolak tepat setelah jendela berakhir', () => {
    expect(checkVoucherClaimable(voucher({ endsAt: NOW }), NOW)).toEqual({
      ok: false,
      reason: 'EXPIRED',
    });
  });

  it('ditolak saat admin mematikannya, walau jendelanya masih terbuka', () => {
    expect(checkVoucherClaimable(voucher({ isActive: false }), NOW)).toEqual({
      ok: false,
      reason: 'INACTIVE',
    });
  });
});

describe('kelayakan pakai voucher', () => {
  it('menerima klaim yang belum dipakai', () => {
    expect(checkVoucherUsable(voucher(), UNUSED, 150_000, NOW)).toEqual({ ok: true });
  });

  it('mewajibkan klaim lebih dulu', () => {
    expect(checkVoucherUsable(voucher(), null, 150_000, NOW)).toEqual({
      ok: false,
      reason: 'NOT_CLAIMED',
    });
  });

  it('menolak klaim yang sudah dipakai di pesanan lain', () => {
    const used = { usedAt: new Date('2026-09-30T00:00:00.000Z') };

    expect(checkVoucherUsable(voucher(), used, 150_000, NOW)).toEqual({
      ok: false,
      reason: 'ALREADY_USED',
    });
  });

  it('menolak saat belanja di bawah minimum', () => {
    const v = voucher({ minPurchase: 200_000 });

    expect(checkVoucherUsable(v, UNUSED, 199_999, NOW)).toEqual({
      ok: false,
      reason: 'MIN_PURCHASE',
    });
  });

  it('menerima tepat pada nilai minimum', () => {
    const v = voucher({ minPurchase: 200_000 });

    expect(checkVoucherUsable(v, UNUSED, 200_000, NOW)).toEqual({ ok: true });
  });

  it('menolak voucher yang jendelanya sudah lewat walau klaimnya masih tersimpan', () => {
    expect(checkVoucherUsable(voucher({ endsAt: NOW }), UNUSED, 150_000, NOW)).toEqual({
      ok: false,
      reason: 'EXPIRED',
    });
  });
});

describe('besar potongan voucher', () => {
  it('FIXED memotong sebesar nilainya', () => {
    expect(resolveVoucherDiscount(voucher({ type: 'FIXED', value: 20_000 }), 150_000)).toBe(20_000);
  });

  it('PERCENT menghitung persen penuh dari subtotal', () => {
    expect(resolveVoucherDiscount(voucher({ type: 'PERCENT', value: 15 }), 200_000)).toBe(30_000);
  });

  it('maxDiscount membatasi potongan persen', () => {
    const v = voucher({ type: 'PERCENT', value: 50, maxDiscount: 25_000 });

    expect(resolveVoucherDiscount(v, 200_000)).toBe(25_000);
  });

  it('tidak pernah memotong lebih dari subtotal', () => {
    const v = voucher({ type: 'FIXED', value: 50_000 });

    expect(resolveVoucherDiscount(v, 10_000)).toBe(10_000);
    expect(resolveVoucherDiscount(v, 50_000)).toBe(50_000);
  });

  it('persen di atas 100 pun tidak melewati subtotal', () => {
    expect(resolveVoucherDiscount(voucher({ type: 'PERCENT', value: 150 }), 80_000)).toBe(80_000);
  });

  it('subtotal nol atau negatif menghasilkan potongan nol', () => {
    const v = voucher({ type: 'FIXED', value: 50_000 });

    expect(resolveVoucherDiscount(v, 0)).toBe(0);
    expect(resolveVoucherDiscount(v, -1_000)).toBe(0);
  });

  it('membulatkan ke bawah', () => {
    expect(resolveVoucherDiscount(voucher({ type: 'PERCENT', value: 10 }), 99_999)).toBe(9_999);
  });
});

describe('label penolakan', () => {
  it('menyediakan kalimat untuk setiap alasan', () => {
    const reasons: VoucherRejection[] = [
      'NOT_FOUND',
      'INACTIVE',
      'NOT_STARTED',
      'EXPIRED',
      'QUOTA_FULL',
      'MIN_PURCHASE',
      'ALREADY_USED',
      'NOT_CLAIMED',
    ];

    for (const reason of reasons) {
      expect(VOUCHER_REJECTION_LABELS[reason]).toBeTruthy();
    }
  });
});
