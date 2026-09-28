# Plan: Menu Pemesanan & Refleksi Hasil Penjualan di Menu Keuangan

**Source**: permintaan bebas
**Complexity**: Medium
**Status**: sebagian selesai, sebagian menunggu keputusan

> Catatan: berkas ini pernah memuat rencana berbasis `/api/admin/stats` yang tidak
> pernah dikerjakan. Isinya diganti dengan apa yang benar-benar dibangun, supaya
> tidak lagi menyesatkan. Commit `ff6c8fe` sebelumnya sudah memperbaiki jalur stats.

## Ringkasan

Penjualan dari menu pemesanan kini masuk ke buku keuangan, kategori transaksi jadi
master data, daftar pesanan berpaginasi, dan bagian atas funnel produk terekam.

## Yang sudah selesai

| # | Perubahan | Bukti |
|---|-----------|-------|
| 1 | Order lunas → baris ledger INCOME, idempoten, dari semua jalur (menu pesanan, verifikasi manual, webhook) | `services/transactionService.ts` `recordOrderIncome`; dipanggil `services/orderStatusService.ts`, `app/api/payment/{verify,webhook}/route.ts` |
| 2 | Refund/void mencari baris ledger INCOME, bukan baris payment PAID | `services/orderStatusService.ts` (~L123) |
| 3 | `REVENUE_STATUSES` menandai status yang uangnya menetap | `lib/orderStatus.ts` |
| 4 | Master data kategori ledger (CRUD + validasi di 2 jalur tulis + panel UI) | `prisma/schema.prisma` `LedgerCategory`, `lib/ledgerCategory.ts`, `app/api/admin/finance/categories/route.ts` |
| 5 | Kategori default untuk toko baru | `lib/ledgerCategory.ts` `DEFAULT_LEDGER_CATEGORIES`, dipanggil `app/api/stores/route.ts` |
| 6 | Pagination pesanan + pemilih ukuran 5/10/25/50/100 | `app/api/orders/route.ts`, `app/admin/orders/page.tsx` |
| 7 | Ingest funnel produk (VIEW / ADD_TO_CART / CHECKOUT_START) | `prisma/schema.prisma` `ProductEvent`, `lib/funnelEvents.ts`, `app/api/events/route.ts`, `lib/rateLimit.ts` |

Commit: `02c8fbe`, `cfaf3aa`, `1b36070`, `a5621bb`, `3d4c36d`, `0f3a24a`.

## Yang belum selesai

| # | Item | Kenapa belum |
|---|------|--------------|
| A | Pemancar funnel di storefront | Endpoint ingest ada, nol pemanggil. `product_events` masih 0 baris. Menunggu keputusan apakah funnel dilanjutkan |
| B | Halaman/endpoint laporan funnel | Baru berguna setelah A ada |
| C | Backfill kategori untuk toko lama | Demo store sudah di-backfill manual (13 baris); toko lain belum, dan `prisma/seed.ts` menulis daftarnya sendiri |

## Batasan yang diketahui

| Batasan | Dampak | Kapan perlu ditangani |
|---------|--------|-----------------------|
| `lib/rateLimit.ts` in-process | Batas per instance, bukan per kluster | Saat deploy multi-instance |
| `recordOrderIncome` cek-lalu-tulis tidak atomik | Dua pemanggil bersamaan bisa dobel catat | Saat benar-benar muncul; tambahkan unique index `(referenceType, referenceId)` |
| Tak ada folder `prisma/migrations/` | Deploy harus `npm run db:push` | Saat pindah ke alur migrate |
| `ts-node` menjalankan `prisma/seed.ts` sebagai ESM | Impor relatif `.ts` gagal; `@/` juga tak resolve | Kalau seed.ts perlu berbagi kode dengan `lib/` |

## Validasi

```bash
npx tsc --noEmit          # bersih
npx next lint             # bersih
npm test                  # 29 suite, 474 lulus, 2 skip
```

## Keputusan yang menunggu

Lanjutkan funnel (pemancar di storefront + halaman laporan), atau hapus
`app/api/events/` + `lib/funnelEvents.ts` dan simpan modelnya sampai dibutuhkan.
