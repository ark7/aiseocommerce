export type SectionType =
  | 'hero'
  | 'testimonials'
  | 'proof_trust'
  | 'features'
  | 'offer'
  | 'faq'
  | 'sticky_cta'
  | 'event_details'
  | 'speakers'
  | 'event_schedule'
  | 'digital_curriculum'
  | 'pricing_tiers';

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

export interface EventSpeakerItem {
  id: string;
  name: string;
  role: string;
  company?: string;
  avatar: string;
  bio?: string;
}

export interface EventScheduleSession {
  id: string;
  time: string;
  title: string;
  speaker?: string;
  description?: string;
}

export interface CurriculumModuleItem {
  id: string;
  title: string;
  durationOrPages?: string;
  isFreePreview?: boolean;
  description?: string;
  topics?: string[];
}

export interface PricingTierItem {
  id: string;
  name: string;
  badge?: string;
  originalPrice?: number;
  price: number;
  description: string;
  features: string[];
  buttonText: string;
  buttonLink: string;
  isPopular?: boolean;
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

export interface EventDetailsSectionData {
  id: string;
  type: 'event_details';
  title: string;
  subtitle: string;
  eventStartDate: string;
  eventEndDate?: string;
  timezone: string;
  locationType: 'ONLINE' | 'OFFLINE';
  venueName: string;
  venueAddress?: string;
  platformBadge: string;
  quotaRemaining?: number;
  benefits: string[];
}

export interface SpeakersSectionData {
  id: string;
  type: 'speakers';
  title: string;
  subtitle: string;
  speakers: EventSpeakerItem[];
}

export interface EventScheduleSectionData {
  id: string;
  type: 'event_schedule';
  title: string;
  subtitle: string;
  dateLabel?: string;
  sessions: EventScheduleSession[];
}

export interface DigitalCurriculumSectionData {
  id: string;
  type: 'digital_curriculum';
  title: string;
  subtitle: string;
  totalModulesText?: string;
  downloadInfoBadge?: string;
  modules: CurriculumModuleItem[];
}

export interface PricingTiersSectionData {
  id: string;
  type: 'pricing_tiers';
  title: string;
  subtitle: string;
  guaranteeText?: string;
  tiers: PricingTierItem[];
}

export type LandingPageSection =
  | HeroSectionData
  | TestimonialsSectionData
  | ProofTrustSectionData
  | FeaturesSectionData
  | OfferSectionData
  | FaqSectionData
  | StickyCtaSectionData
  | EventDetailsSectionData
  | SpeakersSectionData
  | EventScheduleSectionData
  | DigitalCurriculumSectionData
  | PricingTiersSectionData;

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
        subtitle:
          'Dapatkan hasil maksimal tanpa repot. Telah dipercaya oleh lebih dari 10.000 pelanggan puas di seluruh Indonesia.',
        ctaText: 'Klaim Promo Sekarang',
        ctaLink: '#offer',
        secondaryCtaText: 'Lihat Ulasan Pelanggan',
        secondaryCtaLink: '#testimonials',
        imageUrl:
          'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1000&auto=format&fit=crop&q=80',
      };
    case 'testimonials':
      return {
        id,
        type: 'testimonials',
        title: 'Apa Kata Pelanggan Setia Kami?',
        subtitle:
          'Pengalaman nyata dari pembeli yang telah merasakan manfaat produk kami secara langsung.',
        items: [
          {
            id: 'testi_1',
            name: 'Rina Wijaya',
            location: 'Surabaya',
            avatar:
              'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
            rating: 5,
            isVerified: true,
            comment:
              'Awalnya ragu, tapi setelah coba sendiri hasilnya benar-benar luar biasa! Pengiriman juga cepat hanya 2 hari sudah sampai ke Surabaya.',
            reviewImage:
              'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&auto=format&fit=crop&q=80',
            date: '2 hari lalu',
          },
          {
            id: 'testi_2',
            name: 'Budi Santoso',
            location: 'Jakarta Barat',
            avatar:
              'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
            rating: 5,
            isVerified: true,
            comment:
              'Kualitas produknya top markotop, sangat bermanfaat untuk keluarga. Sangat direkomendasikan buat siapa saja yang butuh solusi cepat dan aman.',
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
            url:
              'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600&auto=format&fit=crop&q=80',
            caption: 'Ribuan paket siap kirim setiap harinya via kurir terpercaya',
          },
          {
            url:
              'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=600&auto=format&fit=crop&q=80',
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
            description:
              'Menggunakan material berkualitas tertinggi yang tahan lama dan aman digunakan sehari-hari.',
            icon: '✨',
          },
          {
            id: 'feat_2',
            title: 'Hasil Nyata Cepat Terlihat',
            description:
              'Dirancang dengan riset mendalam agar manfaat dapat Anda rasakan sejak pemakaian pertama.',
            icon: '🚀',
          },
          {
            id: 'feat_3',
            title: 'Praktis & Mudah Digunakan',
            description:
              'Tanpa proses rumit, siap pakai kapan saja sesuai kebutuhan gaya hidup Anda.',
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
        subtitle:
          'Harga promo hanya berlaku hari ini atau selama persediaan kuota promo masih tersedia.',
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
            answer:
              'Ya, seluruh produk kami terjamin 100% original, aman digunakan, dan dilengkapi garansi kepuasan atau retur gratis jika barang tidak sesuai.',
          },
          {
            id: 'faq_2',
            question: 'Apakah bisa bayar di tempat (COD)?',
            answer:
              'Bisa! Kami melayani sistem pembayaran Cash on Delivery (COD) ke hampir seluruh wilayah di Indonesia.',
          },
          {
            id: 'faq_3',
            question: 'Berapa lama estimasi pengiriman?',
            answer:
              'Pesanan diproses dalam 24 jam. Pengiriman untuk area Jabodetabek berkisar 1-2 hari kerja, luar kota 2-4 hari kerja.',
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

    // ----- SECTION BARU: EVENT / SEMINAR & DIGITAL PRODUCTS -----
    case 'event_details':
      return {
        id,
        type: 'event_details',
        title: 'Detail & Waktu Pelaksanaan Seminar',
        subtitle: 'Simpan tanggalnya dan pastikan Anda hadir tepat waktu untuk materi terbaik.',
        eventStartDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        eventEndDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000).toISOString(),
        timezone: 'WIB',
        locationType: 'ONLINE',
        venueName: 'Live Interactive via Zoom Webinar',
        venueAddress: 'Tautan privat ruang Zoom otomatis diberikan setelah pembayaran lunas.',
        platformBadge: '🎟️ Kuota Terbatas 100 Peserta',
        quotaRemaining: 23,
        benefits: [
          'Akses Live Streaming & Tanya Jawab Interaktif',
          'E-Sertifikat Resmi Ber-SKP / Terverifikasi',
          'Rekaman Full HD Dapat Diakses 1 Tahun',
          'E-Book & Modul Presentasi Pembicara (PDF)',
          'Akses ke Grup Diskusi Eksklusif Alumni',
        ],
      };

    case 'speakers':
      return {
        id,
        type: 'speakers',
        title: 'Belajar Langsung dari Praktisi Terbaik',
        subtitle: 'Para pakar industri yang telah berpengalaman bertahun-tahun di bidangnya.',
        speakers: [
          {
            id: 'spk_1',
            name: 'dr. Andi Pratama, Sp.A',
            role: 'Senior Digital Healthcare Strategist',
            company: 'TechHealth Indonesia',
            avatar:
              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
            bio: 'Telah membimbing lebih dari 15.000 peserta dan praktisi dalam digital transformation.',
          },
          {
            id: 'spk_2',
            name: 'Bambang Sudibyo, M.Kom',
            role: 'Head of Growth & SEO Engineering',
            company: 'GrowthMasters Asia',
            avatar:
              'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
            bio: 'Pakar pertumbuhan trafik organik dengan pengalaman menangani jutaan pengunjung bulanan.',
          },
        ],
      };

    case 'event_schedule':
      return {
        id,
        type: 'event_schedule',
        title: 'Rundown & Agenda Sesi Acara',
        subtitle: 'Susunan jadwal pembahasan materi dan sesi tanya jawab langsung.',
        dateLabel: 'Sesi Intensif (09:00 - 13:00 WIB)',
        sessions: [
          {
            id: 'sch_1',
            time: '09:00 - 09:30',
            title: 'Pembukaan & Pengantar Fundamental 2026',
            speaker: 'Tim Penyelenggara',
            description: 'Registrasi online peserta dan pengantar garis besar materi webinar.',
          },
          {
            id: 'sch_2',
            time: '09:30 - 11:00',
            title: 'Sesi Inti 1: Framework Praktis & Studi Kasus',
            speaker: 'dr. Andi Pratama',
            description: 'Bedah studi kasus nyata dari nol hingga mencapai target yang diharapkan.',
          },
          {
            id: 'sch_3',
            time: '11:00 - 12:15',
            title: 'Sesi Inti 2: Taktik Eksekusi & Solusi Troubleshooting',
            speaker: 'Bambang Sudibyo',
            description: 'Langkah taktis implementasi cepat dan cara mengatasi kendala teknis.',
          },
          {
            id: 'sch_4',
            time: '12:15 - 13:00',
            title: 'Tanya Jawab Eksklusif & Pembagian Doorprize',
            speaker: 'Semua Pembicara',
            description: 'Konsultasi terbuka pertanyaan peserta dan penyerahan e-sertifikat.',
          },
        ],
      };

    case 'digital_curriculum':
      return {
        id,
        type: 'digital_curriculum',
        title: 'Silabus Lengkap & Isi Materi Digital',
        subtitle: 'Struktur kurikulum sistematis yang dirancang agar mudah dipelajari siapa saja.',
        totalModulesText: '6 Modul Utama • 35 Video Pembelajaran HD • 12 Template Siap Pakai',
        downloadInfoBadge: '⚡ Instant Download File & Akses Selamanya',
        modules: [
          {
            id: 'mod_1',
            title: 'Modul 1: Fondasi Dasar & Mindset Sukses',
            durationOrPages: '45 Menit • 3 Video',
            isFreePreview: true,
            description: 'Memahami prinsip utama dan peta jalan dari awal sampai mahir.',
            topics: ['Pengantar prinsip dasar', 'Tools & aset yang diperlukan', 'Checklist persiapan awal'],
          },
          {
            id: 'mod_2',
            title: 'Modul 2: Strategi Praktis & Trik Efisiensi',
            durationOrPages: '90 Menit • 5 Video',
            isFreePreview: false,
            description: 'Langkah demi langkah menerapkan metode terbaik dengan cepat.',
            topics: ['Formula optimasi', 'Template kerja siap duplikasi', 'Trik menghemat waktu 10x lipat'],
          },
          {
            id: 'mod_3',
            title: 'Modul 3: Skalabilitas & Otomasi Hasil',
            durationOrPages: '75 Menit • 4 Video',
            isFreePreview: false,
            description: 'Cara melipatgandakan hasil dan membangun alur otomatis yang konsisten.',
            topics: ['Sistem automasi', 'Menganalisis performa metriks', 'Studi kasus nyata keberhasilan'],
          },
        ],
      };

    case 'pricing_tiers':
      return {
        id,
        type: 'pricing_tiers',
        title: 'Pilihan Tiket / Paket Akses',
        subtitle: 'Pilih paket yang paling cocok dengan kebutuhan belajar Anda sekarang.',
        guaranteeText: '🛡️ Garansi 100% Kepuasan Peserta atau Uang Kembali.',
        tiers: [
          {
            id: 'tier_1',
            name: 'Tiket Regular (Live Streaming)',
            badge: 'Paling Hemat',
            originalPrice: 199000,
            price: 99000,
            description: 'Cocok untuk Anda yang ingin mengikuti live session dan mendapatkan e-sertifikat.',
            features: [
              'Akses Live Zoom Webinar',
              'E-Sertifikat Resmi Peserta',
              'Ringkasan Materi PDF',
            ],
            buttonText: 'Daftar Tiket Regular',
            buttonLink: '#order',
            isPopular: false,
          },
          {
            id: 'tier_2',
            name: 'Tiket VIP All-Access',
            badge: 'Paling Populer & Lengkap',
            originalPrice: 499000,
            price: 199000,
            description: 'Paket terlengkap dengan rekaman permanen dan sesi tanya jawab prioritas.',
            features: [
              'Semua Benefit Tiket Regular',
              'Akses Rekaman Video HD (Selamanya)',
              'Modul Slide Presentasi Lengkap',
              'Akses Grup WhatsApp VIP Alumni',
              'Konsultasi Tanya Jawab Prioritas',
            ],
            buttonText: 'Daftar Tiket VIP',
            buttonLink: '#order',
            isPopular: true,
          },
        ],
      };
  }
}

/**
 * Template generator for standard Physical Product Landing Pages
 */
export function createPhysicalLandingPageTemplate(): LandingPageSection[] {
  return [
    createDefaultSection('hero'),
    createDefaultSection('proof_trust'),
    createDefaultSection('features'),
    createDefaultSection('offer'),
    createDefaultSection('testimonials'),
    createDefaultSection('faq'),
    createDefaultSection('sticky_cta'),
  ];
}

/**
 * Template generator for Event / Seminar / Webinar Landing Pages
 */
export function createEventLandingPageTemplate(): LandingPageSection[] {
  const hero = createDefaultSection('hero') as HeroSectionData;
  hero.badge = '🎟️ WEBINAR & SEMINAR EKSKLUSIF 2026';
  hero.title = 'Masterclass Strategi Terdepan: Transformasi Hasil Nyata';
  hero.subtitle =
    'Ikuti seminar live interaktif bersama para praktisi ternama. Kuota terbatas untuk memastikan kualitas diskusi maksimal.';
  hero.ctaText = 'Amankan Tiket Seminar';
  hero.ctaLink = '#pricing_tiers';
  hero.secondaryCtaText = 'Lihat Susunan Acara';
  hero.secondaryCtaLink = '#event_schedule';

  const sticky = createDefaultSection('sticky_cta') as StickyCtaSectionData;
  sticky.text = 'Pendaftaran Seminar Dibuka • Kuota Terbatas!';
  sticky.buttonText = 'Daftar Tiket Sekarang';
  sticky.buttonLink = '#pricing_tiers';

  return [
    hero,
    createDefaultSection('event_details'),
    createDefaultSection('speakers'),
    createDefaultSection('event_schedule'),
    createDefaultSection('pricing_tiers'),
    createDefaultSection('testimonials'),
    createDefaultSection('faq'),
    sticky,
  ];
}

/**
 * Template generator for Digital Product / E-Book / Course Landing Pages
 */
export function createDigitalProductLandingPageTemplate(): LandingPageSection[] {
  const hero = createDefaultSection('hero') as HeroSectionData;
  hero.badge = '📚 PRODUK DIGITAL & COURSE RESMI';
  hero.title = 'Kuasai Keterampilan Baru dengan Panduan & Template Siap Pakai';
  hero.subtitle =
    'Materi terlengkap yang langsung dapat diunduh detik ini juga. Dilengkapi template kerja dan studi kasus sukses teruji.';
  hero.ctaText = 'Dapatkan Akses Download';
  hero.ctaLink = '#pricing_tiers';
  hero.secondaryCtaText = 'Lihat Silabus Modul';
  hero.secondaryCtaLink = '#digital_curriculum';

  const sticky = createDefaultSection('sticky_cta') as StickyCtaSectionData;
  sticky.text = 'Instant Download File • Akses Selamanya!';
  sticky.buttonText = 'Beli & Unduh Sekarang';
  sticky.buttonLink = '#pricing_tiers';

  return [
    hero,
    createDefaultSection('proof_trust'),
    createDefaultSection('features'),
    createDefaultSection('digital_curriculum'),
    createDefaultSection('pricing_tiers'),
    createDefaultSection('testimonials'),
    createDefaultSection('faq'),
    sticky,
  ];
}
