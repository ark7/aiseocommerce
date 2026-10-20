/**
 * Default templates for Store Legal Pages and Cookie Permission
 */

export function getDefaultTerms(storeName: string, storeEmail?: string, storePhone?: string): string {
  return `## 1. Pendahuluan
Selamat datang di ${storeName}. Dokumen Syarat & Ketentuan ini mengatur penggunaan situs web kami, pembelian produk, serta layanan terkait yang disediakan oleh ${storeName}. Dengan mengakses atau berbelanja di situs kami, Anda dianggap telah membaca, memahami, dan menyetujui seluruh ketentuan ini.

## 2. Akun & Keamanan Pengguna
* Pengguna bertanggung jawab untuk menjaga kerahasiaan kata sandi dan data akun pribadi masing-masing.
* Seluruh aktivitas yang terjadi melalui akun Anda merupakan tanggung jawab penuh pemilik akun.
* ${storeName} berhak membatasi atau menonaktifkan akun pengguna jika ditemukan indikasi penyalahgunaan, penipuan, atau pelanggaran hukum yang berlaku.

## 3. Pemesanan & Pembayaran
* Semua harga produk yang tertera dalam mata uang Rupiah (IDR) dan dapat berubah sewaktu-waktu sesuai kebijakan toko.
* Pembayaran dapat dilakukan melalui gateway pembayaran resmi yang telah terintegrasi (Transfer Bank, Virtual Account, QRIS, Kartu Kredit, atau e-Wallet).
* Pesanan akan diproses setelah verifikasi pembayaran berhasil diterima oleh sistem kami.

## 4. Pengiriman & Penerimaan Produk
* Estimasi waktu pengiriman bergantung pada jasa ekspedisi dan lokasi tujuan penerima.
* Risiko atas keterlambatan atau kerusakan selama proses pengiriman oleh pihak ketiga (kurir/ekspedisi) akan ditangani sesuai prosedur klaim asuransi ekspedisi terkait.
* Pembeli diwajibkan melakukan perekaman video unboxing tanpa jeda saat membuka paket sebagai bukti sah apabila terdapat kekurangan atau cacat produk.

## 5. Pengembalian & Garansi (Return Policy)
* Permohonan penukaran atau pengembalian barang hanya diterima dalam waktu maksimal 2 x 24 jam setelah pesanan tiba di alamat tujuan.
* Produk harus berada dalam kondisi baru, belum digunakan, serta kelengkapan tag dan kemasan asli masih utuh.

## 6. Hak Kekayaan Intelektual
Seluruh konten pada situs ini, termasuk namun tidak terbatas pada logo, teks, foto produk, grafik, dan tata letak adalah milik ${storeName} dan dilindungi oleh undang-undang hak cipta Republik Indonesia. Dilarang keras menyalin, mendistribusikan, atau memodifikasi konten tanpa izin tertulis dari kami.

## 7. Kontak & Bantuan
Apabila Anda memiliki pertanyaan lebih lanjut mengenai Syarat & Ketentuan ini, silakan hubungi tim kami melalui:
* Email: ${storeEmail || 'cs@toko.com'}
* Telepon / WhatsApp: ${storePhone || '+62 812-3456-7890'}
`;
}

export function getDefaultPrivacy(storeName: string, storeEmail?: string): string {
  return `## 1. Komitmen Privasi Kami
${storeName} berkomitmen penuh untuk melindungi dan menghormati privasi data pribadi Anda sesuai dengan peraturan perundang-undangan perlindungan data pribadi (UU Perlindungan Data Pribadi / UU PDP) yang berlaku di Republik Indonesia.

## 2. Informasi yang Kami Kumpulkan
Kami dapat mengumpulkan dan memproses jenis data pribadi berikut:
* **Informasi Identitas & Kontak:** Nama lengkap, alamat pengiriman, alamat email, dan nomor telepon saat Anda mendaftar atau melakukan checkout pesanan.
* **Informasi Transaksi:** Rincian produk yang dibeli, riwayat pemesanan, dan metode pembayaran yang dipilih (kami tidak pernah menyimpan informasi sensitif kartu kredit Anda; seluruh transaksi diproses melalui payment gateway tersertifikasi PCI-DSS).
* **Data Teknis & Navigasi:** Alamat IP, jenis peramban (browser), sistem operasi, dan aktivitas penjelajahan melalui cookie untuk mengelola sesi keranjang belanja.

## 3. Penggunaan Informasi
Data yang kami kumpulkan digunakan untuk keperluan:
* Memproses, mengonfirmasi, dan mengirimkan pesanan belanja Anda.
* Memberikan pembaruan status pesanan melalui email atau WhatsApp.
* Mengelola keranjang belanja dan preferensi akun Anda.
* Meningkatkan performa sistem, keamanan dari penipuan, dan pengalaman pengguna di situs kami.

## 4. Penggunaan Cookie & Pelacak
Situs web kami menggunakan cookie untuk:
* Mengingat item produk yang telah Anda masukkan ke dalam keranjang belanja.
* Menjaga sesi login Anda tetap aktif dan aman.
* Menganalisis lalu lintas situs secara anonim guna mengoptimalkan navigasi toko.
Anda memiliki kendali penuh untuk menerima atau menolak cookie non-esensial melalui banner izin cookie yang muncul pada kunjungan pertama Anda.

## 5. Keamanan Data Pribadi
Kami menerapkan langkah-langkah keamanan teknis dan organisasi yang ketat (termasuk enkripsi SSL/HTTPS, hashing kata sandi dengan bcrypt, dan pembatasan akses database) untuk mencegah akses tidak sah, pengungkapan, atau kehilangan data Anda.

## 6. Hak-Hak Anda
Anda berhak untuk:
* Mengakses dan memperbarui informasi akun Anda kapan saja melalui menu akun.
* Meminta penghapusan data akun atau data pribadi Anda dari sistem kami dengan menghubungi layanan pelanggan kami.

## 7. Hubungi Kami
Jika Anda memiliki pertanyaan, keluhan, atau permintaan terkait kebijakan privasi ini, silakan hubungi kami di:
* Email: ${storeEmail || 'privacy@toko.com'}
`;
}

export const DEFAULT_COOKIE_TITLE = 'Pemberitahuan & Izin Penggunaan Cookie';

export const DEFAULT_COOKIE_TEXT =
  'Kami menggunakan cookie untuk memastikan transaksi belanja dan keranjang Anda berjalan optimal, mengingat preferensi sesi, serta meningkatkan kenyamanan navigasi Anda di situs ini.';

