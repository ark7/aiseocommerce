# Plan: Auth Berjenjang (Guest dulu) + Landing Preview + Turnstile

**Source**: permintaan bebas
**Complexity**: Large

## Ringkasan

Tidak ada lagi akses tanpa identitas. Setiap permintaan dokumen mendapat sesi
**GUEST** kalau belum punya, dan fitur terbuka sesuai tingkatnya. Root `/` jadi
landing dengan preview produk & kategori; klik dari landing meminta
daftar/login karena tamu belum boleh masuk detail produk. Turnstile menjaga
form login dan register, kuncinya per toko.

## Keputusan yang sudah diambil

| Pertanyaan | Jawaban |
|-----------|---------|
| Landing mana | Root `/` (landing SaaS) |
| Sejauh mana gerbang | Hanya dari landing untuk *masuk detail*; halaman lain tetap publik **sebatas tingkat GUEST** |
| Turnstile | Login + register, kunci per toko di `StoreSettings` |
| Model auth | **Berjenjang, tamu pun diautentikasi** — bukan publik tanpa auth |

## Tangga tingkat

```
GUEST  <  CUSTOMER  <  STAFF  <  ADMIN
```

`Role` di DB hanya `ADMIN | CUSTOMER | STAFF` (`prisma/schema.prisma`), jadi
`GUEST` bukan baris `User` — tamu adalah JWT bertanda `type: 'guest'` dengan
`sub` acak dan `storeId`, berisi `role: 'GUEST'`. `UserPayload` di `lib/auth.ts:16`
harus dilebarkan untuk menerima tingkat ini.

| Permukaan | Tingkat minimum | Perilaku kalau kurang |
|-----------|-----------------|----------------------|
| `/`, `/login`, `/register`, `/api/auth/*` | — | Sesi tamu tetap diterbitkan |
| `/{domain}`, `/{domain}/product/*`, `/products`, `/category/*`, `POST /api/events` | GUEST | Terbitkan sesi tamu, lanjutkan |
| `/{domain}/cart`, `POST /api/orders`, `/api/checkout`, `/{domain}/orders` | CUSTOMER | Halaman → `/login?from=`; API → 401 |
| `/admin`, `/api/admin` | STAFF (sebagian ADMIN) | Seperti perilaku sekarang |

## Keputusan desain yang penting

**Terbitkan, jangan alihkan.** Kalau permintaan dokumen tanpa sesi dialihkan ke
login, crawler dan prerender mati — persis risiko yang tadinya dihindari dengan
membiarkan storefront publik. Karena itu middleware **menerbitkan** sesi tamu dan
meneruskan permintaan; hanya pengalihan ketika sesi **ada tapi tingkatnya
kurang**. Halaman detail tetap ter-prerender dan tetap terbaca crawler.

**Halaman tidak boleh membaca cookie.** Middleware boleh (`request.cookies`)
tanpa mematikan cache; begitu halaman memanggil `cookies()`, ISR-nya runtuh.
Landing dan detail tetap `revalidate = 300`.

**Penegakan di middleware, bukan di tiap route.** Route yang ada sudah punya
guard peran sendiri dan tesnya memanggil handler langsung tanpa middleware.
Menaruh tangga tingkat di middleware membuat `__tests__` yang ada tetap hijau,
dan menjaga satu tempat untuk melihat seluruh kebijakan akses.

**Turnstile tidak di penerbitan sesi tamu.** Itu justru akan memblokir crawler
dan mengubah setiap kunjungan pertama jadi tantangan. Posisinya tetap di login
dan register — permukaan yang bisa disalahgunakan untuk membuat akun.

**Funnel ikut membaik.** `ProductEvent.sessionId` sekarang bisa diisi id tamu
dari sesi server, bukan `sessionStorage`. Catatan "penyimpanan diblokir membuat
satu orang terhitung beberapa sesi" di kaki halaman Funnel jadi tidak berlaku —
bonus, bukan pekerjaan tambahan yang mendesak.

**Satu perubahan perilaku:** checkout tamu hilang. Sekarang `POST /api/orders`
menerima `customerId` opsional; dengan tangga ini membeli wajib CUSTOMER. Itu
konsekuensi langsung dari "jangan tanpa auth", tapi ini fitur konversi — perlu
sadar dipilih, bukan diam-diam.

## Pola yang Disalin

| Kategori | Sumber | Pola |
|----------|--------|------|
| Token & verifikasi | `lib/auth.ts:36,56,71,82` | `generateToken` / `verifyToken` / `requireUser` / `requireStoreRole` |
| Cookie httpOnly | `app/api/auth/login/route.ts:77-91` | `token` 7d, `refreshToken` 30d, sameSite lax, secure saat production |
| Baca token di middleware | `middleware.ts:117-121` | Bearer dulu, fallback cookie `token` |
| Kurungan rute | `middleware.ts:177-214` | `PROTECTED_PATHS` + redirect `/login?from=`, API 401 JSON |
| Query landing | `app/[storeDomain]/page.tsx:194,262` | Server component + `prisma` langsung |
| Halaman server + form klien | `app/[storeDomain]/cart/page.tsx` | Server shell resolve data, form komponen klien |
| Route settings admin | `app/api/admin/settings/analytics/route.ts:10-69` | `requireUser` → 401 → ADMIN → 403 → zod → `upsert` → `revalidateStoreSettings` |
| Tes | `__tests__/unit/*.test.ts` | Jest, mock `@/lib/prisma` & `@/lib/auth`, AAA |

## Berkas yang Diubah

| Berkas | Aksi | Alasan |
|--------|------|--------|
| `lib/tiers.ts` | CREATE | `Tier`, `meetsTier`, `requiredTierFor(path)` — murni, bisa diuji |
| `middleware.ts` | UPDATE | Terbitkan sesi tamu; kurungan rute dari tabel tingkat |
| `lib/auth.ts` | UPDATE | `UserPayload` menerima `role: 'GUEST'` |
| `lib/guestSession.ts` | CREATE | Tanda tangan + validasi token tamu |
| `app/api/auth/upgrade/route.ts` | CREATE | Tukar sesi tamu jadi sesi user setelah login/register (opsional kalau login sudah menimpa cookie) |
| `app/page.tsx` | UPDATE | Stub redirect → landing preview |
| `components/GatedLink.tsx` | CREATE | Klik: tingkat < CUSTOMER → `/login?from=`, selain itu lanjut |
| `app/login/page.tsx` | UPDATE | Server shell (toko dari host, site key, `from`) + form klien |
| `components/LoginForm.tsx` | CREATE | Form login + widget Turnstile |
| `app/register/page.tsx` | CREATE | Tautan `/register` sekarang mati |
| `components/RegisterForm.tsx` | CREATE | Form daftar + widget Turnstile |
| `lib/turnstile.ts` | CREATE | `verifyTurnstile` + penentu wajib/tidak |
| `app/api/auth/login/route.ts` | UPDATE | Verifikasi Turnstile; timpa sesi tamu |
| `app/api/auth/register/route.ts` | UPDATE | Sama — dan ini yang paling perlu |
| `app/api/admin/settings/turnstile/route.ts` | CREATE | GET prefill, PUT simpan, secret tak pernah dikembalikan |
| `app/admin/settings/page.tsx` | UPDATE | Section Turnstile |
| `prisma/schema.prisma` | UPDATE | `StoreSettings`: `turnstileSiteKey`, `turnstileSecretKey`, `turnstileEnabled` |
| `__tests__/unit/tiers.test.ts` | CREATE | Tangga: urutan, batas per path, tamu tidak lolos CUSTOMER |
| `__tests__/unit/guestSession.test.ts` | CREATE | Terbitkan/verifikasi, tolak token user dipakai sebagai tamu |
| `__tests__/unit/turnstile.test.ts` | CREATE | Lulus/gagal, wajib/dilewati, fail-closed |
| `__tests__/unit/turnstileSettingsRoute.test.ts` | CREATE | 401/403, upsert, secret tidak dikembalikan |

## Tasks

### Task 0: Tutup kebocoran settings (tetap disarankan)
- **Action**: `app/api/stores/[domain]/route.ts:50` mengembalikan `settings` utuh tanpa auth — `midtransServerKey`, `flipApiKey`, `analyticsConfig` terbaca siapa pun yang tahu domain. Ganti dengan whitelist field publik.
- **Validate**: `curl -s http://localhost:3000/api/stores/demo-store.local | grep -i "serverkey\|flipApiKey"` → kosong.
- **Catatan**: dengan tangga tingkat, kebocoran ini minimal tersaring sampai GUEST — tetap bocor, karena tamu siapa pun bisa dapat.

### Task 1: Tangga tingkat (`lib/tiers.ts`)
- **Action**: `type Tier = 'GUEST' | 'CUSTOMER' | 'STAFF' | 'ADMIN'`, `TIER_RANK`, `meetsTier(role, required)`, dan `requiredTierFor(pathname)` yang mengembalikan tingkat minimum per pola rute (tabel di atas). Fungsi murni, tanpa `next` maupun `prisma`.
- **Mirror**: pola fungsi murni `lib/orderStatus.ts`.
- **Validate**: `npx jest __tests__/unit/tiers.test.ts` — termasuk tamu **tidak** lolos untuk `/cart` dan `/api/orders`.

### Task 2: Sesi tamu (`lib/guestSession.ts` + middleware)
- **Action**: Token tamu bertanda `type: 'guest'`, `sub` acak (`crypto.randomUUID()`), `role: 'GUEST'`, `storeId` hasil resolve domain dari host. Middleware: kalau tidak ada sesi sah dan permintaan dokumen (bukan `_next`, bukan aset statis) → terbitkan cookie `guest` httpOnly dan **lanjutkan** tanpa redirect. Kalau sesi ada tapi tingkatnya kurang → perilaku sekarang (`/login?from=`, API 401). Kalau token tamu dipakai di `/admin` → tolak.
- **Mirror**: pembacaan token `middleware.ts:117-121`, penulisan cookie `app/api/auth/login/route.ts:77-91`; matcher `/:path*` + runtime nodejs (`middleware.ts:235-238`).
- **Validate**: `npx jest __tests__/unit/guestSession.test.ts`; manual: `curl -i http://localhost:3000/demo-store.local` → ada `Set-Cookie: guest=…`, status 200 (bukan 302).

### Task 3: Gerbang landing
- **Action**: `components/GatedLink.tsx` + keputusan murni di `lib/tiers.ts` (`gateFor(role, targetPath)`): tingkat ≥ CUSTOMER → lanjut; GUEST → `/login?from=<path>`. `from` hanya path internal (diawali `/`, bukan `//`), kalau tidak jatuh ke `/`.
- **Mirror**: konvensi `?from=` di `middleware.ts:179`.
- **Validate**: `npx jest __tests__/unit/tiers.test.ts` (kasus `from` jahat: `//evil.com`, `https://evil.com`).

### Task 4: Landing root
- **Action**: `app/page.tsx` jadi server component: toko dari `process.env.LANDING_STORE_DOMAIN`, fallback `prisma.store.findFirst({ orderBy: { createdAt: 'asc' } })`. Produk terbit (8, unggulan dulu) + kategori teratas. Dua `<section>`, tiap kartu dibungkus `GatedLink`. `export const revalidate = 300`. **Jangan** panggil `cookies()` di sini.
- **Mirror**: `app/[storeDomain]/page.tsx:194,262`.
- **Validate**: `npm run build` tetap prerender; buka `/` sebagai tamu, klik → `/login?from=…`.

### Task 5: Register + `from` + naik tingkat
- **Action**: Pecah `app/login/page.tsx` jadi server shell + `components/LoginForm.tsx`; shell mengambil toko dari host, site key Turnstile, dan `from`. `app/register/page.tsx` + `components/RegisterForm.tsx` mengikuti bentuk yang sama. Login dan register menimpa cookie `guest` dengan cookie sesi user, jadi naik tingkat terjadi pada respons yang sama.
- **Mirror**: server shell + form klien `app/[storeDomain]/cart/page.tsx`.
- **Validate**: `npx tsc --noEmit`; manual: login dengan `?from=/demo-store.local/product/x` → mendarat di situ; cookie `guest` hilang.

### Task 6: Skema + route settings Turnstile
- **Action**: Tiga kolom `StoreSettings` (`turnstileSiteKey String?`, `turnstileSecretKey String?`, `turnstileEnabled Boolean @default(false)`) lalu `npm run db:push`. Route `app/api/admin/settings/turnstile/route.ts`: GET → `{ siteKey, enabled, hasSecret }` (**secret tidak pernah dikembalikan**); PUT → secret hanya ditimpa kalau dikirim tidak kosong.
- **Mirror**: `app/api/admin/settings/analytics/route.ts:10-69`, `lib/analytics.ts:10-39`.
- **Validate**: `npx jest __tests__/unit/turnstileSettingsRoute.test.ts`.

### Task 7: Verifikasi Turnstile di login & register
- **Action**: `lib/turnstile.ts` — `verifyTurnstile(secret, token, ip)` panggil `siteverify`, timeout pendek, gagal jaringan = `false`. Di kedua route, setelah toko di-resolve: kalau `turnstileEnabled` wajib ada `turnstileToken` dan lulus; `enabled` tanpa secret → tolak dengan pesan konfigurasi (fail-closed, jangan dilewati diam-diam).
- **Validate**: `npx jest __tests__/unit/turnstile.test.ts`; manual dengan test key `1x00000000000000000000AA` / `1x0000000000000000000000000000000AA`.

### Task 8: Widget + panel
- **Action**: Widget di `LoginForm`/`RegisterForm`, hanya kalau site key ada; `api.js` dimuat sekali. Section Turnstile di `app/admin/settings/page.tsx`: site key, secret (kosong = tidak diubah, ada penanda "sudah tersimpan"), toggle, plus peringatan kalau aktif tanpa secret.
- **Validate**: `npx next lint`; manual: aktifkan, login menampilkan widget, gagal tanpa menyelesaikannya.

### Task 9 (opsional): Funnel pakai id tamu
- **Action**: `POST /api/events` mengambil id tamu dari sesi, bukan `sessionId` kiriman klien; `trackFunnelEvent` berhenti mengirim `sessionId`. Hapus catatan penyimpanan-diblokir di kaki halaman Funnel.
- **Validate**: `npx jest __tests__/unit/eventsRoute.test.ts __tests__/unit/funnelEventsClient.test.ts`.

## Validasi

```bash
npx tsc --noEmit
npx next lint
npx jest
npm run build
```

## Risiko

| Risiko | Kemungkinan | Mitigasi |
|--------|-------------|----------|
| Middleware menerbitkan cookie di setiap permintaan aset | Tinggi | Batasi ke permintaan dokumen (lewati `_next`, `api/`, ekstensi berkas); diuji di Task 2 |
| Toko tidak ter-resolve dari host saat penerbitan tamu | Sedang | Kalau domain tak dikenal, jangan terbitkan cookie dan lanjutkan sebagai anonim — jangan 500 |
| Crawler dianggap bot, prerender tetap rusak | Rendah | Penerbitan tidak pernah menantang dan tidak pernah mengalihkan; diverifikasi dengan `curl` tanpa cookie di Task 2 |
| Checkout tamu hilang | Tinggi (pasti) | Keputusan sadar; kalau ingin dipertahankan, `POST /api/orders` diberi pengecualian GUEST dan dicatat sebagai lubang yang disengaja |
| Cookie tamu menumpuk di klien lama | Rendah | Nama cookie tetap, `set` menimpa; ada masa berlaku |
| Fail-closed Turnstile mengunci admin | Sedang | Pesan error menyebut penyebab; test key Cloudflare untuk dev |
| Open redirect lewat `from` | Sedang | Hanya path internal; diuji di Task 3 |

## Penerimaan

- [ ] Tidak ada permintaan dokumen yang dilayani tanpa identitas — tamu pun dapat sesi
- [ ] `curl` tanpa cookie ke storefront → 200 + `Set-Cookie` tamu (bukan 302)
- [ ] `/cart` sebagai tamu → `/login?from=/cart`; setelah login → kembali ke cart
- [ ] `/` menampilkan preview produk & kategori dan tetap ter-prerender
- [ ] `/register` ada dan berfungsi; cookie tamu tertimpa sesi user
- [ ] Turnstile aktif per toko; secret tidak pernah dikembalikan API
- [ ] `tsc`, `lint`, `jest`, `build` bersih
- [ ] Task 0 dan Task 9 diputuskan: dikerjakan atau ditunda dengan sadar
