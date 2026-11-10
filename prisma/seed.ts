/**
 * AI SEO E-Commerce SaaS - Curated Seed Data Generator
 * 
 * Usage:
 *   npx ts-node prisma/seed.ts
 * 
 * This script seeds realistic, high-fidelity Indonesian demo data:
 * - Curated store & store settings (hero banner, flat rate shipping, Biteship origin, AI assistant)
 * - 5 realistic categories
 * - 20 curated products with exact matching Unsplash photos
 * - Admin, Staff, and Customer users
 * - 6 realistic orders across various lifecycle stages (PENDING, MANUAL_VERIFICATION, PROCESSING, SHIPPED, COMPLETED, CANCELLED)
 * - 6 SEO blog articles linked to featured products
 * - Stock logs & ledger accounting entries
 */

import { PrismaClient, Role, OrderStatus, PaymentStatus, PaymentMethod, StockType, LedgerType } from '@prisma/client';

const prisma = new PrismaClient();

// Configuration
const STORE_DOMAIN = process.env.DEFAULT_STORE_DOMAIN || 'demo.larismanis.online';
const STORE_NAME = 'LarisManis Demo Store';

interface CuratedProduct {
  name: string;
  categorySlug: string;
  shortDesc: string;
  description: string;
  price: number;
  stock: number;
  isFeatured: boolean;
  images: { url: string; altText: string }[];
}

const CURATED_CATEGORIES = [
  {
    name: 'Fashion & Pakaian',
    slug: 'fashion-pakaian',
    description: 'Koleksi busana pria dan wanita pilihan berkualitas tinggi dengan sentuhan gaya kontemporer dan etnik Indonesia.',
  },
  {
    name: 'Sepatu & Footwear',
    slug: 'sepatu-footwear',
    description: 'Pilihan sepatu sneakers, lari, kasual, dan formal dengan kenyamanan maksimal dan desain modern.',
  },
  {
    name: 'Elektronik & Gadget',
    slug: 'elektronik-gadget',
    description: 'Perangkat pintar, smartphone, audio wireless, dan aksesori gadget terkini untuk menunjang produktivitas harian.',
  },
  {
    name: 'Rumah Tangga & Dapur',
    slug: 'rumah-tangga-dapur',
    description: 'Peralatan memasak modern, perlengkapan dapur premium, dan robot pintar pembersih rumah tangga.',
  },
  {
    name: 'Kopi & Kuliner Nusantara',
    slug: 'kopi-kuliner-nusantara',
    description: 'Kopi specialty nusantara, madu hutan murni, dan sambal khas pilihan dari berbagai penjuru nusantara.',
  },
];

const CURATED_PRODUCTS: CuratedProduct[] = [
  // Fashion & Pakaian
  {
    name: 'Kemeja Batik Pria Slim Fit Solo',
    categorySlug: 'fashion-pakaian',
    shortDesc: 'Kemeja batik katun primisima dengan motif parang modern dan furing halus.',
    description: 'Kemeja batik lengan panjang bermotif khas Solo dengan potongan slim fit modern. Dibuat dari 100% katun primisima berkualitas tinggi dengan jahitan dobel dan lapisan furing katun adem. Sangat cocok untuk acara formal kantor, jamuan pernikahan, maupun santai.',
    price: 285000,
    stock: 45,
    isFeatured: true,
    images: [
      {
        url: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=800&q=80',
        altText: 'Kemeja Batik Pria Slim Fit Solo - Tampilan Depan',
      },
      {
        url: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=800&q=80',
        altText: 'Kemeja Batik Pria Slim Fit Solo - Detail Motif Katun',
      },
    ],
  },
  {
    name: 'Kaos Polos Cotton Combed 24s Heavyweight',
    categorySlug: 'fashion-pakaian',
    shortDesc: 'Kaos basic unisex katun combed 24s reaktif warna hitam pekat dan nyaman.',
    description: 'T-Shirt polos basic premium berbahan 100% cotton combed 24s gramasi 185-195 gsm. Lembut, menyerap keringat dengan baik, tidak panas, dan warna tidak pudar setelah dicuci berkali-kali. Kerah rib spandex elastis tidak mudah melar.',
    price: 85000,
    stock: 120,
    isFeatured: true,
    images: [
      {
        url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=800&q=80',
        altText: 'Kaos Polos Cotton Combed 24s - Tampak Depan',
      },
      {
        url: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&w=800&q=80',
        altText: 'Kaos Polos Cotton Combed 24s - Tekstur Kain Katun',
      },
    ],
  },
  {
    name: 'Celana Chino Slim Fit Pria Stretch Khaki',
    categorySlug: 'fashion-pakaian',
    shortDesc: 'Celana chino katun stretch warna khaki elegan untuk kasual dan kerja.',
    description: 'Celana panjang chino pria dengan potongan slim fit kekinian. Terbuat dari katun twill stretch premium yang fleksibel dan leluasa bergerak seharian. Dilengkapi ritsleting YKK orisinal dan saku samping berpotongan rapi.',
    price: 215000,
    stock: 35,
    isFeatured: false,
    images: [
      {
        url: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=800&q=80',
        altText: 'Celana Chino Slim Fit Pria Stretch Khaki',
      },
      {
        url: 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?auto=format&fit=crop&w=800&q=80',
        altText: 'Celana Chino Pria - Tampilan Samping dan Saku',
      },
    ],
  },
  {
    name: 'Gamis Syari Modern Pastel Series',
    categorySlug: 'fashion-pakaian',
    shortDesc: 'Gamis muslimah bahan crinkle airflow lembut beraksen lipit cantik.',
    description: 'Gamis muslimah elegan terbuat dari bahan premium crinkle airflow yang adem, flowy, dan ironless (tidak mudah kusut). Dilengkapi resleting dada busui-friendly dan manset tangan karet wudhu-friendly.',
    price: 320000,
    stock: 40,
    isFeatured: false,
    images: [
      {
        url: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=800&q=80',
        altText: 'Gamis Syari Modern Pastel Series - Model Depan',
      },
      {
        url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80',
        altText: 'Gamis Syari Modern - Detail Warna & Potongan',
      },
    ],
  },

  // Sepatu & Footwear
  {
    name: 'Sneakers Casual Retro White Classic',
    categorySlug: 'sepatu-footwear',
    shortDesc: 'Sneakers putih kasual sol karet TPR anti-slip dengan insole empuk.',
    description: 'Sneakers kasual bernuansa retro klasik dengan balutan bahan synthetic action leather mudah dibersihkan. Dilengkapi memory foam insole yang empuk serta outsole karet murni anti-slip, nyaman digunakan jalan santai maupun beraktivitas kuliah.',
    price: 389000,
    stock: 50,
    isFeatured: true,
    images: [
      {
        url: 'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&w=800&q=80',
        altText: 'Sneakers Casual Retro White Classic - Sudut 45 Derajat',
      },
      {
        url: 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?auto=format&fit=crop&w=800&q=80',
        altText: 'Sneakers Retro White - Tampilan Samping dan Sol',
      },
    ],
  },
  {
    name: 'Sepatu Lari Ultralight Breathable Pro',
    categorySlug: 'sepatu-footwear',
    shortDesc: 'Sepatu running ringan bantalan foam responsive dengan upper mesh sirkulasi udara.',
    description: 'Sepatu lari performa tinggi dirancang untuk kenyamanan jarak menengah hingga maraton. Bobot sangat ringan hanya 210 gram, didukung upper engineered mesh berventilasi udara maksimal serta midsole EVA rebound foam yang meredam benturan dengan lembut.',
    price: 549000,
    stock: 30,
    isFeatured: true,
    images: [
      {
        url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80',
        altText: 'Sepatu Lari Ultralight Breathable Pro - Warna Merah Sporty',
      },
      {
        url: 'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?auto=format&fit=crop&w=800&q=80',
        altText: 'Sepatu Lari Ultralight - Sol Bawah Grip Dinamis',
      },
    ],
  },
  {
    name: 'Sandal Kulit Pria Casual Slide Muka',
    categorySlug: 'sepatu-footwear',
    shortDesc: 'Sandal slide pria kulit sapi asli dengan insole anatomi telapak kaki.',
    description: 'Sandal selop kasual pria terbuat dari 100% kulit sapi asli bertekstur pull-up. Menggunakan bantalan sol anatomi cetak yang mengikuti lekuk telapak kaki sehingga tidak pegal saat dipakai bepergian seharian.',
    price: 245000,
    stock: 60,
    isFeatured: false,
    images: [
      {
        url: 'https://images.unsplash.com/photo-1603808033192-082d6919d3e1?auto=format&fit=crop&w=800&q=80',
        altText: 'Sandal Kulit Pria Casual Slide Muka - Tampak Atas',
      },
      {
        url: 'https://images.unsplash.com/photo-1562273138-f46be4ebdf33?auto=format&fit=crop&w=800&q=80',
        altText: 'Sandal Kulit Pria - Detail Jahitan Kulit Asli',
      },
    ],
  },
  {
    name: 'Sepatu Formal Oxford Leather Pria Hitam',
    categorySlug: 'sepatu-footwear',
    shortDesc: 'Sepatu pantofel oxford kulit asli mengkilap untuk acara resmi dan kantor.',
    description: 'Sepatu formal pria model Oxford berujung cap-toe elegan. Dibuat dari kulit sapi full grain berpelitur kilap tinggi, sol kulit sintetis presisi tinggi, dan insole empuk antibakteri. Sangat pas melengkapi setelan jas dan busana kerja.',
    price: 675000,
    stock: 25,
    isFeatured: false,
    images: [
      {
        url: 'https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?auto=format&fit=crop&w=800&q=80',
        altText: 'Sepatu Formal Oxford Leather Pria Hitam',
      },
      {
        url: 'https://images.unsplash.com/photo-1533867617858-e7b97e060509?auto=format&fit=crop&w=800&q=80',
        altText: 'Sepatu Formal Oxford - Detail Kilap Kulit Full Grain',
      },
    ],
  },

  // Elektronik & Gadget
  {
    name: 'Smartphone 5G Pro 8GB/256GB AMOLED 120Hz',
    categorySlug: 'elektronik-gadget',
    shortDesc: 'Smartphone layar AMOLED 120Hz, kamera 108MP OIS, baterai 5000mAh 67W Turbo Charge.',
    description: 'Ponsel pintar performa kencang ditenagai prosesor Octa-core 5G terkini. Layar 6.67 inch FHD+ AMOLED 120Hz super mulus, sistem kamera triple 108MP dengan OIS untuk foto malam tajam, serta pengisian daya cepat 67W yang terisi penuh dalam 38 menit.',
    price: 4299000,
    stock: 20,
    isFeatured: true,
    images: [
      {
        url: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=800&q=80',
        altText: 'Smartphone 5G Pro - Layar Depan AMOLED',
      },
      {
        url: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=800&q=80',
        altText: 'Smartphone 5G Pro - Tampak Belakang Kamera Triple',
      },
    ],
  },
  {
    name: 'TWS Wireless Bluetooth 5.3 ANC Earbuds',
    categorySlug: 'elektronik-gadget',
    shortDesc: 'Earbuds nirkabel active noise cancellation 40dB, baterai 32 jam, low latency.',
    description: 'Earbuds nirkabel dengan Active Noise Cancelling (ANC) hingga 40dB yang meredam kebisingan sekitar secara instan. Dilengkapi driver dinamis 12mm berlapis titanium untuk bass bertenaga dan vokal jernih, sertifikasi tahan cipratan air IPX5, dan daya tahan baterai total 32 jam.',
    price: 499000,
    stock: 45,
    isFeatured: true,
    images: [
      {
        url: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=800&q=80',
        altText: 'TWS Wireless Bluetooth ANC Earbuds dalam Charging Case',
      },
      {
        url: 'https://images.unsplash.com/photo-1572536147248-ac59a8abfa4b?auto=format&fit=crop&w=800&q=80',
        altText: 'TWS Wireless Earbuds - Desain Ergonomis',
      },
    ],
  },
  {
    name: 'Smartwatch Sport GPS SpO2 Heart Rate Monitor',
    categorySlug: 'elektronik-gadget',
    shortDesc: 'Jam tangan pintar fitness 100+ mode olahraga, sensor detak jantung dan GPS akurat.',
    description: 'Smartwatch tangguh berlayar HD 1.43 inch dengan kaca anti gores. Mengukur detak jantung 24/7, kadar oksigen darah (SpO2), pemantau kualitas tidur, dan GPS ganda terintegrasi untuk pelacakan rute lari serta bersepeda tanpa perlu membawa ponsel.',
    price: 899000,
    stock: 25,
    isFeatured: false,
    images: [
      {
        url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80',
        altText: 'Smartwatch Sport GPS - Tampilan Dial Digital',
      },
      {
        url: 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?auto=format&fit=crop&w=800&q=80',
        altText: 'Smartwatch Sport - Tampak Tali dan Sensor Bawah',
      },
    ],
  },
  {
    name: 'Powerbank 20000mAh 65W Fast Charging PD QC',
    categorySlug: 'elektronik-gadget',
    shortDesc: 'Pengisi daya portabel kapasitas 20000mAh output 65W untuk laptop dan smartphone.',
    description: 'Powerbank berkapasitas besar 20.000 mAh dengan output daya tinggi hingga 65 Watt Power Delivery. Mampu mengisi baterai laptop, tablet, dan smartphone secara bersamaan lewat 3 port output (2x USB-C + 1x USB-A). Layar LED digital menampilkan sisa persentase daya secara presisi.',
    price: 435000,
    stock: 55,
    isFeatured: false,
    images: [
      {
        url: 'https://images.unsplash.com/photo-1609592424095-d24be51c6ec7?auto=format&fit=crop&w=800&q=80',
        altText: 'Powerbank 20000mAh 65W Fast Charging - Bodi Ringkas',
      },
      {
        url: 'https://images.unsplash.com/photo-1585338107529-13afc5f02586?auto=format&fit=crop&w=800&q=80',
        altText: 'Powerbank Portabel - Tampilan Port Koneksi USB-C',
      },
    ],
  },

  // Rumah Tangga & Dapur
  {
    name: 'Digital Air Fryer 4.5L Touchscreen Low Watt',
    categorySlug: 'rumah-tangga-dapur',
    shortDesc: 'Air fryer kapasitas 4.5 liter menggoreng sehat tanpa minyak daya 650W hemat energi.',
    description: 'Air fryer modern berkapasitas 4.5 liter dengan teknologi Rapid Air 360 derajat yang mematangkan masakan renyah di luar dan juicy di dalam tanpa minyak. Panel kontrol sentuh digital dilengkapi 8 preset masakan otomatis (kentang, ayam, daging, kue, dll.) dengan daya listrik hemat hanya 650W.',
    price: 799000,
    stock: 35,
    isFeatured: true,
    images: [
      {
        url: 'https://images.unsplash.com/photo-1585515320310-259814833e62?auto=format&fit=crop&w=800&q=80',
        altText: 'Digital Air Fryer 4.5L - Tampilan Panel Sentuh Depan',
      },
      {
        url: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80',
        altText: 'Air Fryer - Suasana Masak Sehat di Dapur',
      },
    ],
  },
  {
    name: 'Cookware Set Keramik Anti Lengket 5 Pcs Granite',
    categorySlug: 'rumah-tangga-dapur',
    shortDesc: 'Set wajan dan panci masak lapisan keramik granit bebas PFOA aman untuk induksi.',
    description: 'Set perlengkapan masak 5 buah terdiri dari wok pan 28cm, fry pan 24cm, sauce pan 18cm dengan tutup kaca tempered, dan spatula silikon tahan panas. Dilapisi 5 lapis keramik granit Jerman anti lengket dan bebas racun PFOA/PTFE, kompatibel dengan semua jenis kompor termasuk induksi.',
    price: 685000,
    stock: 28,
    isFeatured: false,
    images: [
      {
        url: 'https://images.unsplash.com/photo-1584990347449-a29910d9f48a?auto=format&fit=crop&w=800&q=80',
        altText: 'Cookware Set Keramik Anti Lengket 5 Pcs Granite',
      },
      {
        url: 'https://images.unsplash.com/photo-1583778176476-4a8b02a64c01?auto=format&fit=crop&w=800&q=80',
        altText: 'Panci dan Wajan Keramik - Detail Lapisan Granit',
      },
    ],
  },
  {
    name: 'Portable Mini Blender Juicer USB Rechargeable 400ml',
    categorySlug: 'rumah-tangga-dapur',
    shortDesc: 'Blender botol mini praktis 6 mata pisau baja tahan karat baterai tahan lama.',
    description: 'Blender personal portabel berkapasitas 400ml dengan 6 bilah pisau baja tahan karat 304 tajam yang sanggup menghaluskan es batu dan buah segar dalam 30 detik. Praktis dibawa ke kantor, gym, atau bepergian. Diisi ulang daya lewat kabel USB-C.',
    price: 189000,
    stock: 70,
    isFeatured: false,
    images: [
      {
        url: 'https://images.unsplash.com/photo-1570222094114-d054a817e56b?auto=format&fit=crop&w=800&q=80',
        altText: 'Portable Mini Blender Juicer - Smoothie Buah Segar',
      },
      {
        url: 'https://images.unsplash.com/photo-1622484216258-6927d7ec0d2c?auto=format&fit=crop&w=800&q=80',
        altText: 'Mini Blender USB - Pisau Baja dan Bodi Botol',
      },
    ],
  },
  {
    name: 'Smart Robot Vacuum Cleaner Mop 2-in-1 Sensor LiDAR',
    categorySlug: 'rumah-tangga-dapur',
    shortDesc: 'Robot pembersih lantai otomatis sapu pel navigasi cerdas kontrol via aplikasi.',
    description: 'Robot penyedot debu dan pengepel lantai 2-in-1 dilengkapi navigasi laser LiDAR presisi tinggi. Daya hisap kuat 3000Pa efektif menyedot bulu hewan dan debu mikro. Otomatis kembali mengisi daya ke dock saat baterai melemah.',
    price: 2450000,
    stock: 15,
    isFeatured: true,
    images: [
      {
        url: 'https://images.unsplash.com/photo-1616401784845-180882ba9ba8?auto=format&fit=crop&w=800&q=80',
        altText: 'Smart Robot Vacuum Cleaner Mop 2-in-1 Beroperasi',
      },
      {
        url: 'https://images.unsplash.com/photo-1558317374-067fb5f30001?auto=format&fit=crop&w=800&q=80',
        altText: 'Smart Vacuum Cleaner - Sensor dan Roda Penggerak',
      },
    ],
  },

  // Kopi & Kuliner Nusantara
  {
    name: 'Biji Kopi Arabika Gayo Aceh Specialty 250g',
    categorySlug: 'kopi-kuliner-nusantara',
    shortDesc: 'Single origin Arabika Gayo proses semi washed dengan cita rasa fruity dan aroma rempah.',
    description: 'Biji kopi sangrai pilihan dari dataran tinggi Gayo, Aceh Tengah pada ketinggian 1.500 mdpl. Proses semi-washed menghasilkan cita rasa kompleks bernuansa brown sugar, citrus keasaman lembut, dan aftertaste manis berkepanjangan. Tersedia dalam bentuk biji utuh atau gilingan sesuai kebutuhan.',
    price: 95000,
    stock: 80,
    isFeatured: true,
    images: [
      {
        url: 'https://images.unsplash.com/photo-1587734195503-904fca47e0e9?auto=format&fit=crop&w=800&q=80',
        altText: 'Biji Kopi Arabika Gayo Aceh Sangrai Specialty',
      },
      {
        url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80',
        altText: 'Seduhan Kopi Gayo Manual Brew Pour Over',
      },
    ],
  },
  {
    name: 'Madu Hutan Murni Sumbawa Asli 500g',
    categorySlug: 'kopi-kuliner-nusantara',
    shortDesc: 'Madu mentah nektar bunga pohon hutan Sumbawa tanpa campuran dan pemanasan.',
    description: 'Madu hutan liar asli (Apis dorsata) dipanen berkelanjutan dari pedalaman hutan Sumbawa. Murni 100% tanpa bahan pengawet atau gula tambahan, kaya akan antioksidan, enzim alami, serta khasiat meningkatkan daya tahan tubuh harian keluarga.',
    price: 135000,
    stock: 65,
    isFeatured: false,
    images: [
      {
        url: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=800&q=80',
        altText: 'Madu Hutan Murni Sumbawa Asli dalam Jar Kaca',
      },
      {
        url: 'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?auto=format&fit=crop&w=800&q=80',
        altText: 'Tekstur Kental Madu Murni Alami',
      },
    ],
  },
  {
    name: 'Sambal Bawang Cumi Asin Gurih Pedas 200g',
    categorySlug: 'kopi-kuliner-nusantara',
    shortDesc: 'Sambal bawang ulek tradisional dengan potongan cumi asin empuk gurih menggoda.',
    description: 'Sambal kemasan siap santap dibuat dari cabai rawit merah segar, bawang merah pilihan, dan cumi asin kenyal gurih. Dimasak matang sempurna dengan minyak kelapa sehingga awet tanpa bahan pengawet sintesis. Nikmat disantap langsung bersama nasi putih hangat.',
    price: 48000,
    stock: 100,
    isFeatured: false,
    images: [
      {
        url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=800&q=80',
        altText: 'Sambal Bawang Cumi Asin Gurih Pedas dalam Mangkuk',
      },
      {
        url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
        altText: 'Sajian Sambal Pedas Pelengkap Lauk Nusantara',
      },
    ],
  },
  {
    name: 'Teh Hitam Artisan Ciwidey Highland Premium 100g',
    categorySlug: 'kopi-kuliner-nusantara',
    shortDesc: 'Daun teh hitam pucuk pilihan dari perkebunan Ciwidey aroma kayu manis harum.',
    description: 'Teh hitam premium dipetik dari pucuk daun muda perkebunan lereng Gunung Patuha Ciwidey, Jawa Barat. Memiliki aroma floral alami khas dataran tinggi dengan sentuhan manis karamel dan seduhan warna merah amber jernih yang menenangkan pikiran.',
    price: 65000,
    stock: 50,
    isFeatured: false,
    images: [
      {
        url: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=800&q=80',
        altText: 'Teh Hitam Artisan Ciwidey Highland dalam Cangkir Kaca',
      },
      {
        url: 'https://images.unsplash.com/photo-1597481499750-3e6b22637e12?auto=format&fit=crop&w=800&q=80',
        altText: 'Daun Teh Kering Berkualitas Tinggi',
      },
    ],
  },
];

// Helper to generate SKU
function generateSKU(name: string, index: number): string {
  const cleanName = name
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .split(/\s+/)
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return `SKU-${cleanName}-${String(index + 1).padStart(3, '0')}`;
}

// Helper to generate slug
function generateSlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

async function main() {
  console.log('🌱 Memulai proses reset dan seeding data demo toko...\n');

  // 1. Clean existing demo store data
  console.log('🧹 Membersihkan data demo lama...');
  const demoStore = await prisma.store.findFirst({ 
    where: { OR: [{ domain: STORE_DOMAIN }, { domain: 'demo-store.local' }, { domain: 'demo.larismanis.online' }] } 
  });
  
  if (demoStore) {
    await prisma.articleProduct.deleteMany({ where: { article: { storeId: demoStore.id } } });
    await prisma.article.deleteMany({ where: { storeId: demoStore.id } });
    await prisma.productEvent.deleteMany({ where: { storeId: demoStore.id } });
    await prisma.orderItem.deleteMany({ where: { product: { storeId: demoStore.id } } });
    await prisma.payment.deleteMany({ where: { order: { storeId: demoStore.id } } });
    await prisma.order.deleteMany({ where: { storeId: demoStore.id } });
    await prisma.productImage.deleteMany({ where: { product: { storeId: demoStore.id } } });
    await prisma.stockLog.deleteMany({ where: { product: { storeId: demoStore.id } } });
    await prisma.product.deleteMany({ where: { storeId: demoStore.id } });
    await prisma.category.deleteMany({ where: { storeId: demoStore.id } });
    await prisma.ledger.deleteMany({ where: { storeId: demoStore.id } });
    await prisma.ledgerCategory.deleteMany({ where: { storeId: demoStore.id } });
    await prisma.landingPage.deleteMany({ where: { storeId: demoStore.id } });
    await prisma.voucherClaim.deleteMany({ where: { user: { storeId: demoStore.id } } });
    await prisma.voucher.deleteMany({ where: { storeId: demoStore.id } });
    await prisma.user.deleteMany({ where: { storeId: demoStore.id } });
    await prisma.storeSettings.deleteMany({ where: { storeId: demoStore.id } });
    await prisma.store.deleteMany({ where: { id: demoStore.id } });
    console.log('✅ Data demo lama berhasil dibersihkan.\n');
  }

  // 2. Create Store with Rich Settings
  console.log('🏪 Membuat data toko demo...');
  const store = await prisma.store.create({
    data: {
      id: 'demo-store-001',
      name: STORE_NAME,
      domain: STORE_DOMAIN,
      logo: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=200&q=80',
      address: 'Jl. Tebet Barat Raya No. 42, Tebet, Jakarta Selatan, DKI Jakarta 12810',
      phone: '+62 812 8899 7711',
      email: 'admin@demo-store.local',
      isDemo: true,
      settings: {
        create: {
          businessName: STORE_NAME,
          businessAddress: 'Jl. Tebet Barat Raya No. 42, Tebet, Jakarta Selatan, DKI Jakarta 12810',
          businessPhone: '+62 812 8899 7711',
          tagline: 'Website komersial pemersatu jalur penjualan online Anda',
          heroTitle: 'Website komersial pemersatu jalur penjualan online Anda',
          heroSubtitle: 'Satu toko online mandiri terintegrasi langsung dengan Shopee, Tokopedia, TikTok Shop, kurir ekspedisi nasional Biteship, dan payment gateway. Dikelola tuntas oleh LarisManis.online.',
          heroCtaText: 'Belanja Sekarang',
          heroCtaLink: '/products',
          heroCtaSecondaryText: 'Produk Terlaris',
          heroCtaSecondaryLink: '/products?featured=true',
          heroImageUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80',
          primaryColor: '#4F46E5',
          fontFamily: 'inter',
          defaultSeoTitle: 'LarisManis Demo Store — Website komersial pemersatu jalur penjualan online Anda',
          defaultSeoDescription: 'Platform website komersial modern pemersatu jalur penjualan online Anda dengan integrasi omnichannel marketplace, optimasi SEO otomatis, dan asisten AI pintar.',
          // Tarif Ongkir Flat Manual
          shippingOriginCity: 'Jakarta Selatan',
          shippingFlatRateInner: 9000,
          shippingFlatRateOuter: 22000,
          shippingFreeThreshold: 300000,
          shippingCalculationType: 'FLAT_MANUAL',
          // Biteship Ekspedisi
          biteshipEnabled: false,
          biteshipSandbox: true,
          biteshipOriginAddress: 'Jl. Tebet Barat Raya No. 42, Tebet, Jakarta Selatan',
          biteshipOriginPostalCode: '12810',
          biteshipOriginContactName: 'Admin AI SEO Store',
          biteshipOriginContactPhone: '081288997711',
          // AI Assistant BYOK
          aiProvider: 'GEMINI',
          aiModel: 'gemini-2.5-flash',
          aiCustomPrompt: 'Anda adalah asisten belanja cerdas untuk AI SEO Demo Store. Bantu pelanggan toko dengan ramah, komunikatif, dan rekomendasikan produk sesuai kebutuhan mereka.',
          // Payment Gateways Demo
          midtransMerchantId: 'DEMO_MERCHANT',
          midtransClientKey: 'DEMO_CLIENT_KEY',
          midtransServerKey: 'DEMO_SERVER_KEY',
          sandboxPaymentEnabled: true,
        },
      },
    },
    include: { settings: true },
  });
  console.log(`✅ Toko dibuat: ${store.name} (${store.domain})\n`);

  // 3. Seed Ledger Categories
  await prisma.ledgerCategory.createMany({
    data: [
      { storeId: store.id, type: LedgerType.INCOME, name: 'SALES' },
      { storeId: store.id, type: LedgerType.INCOME, name: 'Pendapatan Lain' },
      { storeId: store.id, type: LedgerType.EXPENSE, name: 'Pembelian' },
      { storeId: store.id, type: LedgerType.EXPENSE, name: 'Operasional' },
      { storeId: store.id, type: LedgerType.REFUND, name: 'REFUND' },
      { storeId: store.id, type: LedgerType.PETTY_CASH, name: 'PETTY_CASH' },
    ],
    skipDuplicates: true,
  });

  // 4. Create Categories
  console.log('📁 Membuat kategori produk...');
  const categoryMap = new Map<string, string>(); // slug -> category.id
  for (let i = 0; i < CURATED_CATEGORIES.length; i++) {
    const cat = CURATED_CATEGORIES[i];
    const category = await prisma.category.create({
      data: {
        id: `demo-cat-${String(i + 1).padStart(2, '0')}`,
        storeId: store.id,
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
      },
    });
    categoryMap.set(cat.slug, category.id);
    console.log(`  ✓ ${category.name}`);
  }
  console.log(`✅ ${CURATED_CATEGORIES.length} kategori berhasil dibuat.\n`);

  // 5. Create 20 Curated Products with High-Res Unsplash Images
  console.log('📦 Membuat 20 produk katalog terkurasi...');
  const createdProducts: any[] = [];
  for (let i = 0; i < CURATED_PRODUCTS.length; i++) {
    const item = CURATED_PRODUCTS[i];
    const categoryId = categoryMap.get(item.categorySlug)!;
    const basePrice = Math.round(item.price * 0.75);
    const sku = generateSKU(item.name, i);
    const slug = generateSlug(item.name);

    const product = await prisma.product.create({
      data: {
        id: `demo-prod-${String(i + 1).padStart(3, '0')}`,
        storeId: store.id,
        sku,
        name: item.name,
        slug,
        description: item.description,
        shortDescription: item.shortDesc,
        basePrice,
        sellingPrice: item.price,
        discountPrice: item.isFeatured ? Math.round(item.price * 0.9) : null,
        stock: item.stock,
        minStock: 5,
        isPublished: true,
        isFeatured: item.isFeatured,
        categoryId,
        shopeeUrl: `https://shopee.co.id/demo-store/${slug}`,
        tokopediaUrl: `https://tokopedia.com/demostore/${slug}`,
        tiktokShopUrl: `https://shop.tiktok.com/view/product/${slug}`,
        blibliUrl: i % 2 === 0 ? `https://www.blibli.com/p/${slug}/ps--DEM-001` : null,
        customMarketplaceName: i === 0 ? 'Lazada' : null,
        customMarketplaceUrl: i === 0 ? `https://www.lazada.co.id/products/${slug}.html` : null,
        images: {
          create: item.images.map((img, idx) => ({
            url: img.url,
            altText: img.altText,
            order: idx,
            isPrimary: idx === 0,
          })),
        },
      },
      include: { images: true, category: true },
    });
    createdProducts.push(product);
    console.log(`  ✓ [${product.category?.name}] ${product.name} - Rp ${product.sellingPrice.toLocaleString('id-ID')}`);
  }
  console.log(`✅ ${createdProducts.length} produk katalog berhasil dibuat.\n`);

  // 6. Create Users (Admin, Staff, Customers)
  console.log('👥 Membuat pengguna demo (Admin, Staff, Customers)...');
  const adminPasswordHash = '$2a$10$n0.McLoLU/q/CWNQnT/NfOve.baoxIJW8zIW41IxJzJXCrZBsu4AK'; // 'password'

  const adminUser = await prisma.user.create({
    data: {
      id: 'demo-admin-001',
      storeId: store.id,
      email: 'admin@demo-store.local',
      passwordHash: adminPasswordHash,
      firstName: 'Admin',
      lastName: 'Toko',
      phone: '+62 812 8899 7711',
      role: Role.ADMIN,
      isActive: true,
      emailVerified: true,
    },
  });
  console.log(`  ✓ Admin: ${adminUser.email}`);

  const staffUser = await prisma.user.create({
    data: {
      id: 'demo-staff-001',
      storeId: store.id,
      email: 'staff@demo-store.local',
      passwordHash: adminPasswordHash,
      firstName: 'Staff',
      lastName: 'Gudang',
      phone: '+62 812 8899 7722',
      role: Role.STAFF,
      isActive: true,
      emailVerified: true,
    },
  });
  console.log(`  ✓ Staff: ${staffUser.email}`);

  const customerDataList = [
    { firstName: 'Budi', lastName: 'Santoso', email: 'customer1@demo-store.local', phone: '+62 812 1122 3344', address: 'Jl. Senopati No. 18, Kebayoran Baru, Jakarta Selatan, DKI Jakarta 12190' },
    { firstName: 'Siti', lastName: 'Nurhaliza', email: 'customer2@demo-store.local', phone: '+62 813 2233 4455', address: 'Jl. Riau No. 45, Citarum, Bandung Wetan, Kota Bandung, Jawa Barat 40115' },
    { firstName: 'Ahmad', lastName: 'Fauzi', email: 'customer3@demo-store.local', phone: '+62 815 3344 5566', address: 'Jl. Darmo No. 88, Tegalsari, Kota Surabaya, Jawa Timur 60265' },
    { firstName: 'Dewi', lastName: 'Lestari', email: 'customer4@demo-store.local', phone: '+62 818 4455 6677', address: 'Jl. Diponegoro No. 12, Medan Baru, Kota Medan, Sumatera Utara 20153' },
    { firstName: 'Rizky', lastName: 'Pratama', email: 'customer5@demo-store.local', phone: '+62 821 5566 7788', address: 'Jl. Malioboro No. 23, Danurejan, Kota Yogyakarta, DI Yogyakarta 55213' },
    { firstName: 'Maya', lastName: 'Indah', email: 'customer6@demo-store.local', phone: '+62 822 6677 8899', address: 'Jl. Gajah Mada No. 104, Semarang Tengah, Kota Semarang, Jawa Tengah 50134' },
    { firstName: 'Dimas', lastName: 'Anggara', email: 'customer7@demo-store.local', phone: '+62 856 7788 9900', address: 'Jl. Pemuda No. 56, Denpasar Barat, Kota Denpasar, Bali 80113' },
    { firstName: 'Putri', lastName: 'Ayuningtyas', email: 'customer8@demo-store.local', phone: '+62 877 8899 0011', address: 'Jl. Slamet Riyadi No. 72, Laweyan, Kota Surakarta, Jawa Tengah 57141' },
    { firstName: 'Eko', lastName: 'Prasetyo', email: 'customer9@demo-store.local', phone: '+62 898 9900 1122', address: 'Jl. Veteran No. 34, Klojen, Kota Malang, Jawa Timur 65111' },
    { firstName: 'Rina', lastName: 'Wulandari', email: 'customer10@demo-store.local', phone: '+62 819 0011 2233', address: 'Jl. Sudirman No. 19, Sukajadi, Kota Pekanbaru, Riau 28128' },
  ];

  const createdCustomers: any[] = [];
  for (let i = 0; i < customerDataList.length; i++) {
    const cust = customerDataList[i];
    const user = await prisma.user.create({
      data: {
        id: `demo-customer-${String(i + 1).padStart(2, '0')}`,
        storeId: store.id,
        email: cust.email,
        passwordHash: adminPasswordHash,
        firstName: cust.firstName,
        lastName: cust.lastName,
        phone: cust.phone,
        role: Role.CUSTOMER,
        isActive: true,
        emailVerified: true,
      },
    });
    createdCustomers.push({ ...user, address: cust.address });
    console.log(`  ✓ Customer: ${user.email} (${cust.firstName} ${cust.lastName})`);
  }
  console.log(`✅ ${createdCustomers.length + 2} pengguna berhasil dibuat.\n`);

  // 7. Create 6 Realistic Sample Orders
  console.log('📋 Membuat 6 pesanan contoh realistis...');
  const demoOrdersData = [
    {
      orderNumber: 'ORD-20261028-001',
      customerIndex: 0,
      productIndices: [0, 2], // Kemeja Batik Solo (1), Celana Chino (1)
      status: OrderStatus.PENDING,
      paymentMethod: PaymentMethod.MANUAL,
      paymentStatus: PaymentStatus.PENDING,
      shippingCost: 9000,
      hasProof: false,
    },
    {
      orderNumber: 'ORD-20261028-002',
      customerIndex: 1,
      productIndices: [3, 16], // Gamis Syari (1), Biji Kopi Gayo (2)
      status: OrderStatus.MANUAL_VERIFICATION,
      paymentMethod: PaymentMethod.MANUAL,
      paymentStatus: PaymentStatus.PENDING,
      shippingCost: 9000,
      hasProof: true,
    },
    {
      orderNumber: 'ORD-20261028-003',
      customerIndex: 2,
      productIndices: [9, 11], // TWS Earbuds (1), Powerbank 65W (1)
      status: OrderStatus.PROCESSING,
      paymentMethod: PaymentMethod.MIDTRANS,
      paymentStatus: PaymentStatus.PAID,
      shippingCost: 9000,
      hasProof: false,
    },
    {
      orderNumber: 'ORD-20261028-004',
      customerIndex: 3,
      productIndices: [4, 1], // Sneakers White (1), Kaos Combed (2)
      status: OrderStatus.SHIPPED,
      paymentMethod: PaymentMethod.MANUAL,
      paymentStatus: PaymentStatus.PAID,
      shippingCost: 22000,
      hasProof: true,
      courier: {
        code: 'jne',
        service: 'REG',
        serviceName: 'JNE Reguler',
        etd: '2-3 hari',
        waybill: 'JNE-CGK-8923184910',
      },
    },
    {
      orderNumber: 'ORD-20261028-005',
      customerIndex: 4,
      productIndices: [12, 13], // Digital Air Fryer (1), Cookware Set (1)
      status: OrderStatus.COMPLETED,
      paymentMethod: PaymentMethod.MIDTRANS,
      paymentStatus: PaymentStatus.PAID,
      shippingCost: 0, // Free shipping > 300k
      hasProof: false,
      courier: {
        code: 'sicepat',
        service: 'SIUNT',
        serviceName: 'SiCepat Untung',
        etd: '1-2 hari',
        waybill: '003928174921',
      },
    },
    {
      orderNumber: 'ORD-20261028-006',
      customerIndex: 5,
      productIndices: [5], // Sepatu Lari Pro (1)
      status: OrderStatus.CANCELLED,
      paymentMethod: PaymentMethod.MANUAL,
      paymentStatus: PaymentStatus.PENDING,
      shippingCost: 9000,
      hasProof: false,
    },
  ];

  for (let i = 0; i < demoOrdersData.length; i++) {
    const oData = demoOrdersData[i];
    const customer = createdCustomers[oData.customerIndex];
    
    let subtotal = 0;
    const items = oData.productIndices.map((pIdx, itemIdx) => {
      const prod = createdProducts[pIdx];
      const qty = itemIdx === 1 ? 2 : 1;
      const effectivePrice = prod.discountPrice || prod.sellingPrice;
      const totalItem = effectivePrice * qty;
      subtotal += totalItem;
      return {
        productId: prod.id,
        quantity: qty,
        unitPrice: effectivePrice,
        totalPrice: totalItem,
      };
    });

    const totalAmount = subtotal + oData.shippingCost;
    const now = new Date();

    const order = await prisma.order.create({
      data: {
        id: `demo-order-${String(i + 1).padStart(3, '0')}`,
        storeId: store.id,
        orderNumber: oData.orderNumber,
        userId: customer.id,
        customerName: `${customer.firstName} ${customer.lastName}`,
        customerEmail: customer.email,
        customerPhone: customer.phone,
        shippingAddress: customer.address,
        subtotal,
        shippingCost: oData.shippingCost,
        taxAmount: 0,
        discount: 0,
        totalAmount,
        status: oData.status,
        courierCode: oData.courier?.code || null,
        courierService: oData.courier?.service || null,
        courierServiceName: oData.courier?.serviceName || null,
        courierEtd: oData.courier?.etd || null,
        waybillNumber: oData.courier?.waybill || null,
        shippedAt: oData.status === OrderStatus.SHIPPED || oData.status === OrderStatus.COMPLETED ? new Date(now.getTime() - 86400000 * 2) : null,
        deliveredAt: oData.status === OrderStatus.COMPLETED ? new Date(now.getTime() - 86400000) : null,
        completedAt: oData.status === OrderStatus.COMPLETED ? now : null,
        shippingTrackingHistory: oData.courier ? [
          { status: 'MANIFESTED', note: 'Paket telah diserahkan ke kurir di Jakarta Selatan', timestamp: new Date(now.getTime() - 86400000 * 2).toISOString() },
          { status: 'ON_TRANSIT', note: 'Paket sedang transit di pusat sortir logistik', timestamp: new Date(now.getTime() - 86400000 * 1.5).toISOString() },
          { status: oData.status === OrderStatus.COMPLETED ? 'DELIVERED' : 'WITH_COURIER', note: oData.status === OrderStatus.COMPLETED ? 'Paket telah diterima oleh penerima yang bersangkutan' : 'Paket sedang dibawa oleh kurir menuju alamat penerima', timestamp: new Date(now.getTime() - 86400000 * 0.5).toISOString() },
        ] : undefined,
        orderItems: { create: items },
      },
    });

    // Create Payment
    await prisma.payment.create({
      data: {
        id: `demo-payment-${String(i + 1).padStart(3, '0')}`,
        orderId: order.id,
        method: oData.paymentMethod,
        amount: order.totalAmount,
        transactionId: oData.paymentMethod === PaymentMethod.MIDTRANS ? `MIDTRANS-${order.orderNumber}` : null,
        gatewayResponse: oData.paymentMethod === PaymentMethod.MIDTRANS ? JSON.stringify({ status: 'settlement', transaction_id: `MIDTRANS-${order.orderNumber}` }) : null,
        status: oData.paymentStatus,
        proofUrl: oData.hasProof ? 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80' : null,
        proofFile: oData.hasProof ? JSON.stringify({ name: `bukti_transfer_${order.orderNumber}.jpg`, type: 'image/jpeg', size: 142800 }) : null,
        verifiedById: oData.paymentStatus === PaymentStatus.PAID ? adminUser.id : null,
        verifiedAt: oData.paymentStatus === PaymentStatus.PAID ? now : null,
      },
    });

    // Create Ledger if Paid or Completed
    if (oData.paymentStatus === PaymentStatus.PAID) {
      await prisma.ledger.create({
        data: {
          id: `demo-ledger-${order.id}`,
          storeId: store.id,
          type: LedgerType.INCOME,
          amount: order.totalAmount,
          description: `Order ${order.orderNumber} - ${items.length} items (${customer.firstName} ${customer.lastName})`,
          referenceId: order.id,
          referenceType: 'ORDER',
          category: 'SALES',
        },
      });
    }

    console.log(`  ✓ ${order.orderNumber} [${order.status}] - Rp ${order.totalAmount.toLocaleString('id-ID')} (${customer.firstName})`);
  }
  console.log(`✅ 6 pesanan contoh berhasil dibuat.\n`);

  // 8. Create Stock Logs
  console.log('📊 Membuat riwayat stok awal...');
  for (const prod of createdProducts.slice(0, 10)) {
    await prisma.stockLog.create({
      data: {
        id: `demo-stock-${prod.id}`,
        productId: prod.id,
        type: StockType.IN,
        quantity: prod.stock,
        previousStock: 0,
        newStock: prod.stock,
        reason: 'Stok awal setup katalog toko demo',
        referenceId: prod.id,
        userId: adminUser.id,
      },
    });
  }
  console.log('✅ Riwayat stok awal dibuat.\n');

  // 9. Create 6 SEO Blog Articles with High-Res Unsplash Images
  console.log('📰 Membuat 6 artikel edukasi blog SEO...');
  const blogArticles = [
    {
      id: 'demo-art-001',
      title: '5 Tips Memilih Sepatu Lari yang Nyaman untuk Pemula Bebas Cedera',
      slug: 'tips-memilih-sepatu-lari-pemula',
      content: `<p>Memulai hobi lari adalah salah satu investasi terbaik untuk kesehatan jantung dan kebugaran tubuh. Namun, banyak pelari pemula mengabaikan pentingnya memilih sepatu lari yang tepat, sehingga rentan mengalami cedera seperti shin splints atau nyeri lutut.</p><h2>1. Kenali Tipe Pronasi Kaki Anda</h2><p>Setiap orang memiliki bentuk telapak kaki yang unik: normal arch, high arch (supinasi), atau flat feet (overpronasi). Mengetahui tipe kelengkungan kaki akan membantu Anda memilih sepatu dengan stabilitas atau bantalan yang seimbang.</p><h2>2. Pilih Ukuran Satu Nomor Lebih Besar</h2><p>Saat berlari jauh, kaki akan sedikit memuai akibat peningkatan sirkulasi darah. Selalu sediakan ruang sekitar 0.5 hingga 1 cm di bagian ujung jari agar kuku tidak menghitam.</p><h2>3. Perhatikan Material Upper dan Sirkulasi Udara</h2><p>Pilihlah sepatu lari dengan bahan engineered mesh yang breathable agar sirkulasi udara tetap lancar dan kaki tidak lembap di iklim tropis Indonesia.</p><h2>4. Ganti Sepatu Secara Berkala</h2><p>Bantalan busa sol lari memiliki batas elastisitas efektif sekitar 600 - 800 km pemakaian. Jangan tunggu sampai sol aus total sebelum menggantinya.</p>`,
      seoTitle: '5 Tips Memilih Sepatu Lari Nyaman untuk Pemula | Panduan Lengkap',
      seoDescription: 'Panduan lengkap memilih sepatu lari yang nyaman dan tepat untuk pemula: kenali tipe kaki, ukuran ideal, dan bantalan responsif agar lari bebas cedera.',
      imageUrl: 'https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?auto=format&fit=crop&w=1200&q=80',
      isFeatured: true,
      linkedProductIndices: [5], // Sepatu Lari Pro
    },
    {
      id: 'demo-art-002',
      title: 'Panduan Praktis Merawat Pakaian Katun & Batik Solo Agar Tetap Awet',
      slug: 'panduan-merawat-pakaian-katun-batik-awet',
      content: `<p>Kemeja batik katun primisima dan kaos katun combed merupakan pakaian andalan sehari-hari masyarakat Indonesia. Agar serat kain tetap lembut dan warna aslinya tidak memudar, diperlukan perawatan yang tepat.</p><h2>1. Hindari Penggunaan Mesin Cuci dengan Putaran Keras</h2><p>Pakaian batik sebaiknya dicuci secara manual menggunakan tangan atau lerak/shampoo khusus batik. Hindari deterjen berbahan pemutih klorin tinggi.</p><h2>2. Jangan Jemur di Bawah Terik Matahari Langsung</h2><p>Cukup angin-anginkan pakaian katun di tempat teduh dengan sirkulasi udara baik. Sinar ultraviolet langsung dapat memecah pigmen warna kain lebih cepat.</p><h2>3. Menyetrika dengan Suhu Sedang dari Bagian Dalam</h2><p>Setrika kain katun dari bagian dalam (inside-out) dengan suhu sedang. Hal ini menjaga permukaan serat luar tetap halus dan tidak mengkilap terbakar.</p>`,
      seoTitle: 'Cara Merawat Pakaian Katun & Batik Solo Agar Awet dan Tahan Lama',
      seoDescription: 'Tips merawat kemeja batik dan kaos katun agar warna tidak cepat pudar: cara mencuci lembut, teknik menjemur teduh, dan tips menyetrika bagian dalam.',
      imageUrl: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=1200&q=80',
      isFeatured: true,
      linkedProductIndices: [0, 1], // Batik Solo, Kaos Combed
    },
    {
      id: 'demo-art-003',
      title: 'Tren Fashion Batik Modern 2026: Kombinasi Tradisi Etnik dan Gaya Kasual',
      slug: 'tren-fashion-batik-modern-2026',
      content: `<p>Batik kini telah bertransformasi dari sekadar pakaian formal acara kenegaraan menjadi busana sehari-hari yang digemari generasi muda. Perpaduan motif klasik dengan potongan santai menciptakan nuansa kasual modern yang memikat.</p><h2>1. Potongan Siluet Minimalis</h2><p>Kemeja batik slim fit berkerah shanghai atau kerah kasual menjadi pilihan populer bagi profesional muda yang ingin tampil rapi tanpa kesan kaku.</p><h2>2. Paduan dengan Celana Chino dan Sneakers</h2><p>Mengkombinasikan kemeja batik dengan celana chino warna netral dan sneakers putih kasual menciptakan gaya smart-casual yang segar dan berkelas.</p>`,
      seoTitle: 'Tren Fashion Batik Modern 2026: Perpaduan Tradisi & Gaya Kasual',
      seoDescription: 'Eksplorasi tren busana batik modern 2026: potongan slim fit santai, kombinasi celana chino dan sneakers putih untuk tampilan smart-casual masa kini.',
      imageUrl: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1200&q=80',
      isFeatured: true,
      linkedProductIndices: [0, 2, 4], // Batik, Chino, Sneakers
    },
    {
      id: 'demo-art-004',
      title: '5 Keunggulan Memasak Sehat Menggunakan Air Fryer Digital Hemat Listrik',
      slug: 'keunggulan-memasak-sehat-air-fryer-digital',
      content: `<p>Tren gaya hidup sehat semakin digemari masyarakat perkotaan. Mengurangi asupan minyak jenuh kini menjadi lebih mudah dan praktis berkat kehadiran teknologi digital air fryer.</p><h2>1. Mengurangi Kalori dan Minyak Hingga 85%</h2><p>Dengan sirkulasi udara panas 360 derajat berkecepatan tinggi, makanan menjadi renyah di luar dan empuk di dalam tanpa perlu merendamnya dalam minyak goreng panas.</p><h2>2. Praktis dengan Preset Digital Otomatis</h2><p>Cukup sentuh satu tombol preset untuk menggoreng kentang, ayam panggang, atau ikan tanpa perlu khawatir masakan gosong karena suhu dan waktu telah diatur secara akurat.</p><h2>3. Dapur Lebih Bersih Bebas Cipratan Minyak</h2><p>Tidak ada lagi aroma asap pekat atau minyak yang menciprati dinding kompor dapur Anda saat memasak.</p>`,
      seoTitle: 'Keunggulan Air Fryer Digital untuk Menu Masakan Sehat Keluarga',
      seoDescription: 'Pelajari keunggulan digital air fryer: kurangi minyak hingga 85%, lebih hemat waktu, hemat listrik, dan menjaga dapur tetap bersih higienis.',
      imageUrl: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1200&q=80',
      isFeatured: false,
      linkedProductIndices: [12], // Air Fryer
    },
    {
      id: 'demo-art-005',
      title: 'Mengenal Cita Rasa Kopi Arabika Specialty Nusantara: Keunikan Dataran Gayo',
      slug: 'keunikan-kopi-arabika-gayo-nusantara',
      content: `<p>Indonesia dikenal dunia sebagai salah satu produsen kopi specialty terbaik di dunia. Dari sekian banyak varietas, Kopi Arabika Gayo dari dataran tinggi Aceh Tengah menduduki tempat istimewa di hati para penikmat kopi.</p><h2>1. Ketinggian Tanam dan Iklim Mikro Ideal</h2><p>Ditanam pada ketinggian lebih dari 1.500 mdpl di bawah naungan pohon hutan tropis, buah ceri kopi matang secara perlahan sehingga menghasilkan densitas biji yang padat dan kaya nutrisi.</p><h2>2. Karakter Rasa yang Bersih dan Kompleks</h2><p>Kopi Gayo terkenal dengan tingkat keasaman sedang bernuansa buah jeruk segar, bodi yang tebal (heavy body), dan aroma rempah alami yang harum menggugah selera saat diseduh manual.</p>`,
      seoTitle: 'Karakteristik & Cita Rasa Kopi Arabika Gayo Aceh Specialty',
      seoDescription: 'Mengenal rahasia kenikmatan kopi Arabika Gayo Aceh: ketinggian tanam, profil rasa fruity yang bersih, aroma rempah harum, dan cara seduh terbaik.',
      imageUrl: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=1200&q=80',
      isFeatured: true,
      linkedProductIndices: [16], // Kopi Gayo
    },
    {
      id: 'demo-art-006',
      title: 'Panduan Memilih TWS Earbuds Nirkabel Terbaik dengan Fitur Active Noise Cancelling',
      slug: 'panduan-memilih-tws-earbuds-anc-terbaik',
      content: `<p>True Wireless Stereo (TWS) telah menjadi perlengkapan wajib untuk menemani mobilitas harian, mulai dari rapat daring (Zoom call), menikmati musik saat berolahraga, hingga mendengarkan podcast dalam perjalanan.</p><h2>1. Efektivitas Active Noise Cancelling (ANC)</h2><p>Fitur ANC bekerja menggunakan mikrofon luar untuk menangkap gelombang kebisingan lingkungan lalu menciptakan gelombang frekuensi berlawanan untuk meredamnya secara seketika.</p><h2>2. Stabilitas Koneksi Bluetooth 5.3</h2><p>Versi Bluetooth terbaru menjamin transmisi audio tanpa jeda (low latency), konsumsi daya lebih irit, dan jangkauan sinyal yang lebih kuat.</p><h2>3. Ketahanan Baterai dan Kenyamanan Eartips</h2><p>Pilihlah earbuds dengan eartips berbahan silikon lembut berbagai ukuran serta daya tahan baterai minimal 6 jam pemakaian terus menerus.</p>`,
      seoTitle: 'Panduan Memilih TWS Earbuds Bluetooth ANC Terbaik 2026',
      seoDescription: 'Tips memilih earphone TWS nirkabel berkualitas: perhatikan fitur Active Noise Cancelling (ANC), Bluetooth 5.3, latensi rendah, dan daya tahan baterai.',
      imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1200&q=80',
      isFeatured: false,
      linkedProductIndices: [9], // TWS Earbuds
    },
  ];

  for (const art of blogArticles) {
    const article = await prisma.article.create({
      data: {
        id: art.id,
        storeId: store.id,
        title: art.title,
        slug: art.slug,
        content: art.content,
        seoTitle: art.seoTitle,
        seoDescription: art.seoDescription,
        imageUrl: art.imageUrl,
        isFeatured: art.isFeatured,
      },
    });

    if (art.linkedProductIndices && art.linkedProductIndices.length > 0) {
      for (const pIdx of art.linkedProductIndices) {
        const prod = createdProducts[pIdx];
        if (prod) {
          await prisma.articleProduct.create({
            data: {
              articleId: article.id,
              productId: prod.id,
            },
          });
        }
      }
    }
    console.log(`  ✓ ${article.title}`);
  }
  console.log(`✅ ${blogArticles.length} artikel blog edukasi berhasil dibuat.\n`);

  console.log('='.repeat(65));
  console.log('🎉 SEEDING DATA DEMO SELESAI!');
  console.log('='.repeat(65));
  console.log(`Toko:             ${store.name} (${store.domain})`);
  console.log(`Kategori:         ${CURATED_CATEGORIES.length} Kategori Terkurasi`);
  console.log(`Produk:           ${createdProducts.length} Produk Realistis (Foto Unsplash HD)`);
  console.log(`Pengguna:         ${createdCustomers.length + 2} Pengguna (1 Admin, 1 Staff, 10 Customers)`);
  console.log(`Pesanan:          6 Pesanan Demo Berbagai Status`);
  console.log(`Artikel Blog:     ${blogArticles.length} Artikel Teroptimasi SEO`);
  console.log('='.repeat(65));
  console.log('\n🔑 Kredensial Login Demo:');
  console.log('  Admin:    admin@demo-store.local / password');
  console.log('  Staff:    staff@demo-store.local / password');
  console.log('  Customer: customer1@demo-store.local / password');
  console.log('='.repeat(65));
}

main()
  .catch((e) => {
    console.error('❌ Gagal menjalankan seeder:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
