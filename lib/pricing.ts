/**
 * Harga efektif satu produk, dan sisa kuota harga coretnya.
 *
 * `discountPrice` sudah tayang sebagai harga coret di storefront sejak dulu,
 * tapi tanpa jendela waktu, tanpa kuota, dan checkout tetap menagih
 * `sellingPrice`. Dua tempat yang memutuskan harga sendiri itulah yang membuat
 * pelanggan bisa melihat satu harga dan ditagih harga lain. Modul ini jadi
 * satu-satunya tempat keputusan itu diambil.
 *
 * Murni dan bebas impor Prisma: dipakai `services/transactionService.ts` di
 * server dan komponen storefront di klien.
 */

/**
 * Prisma hands over a `Date`; the JSON API hands over an ISO string. Accepting
 * both here is what keeps the storefront and the server from reaching
 * different verdicts on the same row.
 */
export type SaleDate = string | Date | null;

/** Field minimum yang dibutuhkan untuk memutuskan harga. */
export interface SalePricing {
  sellingPrice: number;
  discountPrice: number | null;
  saleStartsAt: SaleDate;
  saleEndsAt: SaleDate;
  saleQuota: number | null;
  saleSold: number;
}

/** Epoch ms, atau null kalau tidak ada tanggal yang bisa dibaca. */
function toTime(value: SaleDate): number | null {
  if (value == null) return null;

  const time = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
}

/**
 * Jendela dan kuota `null` berarti tanpa batas — bukan tidak pernah aktif.
 * Baris `discountPrice` yang dipasang sebelum kolom itu ada tidak punya
 * keduanya, dan harus tetap tayang setelah migrasi.
 */
export function isSaleActive(product: SalePricing, now: Date = new Date()): boolean {
  if (product.discountPrice == null) return false;

  // "Harga coret" yang tidak lebih murah dari harga jual bukan diskon, dan
  // menampilkannya hanya membuat toko terlihat menaikkan harga.
  if (product.discountPrice >= product.sellingPrice) return false;

  const startsAt = toTime(product.saleStartsAt);
  if (startsAt != null && now.getTime() < startsAt) return false;

  const endsAt = toTime(product.saleEndsAt);
  if (endsAt != null && now.getTime() >= endsAt) return false;

  if (product.saleQuota != null && product.saleSold >= product.saleQuota) return false;

  return true;
}

/** Harga satuan yang harus ditagih. Harga coret kalau sedang aktif. */
export function resolveUnitPrice(product: SalePricing, now: Date = new Date()): number {
  return isSaleActive(product, now) ? (product.discountPrice as number) : product.sellingPrice;
}

/** Sisa unit yang masih boleh terjual di harga coret. `null` = tak terbatas. */
export function saleRemaining(product: SalePricing): number | null {
  if (product.saleQuota == null) return null;
  return Math.max(0, product.saleQuota - product.saleSold);
}
