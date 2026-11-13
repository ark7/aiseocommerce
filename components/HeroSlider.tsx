'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { HeroSlideItem } from '@/lib/heroSlides';

export interface HeroSliderProps {
  slides: HeroSlideItem[];
  primaryColor?: string;
  storeName: string;
  tagline?: string | null;
  autoPlayMs?: number;
}

export default function HeroSlider({
  slides,
  primaryColor = '#4F46E5',
  storeName,
  tagline,
  autoPlayMs = 5500,
}: HeroSliderProps) {
  const safeSlides = slides.length > 0 ? slides : [];
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [failedImages, setFailedImages] = useState<Record<number, boolean>>({});
  const touchStartXRef = useRef<number | null>(null);

  const slideCount = safeSlides.length;
  const currentIndex = slideCount > 0 ? activeIndex % slideCount : 0;
  const activeSlide = safeSlides[currentIndex];

  useEffect(() => {
    if (slideCount <= 1 || isPaused) return;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % slideCount);
    }, autoPlayMs);
    return () => clearInterval(timer);
  }, [slideCount, isPaused, autoPlayMs]);

  if (!activeSlide) {
    return null;
  }

  const goToSlide = (index: number) => {
    if (slideCount === 0) return;
    const next = ((index % slideCount) + slideCount) % slideCount;
    setActiveIndex(next);
  };

  const handlePrev = () => goToSlide(currentIndex - 1);
  const handleNext = () => goToSlide(currentIndex + 1);

  const handleTouchStart = (e: React.TouchEvent<HTMLElement>) => {
    touchStartXRef.current = e.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLElement>) => {
    if (touchStartXRef.current === null || slideCount <= 1) return;
    const endX = e.changedTouches[0]?.clientX ?? touchStartXRef.current;
    const delta = touchStartXRef.current - endX;
    touchStartXRef.current = null;
    if (Math.abs(delta) < 40) return;
    if (delta > 0) {
      handleNext();
    } else {
      handlePrev();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (slideCount <= 1) return;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      handleNext();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      handlePrev();
    }
  };

  const hasValidImage = Boolean(activeSlide.imageUrl) && !failedImages[currentIndex];

  return (
    <section
      aria-label="Hero Banner Slider"
      aria-roledescription="carousel"
      tabIndex={0}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onKeyDown={handleKeyDown}
      data-testid="hero-slider"
      className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-white via-gray-50 to-indigo-50/20 border border-gray-200/80 shadow-sm p-6 sm:p-10 md:p-12 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Sisi Kiri: Teks & Call-to-Action */}
        <div className="lg:col-span-7 space-y-5 text-left">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {activeSlide.badge ? (
              <div
                style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wide"
              >
                <span
                  className="w-2 h-2 rounded-full animate-pulse"
                  style={{ backgroundColor: primaryColor }}
                />
                <span>{activeSlide.badge}</span>
              </div>
            ) : (
              <span />
            )}

            {slideCount > 1 && (
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 bg-white/80 border border-gray-200 rounded-full px-3 py-1">
                <span>
                  Slide {currentIndex + 1} / {slideCount}
                </span>
              </div>
            )}
          </div>

          {currentIndex === 0 ? (
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-gray-900 tracking-tight leading-[1.15]">
              {activeSlide.title}
            </h1>
          ) : (
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-gray-900 tracking-tight leading-[1.15]">
              {activeSlide.title}
            </h2>
          )}

          {activeSlide.subtitle && (
            <p className="text-base sm:text-lg text-gray-600 max-w-xl leading-relaxed">
              {activeSlide.subtitle}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-4 pt-1">
            <Link
              href={activeSlide.ctaLink || '/products'}
              style={{ backgroundColor: primaryColor }}
              className="text-white px-6 py-3.5 rounded-xl font-semibold text-sm sm:text-base shadow-sm hover:opacity-95 transition-all flex items-center gap-2 group"
            >
              <span>{activeSlide.ctaText || 'Mulai Belanja'}</span>
              <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
            </Link>

            {activeSlide.ctaSecondaryText && (
              <Link
                href={activeSlide.ctaSecondaryLink || '/articles'}
                className="bg-white border border-gray-300 text-gray-700 px-6 py-3.5 rounded-xl font-medium text-sm sm:text-base hover:bg-gray-50 hover:border-gray-400 transition-colors"
              >
                {activeSlide.ctaSecondaryText}
              </Link>
            )}
          </div>

          {/* USP / Feature Badges */}
          <div className="pt-4 border-t border-gray-200/60 grid grid-cols-3 gap-3 text-xs text-gray-500">
            <div className="flex items-center gap-2">
              <span className="text-emerald-600 font-bold">✓</span>
              <span>Produk Original</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-emerald-600 font-bold">✓</span>
              <span>Pengiriman Aman</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-emerald-600 font-bold">✓</span>
              <span>Layanan Responsif</span>
            </div>
          </div>
        </div>

        {/* Sisi Kanan: Visual Banner Image / Showcase Card */}
        <div className="lg:col-span-5 relative">
          <div className="relative aspect-[4/3] sm:aspect-[16/10] lg:aspect-square w-full rounded-2xl overflow-hidden bg-gradient-to-tr from-gray-100 to-gray-200 border border-gray-200 shadow-md">
            {hasValidImage ? (
              <Image
                key={`${activeSlide.id}-${activeSlide.imageUrl}`}
                src={activeSlide.imageUrl}
                alt={activeSlide.title}
                fill
                className="object-cover transition-opacity duration-300"
                priority={currentIndex === 0}
                unoptimized
                onError={() =>
                  setFailedImages((prev) => ({
                    ...prev,
                    [currentIndex]: true,
                  }))
                }
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-6 text-center space-y-3 bg-gradient-to-br from-indigo-50/40 via-white to-gray-50">
                <div
                  style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-inner"
                >
                  🛍️
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-base">{storeName}</p>
                  <p className="text-xs text-gray-500 max-w-xs mt-1">
                    {tagline || 'Pusat belanja online terpercaya dengan katalog kurasi terbaik.'}
                  </p>
                </div>
                <span
                  style={{ borderColor: primaryColor, color: primaryColor }}
                  className="inline-block border text-[11px] font-semibold px-3 py-1 rounded-full bg-white shadow-xs"
                >
                  Katalog Resmi Toko
                </span>
              </div>
            )}

            {slideCount > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrev}
                  aria-label="Slide sebelumnya"
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-gray-800 shadow-md border border-gray-200 flex items-center justify-center transition-transform hover:scale-105"
                >
                  <span aria-hidden="true">&lsaquo;</span>
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  aria-label="Slide berikutnya"
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-gray-800 shadow-md border border-gray-200 flex items-center justify-center transition-transform hover:scale-105"
                >
                  <span aria-hidden="true">&rsaquo;</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Multi-Card Slide Selector Strip */}
      {slideCount > 1 && (
        <div className="mt-6 pt-5 border-t border-gray-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 flex-1">
            {safeSlides.map((slide, idx) => {
              const isActive = idx === currentIndex;
              return (
                <button
                  key={slide.id || idx}
                  type="button"
                  onClick={() => goToSlide(idx)}
                  aria-label={`Pilih slide ${idx + 1}: ${slide.title}`}
                  aria-current={isActive ? 'true' : undefined}
                  style={
                    isActive
                      ? { borderColor: primaryColor, backgroundColor: `${primaryColor}08` }
                      : undefined
                  }
                  className={`text-left rounded-xl border px-3.5 py-2.5 transition-all ${
                    isActive
                      ? 'shadow-xs ring-1 ring-inset ring-indigo-200'
                      : 'border-gray-200/80 bg-white/70 hover:bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      style={isActive ? { color: primaryColor } : undefined}
                      className={`text-[11px] font-bold uppercase tracking-wider truncate ${
                        isActive ? '' : 'text-gray-400'
                      }`}
                    >
                      0{idx + 1} • {slide.badge || 'Sorotan'}
                    </span>
                    {isActive && (
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: primaryColor }}
                      />
                    )}
                  </div>
                  <p className="text-xs font-semibold text-gray-800 line-clamp-1 mt-0.5">
                    {slide.title}
                  </p>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Card sebelumnya"
              className="w-8 h-8 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 flex items-center justify-center text-sm font-semibold"
            >
              &larr;
            </button>
            <div className="flex items-center gap-1.5" role="tablist" aria-label="Indikator slide hero">
              {safeSlides.map((slide, idx) => (
                <button
                  key={`dot-${slide.id || idx}`}
                  type="button"
                  role="tab"
                  aria-selected={idx === currentIndex}
                  aria-label={`Slide ${idx + 1}`}
                  onClick={() => goToSlide(idx)}
                  style={idx === currentIndex ? { backgroundColor: primaryColor } : undefined}
                  className={`h-2 rounded-full transition-all ${
                    idx === currentIndex ? 'w-6' : 'w-2 bg-gray-300 hover:bg-gray-400'
                  }`}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={handleNext}
              aria-label="Card berikutnya"
              className="w-8 h-8 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 flex items-center justify-center text-sm font-semibold"
            >
              &rarr;
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
