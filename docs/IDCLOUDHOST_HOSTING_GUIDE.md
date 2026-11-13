# Panduan Hosting LarisManis.online di IDCloudHost VPS + Cloudflare
**Website komersial pemersatu jalur penjualan online Anda — Didukung oleh LarisManis.online**  
*Dual-Host Architecture: WordPress Marketing (:8080) + Next.js E-Commerce SaaS (:3000)*

Panduan komprehensif untuk meluncurkan platform **LarisManis.online** di layanan Cloud VPS IDCloudHost dengan jaringan lokal Indonesia (low-latency) dan perlindungan Cloudflare Edge.

---

## 1. Arsitektur Domain & Subdomain

Platform ini menggunakan konfigurasi dual-host yang efisien dalam 1 server VPS:

| Domain / URL | Peran & Layanan | Teknologi | Port Internal |
| :--- | :--- | :--- | :--- |
| **`https://larismanis.online`** | **Landing Page Pemasaran Managed Webcommerce** | WordPress 6.7 Apache | `127.0.0.1:8080` |
| **`https://www.larismanis.online`** | Alias resmi landing page pemasaran | WordPress 6.7 Apache | `127.0.0.1:8080` |
| **`https://demo.larismanis.online`** | **Demo E-Commerce SaaS Storefront & Admin** | Next.js 14 Standalone | `127.0.0.1:3000` |
| **`https://*.larismanis.online`** | Wildcard multi-tenant toko klien | Next.js 14 Standalone | `127.0.0.1:3000` |

---

## 2. Rekomendasi Spesifikasi VPS IDCloudHost

Untuk menjalankan Next.js SaaS, WordPress, MariaDB, dan Nginx secara optimal dan hemat biaya:

| Komponen | Rekomendasi Minimum | Rekomendasi Ideal (Sangat Disarankan) |
| :--- | :--- | :--- |
| **Paket** | Cloud VPS Starter | **Cloud VPS Pro / Standard** |
| **Data Center** | Jakarta (Cyber 1 / DCI Indonesia) | **Jakarta (Cyber 1 / DCI Indonesia)** |
| **vCPU** | 1 Core | **2 Cores** |
| **RAM** | 2 GB | **4 GB** (Leluasa untuk Docker build) |
| **Storage** | 30 GB SSD | **50 GB SSD NVMe** |
| **Sistem Operasi** | Ubuntu 22.04 LTS 64-bit | **Ubuntu 24.04 LTS 64-bit** |
| **Estimasi Biaya** | ~Rp 80.000 / bulan | **~Rp 130.000 - 160.000 / bulan** |

> [!TIP]
> Database utama SaaS tetap menggunakan **Neon PostgreSQL Serverless (AWS Singapore)** sehingga komputasi transaksi toko tidak membebani memori VPS Anda. MariaDB di VPS hanya digunakan untuk landing page WordPress pemasaran.

---

## 3. Pengaturan DNS & SSL di Cloudflare

Buka akun Cloudflare Anda pada domain **`larismanis.online`**:

### A. Konfigurasi DNS Records
Masuk ke menu **DNS** > **Records** dan tambahkan entri berikut:

| Tipe | Nama Host | Target / Alamat IPv4 | Proxy Status | TTL |
| :--- | :--- | :--- | :--- | :--- |
| **`A`** | `@` | `<IP_PUBLIC_VPS_IDCLOUDHOST>` | **Proxied (Awan Oranye)** | Auto |
| **`CNAME`** | `www` | `larismanis.online` | **Proxied (Awan Oranye)** | Auto |
| **`CNAME`** | `demo` | `larismanis.online` | **Proxied (Awan Oranye)** | Auto |
| **`CNAME`** | `*` | `larismanis.online` | **Proxied (Awan Oranye)** | Auto |

> [!IMPORTANT]
> Pastikan seluruh record berstatus **Proxied (Awan Oranye)** agar pengunjung mendapatkan akselerasi CDN Cloudflare dan sertifikat SSL otomatis tanpa perlu pengaturan manual.

### B. Konfigurasi SSL/TLS
1. Buka menu **SSL/TLS** > **Overview**.
2. Pilih mode enkripsi: **Full** (atau **Flexible**).
3. Buka tab **Edge Certificates** dan aktifkan opsi **Always Use HTTPS** serta **Automatic HTTPS Rewrites**.

---

## 4. Langkah Instalasi Otomatis (1-Click Deployment)

Repository ini telah dilengkapi dengan script otomatisasi [`deploy/setup-idcloudhost.sh`](file:///home/ngabsenid/aiseocommerce/aiseocommerce/deploy/setup-idcloudhost.sh).

### Langkah 1: Akses VPS IDCloudHost via SSH
```bash
ssh root@<IP_PUBLIC_VPS_IDCLOUDHOST>
```

### Langkah 2: Clone Repository
```bash
git clone <URL_REPOSITORY_ANDA> aiseocommerce
cd aiseocommerce
```

### Langkah 3: Siapkan File Konfigurasi Lingkungan (`.env.production`)
```bash
cp .env.example .env.production
nano .env.production
```
Pastikan variabel kunci berikut terisi:
```ini
NODE_ENV=production
PORT=3000
DEFAULT_STORE_DOMAIN="demo.larismanis.online"

# Koneksi Database Neon PostgreSQL Cloud
DATABASE_URL="postgresql://neondb_owner:npg_1u2GyWNRqVgz@ep-icy-scene-azp2bur3-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&connect_timeout=15&pgbouncer=true"

# NextAuth Authentication Secret
NEXTAUTH_URL="https://demo.larismanis.online"
NEXTAUTH_SECRET="kunci-secret-acak-minimal-32-karakter-keamanan"
```

### Langkah 4: Jalankan Script Otomasi Deploy
```bash
sudo bash deploy/setup-idcloudhost.sh
```

Script akan mengeksekusi secara otomatis:
1. Memperbarui paket sistem Ubuntu.
2. Memasang Docker Engine & Docker Compose plugin.
3. Membuka port firewall (SSH 22, HTTP 80, HTTPS 443).
4. Memasang Nginx Reverse Proxy Dual Virtual Host (`larismanis.online` & `demo.larismanis.online`).
5. Membangun dan menjalankan 3 container:
   - `aiseocommerce-web` (Next.js SaaS)
   - `marketing-wp` (WordPress Landing Page)
   - `marketing-db` (MariaDB Alpine ringan)
6. Melakukan uji healthcheck ke port 3000 dan 8080.

---

## 5. Setup Awal WordPress Landing Page (`larismanis.online`)

Setelah script selesai berjalan:
1. Buka browser dan akses: `https://larismanis.online`.
2. Halaman wizard instalasi WordPress akan muncul:
   - **Pilih Bahasa:** Bahasa Indonesia / English.
   - **Judul Situs:** `LarisManis.online — Website komersial pemersatu jalur penjualan online Anda`
   - **Nama Pengguna Admin:** `admin_larismanis` (atau sesuai pilihan Anda)
   - **Kata Sandi:** Masukkan kata sandi yang kuat.
   - **Email:** Email kontak Anda.
3. Klik **Install WordPress**.
4. Di dasbor WordPress, Anda dapat memasang tema ringan (seperti *Astra*, *Kadence*, atau *GeneratePress*) dan mendesain landing page dengan tombol Call to Action mengarah ke `https://demo.larismanis.online`.

---

## 6. Reset & Seed Data Demo Toko (`demo.larismanis.online`)

Untuk menyinkronkan data katalog produk realistis, Pre-Order, variasi, dan integrasi omnichannel ke database toko demo:

```bash
docker compose exec web npx ts-node prisma/seed.ts
```

### Akun Login Demo Toko Siap Pakai:
* **Portal Admin Toko:** `https://demo.larismanis.online/login`
  * Email: `admin@demo-store.local`
  * Password: `password`
* **Portal Staff Toko:** `https://demo.larismanis.online/login`
  * Email: `staff@demo-store.local`
  * Password: `password`
* **Akun Pelanggan (Customer):** `https://demo.larismanis.online/login`
  * Email: `customer1@demo-store.local`
  * Password: `password`

---

## 7. Perintah Operasional Harian (Maintenance)

```bash
# Cek Status Seluruh Container
docker compose ps

# Cek Log Next.js SaaS
docker compose logs -f web

# Cek Log WordPress
docker compose logs -f marketing-wp

# Restart Seluruh Layanan
docker compose restart

# Update Kode Aplikasi Terbaru dari Git (via SSH Alias larismanis-prod)
ssh larismanis-prod "cd ~/aiseocommerce && git pull origin main && nohup sudo docker compose up -d --build --force-recreate web > ~/deploy-web.log 2>&1 < /dev/null &"

# Pantau Log Rebuild Container Next.js Tanpa Menyentuh WordPress
ssh larismanis-prod "tail -f ~/deploy-web.log"
```

---
*LarisManis.online — Website komersial pemersatu jalur penjualan online Anda*  
*Didukung oleh LarisManis.online.*
