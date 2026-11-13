export interface HeroSlideItem {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  ctaText: string;
  ctaLink: string;
  ctaSecondaryText: string;
  ctaSecondaryLink: string;
  imageUrl: string;
}

export const HERO_SLIDES_SOCIAL_KEY = '__heroSlides';

const PUBLIC_SOCIAL_KEYS = ['instagram', 'facebook', 'tiktok', 'youtube', 'whatsapp'] as const;

export function createEmptyHeroSlide(index = 0): HeroSlideItem {
  return {
    id: `slide-${Date.now()}-${index + 1}`,
    badge: index === 0 ? 'Koleksi Terbaru 2026' : 'Promo Spesial',
    title: '',
    subtitle: '',
    ctaText: 'Mulai Belanja',
    ctaLink: '/products',
    ctaSecondaryText: '',
    ctaSecondaryLink: '/articles',
    imageUrl: '',
  };
}

/**
 * Extracts only public social media links (`instagram`, `facebook`, `tiktok`, `youtube`, `whatsapp`),
 * filtering out internal metadata such as `__heroSlides` stored inside StoreSettings.socialLinks.
 */
export function extractPublicSocialLinks(rawSocialLinks: unknown): Record<string, string> {
  if (!rawSocialLinks || typeof rawSocialLinks !== 'object' || Array.isArray(rawSocialLinks)) {
    return {};
  }

  const record = rawSocialLinks as Record<string, unknown>;
  const cleaned: Record<string, string> = {};

  for (const key of PUBLIC_SOCIAL_KEYS) {
    const val = record[key];
    if (typeof val === 'string' && val.trim().length > 0) {
      cleaned[key] = val.trim();
    }
  }

  return cleaned;
}

function normalizeHeroSlide(raw: unknown, index: number): HeroSlideItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const item = raw as Record<string, unknown>;
  const title = typeof item.title === 'string' ? item.title.trim() : '';
  if (!title) return null;

  const id = typeof item.id === 'string' && item.id.trim() ? item.id.trim() : `slide-${index + 1}`;

  return {
    id,
    badge: typeof item.badge === 'string' ? item.badge.trim() : '',
    title,
    subtitle: typeof item.subtitle === 'string' ? item.subtitle.trim() : '',
    ctaText: typeof item.ctaText === 'string' && item.ctaText.trim() ? item.ctaText.trim() : 'Mulai Belanja',
    ctaLink: typeof item.ctaLink === 'string' && item.ctaLink.trim() ? item.ctaLink.trim() : '/products',
    ctaSecondaryText: typeof item.ctaSecondaryText === 'string' ? item.ctaSecondaryText.trim() : '',
    ctaSecondaryLink: typeof item.ctaSecondaryLink === 'string' && item.ctaSecondaryLink.trim() ? item.ctaSecondaryLink.trim() : '/articles',
    imageUrl: typeof item.imageUrl === 'string' ? item.imageUrl.trim() : '',
  };
}

/**
 * Reads saved multi-card Hero slides from `StoreSettings.socialLinks.__heroSlides`.
 */
export function extractSavedHeroSlides(rawSocialLinks: unknown): HeroSlideItem[] {
  if (!rawSocialLinks || typeof rawSocialLinks !== 'object' || Array.isArray(rawSocialLinks)) {
    return [];
  }

  const record = rawSocialLinks as Record<string, unknown>;
  const rawSlides = record[HERO_SLIDES_SOCIAL_KEY];
  if (!Array.isArray(rawSlides)) return [];

  const normalized: HeroSlideItem[] = [];
  rawSlides.forEach((raw, idx) => {
    const slide = normalizeHeroSlide(raw, idx);
    if (slide) normalized.push(slide);
  });

  return normalized;
}

/**
 * Merges incoming public social links and/or `heroSlides` into StoreSettings.socialLinks JSON
 * without dropping existing social links or previously saved slides.
 */
export function mergeHeroSlidesIntoSocialLinks(
  existingSocialLinks: unknown,
  incomingSocialLinks?: Record<string, string | null | undefined> | null,
  heroSlides?: Array<Partial<HeroSlideItem>> | null
): Record<string, unknown> {
  const existingPublic = extractPublicSocialLinks(existingSocialLinks);
  const existingSlides = extractSavedHeroSlides(existingSocialLinks);

  const nextPublic: Record<string, unknown> =
    incomingSocialLinks !== undefined
      ? extractPublicSocialLinks(incomingSocialLinks)
      : { ...existingPublic };

  const normalizedIncomingSlides = Array.isArray(heroSlides)
    ? heroSlides
        .map((slide, idx) => normalizeHeroSlide(slide, idx))
        .filter((item): item is HeroSlideItem => item !== null)
    : null;

  const finalSlides = normalizedIncomingSlides !== null ? normalizedIncomingSlides : existingSlides;

  if (finalSlides.length > 0) {
    return {
      ...nextPublic,
      [HERO_SLIDES_SOCIAL_KEY]: finalSlides,
    };
  }

  return nextPublic;
}

export interface ResolveStoreHeroSlidesParams {
  storeName: string;
  tagline?: string | null;
  settings?: {
    heroBadge?: string | null;
    heroTitle?: string | null;
    heroSubtitle?: string | null;
    heroCtaText?: string | null;
    heroCtaLink?: string | null;
    heroCtaSecondaryText?: string | null;
    heroCtaSecondaryLink?: string | null;
    heroImageUrl?: string | null;
    socialLinks?: unknown;
  } | null;
  fallbackProductImage?: string | null;
}

/**
 * Resolves the homepage Hero Slider cards for a store.
 * Always yields multiple cards (using admin-configured `__heroSlides` when >= 2 slides exist,
 * or combining the store's primary hero card with curated default cards for instant multi-card slider UX).
 */
export function resolveStoreHeroSlides({
  storeName,
  tagline,
  settings,
  fallbackProductImage,
}: ResolveStoreHeroSlidesParams): HeroSlideItem[] {
  const savedSlides = extractSavedHeroSlides(settings?.socialLinks);

  if (savedSlides.length >= 2) {
    return savedSlides.map((slide, idx) => {
      if (idx === 0 && !slide.imageUrl && settings?.heroImageUrl) {
        return { ...slide, imageUrl: settings.heroImageUrl };
      }
      return slide;
    });
  }

  const primarySlide: HeroSlideItem = savedSlides[0]
    ? {
        ...savedSlides[0],
        imageUrl: savedSlides[0].imageUrl || settings?.heroImageUrl || '',
      }
    : {
        id: 'primary-slide-1',
        badge: settings?.heroBadge || 'Koleksi Terbaru 2026',
        title: settings?.heroTitle || `Selamat Datang di ${storeName}`,
        subtitle:
          settings?.heroSubtitle ||
          tagline ||
          'Temukan berbagai produk berkualitas tinggi dengan penawaran terbaik dan garansi kepuasan pelanggan.',
        ctaText: settings?.heroCtaText || 'Mulai Belanja',
        ctaLink: settings?.heroCtaLink || '/products',
        ctaSecondaryText: settings?.heroCtaSecondaryText || 'Baca Artikel Rekomendasi',
        ctaSecondaryLink: settings?.heroCtaSecondaryLink || '/articles',
        imageUrl: settings?.heroImageUrl || '',
      };

  const defaultSlides: HeroSlideItem[] = [
    {
      id: 'default-slide-2',
      badge: 'Promo & Harga Grosir',
      title: 'Hemat Lebih Banyak dengan Harga Bertingkat',
      subtitle:
        'Pesan satuan maupun partai besar dengan harga grosir otomatis yang transparan, stok terjamin, dan pengiriman ke seluruh Indonesia.',
      ctaText: 'Lihat Katalog Produk',
      ctaLink: '/products',
      ctaSecondaryText: 'Cek Penawaran Spesial',
      ctaSecondaryLink: '/offers',
      imageUrl:
        fallbackProductImage ||
        'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=1200&q=80',
    },
    {
      id: 'default-slide-3',
      badge: 'Panduan & Rekomendasi Editor',
      title: 'Inspirasi & Tips Belanja Terbaik untuk Anda',
      subtitle:
        'Baca ulasan mendalam, panduan memilih produk yang tepat, serta rekomendasi kurasi terbaik langsung dari tim editor kami.',
      ctaText: 'Baca Artikel & Panduan',
      ctaLink: '/articles',
      ctaSecondaryText: 'Jelajahi Kategori',
      ctaSecondaryLink: '/categories',
      imageUrl:
        'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=1200&q=80',
    },
  ];

  return [primarySlide, ...defaultSlides];
}
