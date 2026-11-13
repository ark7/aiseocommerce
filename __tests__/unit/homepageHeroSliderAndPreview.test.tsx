/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import HeroSlider from '@/components/HeroSlider';
import ProductPreviewThumb from '@/components/ProductPreviewThumb';
import GlobalPublicTurnstileGuard, {
  TURNSTILE_DEFERRED_IDLE_MS,
  isSearchEngineOrPreviewBot,
} from '@/components/security/GlobalPublicTurnstileGuard';
import {
  extractPublicSocialLinks,
  mergeHeroSlidesIntoSocialLinks,
  resolveStoreHeroSlides,
} from '@/lib/heroSlides';

const mockUsePathname = jest.fn(() => '/');
jest.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}));

describe('Homepage Hero Slider, Product Previews & SEO-Safe Turnstile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePathname.mockReturnValue('/');
  });

  describe('lib/heroSlides', () => {
    it('expands a single-hero store into 3 curated cards for multi-card slider UX', () => {
      const slides = resolveStoreHeroSlides({
        storeName: 'Toko Jaya',
        tagline: 'Belanja Hemat',
        settings: {
          heroBadge: 'Promo Utama',
          heroTitle: 'Diskon Akhir Tahun',
          heroSubtitle: 'Nikmati promo terbaik minggu ini.',
          heroImageUrl: 'https://example.com/hero1.jpg',
        },
        fallbackProductImage: 'https://example.com/prod1.jpg',
      });

      expect(slides).toHaveLength(3);
      expect(slides[0].title).toBe('Diskon Akhir Tahun');
      expect(slides[1].imageUrl).toBe('https://example.com/prod1.jpg');
      expect(slides[2].ctaLink).toBe('/articles');
    });

    it('extracts public social links cleanly without leaking internal __heroSlides', () => {
      const merged = mergeHeroSlidesIntoSocialLinks(
        { instagram: '@tokoku', tiktok: '@tokokutt' },
        undefined,
        [
          {
            id: 's1',
            badge: 'Slide 1',
            title: 'Judul Satu',
            subtitle: 'Sub satu',
            ctaText: 'Beli',
            ctaLink: '/products',
            ctaSecondaryText: '',
            ctaSecondaryLink: '/articles',
            imageUrl: 'https://example.com/1.jpg',
          },
          {
            id: 's2',
            badge: 'Slide 2',
            title: 'Judul Dua',
            subtitle: 'Sub dua',
            ctaText: 'Cek',
            ctaLink: '/offers',
            ctaSecondaryText: '',
            ctaSecondaryLink: '/articles',
            imageUrl: 'https://example.com/2.jpg',
          },
        ]
      );

      expect(extractPublicSocialLinks(merged)).toEqual({
        instagram: '@tokoku',
        tiktok: '@tokokutt',
      });

      const resolved = resolveStoreHeroSlides({
        storeName: 'Toko Jaya',
        settings: { socialLinks: merged },
      });
      expect(resolved).toHaveLength(2);
      expect(resolved[1].title).toBe('Judul Dua');
    });
  });

  describe('HeroSlider component', () => {
    it('renders Slide 1 with <h1> for SEO and switches cards via buttons and strip', () => {
      const slides = resolveStoreHeroSlides({
        storeName: 'LarisManis Demo',
        settings: {
          heroTitle: 'Card Hero Pertama',
          heroImageUrl: '/images/hero-1.jpg',
        },
      });

      render(<HeroSlider slides={slides} storeName="LarisManis Demo" autoPlayMs={60000} />);

      const h1 = screen.getByRole('heading', { level: 1 });
      expect(h1).toHaveTextContent('Card Hero Pertama');
      expect(screen.getByText('Slide 1 / 3')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Slide berikutnya' }));
      expect(screen.getByText('Slide 2 / 3')).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(slides[1].title);

      fireEvent.click(screen.getByRole('button', { name: `Pilih slide 3: ${slides[2].title}` }));
      expect(screen.getByText('Slide 3 / 3')).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(slides[2].title);
    });
  });

  describe('ProductPreviewThumb component', () => {
    it('renders unoptimized product image and switches to visual preview fallback on error or missing URL', () => {
      const { rerender } = render(
        <ProductPreviewThumb
          imageUrl="https://example.com/broken.jpg"
          alt="Sepatu Lari Pro"
          categoryName="Sepatu & Footwear"
        />
      );

      const img = screen.getByAltText('Sepatu Lari Pro');
      expect(img).toBeInTheDocument();

      fireEvent.error(img);
      const fallback = screen.getByTestId('product-visual-fallback');
      expect(fallback).toBeInTheDocument();
      expect(fallback).toHaveTextContent('Sepatu & Footwear');
      expect(fallback).toHaveTextContent('Sepatu Lari Pro');

      rerender(
        <ProductPreviewThumb
          imageUrl={null}
          alt="Kopi Arabika Gayo"
          categoryName="Kopi & Kuliner"
        />
      );
      expect(screen.getByTestId('product-visual-fallback')).toHaveTextContent('Kopi Arabika Gayo');
    });
  });

  describe('GlobalPublicTurnstileGuard SEO & First Impression Behavior', () => {
    const originalUserAgent = navigator.userAgent;

    afterEach(() => {
      jest.useRealTimers();
      Object.defineProperty(navigator, 'userAgent', {
        value: originalUserAgent,
        configurable: true,
      });
    });

    it('detects search engine and link preview crawlers accurately', () => {
      expect(
        isSearchEngineOrPreviewBot(
          'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
        )
      ).toBe(true);
      expect(isSearchEngineOrPreviewBot('Chrome-Lighthouse')).toBe(true);
      expect(
        isSearchEngineOrPreviewBot(
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36'
        )
      ).toBe(false);
    });

    it('defers Turnstile mounting on homepage until user interaction or idle timeout', () => {
      jest.useFakeTimers();
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36',
        configurable: true,
      });

      render(
        <GlobalPublicTurnstileGuard
          siteKey="1x00000000000000000000AA"
          initiallyVerified={false}
          storeDomain="demo.larismanis.online"
        />
      );

      // Should NOT block or mount on initial paint
      expect(screen.queryByTestId('global-public-turnstile-guard')).not.toBeInTheDocument();

      // Advances past idle timeout
      act(() => {
        jest.advanceTimersByTime(TURNSTILE_DEFERRED_IDLE_MS);
      });

      expect(screen.getByTestId('global-public-turnstile-guard')).toBeInTheDocument();
    });

    it('never mounts Turnstile for SEO crawlers such as Googlebot', () => {
      jest.useFakeTimers();
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        configurable: true,
      });

      render(
        <GlobalPublicTurnstileGuard
          siteKey="1x00000000000000000000AA"
          initiallyVerified={false}
          storeDomain="demo.larismanis.online"
        />
      );

      act(() => {
        fireEvent.scroll(window);
        jest.advanceTimersByTime(TURNSTILE_DEFERRED_IDLE_MS + 1000);
      });

      expect(screen.queryByTestId('global-public-turnstile-guard')).not.toBeInTheDocument();
    });
  });
});
