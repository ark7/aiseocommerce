# Plan: Harga Coret Berkuota + Voucher Klaim + Menu Penawaran

**Sumber**: `/plan` free-form — "harga coret dengan kuota dan batas waktu; voucher diskon dengan batas potongan, batas waktu, kuota; klaim di menu baru (penawaran menarik & berbatas waktu)"
**Kompleksitas**: Large
**Status**: SELESAI

Dikerjakan sesuai rencana, dengan dua penyimpangan yang dicatat di bawah:
`GET /api/vouchers` publik ditambahkan (tidak ada di rencana — halaman Penawaran
adalah Client Component dan butuh daftar voucher), dan `VoucherRejection`
mendapat `NOT_FOUND` untuk kode yang tidak ada.

## Ringkasan

`Product.discountPrice` sudah ada dan sudah dirender coret di 3 tempat (`product/[slug]/page.tsx:188`, `products/page.tsx:176`, `category/[slug]/page.tsx:160`) — **tapi tanpa kuota, tanpa batas waktu, dan checkout menagih `sellingPrice`, bukan harga coret**. Jadi ini bukan fitur dari nol: ini menutup celah yang sudah ada.

Tiga hal yang dibangun:
1. `Product` dapat jendela waktu + kuota untuk harga coretnya.
2. Model `Voucher` + `VoucherClaim` — klaim per pelanggan, dipakai saat checkout.
3. Halaman storefront `/[storeDomain]/penawaran` + panel admin `/admin/promo`.

Satu sumber kebenaran harga: `lib/pricing.ts`. Dihitung di server saat `createOrder`; klien hanya menampilkan.

## Keputusan Desain (kenapa begini)

| Keputusan | Alasan |
|---|---|
| Harga coret = kolom di `Product`, bukan tabel `Promo` baru | Permintaannya "setting harga coret" per produk. Kampanye multi-produk belum diminta → YAGNI. Naik ke tabel `Promo` kalau butuh satu jendela untuk banyak produk. |
| `saleEndsAt`/`saleQuota` **nullable** | Baris `discountPrice` lama tidak punya jendela. Null = tanpa batas → tidak ada harga yang mendadak naik saat migrasi. |
| Pakai ulang `discountPrice` sebagai harga coret | Kolom + 3 titik render + validasi Zod sudah ada. Menambah `salePrice` = kolom duplikat, dua harga yang bisa berbeda. |
| Kode voucher tetap di baris `Voucher`, hanya ditampilkan setelah klaim | Yang diklaim adalah *hak pakai*, bukan rahasia. Tidak perlu tabel kode unik per klaim. |
| Kuota dipotong pakai `updateMany` bersyarat | Baca-lalu-tulis bisa lolos saat dua checkout bersamaan — pola yang sama sudah dicatat sebagai `ponytail:` di `services/transactionService.ts:11-14`. |

## Pola yang Diikuti

| Kategori | Sumber | Pola |
|---|---|---|
| Route admin | `app/api/admin/settings/analytics/route.ts:10-45` | `requireUser` → cek `role !== 'ADMIN'` → Zod parse → `logger` → `revalidate*` |
| Error boundary | `app/api/products/route.ts:33-73` | `nullableNumber` / `nullableText` / `formBoolean` untuk FormData; `''`→`null`, absen→`undefined` |
| Transaksi | `services/transactionService.ts:63-150`, `:217-229` | Semua efek samping di dalam satu `prisma.$transaction` |
| Lib murni + tes | `lib/orderStatus.ts` ↔ `__tests__/unit/orderStatus.test.ts` | Fungsi murni tanpa Prisma, diuji tanpa DB |
| Zod di batas sistem | `app/api/products/route.ts:75-92`, `app/api/orders/route.ts:13-21` | Skema di modul route, bukan di lib |
| Rate limit | `lib/rateLimit.ts:23` `allow(...)` | Endpoint validasi kode voucher wajib dibatasi |
| Revalidasi cache | `lib/revalidate.ts:69,83,88` | `revalidateProduct` setelah tulis produk |
| Navigasi admin | `app/admin/layout.tsx:80-86` + map `Icons` di `:87-134` | Entri nav + satu fungsi SVG |
| Section storefront | `app/[storeDomain]/page.tsx:191-258` | Grid kartu `Link` + `Image` + badge absolut |

## File yang Berubah

| File | Aksi | Alasan |
|---|---|---|
| `prisma/schema.prisma` | UPDATE | `Product` +3 kolom; model `Voucher`, `VoucherClaim`; enum `VoucherType` |
| `lib/pricing.ts` | CREATE | `resolveUnitPrice`, `isSaleActive`, `saleRemaining` |
| `lib/voucher.ts` | CREATE | `checkVoucherEligibility`, `resolveVoucherDiscount` |
| `__tests__/unit/pricing.test.ts` | CREATE | Jendela waktu, kuota habis, batas potongan |
| `__tests__/unit/voucher.test.ts` | CREATE | Kelayakan + clamp subtotal |
| `services/transactionService.ts` | UPDATE | `createOrder` terima `voucherCode`; harga dari `resolveUnitPrice`; potong kuota atomik; tulis `Order.discount` |
| `app/api/orders/route.ts` | UPDATE | Teruskan `voucherCode`; balas 409 `PRICE_CHANGED` bila harga bergeser |
| `app/api/products/route.ts` | UPDATE | `productFields` + `saleStartsAt`/`saleEndsAt`/`saleQuota` |
| `app/api/admin/vouchers/route.ts` | CREATE | GET daftar + POST buat |
| `app/api/admin/vouchers/[id]/route.ts` | CREATE | PUT ubah + DELETE |
| `app/api/vouchers/route.ts` | CREATE | GET publik: voucher toko yang sedang bisa diklaim |
| `app/api/vouchers/claim/route.ts` | CREATE | POST klaim (butuh login CUSTOMER) |
| `app/api/vouchers/validate/route.ts` | CREATE | POST cek kode + hitung potongan, rate-limited |
| `app/admin/promo/page.tsx` | CREATE | CRUD voucher + daftar klaim |
| `app/admin/layout.tsx` | UPDATE | Entri nav "Promo" + `TagIcon` |
| `app/admin/products/add/page.tsx`, `edit/[id]/page.tsx` | UPDATE | Field harga coret / kuota / jendela |
| `app/[storeDomain]/penawaran/page.tsx` | CREATE | Menu Penawaran Menarik |
| `app/[storeDomain]/page.tsx`, `products/page.tsx`, `category/[slug]/page.tsx`, `product/[slug]/page.tsx` | UPDATE | Harga lewat `resolveUnitPrice`; badge sisa kuota + hitung mundur |
| `components/CartPage.tsx` | UPDATE | Input kode voucher, baris potongan, total akhir |
| `components/StoreHeader.tsx` | UPDATE | Tautan "Penawaran" |
| `components/SaleCountdown.tsx` | CREATE | Hitung mundur klien (`'use client'`) |

## Tugas

### Fase 1 — Skema + lib harga
- **Aksi**: Tambah `Product.saleStartsAt DateTime?`, `Product.saleEndsAt DateTime?`, `Product.saleQuota Int?`, `Product.saleSold Int @default(0)`. Buat `lib/pricing.ts`:
  - `isSaleActive(p, now)` → `discountPrice != null && (saleStartsAt == null || now >= saleStartsAt) && (saleEndsAt == null || now < saleEndsAt) && (saleQuota == null || saleSold < saleQuota)`
  - `resolveUnitPrice(p, now)` → `isSaleActive ? discountPrice : sellingPrice`
  - `saleRemaining(p)` → `saleQuota == null ? null : Math.max(0, saleQuota - saleSold)`
- **Ikuti**: `lib/orderStatus.ts` (murni, tanpa impor Prisma)
- **Validasi**: `npm test -- pricing`
- **Catatan**: `lib/pricing.ts` juga dipakai 6 titik render, jadi harga tampil dan harga tagih tidak bisa lagi berbeda.

### Fase 2 — Admin set harga coret
- **Aksi**: Tambah 3 field di form produk (`add/page.tsx`, `edit/[id]/page.tsx`) dan di `productFields` (`app/api/products/route.ts:75`). `saleQuota` pakai `nullableNumber`; tanggal pakai `nullableText` + `z.coerce.date()`.
- **Ikuti**: `nullableNumber`/`nullableText` di `app/api/products/route.ts:33-52`
- **Validasi**: `npx tsc --noEmit && npm test -- products`

### Fase 3 — Skema + lib voucher
- **Aksi**:
  ```prisma
  enum VoucherType { FIXED PERCENT }
  model Voucher {
    id String @id @default(cuid())
    storeId String
    code String
    name String
    description String?
    type VoucherType
    value Float
    maxDiscount Float?
    minPurchase Float?
    startsAt DateTime?
    endsAt DateTime?
    quota Int?
    claimed Int @default(0)
    used Int @default(0)
    isActive Boolean @default(true)
    @@unique([storeId, code])
  }
  model VoucherClaim {
    id String @id @default(cuid())
    voucherId String
    userId String
    claimedAt DateTime @default(now())
    usedAt DateTime?
    orderId String?
    @@unique([voucherId, userId])
  }
  ```
  `lib/voucher.ts`: `checkVoucherEligibility(voucher, subtotal, now)` → `{ ok: true } | { ok: false, reason }` dengan `reason` ∈ `INACTIVE | NOT_STARTED | EXPIRED | QUOTA_FULL | MIN_PURCHASE`.
  `resolveVoucherDiscount(voucher, subtotal)` → `min(subtotal, type === 'FIXED' ? value : subtotal * value / 100)` lalu di-cap `maxDiscount`.
- **Validasi**: `npm test -- voucher`
- **Wajib**: potongan selalu di-clamp ke `subtotal` — tanpa ini voucher Rp50.000 di keranjang Rp10.000 menghasilkan total negatif.

### Fase 4 — Admin voucher
- **Aksi**: Route `app/api/admin/vouchers` (GET/POST) + `[id]` (PUT/DELETE) mengikuti persis `app/api/admin/settings/analytics/route.ts`. Halaman `app/admin/promo/page.tsx` + entri nav.
- **Ikuti**: `app/api/admin/settings/analytics/route.ts:10-45`; nav `app/admin/layout.tsx:80-134`
- **Validasi**: `npm test && npm run lint`

### Fase 5 — Klaim + menu Penawaran
- **Aksi**: `app/api/vouchers/claim/route.ts` — `requireUser`, role `CUSTOMER`, `prisma.$transaction`, klaim idempoten via `@@unique([voucherId, userId])` (`P2002` → balas klaim yang sudah ada, bukan 500). Kuota klaim dipotong dengan `updateMany({ where: { id, OR: [{ quota: null }, { claimed: { lt: ... } }] } })`.
  Halaman `app/[storeDomain]/penawaran/page.tsx`: dua section — "Sedang Diskon" (produk dengan `isSaleActive`) dan "Voucher" (tombol Klaim; setelah klaim tampilkan kode + tombol salin). Link di `components/StoreHeader.tsx`.
- **Ikuti**: `app/[storeDomain]/page.tsx:191-258` untuk grid kartu + badge
- **Validasi**: manual — klaim dua kali tidak membuat baris ganda

### Fase 6 — Checkout
- **Aksi**: `createOrder(storeId, items, customerId, attribution, voucherCode?)`:
  - unit price dari `resolveUnitPrice(product, now)` (bukan `sellingPrice` mentah di `:97,:105`)
  - `resolveVoucherDiscount` → tulis ke `Order.discount` (`:76,:116` saat ini hardcode `0`)
  - potong `saleSold` + `Voucher.used` + tandai `VoucherClaim.usedAt` di transaksi yang sama; `updateMany` balas `count === 0` → batalkan transaksi
  - `POST /api/orders` balas **409 `PRICE_CHANGED`** + subtotal baru bila harga hasil hitung ≠ harga yang ditampilkan keranjang → `CartPage` perbarui keranjang dan minta konfirmasi ulang. Tanpa ini pelanggan bisa tertagih lebih mahal dari yang ia lihat.
  - `app/api/vouchers/validate/route.ts` dibungkus `allow()` dari `lib/rateLimit.ts:23` supaya kode tidak bisa di-brute-force.
- **Ikuti**: `services/transactionService.ts:63-150` (semua di satu transaksi)
- **Validasi**: `npm test -- transaction`

### Fase 7 — Tampilan batas waktu
- **Aksi**: `components/SaleCountdown.tsx` (`'use client'`, `useEffect` + `setInterval`, cleanup di return). Badge "Sisa N" dan "Berakhir dalam …" di kartu produk + halaman penawaran.
- **Validasi**: `npm run build`
- **Catatan**: hitung mundur murni kosmetik — keputusan aktif/tidak tetap di server (`lib/pricing.ts`), jadi jam klien yang salah tidak bisa memberi harga coret.

## Validasi

```bash
# Repo ini tidak punya prisma/migrations/, jadi pakai db push (lihat CLAUDE.md).
npx prisma generate && npx prisma db push
npx tsc --noEmit
npm run lint
npm test
npm run build
```

Hasil: `tsc` bersih, `next lint` bersih, 522 tes lulus (2 dilewati), `next build`
selesai dengan `/[storeDomain]/penawaran`, `/admin/promo`, `/api/vouchers`,
`/api/vouchers/claim`, `/api/vouchers/validate`, `/api/admin/vouchers` terdaftar.

## Risiko

| Risiko | Peluang | Mitigasi |
|---|---|---|
| Balapan kuota (sale & voucher) | Sedang | `updateMany` bersyarat di dalam transaksi; `count === 1`, kalau 0 → batalkan transaksi |
| Harga naik diam-diam di checkout | Sedang | 409 `PRICE_CHANGED` + konfirmasi ulang di keranjang |
| Diskon melebihi subtotal | Rendah | Clamp ke `subtotal` di `resolveVoucherDiscount`; ada tes |
| Kode voucher ditebak | Sedang | `allow()` di `/api/vouchers/validate`; kode minimal 6 karakter, unik per toko |
| Migrasi mematikan `discountPrice` lama | Tinggi kalau salah | Jendela & kuota nullable — null berarti tanpa batas |
| Kebocoran lewat endpoint publik | Rendah | `app/api/stores/[domain]/route.ts:50` sudah membocorkan `settings` utuh; endpoint voucher baru **jangan** meniru pola itu — balas field eksplisit saja |
| Halaman penawaran jadi lambat | Rendah | Query dibatasi `take`; revalidasi lewat `lib/revalidate.ts` |

## Kriteria Terima

- [x] Semua tugas selesai
- [x] Perintah validasi lulus
- [x] Harga coret tidak aktif di luar jendela / saat kuota habis — dibuktikan `__tests__/unit/pricing.test.ts`
- [x] Voucher: kode tidak valid tidak memotong apa pun; potongan tidak pernah melebihi subtotal
- [x] Klaim dua kali tidak menghasilkan baris ganda — `@@unique([voucherId, userId])` + jawaban idempoten
- [x] Server menolak harga yang tidak sesuai (`PRICE_CHANGED`), bukan menagih diam-diam
- [x] Pola diikuti, bukan dikarang ulang

### Belum diverifikasi
- Tombol Klaim di storefront belum diuji di browser — belum pernah dijalankan
  terhadap toko yang punya voucher aktif.

### Diperbaiki setelah code review

Dua reviewer independen (code + security) menemukan tiga HIGH yang sama.

| Temuan | Perbaikan |
|---|---|
| Klaim voucher bisa dihabiskan dua checkout bersamaan (UPDATE tanpa predikat) | `voucherClaim.updateMany({ where: { id, usedAt: null } })` + lempar `ALREADY_USED` bila `count === 0` |
| `POST /api/orders` tanpa auth memakai `customerId` dari body — bisa menghabiskan voucher orang lain | Saat `voucherCode` ada, wajib token dan `customerId` diambil dari token. Checkout tamu tanpa voucher tetap terbuka |
| Keranjang menampilkan potongan basi setelah item diubah | `updateQuantity`/`removeItem` membatalkan voucher yang sudah diterapkan |
| Order batal membakar kuota coret dan voucher selamanya | `OrderItem.saleQuotaUsed` mencatat baris mana yang memakai kuota; `releaseStock` mengembalikannya + membuka `usedAt` klaim |
| Stok bisa jadi negatif saat dua order bersaing | Dekremen stok ikut lewat predikat (`stock: { gte }`) |
| `setClaimed` memakai closure basi | Updater fungsional + efek penulis localStorage (bukan tulis di dalam updater) |

Dihapus: `isSaleExpired` (tidak pernah dipakai, hanya dipakai tesnya sendiri).

### Diperbaiki setelah verifikasi browser

| Temuan | Perbaikan |
|---|---|
| `x-forwarded-for` dibaca dari ujung kiri — klien memilih keranjang rate limitnya sendiri | Dibaca dari kanan, dihitung mundur `TRUSTED_PROXY_HOPS` (default 1). Salinan duplikat di `middleware.ts` dihapus; `lib/ip.ts` jadi satu implementasi |
| `POST /api/orders` anonim bisa mengosongkan kuota coret dengan order yang tak pernah dibayar | Batas 20 order/menit per alamat |
| `customerId` dari body tidak diverifikasi | Harus benar-benar pelanggan toko itu |
| `reserveStock` diekspor tanpa pemanggil | Dihapus |
| **Checkout putus 401 setiap kali pakai voucher** | `CartPage` mengirim header Authorization ke `/api/orders` |
| `VoucherInputSchema` diekspor dari `route.ts` | Dipindah ke `app/api/admin/vouchers/schema.ts` — Next menolak ekspor non-handler di file rute |

### Checkout tamu ditutup (keputusan produk, 2026-10-01)

`POST /api/orders` sekarang mewajibkan token. `storeId` dan `customerId` diambil dari
token, dan keduanya dihapus dari `OrderSchema` — tidak ada lagi yang bisa dibohongi
dari body. `CartPage` mengalihkan tamu ke `/login?from=<cart>`; `app/login/page.tsx`
kini menghormati `from` (hanya path searah, `//evil.com` ditolak karena itu open
redirect) sehingga pelanggan kembali ke keranjang setelah masuk.

Terverifikasi di browser: tamu di keranjang → `/login?from=%2Fdemo-store.local%2Fcart`
→ masuk → kembali ke keranjang → order `Rp 1.080.000` tembus.

Yang **masih** terbuka: tidak ada kedaluwarsa untuk order `PENDING`, jadi stok dan
kuota coret masih bisa ditahan tanpa pembayaran walau sudah terautentikasi. Butuh job
pembersih atau reserve-saat-bayar.

Halaman `/register` belum ada walau `app/api/auth/register/route.ts` sudah ada, dan
tautan "Daftar sekarang" di halaman login menuju 404. Pre-existing, di luar diff ini.

### Ditambahkan setelah rencana
- `__tests__/unit/createOrder.test.ts` (17 tes) — `prisma.$transaction` di-mock
  untuk memanggil balik `tx` palsu, jadi jalur harga coret, kuota, pergeseran
  harga, dan potongan voucher benar-benar dieksekusi. Diverifikasi dengan
  mutasi: mengganti potongan jadi `0` membuat 2 tes gagal.
- `__tests__/unit/adminVoucherRoutes.test.ts` (12 tes) — isolasi tenant,
  validasi persen/jendela, dan pagar `used > 0` pada DELETE.
