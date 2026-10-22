# 🚀 AI SEO E-Commerce SaaS (Multi-Tenant Platform)

[![Next.js 14](https://img.shields.io/badge/Next.js-14.0.4%20(App%20Router)-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon%20DB-336791?style=for-the-badge&logo=postgresql)](https://neon.tech/)
[![Prisma ORM](https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma)](https://www.prisma.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.x-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![Jest Tests](https://img.shields.io/badge/Tests-61%2F61%20Suites%20Passing%20(711%20Tests)-success?style=for-the-badge&logo=jest)](https://jestjs.io/)
[![OpenTelemetry](https://img.shields.io/badge/OpenTelemetry-OTLP%20Logs-F5A800?style=for-the-badge&logo=opentelemetry)](https://opentelemetry.io/)
[![PostHog](https://img.shields.io/badge/PostHog-Multi--Tenant%20Analytics-blueviolet?style=for-the-badge&logo=posthog)](https://posthog.com/)

> **Enterprise-Ready Shared-Codebase Multi-Tenant E-Commerce Platform** dengan integrasi SEO Otomatis, Mesin Duplikasi Toko Pelanggan Instan, Payment Gateway Sandbox & Live, Sistem Keuangan & Pembukuan Terpisah, serta Observabilitas Terpusat (PostHog & Sentry).

---

## 📑 Daftar Isi
1. [Arsitektur Sistem](#-arsitektur-sistem)
2. [Fitur Unggulan](#-fitur-unggulan)
3. [Panduan Instalasi & Penggunaan Lokal](#-panduan-instalasi--penggunaan-lokal)
4. [Pengujian & Verifikasi Kualitas](#-pengujian--verifikasi-kualitas)
5. [Struktur Direktori Proyek](#-struktur-direktori-proyek)
6. [Katalog Rute API](#-katalog-rute-api)
7. [Keamanan & Isolasi Kriptografis](#-keamanan--isolasi-kriptografis)
8. [Dokumentasi Lengkap](#-dokumentasi-lengkap)

---

## 🏛 Arsitektur Sistem

Platform mengadopsi model *Shared-Codebase Multi-Tenant Architecture* di mana satu basis kode Next.js 14 melayani banyak domain toko sekaligus secara terisolasi dan dinamis.

```
+---------------------------------------------------------------------------------------------------------+
|                                    AI SEO E-COMMERCE SAAS ECOSYSTEM                                     |
+---------------------------------------------------------------------------------------------------------+
                                                     |
        +--------------------------------------------+--------------------------------------------+
        |                                                                                         |
        v                                                                                         v
+-----------------------------------+                                     +-----------------------------------+
|     SUPER-ADMIN CONTROL PLANE     |                                     |    CENTRALIZED OBSERVABILITY      |
|  (/super-admin, Localhost Only)   |                                     |  (PostHog OTel + Sentry Master)   |
|  - 7-Group Website Duplicator     |                                     |  - 1 Single API Key for All Stores|
|  - Cryptographic Secret Gen       |                                     |  - Auto Tenant Tagging (Domain)   |
|  - Master Store Provisioner       |                                     |  - Real-time Alerting (TG/Discord)|
+-----------------------------------+                                     +-----------------------------------+
        |                                                                                         |
        +--------------------------------------------+--------------------------------------------+
                                                     |
                                                     v
+---------------------------------------------------------------------------------------------------------+
|                                    ISOLATED TENANT STOREFRONTS & ADMINS                                 |
+---------------------------------------------------------------------------------------------------------+
|  [Toko A: distrobaju.com]          |  [Toko B: gadgetstore.id]         |  [Toko C: kosmetikalam.com]    |
|  - Isolated Product & Inventory    |  - Isolated Product & Inventory    |  - Isolated Product & Inventory|
|  - Sandbox & Live Midtrans Gateway |  - Sandbox & Live Midtrans Gateway |  - Sandbox & Live Midtrans Gateway|
|  - CMS & Visual Page Builder       |  - CMS & Visual Page Builder       |  - CMS & Visual Page Builder   |
|  - Store Admin Dashboard           |  - Store Admin Dashboard           |  - Store Admin Dashboard       |
|  - Real-time Telemetry (Logs & PV) |  - Real-time Telemetry (Logs & PV) |  - Real-time Telemetry (Logs & PV)|
+---------------------------------------------------------------------------------------------------------+
```

---

## ✨ Fitur Unggulan

### 1. Multi-Tenant Engine & Dynamic Host Resolution
- Resolusi tenant dilakukan otomatis melalui `middleware.ts` dan `lib/store.ts` via header `x-forwarded-host` atau `host`.
- Mendukung pemetaan langsung root domain (`domain.com`), subdomain (`toko.domain.com`), dan lokal (`localhost:3000`).
- Isolasi database ketat pada level Prisma ORM: seluruh query (`Product`, `Order`, `Payment`, `Ledger`, `LandingPage`) terfilter wajib oleh `storeId`.

### 2. Super-Admin Control Plane & Mesin Duplikasi Toko
- **Host-Based Security Lockdown**: Panel `/super-admin` hanya dapat diakses melalui localhost atau host terdaftar (`SUPER_ADMIN_ALLOWED_HOSTS`).
- **7-Group Website Duplication Engine**:
  1. Identitas Toko (Nama, Domain, Subdomain, Logo, Deskripsi).
  2. Akun Administrator Toko (Email, Password hash bcrypt).
  3. Konfigurasi Payment Gateway (Midtrans/Xendit Sandbox & Production).
  4. Logistik & Kurir (Kota Origin, RajaOngkir).
  5. Konfigurasi SEO & Integrasi Meta (Google Verification, OpenGraph).
  6. Kriptografi Mandiri: Otomatis menghasilkan `JWT_SECRET` (64-hex) dan `CRON_SECRET` unik per toko.
  7. Observabilitas Terpusat: Otomatis mewarisi kredensial master PostHog & Sentry.

### 3. Payment Gateway Sandbox Mode & Ledger Segregation
- Mode **Sandbox Simulator** memungkinkan onboarding staf dan pengujian alur checkout tanpa biaya transaksi nyata.
- **Pemisahan Finansial (Ledger Segregation)**: Laporan laba-rugi riil terpisah dari data transaksi testing melalui flag `isSandbox`.
- **Cart Integrity Guard**: Otomatis mendeteksi dan mencegah keranjang belanja campuran antara produk sandbox dan produk reguler.

### 4. Manajemen Produk, Inventori & Pre-Order (PO)
- Pengelolaan fleksibel: **Ready Stock** (potong stok langsung) dan **Pre-Order** (durasi produksi dalam hari kerja, kuota maksimum, dan estimasi kirim).
- Matriks variasi produk berjenjang (Warna, Ukuran, Bahan) dengan SKU dan pelacakan inventori tersendiri.
- Pagination server-side dan global date filter pada semua tabel admin.

### 5. Visual CMS Builder, Tema Toko & AI SEO
- Builder visual blok modular (Hero Banner, Feature Grid, Testimoni, Product Showcase, FAQ, Call-to-Action).
- Generator otomatis Sitemap XML dinamis (`/sitemap.xml`) per tenant dan Schema Markup JSON-LD untuk indeks Google.
- Pengaturan warna brand, typography, dan layout toko dari admin panel.

### 6. Observabilitas & Error Reporting Terpusat (PostHog & Sentry)
- **1 Master Key untuk Seluruh Toko**: Menggunakan 1 Master PostHog Project Token dan Sentry DSN tanpa membuat project terpisah tiap ada toko baru.
- **Automated Tenant Super-Properties**: Setiap event client otomatis diberi tag `$set: { store_domain: window.location.host, store_name: '...' }` untuk filtering multi-tenant instan.
- **Next.js 14 OpenTelemetry OTLP Log Exporter**: Server logs dan unhandled runtime errors dialirkan via protokol OTLP HTTP ke PostHog (`https://us.i.posthog.com/i/v1/logs`).
- **Real-Time Alert Dispatcher**: Meneruskan error kritis ke Telegram/Discord pemilik platform dengan proteksi anti-spam rate limiter 5 menit.

---

## 🛠 Panduan Instalasi & Penggunaan Lokal

### Prasyarat
- **Node.js**: Versi 18.x, 20.x, atau 22.x
- **PostgreSQL**: PostgreSQL 14+ (direkomendasikan cloud instance seperti Neon DB atau Supabase)
- **NPM** atau **PNPM**

### Langkah 1: Kloning & Instalasi Dependensi
```bash
git clone https://github.com/ark7/aiseocommerce.git
cd aiseocommerce
npm install
```

### Langkah 2: Konfigurasi Environment Variables
Salin template environment ke `.env`:
```bash
cp .env.example .env
```
Isi konfigurasi utama pada file `.env`:
```env
# Database PostgreSQL
DATABASE_URL="postgresql://user:password@host/database?sslmode=require"

# Keamanan & Auth
JWT_SECRET="your-super-strong-jwt-secret-64-hex-characters"
CRON_SECRET="your-super-strong-cron-secret-64-hex-characters"

# Super-Admin Host Whitelist
SUPER_ADMIN_ALLOWED_HOSTS="localhost:3000,127.0.0.1:3000"

# Observabilitas Master (PostHog)
NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN="phc_up4iRw8TpeXfJFUhkbGcxgU98vnhqqJjvjCEeYUHLrFR"
NEXT_PUBLIC_POSTHOG_HOST="https://us.i.posthog.com"
```

### Langkah 3: Sinkronisasi Skema Database
```bash
npx prisma generate
npx prisma db push
```

### Langkah 4: Menjalankan Server Development
```bash
npm run dev
```
Aplikasi aktif pada: `http://localhost:3000`

---

## 🧪 Pengujian & Verifikasi Kualitas

Seluruh fungsionalitas sistem telah diuji menggunakan Jest dan Next.js test runner dengan status **100% HIJAU**:

```bash
# Menjalankan seluruh test suite (61 suites, 711 unit/integration tests)
npm test

# Menjalankan pengujian spesifik
npx jest __tests__/unit/telemetryApi.test.ts
npx jest __tests__/unit/paymentGatewaySandbox.test.ts
npx jest __tests__/unit/superAdminProvisioner.test.ts

# Verifikasi kompilasi Next.js production build
npm run build
```

Hasil verifikasi:
- **Test Suites**: 61 passed, 61 total
- **Tests**: 711 passed, 2 skipped, 713 total
- **Kompilasi Build**: Berhasil (Exit code 0) melintasi 64 endpoint dan halaman

---

## 📂 Struktur Direktori Proyek

```
aiseocommerce/
├── __tests__/                   # 61 Test Suites (Unit & Integration tests)
├── app/                         # Next.js 14 App Router
│   ├── (storefront)/            # Halaman katalog, produk, cart, checkout pembeli
│   ├── admin/                   # Dashboard administrasi toko pelanggan
│   │   ├── analytics/           # Tren traffic, pageviews, dan performa penjualan
│   │   ├── finance/             # General ledger, laba-rugi & toggle sandbox
│   │   ├── products/            # Manajemen produk ready stock & pre-order
│   │   └── system/errors/       # Log error & audit health toko
│   ├── api/                     # Backend API Routes (64 endpoints terdaftar)
│   │   ├── checkout/            # Endpoint transaksi, reservasi stok & payment
│   │   ├── super-admin/         # API kontrol provisi & duplikasi toko
│   │   └── telemetry/           # API penerima error client & pageview tracking
│   ├── super-admin/             # Super-Admin Control Plane (Localhost only)
│   ├── layout.tsx               # Root Layout dengan MasterThirdPartyTracker
│   ├── instrumentation.ts       # OpenTelemetry OTLP Log Provider Next.js 14
│   └── middleware.ts            # Dynamic Host Resolver & Security Guard
├── components/                  # UI Components (MasterTracker, PageViewTracker, dll.)
├── docs/                        # Dokumentasi Proyek & Laporan Arsitektur
├── lib/                         # Core Utilities (Logger, Auth, Payment, Guard)
├── prisma/                      # Prisma Schema & Database Models
├── services/                    # Business Logic Layer (Transaction, Telemetry, dll.)
└── scripts/                     # Operational & Testing CLI Scripts
```

---

## 🔌 Katalog Rute API

| Kategori Rute | Endpoint | Deskripsi |
| :--- | :--- | :--- |
| **Storefront & Produk** | `GET /api/products` | Mengambil daftar produk sesuai tenant domain |
| **Storefront & Produk** | `GET /api/categories` | Mengambil kategori produk aktif |
| **Checkout & Pembayaran** | `POST /api/orders` | Membuat pesanan baru dan reservasi stok |
| **Checkout & Pembayaran** | `POST /api/checkout` | Inisiasi payment intent (Sandbox / Production) |
| **Checkout & Pembayaran** | `POST /api/payment/webhook` | Webhook konfirmasi gateway Midtrans/Xendit |
| **Super-Admin** | `POST /api/super-admin/tenants` | Duplikasi & provisi website pelanggan baru |
| **Super-Admin** | `GET /api/super-admin/system-health` | Monitoring kesehatan & status database multi-tenant |
| **Telemetri & Error** | `POST /api/telemetry/errors` | Ingest log error runtime dari frontend |
| **Telemetri & Error** | `POST /api/telemetry/pageview` | Ingest pelacakan kunjungan toko |
| **Admin Finansial** | `GET /api/admin/finance/summary` | Laporan ringkasan finansial (Filter Sandbox) |

---

## 🔒 Keamanan & Isolasi Kriptografis

- **Proteksi Host-Based**: Rute `/super-admin` otomatis diblokir jika diakses dari domain publik pelanggan.
- **Kunci Rahasia Unik**: Setiap duplikasi toko menghasilkan `JWT_SECRET` dan `CRON_SECRET` 64-karakter hex independen sehingga tidak terjadi token spoofing antar toko.
- **Edge Runtime Isolation**: Logging utilities dan Prisma queries terlindungi dari Edge middleware guna menjaga kecepatan rendering dan kompatibilitas runtime.
- **Anti-Spam Alert Limiter**: Dispatcher Telegram/Discord mengelompokkan error identik dalam rentang 5 menit untuk mencegah eksploitasi kuota API.

---

## 📖 Dokumentasi Lengkap

Dokumentasi arsitektur mendalam, panduan sandbox payment gateway, dan laporan teknis tersedia di direktori `docs/`:
- [Dokumentasi Lengkap Progres Proyek (docs/PROJECT_SUMMARY.md)](docs/PROJECT_SUMMARY.md)

---

## 📄 Lisensi
Hak Cipta © 2026 AI SEO E-Commerce Platform. Seluruh hak cipta dilindungi undang-undang.
