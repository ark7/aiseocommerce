import { isSaleActive, resolveUnitPrice, saleRemaining } from '@/lib/pricing';
import type { SalePricing } from '@/lib/pricing';

const NOW = new Date('2026-10-01T12:00:00.000Z');

function product(overrides: Partial<SalePricing> = {}): SalePricing {
  return {
    sellingPrice: 100_000,
    discountPrice: 75_000,
    saleStartsAt: null,
    saleEndsAt: null,
    saleQuota: null,
    saleSold: 0,
    ...overrides,
  };
}

describe('harga coret berkuota dan berbatas waktu', () => {
  it('aktif tanpa jendela dan tanpa kuota', () => {
    expect(isSaleActive(product(), NOW)).toBe(true);
    expect(resolveUnitPrice(product(), NOW)).toBe(75_000);
  });

  it('belum aktif sebelum jendela mulai', () => {
    const p = product({ saleStartsAt: new Date('2026-10-02T00:00:00.000Z') });

    expect(isSaleActive(p, NOW)).toBe(false);
    expect(resolveUnitPrice(p, NOW)).toBe(100_000);
  });

  it('aktif tepat pada saat jendela mulai', () => {
    expect(isSaleActive(product({ saleStartsAt: NOW }), NOW)).toBe(true);
  });

  it('nonaktif tepat pada saat jendela berakhir', () => {
    const p = product({ saleEndsAt: NOW });

    expect(isSaleActive(p, NOW)).toBe(false);
    expect(resolveUnitPrice(p, NOW)).toBe(100_000);
  });

  it('nonaktif saat kuota terpakai habis', () => {
    const p = product({ saleQuota: 10, saleSold: 10 });

    expect(isSaleActive(p, NOW)).toBe(false);
    expect(resolveUnitPrice(p, NOW)).toBe(100_000);
  });

  it('masih aktif saat kuota tersisa satu', () => {
    expect(isSaleActive(product({ saleQuota: 10, saleSold: 9 }), NOW)).toBe(true);
  });

  it('nonaktif kalau tidak ada harga coret', () => {
    const p = product({ discountPrice: null });

    expect(isSaleActive(p, NOW)).toBe(false);
    expect(resolveUnitPrice(p, NOW)).toBe(100_000);
  });

  it('mengabaikan harga coret yang tidak lebih murah dari harga jual', () => {
    const p = product({ discountPrice: 120_000 });

    expect(isSaleActive(p, NOW)).toBe(false);
    expect(resolveUnitPrice(p, NOW)).toBe(100_000);
  });

  it('membaca tanggal ISO dari JSON API sama seperti objek Date', () => {
    // Storefront menerima tanggal sebagai string, server sebagai Date. Kalau
    // keduanya tidak menghasilkan putusan yang sama, pelanggan melihat satu
    // harga dan ditagih harga lain.
    expect(isSaleActive(product({ saleEndsAt: '2026-10-01T12:00:00.000Z' }), NOW)).toBe(false);
    expect(isSaleActive(product({ saleEndsAt: '2026-10-02T00:00:00.000Z' }), NOW)).toBe(true);
    expect(isSaleActive(product({ saleStartsAt: '2026-10-02T00:00:00.000Z' }), NOW)).toBe(false);
  });

  it('menagih harga jual, bukan harga coret, saat kuota baru saja habis', () => {
    const p = product({ saleQuota: 100, saleSold: 100 });

    expect(resolveUnitPrice(p, NOW)).toBe(p.sellingPrice);
  });
});

describe('sisa kuota harga coret', () => {
  it('null berarti tak terbatas', () => {
    expect(saleRemaining(product())).toBeNull();
  });

  it('menghitung sisa yang masih boleh terjual di harga coret', () => {
    expect(saleRemaining(product({ saleQuota: 50, saleSold: 12 }))).toBe(38);
  });

  it('tidak pernah negatif walau penjualan melewati kuota', () => {
    expect(saleRemaining(product({ saleQuota: 5, saleSold: 9 }))).toBe(0);
  });
});
