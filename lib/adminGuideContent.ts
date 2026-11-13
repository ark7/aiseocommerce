/**
 * Basis Data Konten Buku Panduan Pengguna Admin Dashboard (Bahasa Indonesia)
 * Digunakan oleh komponen AdminGuideDrawer untuk menampilkan panduan kontekstual per menu.
 */

export interface GuideStep {
  title: string;
  desc: string;
}

export interface GuideFaq {
  q: string;
  a: string;
}

export interface GuideChapter {
  id: string;
  pathMatch: (path: string) => boolean;
  title: string;
  menuName: string;
  icon: string;
  badge: 'Operasional' | 'Katalog' | 'Penjualan' | 'Konten' | 'Pengaturan' | 'Analitik';
  summary: string;
  steps: GuideStep[];
  tips: string[];
  warnings: string[];
  faqs: GuideFaq[];
  docAnchor: string;
}

export const ADMIN_GUIDE_CHAPTERS: GuideChapter[] = [
  {
    id: 'dashboard',
    pathMatch: (path: string) => path === '/admin',
    title: 'Panduan Dashboard & Metrik Utama',
    menuName: 'Dashboard',
    icon: '📊',
    badge: 'Operasional',
    summary: 'Pusat komando toko untuk memantau performa penjualan, omzet bersih, pesanan baru masuk, dan produk terlaris secara real-time.',
    steps: [
      {
        title: '1. Atur Rentang Tanggal Analisis',
        desc: 'Gunakan filter tanggal di bagian atas (Hari Ini, 7 Hari Terakhir, 30 Hari, Bulan Ini, atau Kustom) untuk melihat performa penjualan pada periode tertentu.',
      },
      {
        title: '2. Periksa 4 Kartu Metrik Kunci',
        desc: 'Pantau Total Omzet Bersih (hanya mencatat pesanan riil yang berstatus lunas), Jumlah Pesanan Masuk, Total Produk Aktif, dan Jumlah Pelanggan Terdaftar.',
      },
      {
        title: '3. Tindak Lanjuti Pesanan Butuh Verifikasi',
        desc: 'Klik langsung pada baris pesanan berstatus PENDING atau bukti transfer baru untuk melakukan verifikasi pembayaran atau pesanan siap dikemas.',
      },
      {
        title: '4. Pantau Grafik Tren Omzet Harian',
        desc: 'Evaluasi grafik fluktuasi omzet untuk mengetahui hari atau jam dengan lonjakan transaksi tertinggi toko Anda.',
      },
    ],
    tips: [
      'Klik salah satu kartu metrik ringkasan untuk langsung diarahkan ke halaman detail transaksi terkait.',
      'Data transaksi pengujian berlabel "Sandbox" otomatis dipisahkan agar omzet bisnis Anda tetap akurat dan bersih.',
      'Gunakan Asisten AI melayang di pojok kanan bawah untuk meminta analisa: "Bagaimana perbandingan omzet minggu ini dibanding minggu lalu?".',
    ],
    warnings: [
      'Jika omzet bernilai Rp 0, pastikan status pesanan telah diubah menjadi "PAID" (Lunas) melalui verifikasi pembayaran manual atau webhook gateway.',
    ],
    faqs: [
      {
        q: 'Mengapa pesanan yang baru masuk belum menambah angka omzet di Dashboard?',
        a: 'Sistem menerapkan prinsip akuntansi kas riil. Pesanan baru yang berstatus PENDING belum dihitung sebagai omzet sampai pembeli membayar lunas dan statusnya berubah menjadi PAID.',
      },
      {
        q: 'Apakah grafik penjualan memperhitungkan pesanan yang dibatalkan (Cancelled)?',
        a: 'Tidak. Pesanan berstatus CANCELLED dan REFUNDED otomatis dikeluarkan dari grafik pendapatan untuk menjaga akurasi pembukuan.',
      },
    ],
    docAnchor: 'bab-2-menu-dashboard-beranda--statistik-kunci',
  },
  {
    id: 'products',
    pathMatch: (path: string) => path.startsWith('/admin/products'),
    title: 'Panduan Katalog Produk, PO & Omnichannel',
    menuName: 'Produk & Stok',
    icon: '📦',
    badge: 'Katalog',
    summary: 'Kelola seluruh katalog produk fisik, produk digital, tiket seminar, variasi warna/ukuran, status Pre-Order (PO), serta tautan belanja Shopee, Tokopedia, dan TikTok Shop.',
    steps: [
      {
        title: '1. Menambah Produk Baru',
        desc: 'Klik tombol "+ Tambah Produk" di kanan atas. Isi nama produk, kategori, harga modal (base price), harga jual, dan stok awal.',
      },
      {
        title: '2. Tentukan Jenis Produk',
        desc: 'Pilih antara Produk Fisik (membutuhkan kurir & berat paket), Produk Digital (masukkan link file download aman), atau Event / Seminar (otomatis generate tiket).',
      },
      {
        title: '3. Atur Ready Stock vs Pre-Order (PO)',
        desc: 'Bila produk harus diproduksi terlebih dahulu, centang opsi Pre-Order (PO) dan tentukan estimasi hari pembuatan. Angka stok akan otomatis disembunyikan di etalase toko agar pembeli tidak bingung.',
      },
      {
        title: '4. Tambahkan Variasi & Harga Coret Promo',
        desc: 'Buat kombinasi variasi (misal: Ukuran S/M/L, Warna Hitam/Putih) lengkap dengan selisih harga dan SKU masing-masing. Aktifkan harga coret untuk menampilkan diskon menarik.',
      },
      {
        title: '5. Hubungkan Link Marketplace (Omnichannel)',
        desc: 'Isi tautan resmi Shopee, Tokopedia, TikTok Shop, Blibli, atau Marketplace Kustom. Tombol belanja resmi akan langsung muncul di halaman detail produk toko.',
      },
      {
        title: '6. Unggah Foto Produk Berkualitas',
        desc: 'Unggah foto produk utama dan foto pendukung. Sistem secara otomatis mengompresi gambar ke format WebP hemat kuota dengan tetap menjaga ketajaman gambar.',
      },
    ],
    tips: [
      'Gunakan tombol "Tanya AI" di sebelah kolom deskripsi untuk membuat copywriting format AIDA atau riset kata kunci SEO produk secara instan.',
      'Produk dengan label PO akan menampilkan badge oranye elegan "Pre-Order (X Hari)" di etalase pembeli.',
      'Jika stok produk habis, pembeli tidak akan bisa melanjutkan checkout kecuali produk diset sebagai PO.',
    ],
    warnings: [
      'Jangan menghapus produk yang sudah memiliki riwayat pesanan aktif, cukup nonaktifkan status "Publikasikan" agar histori pesanan lama tetap utuh.',
      'Pastikan bobot berat produk fisik diisi dalam satuan gram secara akurat karena akan menjadi acuan hitung ongkir kurir Biteship.',
    ],
    faqs: [
      {
        q: 'Bagaimana cara menampilkan tombol "Beli di Shopee / TikTok Shop"?',
        a: 'Cukup masukkan URL lengkap produk Anda pada form Tambah/Edit Produk di bagian "Link Marketplace & Saluran Penjualan Eksternal", lalu klik Simpan.',
      },
      {
        q: 'Bagaimana jika pembeli memesan variasi produk yang stoknya habis?',
        a: 'Sistem keranjang belanja secara otomatis memvalidasi stok per-varian secara atomik. Jika varian habis, tombol beli varian tersebut akan dinonaktifkan.',
      },
    ],
    docAnchor: 'bab-3-menu-produk--manajemen-stok',
  },
  {
    id: 'categories',
    pathMatch: (path: string) => path.startsWith('/admin/categories'),
    title: 'Panduan Kategori Produk',
    menuName: 'Kategori',
    icon: '📁',
    badge: 'Katalog',
    summary: 'Tata struktur pengelompokan produk agar etalase toko Anda rapi, profesional, dan memudahkan calon pembeli menemukan barang yang dicari.',
    steps: [
      {
        title: '1. Buat Kategori Baru',
        desc: 'Masukkan nama kategori (contoh: Pakaian Pria, Hijab Instan, Aksesoris, Gadget). Slug URL akan terisi otomatis.',
      },
      {
        title: '2. Berikan Deskripsi Singkat',
        desc: 'Tuliskan 1-2 kalimat pengantar kategori. Deskripsi ini bermanfaat untuk meningkatkan skor SEO Google saat calon pembeli mencari kategori tersebut.',
      },
      {
        title: '3. Unggah Ikon / Banner Kategori',
        desc: 'Tambahkan gambar ikon atau banner yang menarik untuk mempercantik tampilan menu navigasi kategori di beranda toko.',
      },
      {
        title: '4. Hubungkan Produk ke Kategori',
        desc: 'Setiap kali menambahkan atau mengedit produk, pilih kategori yang relevan dari menu dropdown.',
      },
    ],
    tips: [
      'Batasi kategori utama antara 4 hingga 8 kategori agar menu navigasi di layar smartphone tetap ringkas dan tidak memanjang.',
      'Gunakan penamaan yang umum dicari pembeli (misal: "Batik Modern" lebih mudah dicari dibanding istilah internal perusahaan).',
    ],
    warnings: [
      'Menghapus kategori yang masih memiliki produk akan memindahkan produk-produk tersebut ke status tanpa kategori (Uncategorized).',
    ],
    faqs: [
      {
        q: 'Apakah satu produk bisa masuk ke beberapa kategori sekaligus?',
        a: 'Saat ini satu produk ditautkan ke satu kategori utama untuk memastikan konsistensi rekap analitik dan breadcrumb SEO Google.',
      },
    ],
    docAnchor: 'bab-4-menu-kategori-produk',
  },
  {
    id: 'orders',
    pathMatch: (path: string) => path.startsWith('/admin/orders'),
    title: 'Panduan Pesanan, Bukti Transfer & Resi Biteship',
    menuName: 'Pesanan',
    icon: '🛍️',
    badge: 'Penjualan',
    summary: 'Kelola seluruh alur pesanan dari verifikasi pembayaran manual, booking kurir penjemputan paket Biteship, penerbitan resi otomatis, hingga pencetakan invoice.',
    steps: [
      {
        title: '1. Pantau Status Pesanan',
        desc: 'Gunakan tab filter status: PENDING (belum bayar), PAID (sudah bayar), PROCESSING (sedang dikemas), SHIPPED (sedang dikirim), DELIVERED (selesai), atau CANCELLED.',
      },
      {
        title: '2. Verifikasi Bukti Pembayaran Manual',
        desc: 'Buka pesanan berstatus PENDING. Klik bukti transfer yang diunggah pembeli untuk melihat gambar resi bank. Klik "Konfirmasi Pembayaran" jika dana sudah masuk di mutasi rekening Anda.',
      },
      {
        title: '3. Panggil Kurir via Ekspedisi Biteship (1-Klik)',
        desc: 'Pada pesanan berstatus PAID/PROCESSING, klik tombol "Kirim via Biteship". Pilih kurir (JNE, J&T, SiCepat, dll.) dan layanan. Sistem akan langsung memanggil kurir ke alamat toko Anda dan menerbitkan nomor resi resmi.',
      },
      {
        title: '4. Pelacakan Resi Progresif',
        desc: 'Riwayat pergerakan paket dari penjemputan kurir, sortir gudang, hingga tiba di tangan pembeli dapat dipantau langsung dari dashboard dan halaman lacak pembeli.',
      },
      {
        title: '5. Cetak Invoice & Label Pengiriman',
        desc: 'Klik "Cetak Invoice" untuk mencetak dokumen nota pesanan berstandar LarisManis.online yang rapi untuk diselipkan ke dalam paket pembeli.',
      },
    ],
    tips: [
      'Bukti transfer disimpan di folder terisolasi per-toko sehingga aman dari kebocoran data dan tidak bisa diakses toko lain.',
      'Saat kurir Biteship berhasil mengantar paket ke pembeli, webhook Biteship otomatis mengubah status pesanan menjadi DELIVERED.',
      'Jika menggunakan transfer manual, selalu cocokkan nominal 3 digit kode unik (jika ada) dan nama rekening pengirim dengan mutasi rekening Anda.',
    ],
    warnings: [
      'Jangan mengubah status menjadi SHIPPED secara manual jika Anda memesan kurir via Biteship, karena sistem akan memperbarui nomor resi dan status secara otomatis.',
    ],
    faqs: [
      {
        q: 'Bagaimana jika kurir tidak datang menjemput barang?',
        a: 'Nomor kontak kurir dan ID penjemputan tertera pada kartu pengiriman Biteship di detail pesanan. Anda juga dapat menghubungi customer support Biteship atau WhatsApp CS ekspedisi terkait.',
      },
      {
        q: 'Apakah pembeli otomatis mendapatkan nomor resi?',
        a: 'Ya. Nomor resi otomatis muncul di halaman detail pesanan pembeli dan terkirim via notifikasi WhatsApp (jika integrasi Fonnte diaktifkan).',
      },
    ],
    docAnchor: 'bab-5-menu-pesanan--logistik-resi',
  },
  {
    id: 'customers',
    pathMatch: (path: string) => path.startsWith('/admin/customers'),
    title: 'Panduan Data Pelanggan (CRM)',
    menuName: 'Pelanggan',
    icon: '👥',
    badge: 'Penjualan',
    summary: 'Basis data pelanggan toko untuk menganalisis loyalitas, nilai total belanja (Customer Lifetime Value), dan komunikasi langsung via WhatsApp.',
    steps: [
      {
        title: '1. Cari dan Saring Data Pelanggan',
        desc: 'Cari pelanggan berdasarkan nama, alamat email, atau nomor HP/WhatsApp. Anda dapat melihat tanggal pertama kali mereka berbelanja di toko Anda.',
      },
      {
        title: '2. Tinjau Total Belanja (Customer Lifetime Value)',
        desc: 'Ketahui pelanggan VIP toko Anda dengan melihat akumulasi nilai transaksi (LTV) dan jumlah pesanan yang telah mereka selesaikan.',
      },
      {
        title: '3. Kirim Pesan WhatsApp Langsung',
        desc: 'Klik tombol logo WhatsApp di sebelah nomor telepon pelanggan untuk membuka chat WhatsApp resmi secara instan untuk konfirmasi pesanan atau penawaran promo khusus.',
      },
      {
        title: '4. Buka Riwayat Pesanan Lengkap',
        desc: 'Klik nama pelanggan untuk membuka halaman profil yang memuat seluruh daftar produk yang pernah mereka beli.',
      },
    ],
    tips: [
      'Kirimkan voucher diskon khusus kepada 10 pelanggan teratas dengan nominal belanja terbesar setiap akhir bulan untuk menjaga retensi pembeli.',
      'Nomor WhatsApp pelanggan telah diformat secara otomatis dengan kode negara +62 untuk kemudahan pengiriman pesan.',
    ],
    warnings: [
      'Data nomor telepon dan alamat pembeli merupakan data sensitif. Jaga kerahasiaan data pembeli dan batasi hak akses menu Pelanggan hanya untuk tim CS atau Manajer.',
    ],
    faqs: [
      {
        q: 'Apakah pelanggan harus membuat akun terlebih dahulu sebelum bisa belanja?',
        a: 'Tidak harus. Sistem mendukung checkout cepat sebagai tamu (Guest Checkout) yang otomatis mencatat nomor WhatsApp dan alamat pengiriman ke buku kontak.',
      },
    ],
    docAnchor: 'bab-6-menu-pelanggan-crm',
  },
  {
    id: 'finance',
    pathMatch: (path: string) => path.startsWith('/admin/finance'),
    title: 'Panduan Keuangan & Buku Kas Besar (General Ledger)',
    menuName: 'Keuangan',
    icon: '💳',
    badge: 'Penjualan',
    summary: 'Pusat pembukuan keuangan toko otomatis: buku kas besar berprinsip double-entry, laba-rugi bersih, pengeluaran operasional, dan kas kecil (petty cash).',
    steps: [
      {
        title: '1. Pahami Ringkasan Keuangan Toko',
        desc: 'Lihat Total Pendapatan Bersih (omzet pesanan berstatus PAID), Total Pengeluaran Operasional, Saldo Kas Kecil, dan Laba Bersih riil toko Anda.',
      },
      {
        title: '2. Pemasukan Kas Otomatis',
        desc: 'Setiap kali ada pesanan yang lunas (PAID), sistem secara otomatis mencatatkan baris kas masuk (INCOME) lengkap dengan nomor referensi pesanan.',
      },
      {
        title: '3. Catat Beban & Pengeluaran Toko (Expense)',
        desc: 'Klik "+ Catat Pengeluaran". Masukkan nominal biaya operasional (sewa toko, kuota internet, gaji staf, biaya iklan Meta/TikTok Ads, pembelian kardus kemasan).',
      },
      {
        title: '4. Kelola Saldo Petty Cash (Kas Kecil)',
        desc: 'Catat uang tunai fisik yang dipegang staf gudang/toko untuk kebutuhan darurat (beli lakban, isi bensin kurir internal, parkir ekspedisi).',
      },
      {
        title: '5. Filter Periode Pembukuan',
        desc: 'Pilih rentang bulan untuk mengunduh atau memeriksa rekonsiliasi kas pada periode akuntansi tertentu.',
      },
    ],
    tips: [
      'Transaksi pengujian berstatus Sandbox otomatis diabaikan dari buku kas besar sehingga laba bersih tidak terdistorsi saat Anda sedang melakukan uji coba sistem.',
      'Buat kategori kas khusus (misal: "Biaya Packing", "Marketing Ads", "Operasional Toko") agar grafik pos pengeluaran terlihat rapi.',
    ],
    warnings: [
      'Pastikan seluruh nota fisik pengeluaran operasional disimpan oleh staf untuk dicocokkan dengan catatan petty cash setiap akhir pekan.',
    ],
    faqs: [
      {
        q: 'Apakah biaya ongkos kirim dihitung sebagai pendapatan toko?',
        a: 'Pada transaksi kurir Biteship, ongkos kirim diteruskan ke ekspedisi, sedangkan harga produk masuk sebagai pendapatan kotor toko.',
      },
    ],
    docAnchor: 'bab-7-menu-keuangan--pembukuan-kas',
  },
  {
    id: 'promo',
    pathMatch: (path: string) => path.startsWith('/admin/promo'),
    title: 'Panduan Promo & Voucher Diskon',
    menuName: 'Promo',
    icon: '🏷️',
    badge: 'Penjualan',
    summary: 'Tingkatkan konversi penjualan dan nilai keranjang belanja dengan kupon voucher diskon, potongan tetap, cashback, dan promo berjangka waktu.',
    steps: [
      {
        title: '1. Buat Kode Voucher Baru',
        desc: 'Klik "+ Tambah Voucher". Masukkan kode kupon yang mudah diingat pembeli (contoh: MERDEKA50, GAJIANASIK, GRATISONGKIR).',
      },
      {
        title: '2. Tentukan Jenis Potongan Harga',
        desc: 'Pilih tipe diskon: NOMINAL TETAP (misal potong Rp 20.000) atau PERSENTASE (misal potong 15% dari subtotal).',
      },
      {
        title: '3. Atur Ketentuan Belanja',
        desc: 'Tentukan syarat minimum belanja (misal: Min. Belanja Rp 150.000) dan batas maksimal diskon (misal: Max. Potongan Rp 50.000).',
      },
      {
        title: '4. Batasi Kuota & Periode Berlaku',
        desc: 'Tentukan kuota penggunaan (misal: hanya untuk 100 pembeli pertama) serta tanggal mulai dan tanggal berakhirnya promosi.',
      },
      {
        title: '5. Evaluasi Efektivitas Promo',
        desc: 'Pantau jumlah klaim voucher dan total omzet yang dihasilkan dari kampanye kode kupon tersebut pada tabel ringkasan promo.',
      },
    ],
    tips: [
      'Gunakan kode kupon persentase dengan minimum belanja untuk menaikkan rata-rata nilai keranjang belanja (Average Order Value) pembeli.',
      'Voucher dapat dibagikan melalui siaran broadcast WhatsApp atau dicantumkan di banner hero landing page toko.',
    ],
    warnings: [
      'Periksa kembali batas maksimal potongan pada kupon persentase agar keuntungan toko tetap aman saat pembeli memborong produk dalam jumlah besar.',
    ],
    faqs: [
      {
        q: 'Apakah pembeli bisa menggabungkan 2 voucher sekaligus dalam satu checkout?',
        a: 'Untuk menjaga margin bisnis toko, sistem membatasi penggunaan maksimal 1 kode voucher per transaksi checkout.',
      },
    ],
    docAnchor: 'bab-8-menu-promo--voucher-diskon',
  },
  {
    id: 'cms',
    pathMatch: (path: string) => path.startsWith('/admin/cms'),
    title: 'Panduan CMS Landing Page Builder',
    menuName: 'CMS & Konten',
    icon: '🎨',
    badge: 'Konten',
    summary: 'Rancang tampilan halaman beranda toko dan landing page promosi secara visual tanpa memerlukan keahlian koding.',
    steps: [
      {
        title: '1. Pilih Halaman yang Ingin Diatur',
        desc: 'Pilih halaman Beranda (Homepage) atau buat halaman promosi khusus (Landing Page Seminar/Campaign).',
      },
      {
        title: '2. Susun Blok Hero Banner',
        desc: 'Tuliskan judul headline yang memikat, subjudul penjelas, tombol ajakan bertindak (CTA: "Beli Sekarang" / "Lihat Koleksi"), dan latar visual.',
      },
      {
        title: '3. Tambahkan Nilai Keunggulan Toko (Value Proposition)',
        desc: 'Tampilkan 3-4 ikon keunggulan belanja di toko Anda: 100% Original, Pengiriman Cepat Se-Indonesia, Garansi Retur 7 Hari, atau Layanan CS 24 Jam.',
      },
      {
        title: '4. Tampilkan Deretan Produk Pilihan',
        desc: 'Pilih kategori atau produk tertentu untuk ditampilkan di bagian depan beranda (Featured Products).',
      },
      {
        title: '5. Simpan dan Publikasikan',
        desc: 'Klik "Simpan Perubahan". Perubahan visual akan langsung tampil seketika di etalase toko Anda tanpa perlu reload server.',
      },
    ],
    tips: [
      'Gunakan foto dengan kontras yang baik agar teks judul di atas banner hero tetap terbaca jelas di layar smartphone.',
      'Pastikan tombol CTA mengarah ke halaman kategori terlaris atau katalog produk lengkap toko Anda.',
    ],
    warnings: [
      'Hindari memasukkan gambar berukuran terlalu besar (di atas 3MB) agar kecepatan loading website toko tetap instan dan ramah kuota pembeli.',
    ],
    faqs: [
      {
        q: 'Apakah halaman beranda toko sudah otomatis ramah pengguna smartphone (Mobile-Friendly)?',
        a: 'Ya, seluruh blok layout CMS dirancang dengan prinsip responsive mobile-first sehingga tampil sempurna di layar HP, tablet, maupun laptop.',
      },
    ],
    docAnchor: 'bab-9-menu-cms-landing-page-builder',
  },
  {
    id: 'articles',
    pathMatch: (path: string) => path.startsWith('/admin/articles'),
    title: 'Panduan Artikel Blog & Real-Time SEO Analyzer',
    menuName: 'Artikel',
    icon: '📝',
    badge: 'Konten',
    summary: 'Tulis artikel blog berkualitas untuk mendatangkan ribuan calon pembeli gratis dari mesin pencari Google menggunakan alat ukur SEO real-time.',
    steps: [
      {
        title: '1. Buat Judul Artikel yang Menarik',
        desc: 'Tuliskan judul artikel yang sering dicari orang di Google (contoh: "10 Tips Memilih Hijab Nyaman untuk Cuaca Panas").',
      },
      {
        title: '2. Tentukan Kata Kunci Fokus (Focus Keyword)',
        desc: 'Ketikkan kata kunci utama yang ingin ditargetkan pada mesin pencari Google (contoh: "tips memilih hijab").',
      },
      {
        title: '3. Tulis Konten & Pantau Real-Time SEO Analyzer',
        desc: 'Saat Anda mengetik, indikator SEO di sisi kanan otomatis menghitung: jumlah kata, kemunculan kata kunci, kepadatan (density 1-2.5%), dan memberikan Skor SEO (0-100).',
      },
      {
        title: '4. Tautkan Produk Terkait (Article Placement)',
        desc: 'Pilih produk dari katalog toko untuk disematkan di dalam artikel. Pembaca artikel dapat langsung mengklik tombol "Beli Produk Ini" saat sedang membaca blog Anda!',
      },
      {
        title: '5. Publikasikan Artikel',
        desc: 'Atur status menjadi "Published" dan simpan. Sitemap XML Google otomatis diperbarui agar artikel cepat terindeks di Google Search.',
      },
    ],
    tips: [
      'Targetkan skor SEO minimal 75-85 agar artikel Anda memiliki peluang tertinggi menembus halaman pertama Google.',
      'Sisipkan kata kunci fokus pada judul artikel, paragraf pertama, dan salah satu subjudul (H2).',
    ],
    warnings: [
      'Hindari menumpuk kata kunci secara berlebihan (keyword stuffing) karena dapat dianggap spam oleh algoritma Google.',
    ],
    faqs: [
      {
        q: 'Apakah artikel yang dipublikasikan langsung masuk ke sitemap XML toko?',
        a: 'Ya. Sistem otomatis menambahkan artikel baru ke endpoint dynamic sitemap (/sitemap.xml) yang siap dirayapi oleh robot Googlebot.',
      },
    ],
    docAnchor: 'bab-10-menu-artikel-blog--optimasi-seo',
  },
  {
    id: 'analytics',
    pathMatch: (path: string) => path.startsWith('/admin/analytics') || path.startsWith('/admin/funnel'),
    title: 'Panduan Laporan & Analitik Funnel Konversi',
    menuName: 'Laporan & Analitik',
    icon: '📈',
    badge: 'Analitik',
    summary: 'Analisis mendalam mengenai tren penjualan, produk paling diminati, dan Funnel Konversi untuk mendeteksi di mana calon pembeli berhenti saat berbelanja.',
    steps: [
      {
        title: '1. Pantau Tren Omzet & Unit Terjual',
        desc: 'Evaluasi grafik pertumbuhan toko dari minggu ke minggu untuk melihat efektivitas strategi promosi yang sedang dijalankan.',
      },
      {
        title: '2. Pelajari Funnel Konversi Produk',
        desc: 'Perhatikan 4 tahapan funnel belanja: Produk Dilihat ➡️ Dimasukkan ke Keranjang ➡️ Menuju Form Checkout ➡️ Sukses Melakukan Pembayaran.',
      },
      {
        title: '3. Identifikasi Titik Kebocoran (Drop-Off)',
        desc: 'Jika banyak pembeli berhenti di form checkout, periksa apakah pilihan ongkir terlalu mahal atau opsi pembayaran transfer kurang lengkap.',
      },
      {
        title: '4. Pantau Log Kesehatan Sistem & Error',
        desc: 'Buka menu log error sistem jika terdapat laporan kendala dari pembeli saat proses pembayaran atau integrasi ekspedisi.',
      },
    ],
    tips: [
      'Tingkat konversi rata-rata e-commerce sehat berkisar antara 1.5% hingga 3.5% dari total pengunjung toko.',
      'Tanyakan pada Asisten AI: "Berapa rasio konversi keranjang ke pesanan minggu ini dan bagaimana cara meningkatkannya?".',
    ],
    warnings: [
      'Pastikan script tracking Pixel (Meta, TikTok, Google Tag) sudah dipasang di menu Pengaturan agar data analitik pihak ketiga tercatat sempurna.',
    ],
    faqs: [
      {
        q: 'Dari mana data analitik funnel ini dikumpulkan?',
        a: 'Data dikumpulkan secara aman dan real-time dari setiap interaksi klik tombol di storefront toko Anda tanpa membebani performa loading website.',
      },
    ],
    docAnchor: 'bab-11-menu-laporan--analitik',
  },
  {
    id: 'settings',
    pathMatch: (path: string) => path.startsWith('/admin/settings'),
    title: 'Panduan Master Pengaturan Toko (9 Kategori)',
    menuName: 'Pengaturan',
    icon: '⚙️',
    badge: 'Pengaturan',
    summary: 'Pusat kendali konfigurasi lengkap toko: identitas brand, tema/font, logistik Biteship, payment gateway, asisten AI BYOK, notifikasi WA/TG, dan email SMTP.',
    steps: [
      {
        title: '1. Tab Identitas & Kontak (General)',
        desc: 'Atur nama toko, slogan, nomor WhatsApp CS utama, alamat fisik toko, serta unggah logo resmi dan favicon.',
      },
      {
        title: '2. Tab Hero Section & Tema Tampilan',
        desc: 'Pilih font Google Fonts favorit (Plus Jakarta Sans, Inter, Poppins, Roboto, Playfair Display) dan warna aksen brand Anda.',
      },
      {
        title: '3. Tab Pengiriman & Logistik (Shipping)',
        desc: 'Masukkan API Key Biteship dan tentukan kurir aktif (JNE, J&T, SiCepat, dll.). Atur tarif flat manual jika ingin memberlakukan ongkir flat.',
      },
      {
        title: '4. Tab Pembayaran & Bank (Payment)',
        desc: 'Atur rekening bank manual toko (BCA, Mandiri, BRI, BNI) dan unggah QRIS statis toko. Konfigurasikan kredensial Midtrans Snap jika menggunakan payment gateway.',
      },
      {
        title: '5. Tab Integrasi Pixel & Keamanan (Cloudflare Turnstile Global)',
        desc: 'Pasang ID Meta Pixel, Google Analytics (GA4), TikTok Pixel, serta Cloudflare Turnstile (Widget Mode Managed dari dash.cloudflare.com) dengan memasukkan Site Key & Secret Key lalu mencentang aktivasi. Proteksi langsung aktif di seluruh halaman & API publik dengan cookie sesi 2 jam (cf_turnstile_pass) agar pembeli nyaman menjelajah tanpa CAPTCHA berulang.',
      },
      {
        title: '6. Tab Asisten AI (BYOK)',
        desc: 'Pilih provider Google Gemini atau OpenAI. Masukkan API Key mandiri dan pilih model AI cerdas (misal gemini-2.5-flash atau gpt-4o-mini).',
      },
      {
        title: '7. Tab Notifikasi Real-time (WA & Telegram)',
        desc: 'Masukkan token Fonnte WhatsApp API dan Telegram Bot Token untuk menerima laporan otomatis saat ada pesanan baru atau stok menipis.',
      },
      {
        title: '8. Tab Email & SMTP Server',
        desc: 'Konfigurasikan server email SMTP kustom, periksa status DNS live (SPF, DKIM, MX), verifikasi token kepemilikan email, dan uji coba kirim email.',
      },
    ],
    tips: [
      'Gunakan fitur "Cek DNS Live" di tab Email untuk memastikan reputasi domain toko Anda aman dari indikasi spam saat mengirim nota ke pembeli.',
      'Di tab Tema, aktifkan Dark Mode untuk menguji kenyamanan tampilan toko di malam hari.',
      'Kunci API AI (Gemini/OpenAI) yang Anda simpan di Tab Asisten AI terenkripsi aman dan tidak pernah dikirimkan ke peramban pelanggan di storefront publik.',
      'Saat membuat widget Cloudflare Turnstile di dash.cloudflare.com, pilih Widget Mode "Managed" agar pengunjung asli terverifikasi mulus di latar belakang.',
    ],
    warnings: [
      'Jangan membagikan API Key (Midtrans, Biteship, Gemini, SMTP) kepada pihak luar demi keamanan transaksi dan saldo toko Anda.',
      'Pastikan alamat kota asal pengiriman di tab Pengiriman sudah sesuai dengan lokasi fisik gudang toko Anda.',
    ],
    faqs: [
      {
        q: 'Apakah perubahan logo dan warna toko membutuhkan restart server?',
        a: 'Tidak. Seluruh perubahan tema, font, logo, dan pengaturan tersimpan di database dan langsung terupdate seketika di seluruh halaman toko.',
      },
      {
        q: 'Bagaimana cara mengaktifkan Cloudflare Turnstile di semua halaman publik?',
        a: 'Buka menu Pengaturan -> tab 🛡️ Pixel & Keamanan -> gulir ke panel Cloudflare Turnstile. Buat widget mode Managed di dash.cloudflare.com untuk domain toko Anda, salin Site Key & Secret Key ke formulir, centang kotak aktivasi, lalu klik Simpan Turnstile. Sistem otomatis melindungi seluruh halaman publik (Beranda, Katalog, Detail Produk, Kategori, Artikel, LP, Auth) & API publik dengan sesi 2 jam.',
      },
    ],
    docAnchor: 'bab-12-menu-pengaturan-toko-master-settings---9-kategori',
  },
  {
    id: 'staff',
    pathMatch: (path: string) => path.startsWith('/admin/staff'),
    title: 'Panduan Manajemen Staf & Delegasi Hak Akses (RBAC)',
    menuName: 'Manajemen Staf',
    icon: '🛡️',
    badge: 'Pengaturan',
    summary: 'Kelola akun staf operasional toko dengan pembatasan hak akses menu secara granular demi menjaga kerahasiaan data keuangan dan kontrol bisnis.',
    steps: [
      {
        title: '1. Tambah Akun Staf Baru',
        desc: 'Klik "+ Tambah Staf". Masukkan nama lengkap, alamat email aktif, kata sandi sementara, dan jabatan staf.',
      },
      {
        title: '2. Gunakan Template Preset Peran (Role Preset)',
        desc: 'Pilih salah satu template cepat: Manajer Operasional, Customer Service (CS), Staf Gudang & Logistik, Staf Keuangan, atau Marketing & Konten.',
      },
      {
        title: '3. Sesuaikan Izin Menu Granular (12 Modul)',
        desc: 'Centang atau hilangkan centang izin modul tertentu jika ingin memberikan hak akses khusus (misal: Staf Gudang hanya boleh membuka menu Produk dan Pesanan).',
      },
      {
        title: '4. Nonaktifkan atau Hapus Akun Staf',
        desc: 'Jika staf sudah tidak bekerja di toko Anda, segera ubah status akun menjadi Nonaktif atau hapus akun tersebut untuk mencegah akses yang tidak sah.',
      },
    ],
    tips: [
      'Hanya Pemilik Toko (Owner/Admin) yang berhak membuka menu Keuangan, Manajemen Staf, dan Pengaturan Sistem.',
      'Staf yang tidak memiliki izin ke menu tertentu tidak akan melihat menu tersebut di sidebar dan otomatis diblokir jika mencoba mengakses URL langsung.',
    ],
    warnings: [
      'Jangan pernah memberikan hak akses "Administrator" kepada staf umum karena peran Admin dapat mengubah rekening bank dan menghapus toko.',
    ],
    faqs: [
      {
        q: 'Apa yang terjadi jika staf mencoba membuka menu yang tidak diizinkan?',
        a: 'Sistem akan menampilkan halaman proteksi ramah "Akses Halaman Dibatasi" lengkap dengan informasi akun dan tombol untuk kembali ke menu yang diizinkan.',
      },
    ],
    docAnchor: 'bab-13-menu-manajemen-staf--delegasi-hak-akses-rbac',
  },
  {
    id: 'ai-studio',
    pathMatch: (path: string) => path.startsWith('/admin/ai'),
    title: 'Panduan AI Studio: Pembuatan Gambar Jualan & Copywriting',
    menuName: 'AI Studio',
    icon: '✨',
    badge: 'Konten',
    summary: 'Asisten AI pintar untuk menghasilkan foto produk komersial berkualitas studio foto dan copywriting konversi tinggi berdasarkan foto referensi fisik produk asli Anda.',
    steps: [
      {
        title: '1. Unggah Foto Referensi Produk Asli (Wajib!)',
        desc: 'AI mewajibkan foto referensi produk asli agar bentuk fisik, warna, proporsi, dan label kemasan produk Anda tetap 100% akurat. Anda dapat mengunggah file foto baru atau memilih foto dari katalog produk toko yang sudah ada.',
      },
      {
        title: '2. Tentukan Tema Panggung Komersial',
        desc: 'Pilih salah satu dari 6 gaya preset studio: Studio White Minimalist, Aesthetic Wooden Podium, Luxury Marble & Gold, Nature Outdoor Lifestyle, Modern Pastel Pop, atau Cyber Neon Tech.',
      },
      {
        title: '3. Pilih Rasio Format Gambar',
        desc: 'Tentukan rasio gambar yang diinginkan: 1:1 Persegi (Katalog & Instagram Feed), 4:5 Portrait (TikTok, Reels, & Story IG), atau 16:9 Landscape (Hero Banner Toko).',
      },
      {
        title: '4. Tambahkan Instruksi Suasana (Opsional)',
        desc: 'Tuliskan detail pencahayaan atau elemen panggung ekstra jika diperlukan, misal: "Tambahkan pantulan air segar di samping botol dan sinar matahari hangat dari arah kanan".',
      },
      {
        title: '5. Klik Generate & Pasang ke Produk',
        desc: 'Setelah gambar selesai dibuat, Anda dapat langsung menautkannya ke galeri produk toko hanya dengan 1 klik ("Jadikan Foto Produk"), mengunduh file WebP beresolusi tinggi, atau membuat variasi visual lainnya.',
      },
    ],
    tips: [
      'Gunakan foto referensi produk dengan pencahayaan terang dan sudut tegak lurus (front view) atau isometrik untuk hasil studio AI yang paling presisi.',
      'Jika produk Anda berukuran kecil (misal kosmetik atau aksesoris), pilih tema Wooden Podium atau Luxury Marble agar produk terlihat mewah dan menonjol.',
      'Simpan konfigurasi API Key Gemini atau OpenAI Anda di menu Pengaturan > AI Assistant untuk batas kuota generate yang leluasa.',
      'Fitur AI (BYOK) berjalan 100% eksklusif hanya di sisi Admin Dashboard. Sisi toko publik/pelanggan sama sekali tidak memiliki chatbot AI, sehingga kuota API Key Anda aman dari penggunaan pihak luar.',
    ],
    warnings: [
      'Foto referensi produk fisik asli mutlak diperlukan. Sistem akan menolak generate gambar tanpa adanya foto referensi fisik produk asli.',
      'Hindari menggunakan foto referensi yang buram, gelap, atau terpotong agar AI tidak salah mengidentifikasi detail produk.',
    ],
    faqs: [
      {
        q: 'Mengapa AI mewajibkan foto referensi produk asli?',
        a: 'Untuk mencegah halusinasi bentuk produk. Dalam jualan online, pembeli harus menerima barang yang persis sama dengan yang ditampilkan di foto. AI bertugas menciptakan panggung studio dan tata cahaya komersial profesional di sekeliling produk asli Anda.',
      },
      {
        q: 'Apakah gambar hasil AI bisa langsung dijadikan foto utama produk?',
        a: 'Ya, terdapat tombol "Jadikan Foto Produk" yang langsung menyimpan dan menautkan gambar hasil generate ke katalog produk toko Anda secara otomatis.',
      },
      {
        q: 'Format file apa yang dihasilkan oleh AI?',
        a: 'Gambar dikompresi otomatis ke format WebP modern yang ringan, tajam, dan dioptimasi penuh untuk kecepatan loading toko online serta ranking SEO Google.',
      },
      {
        q: 'Apakah fitur AI ini berjalan di sisi pembeli/pelanggan toko?',
        a: 'Sama sekali tidak ada di sisi pelanggan. Seluruh fitur AI (pembuatan gambar jualan, copywriting, dan kuota BYOK) beroperasi 100% hanya di sisi Admin Dashboard toko Anda. Pelanggan hanya melihat hasil akhir statis berupa foto WebP dan teks deskripsi produk yang sudah Anda pasang.',
      },
    ],
    docAnchor: 'bab-15-menu-ai-studio-pembuatan-gambar-jualan--asisten-copywriting',
  },
];

/**
 * Mendapatkan bab panduan yang sesuai dengan rute URL admin saat ini.
 */
export function getGuideChapterForPath(pathname: string): GuideChapter {
  const chapter = ADMIN_GUIDE_CHAPTERS.find((ch) => ch.pathMatch(pathname));
  return chapter || ADMIN_GUIDE_CHAPTERS[0]; // fallback to dashboard
}

