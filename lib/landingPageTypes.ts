export type SectionType =
  | 'hero'
  | 'testimonials'
  | 'proof_trust'
  | 'features'
  | 'offer'
  | 'faq'
  | 'sticky_cta';

export interface TestimonialItem {
  id: string;
  name: string;
  location?: string;
  avatar?: string;
  rating: number; // 1 to 5
  isVerified: boolean;
  comment: string;
  reviewImage?: string;
  date?: string;
}

export interface ProofStat {
  label: string;
  value: string;
}

export interface TrustBadgeItem {
  title: string;
  desc: string;
  icon: 'shield' | 'truck' | 'badge' | 'chat' | 'star' | 'check';
}

export interface ProofImageItem {
  url: string;
  caption?: string;
}

export interface FeatureItem {
  id: string;
  title: string;
  description: string;
  icon?: string;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface HeroSectionData {
  id: string;
  type: 'hero';
  badge: string;
  title: string;
  subtitle: string;
  ctaText: string;
  ctaLink: string;
  secondaryCtaText?: string;
  secondaryCtaLink?: string;
  imageUrl?: string;
  videoUrl?: string;
}

export interface TestimonialsSectionData {
  id: string;
  type: 'testimonials';
  title: string;
  subtitle: string;
  items: TestimonialItem[];
}

export interface ProofTrustSectionData {
  id: string;
  type: 'proof_trust';
  title: string;
  subtitle: string;
  aggregateRating: number;
  totalReviews: string;
  statHighlights: ProofStat[];
  trustBadges: TrustBadgeItem[];
  proofImages: ProofImageItem[];
}

export interface FeaturesSectionData {
  id: string;
  type: 'features';
  title: string;
  subtitle: string;
  items: FeatureItem[];
}

export interface OfferSectionData {
  id: string;
  type: 'offer';
  badge: string;
  title: string;
  subtitle: string;
  originalPrice: number;
  discountPrice: number;
  countdownEnd?: string;
  scarcityText?: string;
  buttonText: string;
  buttonLink: string;
  guaranteeNote?: string;
}

export interface FaqSectionData {
  id: string;
  type: 'faq';
  title: string;
  subtitle?: string;
  items: FaqItem[];
}

export interface StickyCtaSectionData {
  id: string;
  type: 'sticky_cta';
  enabled: boolean;
  text: string;
  buttonText: string;
  buttonLink: string;
}

export type LandingPageSection =
  | HeroSectionData
  | TestimonialsSectionData
  | ProofTrustSectionData
  | FeaturesSectionData
  | OfferSectionData
  | FaqSectionData
  | StickyCtaSectionData;

export interface LandingPageData {
  id?: string;
  title: string;
  slug: string;
  customPath?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoKeywords?: string | null;
  ogImage?: string | null;
  isPublished: boolean;
  productId?: string | null;
  product?: {
    id: string;
    name: string;
    sellingPrice: number;
    discountPrice?: number | null;
    images?: Array<{ url: string }>;
  } | null;
  sections: LandingPageSection[];
  createdAt?: string;
  updatedAt?: string;
}

export function createDefaultSection(type: SectionType): LandingPageSection {
  const id = 'sec_' + Math.random().toString(36).substring(2, 9);
  switch (type) {
    case 'hero':
      return {
        id,
        type: 'hero',
        badge: '⚡ PROMO SPESIAL HARI INI',
        title: 'Tingkatkan Kualitas Hidup Anda dengan Solusi Terbaik',
        subtitle: 'Dapatkan hasil maksimal tanpa repot. Telah dipercaya oleh lebih dari 10.000 pelanggan puas di seluruh Indonesia.',
        ctaText: 'Klaim Promo Sekarang',
        ctaLink: '#offer',
        secondaryCtaText: 'Lihat Ulasan Pelanggan',
        secondaryCtaLink: '#testimonials',
        imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1000&auto=format&fit=crop&q=80',
      };
    case 'testimonials':
      return {
        id,
        type: 'testimonials',
        title: 'Apa Kata Pelanggan Setia Kami?',
        subtitle: 'Pengalaman nyata dari pembeli yang telah merasakan manfaat produk kami secara langsung.',
        items: [
          {
            id: 'testi_1',
            name: 'Rina Wijaya',
            location: 'Surabaya',
            avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
            rating: 5,
            isVerified: true,
            comment: 'Awalnya ragu, tapi setelah coba sendiri hasilnya benar-benar luar biasa! Pengiriman juga cepat hanya 2 hari sudah sampai ke Surabaya.',
            reviewImage: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&auto=format&fit=crop&q=80',
            date: '2 hari lalu',
          },
          {
            id: 'testi_2',
            name: 'Budi Santoso',
            location: 'Jakarta Barat',
            avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
            rating: 5,
            isVerified: true,
            comment: 'Kualitas produk sangat premium. CS-nya juga ramah banget membimbing cara pakainya. Worth it banget!',
            date: '1 minggu lalu',
          },
          {
            id: 'testi_3',
            name: 'Dewi Lestari',
            location: 'Bandung',
            avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
            rating: 5,
            isVerified: true,
            comment: 'Sudah repeat order 3 kali untuk keluarga. Sangat direkomendasikan buat siapa saja yang butuh solusi cepat dan aman.',
            date: '2 minggu lalu',
          },
        ],
      };
    case 'proof_trust':
      return {
        id,
        type: 'proof_trust',
        title: 'Bukti Nyata & Jaminan Kepercayaan 100%',
        subtitle: 'Kami mengutamakan kepuasan dan keamanan belanja online Anda.',
        aggregateRating: 4.9,
        totalReviews: '1.450+ Ulasan Pembeli',
        statHighlights: [
          { label: 'Paket Terkirim', value: '15.000+' },
          { label: 'Pelanggan Puas', value: '99.4%' },
          { label: 'Rating Toko', value: '4.9 / 5.0' },
        ],
        trustBadges: [
          {
            title: 'Garansi 100% Uang Kembali',
            desc: 'Jika barang rusak atau tidak sesuai, kami ganti baru atau uang kembali.',
            icon: 'shield',
          },
          {
            title: 'Bisa Bayar di Tempat (COD)',
            desc: 'Bayar tunai ke kurir saat barang sudah Anda terima dengan aman di rumah.',
            icon: 'truck',
          },
          {
            title: '100% Produk Original',
            desc: 'Terdaftar resmi dan memiliki izin standar mutu terjamin.',
            icon: 'badge',
          },
          {
            title: 'Layanan Bantuan 24/7',
            desc: 'Tim Customer Care kami siap membantu kapan pun Anda membutuhkan.',
            icon: 'chat',
          },
        ],
        proofImages: [
          {
            url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600&auto=format&fit=crop&q=80',
            caption: 'Ribuan paket siap kirim setiap harinya via kurir terpercaya',
          },
          {
            url: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=600&auto=format&fit=crop&q=80',
            caption: 'Tangkapan layar kepuasan pelanggan dan bukti resi pengiriman',
          },
        ],
      };
    case 'features':
      return {
        id,
        type: 'features',
        title: 'Keunggulan Eksklusif yang Anda Dapatkan',
        subtitle: 'Dirancang khusus untuk memberikan pengalaman dan kepuasan maksimal.',
        items: [
          {
            id: 'feat_1',
            title: 'Bahan Premium Teruji',
            description: 'Menggunakan material berkualitas tertinggi yang tahan lama dan aman digunakan sehari-hari.',
            icon: '✨',
          },
          {
            id: 'feat_2',
            title: 'Hasil Nyata Cepat Terlihat',
            description: 'Dirancang dengan riset mendalam agar manfaat dapat Anda rasakan sejak pemakaian pertama.',
            icon: '🚀',
          },
          {
            id: 'feat_3',
            title: 'Praktis & Mudah Digunakan',
            description: 'Tanpa proses rumit, siap pakai kapan saja sesuai kebutuhan gaya hidup Anda.',
            icon: '👌',
          },
        ],
      };
    case 'offer':
      return {
        id,
        type: 'offer',
        badge: '⚡ PENAWARAN SPESIAL HARI INI',
        title: 'Dapatkan Diskon Spesial 50% + Gratis Ongkir!',
        subtitle: 'Harga promo hanya berlaku hari ini atau selama persediaan kuota promo masih tersedia.',
        originalPrice: 299000,
        discountPrice: 149000,
        countdownEnd: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        scarcityText: '🔥 Perhatian: Kuota promo tersisa tinggal 12 paket lagi!',
        buttonText: 'Pesan Sekarang (Bisa COD / Transfer)',
        buttonLink: '#order',
        guaranteeNote: '🛡️ Garansi Uang Kembali 100% jika Anda tidak puas.',
      };
    case 'faq':
      return {
        id,
        type: 'faq',
        title: 'Pertanyaan yang Sering Ditanyakan (FAQ)',
        subtitle: 'Jawaban lengkap seputar produk, pemesanan, dan pengiriman.',
        items: [
          {
            id: 'faq_1',
            question: 'Apakah produk ini aman dan bergaransi?',
            answer: 'Ya, seluruh produk kami terjamin 100% original, aman digunakan, dan dilengkapi garansi kepuasan atau retur gratis jika barang tidak sesuai.',
          },
          {
            id: 'faq_2',
            question: 'Apakah bisa bayar di tempat (COD)?',
            answer: 'Bisa! Kami melayani sistem pembayaran Cash on Delivery (COD) ke hampir seluruh wilayah di Indonesia.',
          },
          {
            id: 'faq_3',
            question: 'Berapa lama estimasi pengiriman?',
            answer: 'Pesanan diproses dalam 24 jam. Pengiriman untuk area Jabodetabek berkisar 1-2 hari kerja, luar kota 2-4 hari kerja.',
          },
        ],
      };
    case 'sticky_cta':
      return {
        id,
        type: 'sticky_cta',
        enabled: true,
        text: 'Diskon 50% Berakhir Hari Ini!',
        buttonText: 'Beli Sekarang (COD)',
        buttonLink: '#offer',
      };
  }
}

