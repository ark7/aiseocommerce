# 📘 Buku Panduan Pengguna Admin Dashboard (User Guide)
## Platform E-Commerce SaaS & Managed Web Service

**Edisi Resmi — Didukung oleh LarisManis.online**  
*Versi Sistem: 1.0.0 (Production Ready)*  
*Target Pembaca: Pemilik Toko (Merchant Owner), Manajer Operasional, Tim Customer Service (CS), Staf Gudang, Akuntan, dan Tim Pemasaran.*

---

## Daftar Isi
1. [Bab 1: Pengenalan & Masuk ke Sistem (Login & Keamanan Akun)](#bab-1-pengenalan--masuk-ke-sistem-login--keamanan-akun)
2. [Bab 2: Menu Dashboard (Beranda & Statistik Kunci)](#bab-2-menu-dashboard-beranda--statistik-kunci)
3. [Bab 3: Menu Produk & Manajemen Stok (Fisik, Digital, Event, PO & Omnichannel)](#bab-3-menu-produk--manajemen-stok-fisik-digital-event-po--omnichannel)
4. [Bab 4: Menu Kategori Produk](#bab-4-menu-kategori-produk)
5. [Bab 5: Menu Pesanan & Logistik Resi (Transfer Manual & Biteship)](#bab-5-menu-pesanan--logistik-resi-transfer-manual--biteship)
6. [Bab 6: Menu Pelanggan (CRM & Hubungi WhatsApp Langsung)](#bab-6-menu-pelanggan-crm--hubungi-whatsapp-langsung)
7. [Bab 7: Menu Keuangan & Buku Kas Besar (General Ledger & Petty Cash)](#bab-7-menu-keuangan--buku-kas-besar-general-ledger--petty-cash)
8. [Bab 8: Menu Promo & Kupon Diskon Voucher](#bab-8-menu-promo--kupon-diskon-voucher)
9. [Bab 9: Menu CMS Landing Page Builder (Visual Page Layout)](#bab-9-menu-cms-landing-page-builder-visual-page-layout)
10. [Bab 10: Menu Artikel Blog & Optimasi SEO (Real-Time Analyzer)](#bab-10-menu-artikel-blog--optimasi-seo-real-time-analyzer)
11. [Bab 11: Menu Laporan & Analitik (Funnel Konversi Belanja)](#bab-11-menu-laporan--analitik-funnel-konversi-belanja)
12. [Bab 12: Menu Pengaturan Toko (Master Settings - 9 Kategori Lengkap)](#bab-12-menu-pengaturan-toko-master-settings---9-kategori-lengkap)
13. [Bab 13: Menu Manajemen Staf & Delegasi Hak Akses (RBAC)](#bab-13-menu-manajemen-staf--delegasi-hak-akses-rbac)
14. [Bab 14: Standar Operasional Prosedur (SOP) Harian, Keamanan & FAQ](#bab-14-standar-operasional-prosedur-sop-harian-keamanan--faq)
15. [Bab 15: Menu AI Studio (Pembuatan Gambar Jualan & Asisten Copywriting)](#bab-15-menu-ai-studio-pembuatan-gambar-jualan--asisten-copywriting)

---

## Bab 1: Pengenalan & Masuk ke Sistem (Login & Keamanan Akun)

### 1.1 Cara Masuk ke Dashboard (Login)
1. Buka peramban web (Google Chrome, Safari, atau Firefox) lalu akses URL:
   `https://demo.tokoanda.com/login` (atau alamat domain toko Anda).
2. Masukkan **Alamat Email** dan **Kata Sandi** yang telah didaftarkan oleh Administrator / LarisManis.online.
3. Klik tombol **"Masuk ke Dashboard"**.
4. Sistem secara otomatis memeriksa hak akses Anda dan mengarahkan ke halaman Beranda Dashboard sesuai izin peran (*role*) Anda.

### 1.2 Memahami Peran Pengguna (Role Hierarchy)
Sistem membedakan dua kategori akun utama:
* 👑 **Administrator (Owner)**: Pemilik toko yang memiliki kekuasaan penuh ke seluruh pengaturan finansial, penambahan staf, rekening bank, dan data pelanggan.
* 👥 **Staf Toko (Staff)**: Akun operasional dengan wewenang terbatas yang disesuaikan dengan tanggung jawab masing-masing (Manajer, CS, Gudang, Keuangan, Marketing).

### 1.3 Mode Gelap (Dark Mode) & Pengaturan Tampilan
* Di sudut kanan atas bilah navigasi, terdapat ikon tombol **Bulan / Matahari (Theme Toggle)**.
* Klik tombol tersebut kapan saja untuk beralih antara **Light Mode** (latar putih segar) dan **Dark Mode** (latar gelap nyaman untuk mata di malam hari).
* Teks formulir telah dioptimalkan dengan kontras tinggi sehingga tulisan yang Anda ketik selalu terlihat jelas dan tidak berbayang.

### 1.4 Membuka Buku Panduan Cepat (Guide Drawer) & Asisten AI
* **Tombol Panduan Menu**: Terletak di bagian atas navbar `[📖 Panduan Menu]` atau tab sticky di sisi kanan layar `[📖 PANDUAN]`. Klik tombol ini untuk membuka rangkuman instruksi langkah kerja menu yang sedang Anda buka.
* **Tombol Asisten AI**: Tombol melayang ungu di pojok kanan bawah. Klik untuk bertanya seputar copywriting produk, ide promosi, atau analisa penjualan toko Anda.

---

## Bab 2: Menu Dashboard (Beranda & Statistik Kunci)

Halaman Dashboard ([`/admin`](file:///home/ngabsenid/aiseocommerce/aiseocommerce/app/admin)) adalah pusat kendali real-time untuk memantau ritme perputaran bisnis Anda.

### 2.1 Filter Rentang Tanggal
Di bagian atas dashboard, gunakan pemilih tanggal cepat:
* **Hari Ini**: Memantau perputaran omzet sejak pukul 00:00 hari ini.
* **7 Hari Terakhir**: Evaluasi ritme mingguan.
* **30 Hari Terakhir / Bulan Ini**: Laporan performa bulanan toko.
* **Kustom**: Pilih tanggal awal dan tanggal akhir secara fleksibel.

### 2.2 Membaca 4 Kartu Metrik Utama
1. **Total Omzet Bersih**: Akumulasi nilai belanja dari seluruh pesanan yang telah berstatus `PAID` (Lunas). Pesanan berstatus PENDING atau CANCELLED tidak dihitung demi akurasi.
2. **Total Pesanan**: Jumlah seluruh pesanan yang masuk pada rentang waktu yang dipilih.
3. **Produk Aktif**: Jumlah produk yang sedang dipublikasikan dan dapat dibeli oleh pelanggan di etalase toko.
4. **Total Pelanggan**: Jumlah kontak pelanggan unik yang tersimpan di sistem.

> [!TIP]
> Klik langsung pada kartu metrik atau baris tabel pesanan terkini untuk langsung berpindah ke halaman rincian transaksi terkait.

---

## Bab 3: Menu Produk & Manajemen Stok (Fisik, Digital, Event, PO & Omnichannel)

Menu Produk ([`/admin/products`](file:///home/ngabsenid/aiseocommerce/aiseocommerce/app/admin/products)) digunakan untuk mengelola seluruh etalase barang dagangan Anda.

### 3.1 Menambah Produk Baru
1. Klik tombol **"+ Tambah Produk"** di pojok kanan atas.
2. Masukkan **Nama Produk** (contoh: *Kemeja Batik Katun Premium*). Slug URL otomatis dihasilkan sistem.
3. Pilih **Kategori** produk.
4. Masukkan **Harga Modal (Base Price)** dan **Harga Jual (Selling Price)**.
5. Masukkan **Stok Awal**.

### 3.2 Memilih Jenis Produk (Product Types)
* 📦 **Produk Fisik**: Membutuhkan pengiriman kurir. **Wajib mengisi Berat Produk (dalam gram)** agar ongkir kurir Biteship dapat dihitung secara akurat.
* 💾 **Produk Digital**: Ebook, panduan PDF, atau lisensi software. Masukkan link unduhan file yang aman. Pembeli yang telah lunas otomatis mendapatkan tombol unduh di invoice mereka.
* 🎟️ **Event / Seminar**: Tiket webinar atau workshop offline. Sistem otomatis menghasilkan kode e-tiket unik saat pembayaran terkonfirmasi.

### 3.3 Pengaturan Ready Stock vs Pre-Order (PO)
* Jika barang sudah tersedia di gudang: Biarkan opsi PO tidak dicentang (Ready Stock).
* Jika barang harus diproduksi/dijahit terlebih dahulu:
  1. Centang kotak **"Produk Pre-Order (PO)"**.
  2. Masukkan **Estimasi Waktu Pengerjaan** (misal: `7` hari).
  3. Di etalase toko, sistem otomatis menampilkan lencana oranye *Pre-Order (7 Hari)* dan **menyembunyikan angka stok fisik** agar pelanggan tidak ragu melakukan pemesanan.

### 3.4 Menambahkan Variasi Produk
Jika produk memiliki pilihan warna atau ukuran:
1. Gulir ke bagian **Variasi Produk**.
2. Tambahkan varian (contoh: *Warna: Hitam, Ukuran: XL*).
3. Tentukan SKU unik, harga spesifik untuk varian tersebut, dan stok masing-masing.

### 3.5 Tautan Marketplace Omnichannel (Shopee, Tokopedia, TikTok Shop, Blibli)
Untuk menangkap calon pembeli yang lebih nyaman bertransaksi di marketplace:
1. Buka section **"Link Marketplace & Saluran Penjualan Eksternal"**.
2. Masukkan URL produk Anda di **Shopee, Tokopedia, TikTok Shop, Blibli**, atau **Marketplace Kustom** (Lazada/CS WhatsApp).
3. Simpan produk. Di halaman toko pembeli, tepat di bawah tombol *Tambah ke Keranjang*, akan muncul tombol-tombol belanja berlogo resmi marketplace tersebut.

---

## Bab 4: Menu Kategori Produk

Menu Kategori ([`/admin/categories`](file:///home/ngabsenid/aiseocommerce/aiseocommerce/app/admin/categories)) memastikan pengelompokan barang Anda rapi dan terstruktur.

1. **Tambah Kategori**: Ketikkan nama kategori (misal: *Hijab Voal*, *Sepatu Kulit*, *Kopi Nusantara*).
2. **Deskripsi SEO**: Tuliskan 1-2 kalimat ringkasan tentang kategori tersebut. Mesin pencari Google menyukai kategori yang memiliki deskripsi informatif.
3. **Banner / Ikon**: Tambahkan gambar ikon agar tampilan menu beranda tampak visual dan modern.
4. **Pengurutan**: Tata kategori utama agar produk terpopuler tampil di urutan teratas.

---

## Bab 5: Menu Pesanan & Logistik Resi (Transfer Manual & Biteship)

Menu Pesanan ([`/admin/orders`](file:///home/ngabsenid/aiseocommerce/aiseocommerce/app/admin/orders)) adalah jantung operasional harian toko Anda.

### 5.1 Alur Status Pesanan (Order Lifecycle)
* ⏳ `PENDING`: Pesanan telah dibuat oleh pelanggan, menunggu pembayaran.
* 💳 `PAID`: Pembayaran telah diverifikasi (melalui mutasi bank atau gateway Midtrans).
* 📦 `PROCESSING`: Pembayaran telah diterima, staf gudang sedang mengemas barang.
* 🚚 `SHIPPED`: Paket telah diserahkan ke kurir atau dijemput oleh ekspedisi Biteship.
* ✅ `DELIVERED`: Paket telah sampai dengan selamat di tangan pembeli.
* ❌ `CANCELLED` / `REFUNDED`: Pesanan dibatalkan atau dana dikembalikan ke pembeli.

### 5.2 Cara Memverifikasi Pembayaran Transfer Bank Manual
1. Buka pesanan yang berstatus `PENDING`.
2. Klik thumbnail **Bukti Pembayaran** untuk membuka foto resi bank yang diunggah pembeli secara *full screen*.
3. Periksa kecocokan nama pengirim dan nominal transfer dengan mutasi rekening bank Anda.
4. Jika valid, klik tombol hijau **"Konfirmasi Pembayaran (PAID)"**.
5. Sistem seketika mengubah status menjadi `PAID`, mengirim notifikasi, dan mencatat transaksi ke buku kas besar toko.

### 5.3 Memesan Penjemputan Kurir via Biteship (1-Klik)
1. Buka pesanan yang berstatus `PAID` atau `PROCESSING`.
2. Pada kartu logistik, klik tombol **"Kirim via Biteship"**.
3. Pilih kurir aktif (contoh: *JNE Reguler*, *SiCepat BEST*, atau *J&T EZ*).
4. Klik **"Panggil Kurir Sekarang"**.
5. Sistem secara otomatis memesan penjemputan (*pickup request*), menerbitkan **Nomor Resi (Waybill)** resmi, dan mengubah status pesanan menjadi `SHIPPED`.
6. Klik **"Cetak Invoice"** untuk mencetak nota yang siap ditempelkan di paket.

### 5.4 Pelacakan Resi Progresif (Live Tracking)
* Anda dan pembeli dapat melihat riwayat perjalanan kurir secara transparan: jam paket dijemput, lokasi manifest transit, hingga nama kurir pengantar.
* Begitu kurir menyelesaikan pengantaran, sistem otomatis mendeteksi webhook dan mengubah status akhir menjadi `DELIVERED`.

---

## Bab 6: Menu Pelanggan (CRM & Hubungi WhatsApp Langsung)

Menu Pelanggan ([`/admin/customers`](file:///home/ngabsenid/aiseocommerce/aiseocommerce/app/admin/customers)) menyimpan seluruh data interaksi pembeli Anda.

1. **Pencarian Cepat**: Cari pelanggan berdasarkan nama, nomor telepon, atau alamat email.
2. **Customer Lifetime Value (LTV)**: Ketahui pelanggan paling royal dengan memantau kolom *Total Belanja* dan *Jumlah Pesanan*.
3. **Hubungi via WhatsApp**: Klik ikon WhatsApp di sebelah nomor pembeli. WhatsApp Web / aplikasi WhatsApp Anda akan langsung terbuka dengan nomor telepon pelanggan yang sudah terformat rapi (+62).
4. **Riwayat Alamat**: Periksa daftar alamat kirim yang pernah digunakan pembeli untuk memverifikasi keaslian pesanan.

---

## Bab 7: Menu Keuangan & Buku Kas Besar (General Ledger & Petty Cash)

Menu Keuangan ([`/admin/finance`](file:///home/ngabsenid/aiseocommerce/aiseocommerce/app/admin/finance)) menyajikan laporan akuntansi double-entry yang transparan dan rapi.

### 7.1 Membaca Laporan Laba Rugi Riil
* **Total Pendapatan (Income)**: Bersumber otomatis dari pesanan yang berstatus `PAID`.
* **Total Beban (Expense)**: Akumulasi seluruh pengeluaran operasional yang Anda catat.
* **Laba / Rugi Bersih**: Selisih bersih antara pendapatan dan pengeluaran riil.
* *Catatan Keamanan*: Seluruh pesanan pengujian mode Sandbox otomatis diabaikan agar laporan keuangan Anda tidak tercampur dengan transaksi uji coba.

### 7.2 Mencatat Beban Pengeluaran Operasional (Expense)
1. Klik tombol **"+ Catat Pengeluaran"**.
2. Masukkan tanggal transaksi, kategori beban (misal: *Marketing Iklan*, *Sewa Tempat*, *Kemasan & Bubble Wrap*).
3. Masukkan nominal pengeluaran dan catatan keterangan.
4. Klik **Simpan**.

### 7.3 Manajemen Kas Kecil (Petty Cash)
* Digunakan untuk mencatat uang kas tunai fisik yang disimpan di toko/gudang untuk keperluan harian kecil (beli lakban, fotokopi resi, konsumsi tim gudang, bensin kurir lokal).
* Staf dapat mencatat kas keluar kecil, dan Manajer/Owner dapat menyetujui rekonsiliasi kas di akhir pekan.

---

## Bab 8: Menu Promo & Kupon Diskon Voucher

Menu Promo ([`/admin/promo`](file:///home/ngabsenid/aiseocommerce/aiseocommerce/app/admin/promo)) digunakan untuk merancang program loyalitas dan kampanye diskon.

1. **Membuat Kupon Baru**: Klik **"+ Tambah Voucher"**.
2. **Kode Voucher**: Masukkan kode unik huruf kapital (misal: `GAJIANSERU`, `ONGKIRHEMAT`).
3. **Pilihan Tipe Potongan**:
   * **Potongan Tetap (Nominal)**: Mengurangi subtotal dengan nominal pasti (contoh: Potongan Rp 25.000).
   * **Potongan Persentase (%)**: Mengurangi subtotal berdasarkan persen (contoh: 15% diskon).
4. **Batas Belanja & Maksimal Potongan**:
   * Masukkan *Minimum Belanja* (misal: wajib belanja minimal Rp 100.000).
   * Masukkan *Maksimal Potongan* untuk diskon persentase agar profit toko tetap terjaga.
5. **Kuota & Masa Berlaku**: Batasi kuota (misal: untuk 100 pemakai pertama) serta tanggal aktif dan tanggal kedaluwarsa kupon.

---

## Bab 9: Menu CMS Landing Page Builder (Visual Page Layout)

Menu CMS ([`/admin/cms`](file:///home/ngabsenid/aiseocommerce/aiseocommerce/app/admin/cms)) memungkinkan Anda mengubah wajah halaman toko tanpa menyentuh kode program.

1. **Hero Banner Toko**: Ubah foto spanduk utama, ketikkan kalimat promosi yang memikat, dan arahkan tombol ajakan bertindak (*Call to Action*).
2. **Section Keunggulan (Value Props)**: Tampilkan alasan mengapa pelanggan harus berbelanja di toko Anda (misal: *Produk Bergaransi*, *Pengiriman Cepat*, *Layanan Pelanggan Ramah*).
3. **Deretan Produk Unggulan**: Pilih produk-produk terlaris untuk disorot di halaman depan agar langsung terlihat oleh pengunjung baru.
4. **Simpan & Publikasikan**: Klik tombol simpan untuk langsung menerapkan perubahan ke toko Anda.

---

## Bab 10: Menu Artikel Blog & Optimasi SEO (Real-Time Analyzer)

Menu Artikel ([`/admin/articles`](file:///home/ngabsenid/aiseocommerce/aiseocommerce/app/admin/articles)) adalah senjata rahasia Anda untuk mendatangkan pembeli gratis dari mesin pencari Google.

### 10.1 Cara Menulis Artikel dengan Skor SEO Tinggi
1. Klik **"+ Tulis Artikel Baru"**.
2. Masukkan **Judul Artikel** yang informatif dan menjawab pertanyaan calon pelanggan.
3. Masukkan **Kata Kunci Fokus (Focus Keyword)** yang ingin ditargetkan (contoh: *baju gamis modern*).
4. Tulis isi artikel Anda.

### 10.2 Membaca Real-Time SEO Analyzer (Sisi Kanan)
Saat Anda mengetik, sistem secara langsung menganalisis:
* **Jumlah Kata**: Disarankan minimal 300 - 600 kata untuk ulasan yang berbobot.
* **Kepadatan Kata Kunci (Keyword Density)**: Sistem merekomendasikan kepadatan antara 1% hingga 2.5% agar artikel tidak dianggap spam oleh Google.
* **Keberadaan Kata Kunci**: Memastikan kata kunci fokus muncul pada judul artikel, paragraf pertama, dan subjudul (Heading H2).
* **Skor SEO Keseluruhan (0 - 100)**: Targetkan skor berwarna hijau (di atas 75) untuk peluang terbaik menembus halaman pertama Google.

### 10.3 Menyisipkan Produk ke Dalam Artikel (Product Placement)
* Di bagian bawah formulir artikel, pilih produk-produk yang relevan dari katalog Anda.
* Di halaman artikel blog pembeli, kartu produk beserta harga dan tombol beli akan muncul secara otomatis di tengah-tengah ulasan artikel Anda!

---

## Bab 11: Menu Laporan & Analitik (Funnel Konversi Belanja)

Menu Analitik ([`/admin/analytics`](file:///home/ngabsenid/aiseocommerce/aiseocommerce/app/admin/analytics)) menyajikan data mendalam untuk evaluasi bisnis.

### 11.1 Memahami Funnel Konversi Produk (Conversion Funnel)
Funnel konversi memperlihatkan perjalanan pembeli dalam 4 langkah:
1. **Dilihat (Product Views)**: Berapa kali halaman produk Anda dibuka pengunjung.
2. **Masuk Keranjang (Add to Cart)**: Berapa pengunjung yang tertarik dan menekan tombol keranjang.
3. **Menuju Checkout**: Pengunjung yang mulai mengisi data alamat pengiriman.
4. **Pembayaran Sukses (Purchased)**: Pengunjung yang menyelesaikan pembayaran hingga tuntas.

> [!TIP]
> Jika banyak pembeli berhenti pada tahap Checkout, evaluasi kembali tarif ongkos kirim atau tawarkan metode pembayaran yang lebih bervariasi.

---

## Bab 12: Menu Pengaturan Toko (Master Settings - 9 Kategori Lengkap)

Menu Pengaturan ([`/admin/settings`](file:///home/ngabsenid/aiseocommerce/aiseocommerce/app/admin/settings)) mengatur pondasi teknologi seluruh toko Anda:

### 1. Tab Identitas & Kontak (General)
* Nama Toko, Slogan/Tagline, Nomor WhatsApp CS, Alamat Email Toko, dan Alamat Fisik.
* Unggah **Logo Toko** dan **Favicon** (ikon tab peramban).
* Pengaturan Domain kustom toko Anda.

### 2. Tab Hero Section
* Mengatur judul teks besar, subjudul, dan gambar latar belakang spanduk utama beranda.

### 3. Tab Tema & Tampilan (Theme)
* Memilih kombinasi huruf Google Fonts (*Plus Jakarta Sans, Inter, Poppins, Roboto, Playfair Display*).
* Menyesuaikan warna aksen primer brand toko.

### 4. Tab Pengiriman & Logistik (Shipping)
* Masukkan **API Key Biteship** untuk mengaktifkan tarif kurir otomatis seluruh Indonesia.
* Centang kurir-kurir yang ingin Anda aktifkan (JNE, J&T, SiCepat, Anteraja, GoSend, GrabExpress, dll.).
* Tentukan Kota Asal pengiriman (lokasi fisik gudang toko Anda).
* Atur tarif pengiriman flat manual sebagai cadangan.

### 5. Tab Pixel & Keamanan
* Pasang kode pelacak iklan: **Meta / Facebook Pixel ID**, **Google Analytics 4 (GA4) Measurement ID**, dan **TikTok Pixel ID**.
* **Panduan Konfigurasi Cloudflare Turnstile (Proteksi Anti-Bot & DDoS Seluruh Path Publik):**
  1. Login ke [Cloudflare Dashboard](https://dash.cloudflare.com), pilih menu **Turnstile**, lalu klik **Add widget**.
  2. Beri nama widget dan masukkan hostname domain toko Anda (contoh: `demo.larismanis.online` atau domain kustom Anda) di bagian **Add Hostnames**.
  3. Pilih **Widget Mode: Managed (Recommended)** agar pembeli asli diverifikasi mulus di latar belakang, lalu klik **Create**.
  4. Salin **Site Key** (`0x4...`) dan **Secret Key** (`0x4...`), masuk ke menu **Pengaturan -> 🛡️ Pixel & Keamanan** di Admin Panel, tempelkan kedua kunci di panel **Cloudflare Turnstile (Anti-Bot / CAPTCHA)**, centang kotak **Aktifkan proteksi bot Cloudflare Turnstile di seluruh path publik**, lalu klik **Simpan Turnstile**.
  5. **Cakupan Proteksi Global & Kenyamanan Pembeli:**
     * **Halaman Publik:** Beranda (`/`), Katalog (`/products`), Detail Produk (`/product/*`), Kategori (`/categories`, `/category/*`), Artikel (`/articles`, `/articles/*`), Penawaran (`/penawaran`), Landing Page (`/lp/*`), Login (`/login`), Registrasi (`/register`), Lupa Password (`/forgot-password`), Reset Password (`/reset-password`), Syarat & Privasi.
     * **API Publik:** Verifikasi Turnstile (`/api/security/turnstile-verify`), Checkout (`/api/orders`), Cek Ongkir & Area Biteship (`/api/shipping/rates`, `/api/shipping/areas`), Pemulihan Password (`/api/auth/forgot-password`, `/api/auth/reset-password`), serta endpoint katalog/kategori/artikel/voucher.
     * Pembeli cukup lolos 1x dan akan menerima cookie sesi `cf_turnstile_pass` (berlaku 2 jam) sehingga dapat menjelajahi produk dengan nyaman tanpa login terlebih dahulu, sementara bot/scraper otomatis terbatasi rate-limit ketat.

### 6. Tab Legalitas & Kebijakan
* Menuliskan halaman Syarat & Ketentuan Layanan, Kebijakan Privasi, Kebijakan Pengembalian Barang (Retur), dan mengaktifkan banner persetujuan Cookie.

### 7. Tab Integrasi Asisten AI (BYOK)
* Pilih penyedia AI: **Google Gemini** atau **OpenAI GPT**.
* Masukkan API Key mandiri Anda (Bring Your Own Key).
* Pilih model AI aktif dari dropdown (misal: *gemini-2.5-flash* atau *gpt-4o-mini*).
* Tentukan instruksi kepribadian khusus untuk asisten AI toko Anda.

> [!IMPORTANT]
> **Isolasi Penuh 100% Back-Office (Admin-Only)**:
> Kunci API dan kapabilitas AI Anda berjalan sepenuhnya privat hanya di sisi Admin Dashboard toko. Toko online di sisi pembeli/pelanggan **sama sekali tidak memuat chatbot AI dan tidak memiliki celah akses untuk mengonsumsi kuota API Key Anda**. Kuota API Key murni hanya digunakan saat admin/staf membuat konten katalog di dashboard. Kunci API Anda disimpan dalam keadaan aman dan disamarkan (`********`).

### 8. Tab Notifikasi Real-Time (WhatsApp & Telegram)
* **Fonnte WhatsApp API**: Masukkan API Token Fonnte agar Anda dan pembeli menerima pesan WhatsApp otomatis saat ada pesanan baru, bukti bayar diunggah, atau resi diterbitkan.
* **Telegram Bot**: Masukkan Bot Token dan Chat ID Telegram untuk menerima notifikasi kilat di ponsel Anda.

### 9. Tab Email & SMTP Server
* Konfigurasikan server email keluar toko: SMTP Host, Port, Username, Password, dan Tipe Enkripsi (TLS/SSL).
* **Cek DNS Live**: Memeriksa validitas record **SPF, DKIM, dan MX** domain Anda secara langsung agar email tidak masuk ke folder spam pembeli.
* **Verifikasi Kepemilikan Email**: Kirim token verifikasi 6 digit ke alamat email toko sebelum mengaktifkan pengiriman email keluar.
* **Uji Coba Kirim Email**: Tombol test untuk memastikan konfigurasi email berfungsi dengan lancar.

---

## Bab 13: Menu Manajemen Staf & Delegasi Hak Akses (RBAC)

Menu Staf ([`/admin/staff`](file:///home/ngabsenid/aiseocommerce/aiseocommerce/app/admin/staff)) memungkinkan Anda mendelegasikan pekerjaan toko ke tim dengan aman.

### 13.1 Menambah Akun Staf Baru
1. Klik **"+ Tambah Akun Staf"**.
2. Masukkan Nama Lengkap, Alamat Email, Jabatan, dan Kata Sandi Sementara.
3. Pilih salah satu **Role Preset**:
   * 💼 **Manajer Operasional**: Akses ke katalog, pesanan, analitik, dan promo.
   * 🎧 **Customer Service (CS)**: Akses ke pesanan, verifikasi bukti bayar, dan kontak pelanggan.
   * 📦 **Staf Gudang**: Akses ke produk, pencetakan resi Biteship, dan stok barang.
   * 💰 **Staf Keuangan**: Akses ke pesanan, kas masuk/keluar, petty cash, dan laporan finansial.
   * ✍️ **Marketing & Konten**: Akses ke artikel SEO, landing page CMS, kupon diskon, dan analitik.

### 13.2 Menyesuaikan Hak Akses Per Menu (Granular Permissions)
* Jika ingin memberikan hak akses khusus (misal: staf gudang yang juga diperbolehkan melihat artikel), cukup centang modul izin terkait pada tabel 12 modul izin.
* Staf yang tidak memiliki izin ke suatu menu tidak akan melihat menu tersebut di sidebar dan otomatis diblokir jika mencoba mengakses URL langsung.

---

## Bab 14: Standar Operasional Prosedur (SOP) Harian, Keamanan & FAQ

### 14.1 Jadwal Rutin Operasional Harian Toko
```
Pagi Hari (08:00 - 09:30):
1. Login ke Dashboard Admin.
2. Periksa menu Pesanan berstatus PENDING.
3. Buka bukti transfer dan lakukan konfirmasi pembayaran (PAID).
4. Klik "Kirim via Biteship" pada seluruh pesanan lunas untuk memesan kurir penjemputan.
5. Cetak Invoice dan serahkan barang ke staf packing.

Siang Hari (12:00 - 14:00):
1. Pantau status kurir penjemputan Biteship (apakah paket sudah dipickup).
2. Balas chat pelanggan via tombol WhatsApp di menu Pelanggan jika ada yang bertanya.

Sore Hari (16:30 - 18:00):
1. Catat pengeluaran operasional hari ini di menu Keuangan (jika ada).
2. Periksa menu Produk untuk memantau stok yang menipis atau produk PO yang jatuh tempo.
3. Buka Asisten AI untuk merencanakan artikel blog atau promo esok hari.
```

### 14.2 Tips Keamanan Akun Toko
1. **Jangan Berbagi Akun Administrator**: Berikan akun staf dengan hak akses terbatas kepada karyawan Anda.
2. **Gunakan Kata Sandi yang Kuat**: Kombinasikan huruf besar, angka, dan simbol.
3. **Segera Nonaktifkan Staf Resign**: Jika ada karyawan yang berhenti, segera ubah status akun staf menjadi *Nonaktif* di menu Manajemen Staf.

### 14.3 Pertanyaan yang Sering Diajukan (FAQ)
* **Q: Bagaimana jika pembeli salah mengunggah foto bukti transfer?**  
  *A: Anda dapat menolak bukti bayar tersebut dengan tombol tolak dan mengirim pesan WhatsApp ramah kepada pembeli untuk meminta unggah ulang bukti transfer yang valid.*
* **Q: Apakah saya bisa mengubah harga produk saat ada pesanan yang sedang berjalan?**  
  *A: Bisa. Sistem menyimpan data harga produk secara historis pada saat transaksi dibuat, sehingga perubahan harga di masa depan tidak akan mengubah nominal pesanan lama.*
* **Q: Ke mana saya harus menghubungi jika membutuhkan bantuan teknis tambahan?**  
  *A: Layanan managed service toko online ini didukung penuh oleh **LarisManis.online**. Anda dapat menghubungi account manager LarisManis.online Anda kapan saja untuk bantuan server, domain, maupun pengembangan fitur baru.*

---

## Bab 15: Menu AI Studio (Pembuatan Gambar Jualan & Asisten Copywriting)

Modul **AI Studio** merupakan pusat kreasi visual komersial dan penulisan copywriting otomatis toko Anda yang didukung oleh AI generasi terbaru (Google Gemini & OpenAI).

### 15.1 Syarat Mutlak Foto Referensi Produk Asli
Dalam penjualan online, kejujuran bentuk fisik barang adalah kunci kepercayaan pelanggan. Oleh karena itu, fitur **Pembuatan Gambar Jualan AI** memiliki syarat wajib:
1. **Wajib Ada Foto Produk Asli**: Anda harus mengunggah atau memilih foto produk fisik asli Anda. AI tidak akan membuat gambar tanpa referensi visual nyata.
2. **Peran AI**: AI bertugas menempatkan produk Anda ke panggung studio komersial (*commercial podium staging*), mengatur pencahayaan studio foto profesional, dan mengganti latar belakang agar terlihat mewah dan estetik.

### 15.2 6 Preset Gaya Panggung Komersial
1. ⚪ **Studio White Minimalist**: Latar putih bersih standar katalog e-commerce dengan pencahayaan softbox seimbang.
2. 🪵 **Aesthetic Wooden Podium**: Panggung kayu oak dengan sinar matahari pagi hangat dan bayangan dedaunan organik (Sangat cocok untuk Skincare, Herbal, dan Makanan).
3. 🏛️ **Luxury Marble & Gold**: Permukaan marmer Carrara mewah berurat emas dan pantulan ambient elegan (Cocok untuk Jam Tangan, Perhiasan, dan Parfum).
4. 🌿 **Nature Outdoor Lifestyle**: Latar batu sungai alami dan dedaunan monstera segar dengan bokeh outdoor lembut.
5. 🌸 **Modern Pastel Pop**: Latar pastel peach dan mint ceria bergaya feed Instagram dan TikTok Shop.
6. ⚡ **Cyber Neon Tech**: Latar gelap akrilik dengan pencahayaan neon cyan-magenta futuristik untuk gadget & aksesori gaming.

### 15.3 Format Rasio Gambar
* **1:1 Persegi (1080x1080)**: Format standar untuk thumbnail katalog toko online, Shopee, Tokopedia, dan Feed Instagram.
* **4:5 Portrait (1080x1350)**: Format vertikal optimal untuk iklan Story IG, Reels, dan TikTok Shop.
* **16:9 Landscape (1920x1080)**: Format horizontal untuk banner promosi hero section beranda toko Anda.

### 15.4 Integrasi 1-Klik ke Produk Toko
Setelah gambar selesai digenerate:
* Klik **"Jadikan Foto Produk"**: Sistem otomatis menyimpan dan menautkan gambar WebP ke galeri produk toko Anda.
* Klik **"Unduh Gambar (WebP)"**: Mengunduh berkas gambar beresolusi tinggi yang sudah terkompresi ringan untuk kebutuhan promosi media sosial.

### 15.5 Batas Keamanan & Privasi AI (100% Back-Office / Admin-Only)
* **Zero Customer Exposure**: Pelanggan atau pembeli di etalase toko online (*storefront*) tidak memiliki akses ke fitur AI, tidak ada widget AI bot, dan tidak ada formulir interaksi AI publik.
* **Perlindungan Kuota Merchant**: Tidak ada risiko kuota API Key (Google Gemini / OpenAI) milik merchant terkuras oleh aktivitas pengunjung atau bot internet.
* **Pencegahan Kebocoran Kunci API (Zero Leakage)**: API Key Anda tidak pernah dikirimkan ke peramban pelanggan dalam bentuk apapun. Pada endpoint admin sekalipun, nilai API key disamarkan (*masked*) menjadi `********`.
* **Proteksi Akses Berlapis**: Seluruh rute API AI dilindungi autentikasi ketat. Pengunjung publik otomatis ditolak dengan `401 Unauthorized` dan akun pembeli (`CUSTOMER`) otomatis ditolak dengan `403 Forbidden`.

---
*Dokumen ini disusun untuk memberikan pengalaman operasional terbaik bagi Anda dan seluruh tim bisnis Anda.*  
*Hak Cipta © 2026 LarisManis.online. Seluruh hak cipta dilindungi undang-undang.*

