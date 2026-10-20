'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  LandingPageData,
  LandingPageSection,
  HeroSectionData,
  ProofTrustSectionData,
  FeaturesSectionData,
  OfferSectionData,
  TestimonialsSectionData,
  FaqSectionData,
  StickyCtaSectionData,
} from '@/lib/landingPageTypes';

interface LandingPageViewProps {
  landingPage: LandingPageData;
  storeName: string;
  storeDomain: string;
}

export default function LandingPageView({
  landingPage,
  storeName,
  storeDomain,
}: LandingPageViewProps) {
  const sections = Array.isArray(landingPage.sections)
    ? (landingPage.sections as LandingPageSection[])
    : [];

  const [openFaqId, setOpenFaqId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number }>({
    hours: 11,
    minutes: 45,
    seconds: 30,
  });

  // Countdown timer simulation
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        }
        return { hours: 12, minutes: 0, seconds: 0 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleFaq = (id: string) => {
    setOpenFaqId(openFaqId === id ? null : id);
  };

  const stickySection = sections.find(
    (s): s is StickyCtaSectionData => s.type === 'sticky_cta' && s.enabled
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 antialiased selection:bg-indigo-500 selection:text-white pb-20 md:pb-8">
      {/* Top Banner & Navigation */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="text-xl font-black text-indigo-600 tracking-tight group-hover:text-indigo-700 transition">
              {storeName}
            </span>
          </Link>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <span className="hidden sm:inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Jaminan 100% Original & COD
            </span>
            <Link
              href="/"
              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
            >
              Lihat Toko ↗
            </Link>
          </div>
        </div>
      </header>

      {/* Render Dynamic Modular Sections */}
      <main className="space-y-0">
        {sections.map((section) => {
          // 1. HERO SECTION
          if (section.type === 'hero') {
            const hero = section as HeroSectionData;
            return (
              <section
                key={hero.id}
                className="relative overflow-hidden bg-gradient-to-b from-indigo-50/70 via-white to-slate-50 py-16 md:py-24 border-b border-slate-200"
              >
                <div className="max-w-4xl mx-auto px-4 text-center">
                  {hero.badge && (
                    <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-extrabold uppercase tracking-wider mb-6 shadow-xs animate-bounce">
                      <span>⚡</span>
                      <span>{hero.badge}</span>
                    </div>
                  )}

                  <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-slate-900 tracking-tight leading-tight">
                    {hero.title}
                  </h1>

                  <p className="mt-5 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
                    {hero.subtitle}
                  </p>

                  {/* Hero Visual */}
                  {hero.imageUrl && (
                    <div className="mt-10 max-w-2xl mx-auto rounded-2xl overflow-hidden shadow-2xl border-4 border-white bg-slate-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={hero.imageUrl}
                        alt={hero.title}
                        className="w-full h-auto object-cover max-h-[460px] transform hover:scale-105 transition duration-500"
                      />
                    </div>
                  )}

                  {/* CTA Buttons */}
                  <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                    <a
                      href={hero.ctaLink || '#offer'}
                      className="w-full sm:w-auto px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm sm:text-base rounded-2xl shadow-xl shadow-indigo-600/25 transition transform active:scale-95"
                    >
                      {hero.ctaText || 'Pesan Sekarang'}
                    </a>
                    {hero.secondaryCtaText && (
                      <a
                        href={hero.secondaryCtaLink || '#testimonials'}
                        className="w-full sm:w-auto px-6 py-4 bg-white hover:bg-slate-100 text-slate-800 font-bold text-sm sm:text-base rounded-2xl border border-slate-200 shadow-sm transition"
                      >
                        {hero.secondaryCtaText}
                      </a>
                    )}
                  </div>
                </div>
              </section>
            );
          }

          // 2. PROOF & TRUST SECTION
          if (section.type === 'proof_trust') {
            const proof = section as ProofTrustSectionData;
            return (
              <section
                key={proof.id}
                id="proof"
                className="py-14 md:py-20 bg-white border-b border-slate-200"
              >
                <div className="max-w-5xl mx-auto px-4">
                  <div className="text-center max-w-2xl mx-auto mb-10">
                    <div className="inline-flex items-center gap-2 bg-amber-50 px-3.5 py-1.5 rounded-full border border-amber-200 mb-3">
                      <span className="text-amber-500 font-bold text-sm">★★★★★</span>
                      <span className="text-xs font-black text-slate-800">
                        {proof.aggregateRating || 4.9} / 5.0 Rating Kepuasan
                      </span>
                      <span className="text-xs text-slate-500 font-medium">({proof.totalReviews})</span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                      {proof.title}
                    </h2>
                    {proof.subtitle && (
                      <p className="mt-2 text-sm text-slate-600">{proof.subtitle}</p>
                    )}
                  </div>

                  {/* Highlights counter */}
                  {proof.statHighlights && proof.statHighlights.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6 mb-12 max-w-3xl mx-auto">
                      {proof.statHighlights.map((stat, idx) => (
                        <div
                          key={idx}
                          className="p-4 bg-indigo-50/60 rounded-2xl border border-indigo-100 text-center"
                        >
                          <div className="text-2xl sm:text-3xl font-black text-indigo-700 tracking-tight">
                            {stat.value}
                          </div>
                          <div className="text-xs font-bold text-slate-600 mt-1 uppercase tracking-wider">
                            {stat.label}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Trust Badges */}
                  {proof.trustBadges && proof.trustBadges.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-12">
                      {proof.trustBadges.map((badge, idx) => (
                        <div
                          key={idx}
                          className="p-5 bg-slate-50 rounded-2xl border border-slate-200 hover:border-indigo-300 transition"
                        >
                          <div className="text-2xl mb-2">🛡️</div>
                          <h4 className="text-sm font-bold text-slate-900">{badge.title}</h4>
                          <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                            {badge.desc}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Proof Photo Gallery */}
                  {proof.proofImages && proof.proofImages.length > 0 && (
                    <div className="space-y-4">
                      <div className="text-center">
                        <h3 className="text-base font-bold text-slate-800">
                          📸 Bukti Pengiriman & Tangkapan Layar Kepuasan Pembeli
                        </h3>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {proof.proofImages.map((img, idx) => (
                          <div
                            key={idx}
                            className="bg-slate-100 rounded-xl overflow-hidden border border-slate-200 shadow-sm"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={img.url}
                              alt={img.caption || 'Bukti Resi'}
                              className="w-full h-48 object-cover hover:scale-105 transition duration-300"
                            />
                            {img.caption && (
                              <p className="p-2.5 text-xs text-slate-600 font-medium bg-white border-t border-slate-100">
                                {img.caption}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </section>
            );
          }

          // 3. FEATURES & BENEFITS SECTION
          if (section.type === 'features') {
            const features = section as FeaturesSectionData;
            return (
              <section key={features.id} className="py-16 md:py-20 bg-slate-50 border-b border-slate-200">
                <div className="max-w-5xl mx-auto px-4">
                  <div className="text-center max-w-2xl mx-auto mb-12">
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                      {features.title}
                    </h2>
                    {features.subtitle && (
                      <p className="mt-2 text-sm text-slate-600">{features.subtitle}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {features.items.map((item) => (
                      <div
                        key={item.id}
                        className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition"
                      >
                        <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-2xl mb-4 font-bold">
                          {item.icon || '✨'}
                        </div>
                        <h3 className="text-base font-bold text-slate-900">{item.title}</h3>
                        <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                          {item.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            );
          }

          // 4. OFFER & SCARCITY SECTION
          if (section.type === 'offer') {
            const offer = section as OfferSectionData;
            return (
              <section
                key={offer.id}
                id="offer"
                className="py-16 md:py-24 bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 text-white relative overflow-hidden"
              >
                {/* Background glow effects */}
                <div className="absolute -top-24 -left-24 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none"></div>
                <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

                <div className="max-w-3xl mx-auto px-4 text-center relative z-10">
                  {offer.badge && (
                    <span className="inline-block px-4 py-1.5 rounded-full bg-amber-400 text-indigo-950 font-black text-xs uppercase tracking-wider mb-4 shadow-lg">
                      {offer.badge}
                    </span>
                  )}

                  <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight">
                    {offer.title}
                  </h2>

                  {offer.subtitle && (
                    <p className="mt-3 text-sm sm:text-base text-indigo-200 max-w-xl mx-auto">
                      {offer.subtitle}
                    </p>
                  )}

                  {/* Countdown Timer */}
                  <div className="my-8 max-w-md mx-auto p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
                    <p className="text-xs font-bold uppercase tracking-wider text-amber-300 mb-2">
                      ⏰ Promo Berakhir Dalam:
                    </p>
                    <div className="flex items-center justify-center gap-3 text-center">
                      <div className="bg-slate-900/80 px-3 py-2 rounded-xl min-w-[64px]">
                        <span className="text-2xl font-black text-white">
                          {String(timeLeft.hours).padStart(2, '0')}
                        </span>
                        <div className="text-[10px] text-slate-400 font-bold uppercase">Jam</div>
                      </div>
                      <span className="text-xl font-bold text-amber-400">:</span>
                      <div className="bg-slate-900/80 px-3 py-2 rounded-xl min-w-[64px]">
                        <span className="text-2xl font-black text-white">
                          {String(timeLeft.minutes).padStart(2, '0')}
                        </span>
                        <div className="text-[10px] text-slate-400 font-bold uppercase">Menit</div>
                      </div>
                      <span className="text-xl font-bold text-amber-400">:</span>
                      <div className="bg-slate-900/80 px-3 py-2 rounded-xl min-w-[64px]">
                        <span className="text-2xl font-black text-white">
                          {String(timeLeft.seconds).padStart(2, '0')}
                        </span>
                        <div className="text-[10px] text-slate-400 font-bold uppercase">Detik</div>
                      </div>
                    </div>
                  </div>

                  {/* Pricing Box */}
                  <div className="bg-white text-slate-900 p-8 rounded-3xl shadow-2xl max-w-lg mx-auto border-2 border-amber-400 relative">
                    <div className="flex items-center justify-center gap-3">
                      <span className="text-slate-400 line-through text-lg font-bold">
                        Rp {offer.originalPrice?.toLocaleString('id-ID')}
                      </span>
                      <span className="px-2 py-0.5 bg-rose-100 text-rose-700 font-black text-xs rounded-full">
                        Hemat 50%
                      </span>
                    </div>

                    <div className="text-4xl sm:text-5xl font-black text-indigo-700 mt-2 tracking-tight">
                      Rp {offer.discountPrice?.toLocaleString('id-ID')}
                    </div>

                    {offer.scarcityText && (
                      <div className="mt-4 p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold">
                        {offer.scarcityText}
                      </div>
                    )}

                    <div className="mt-6 space-y-3">
                      <a
                        href={offer.buttonLink || '/cart'}
                        className="block w-full py-4 bg-amber-400 hover:bg-amber-300 text-indigo-950 font-black text-base rounded-2xl shadow-xl transition transform hover:scale-[1.02] active:scale-95"
                      >
                        {offer.buttonText || 'Beli Sekarang (COD / Transfer)'}
                      </a>

                      {offer.guaranteeNote && (
                        <p className="text-xs text-slate-500 font-medium">
                          {offer.guaranteeNote}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            );
          }

          // 5. TESTIMONIALS & REVIEWS SECTION
          if (section.type === 'testimonials') {
            const testimonials = section as TestimonialsSectionData;
            return (
              <section
                key={testimonials.id}
                id="testimonials"
                className="py-16 md:py-24 bg-white border-b border-slate-200"
              >
                <div className="max-w-6xl mx-auto px-4">
                  <div className="text-center max-w-2xl mx-auto mb-12">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                      Ulasan Pembeli Terverifikasi
                    </span>
                    <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mt-3">
                      {testimonials.title}
                    </h2>
                    {testimonials.subtitle && (
                      <p className="mt-2 text-sm text-slate-600">{testimonials.subtitle}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {testimonials.items.map((item) => (
                      <div
                        key={item.id}
                        className="bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between hover:shadow-md transition"
                      >
                        <div className="space-y-3">
                          {/* Stars */}
                          <div className="flex items-center gap-1 text-amber-400 text-base">
                            {'★'.repeat(item.rating)}
                            {'☆'.repeat(5 - item.rating)}
                          </div>

                          <p className="text-sm text-slate-700 leading-relaxed italic">
                            &ldquo;{item.comment}&rdquo;
                          </p>

                          {/* Review Image */}
                          {item.reviewImage && (
                            <div className="mt-3 rounded-xl overflow-hidden border border-slate-200 max-h-48">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={item.reviewImage}
                                alt="Ulasan Produk"
                                className="w-full h-auto object-cover"
                              />
                            </div>
                          )}
                        </div>

                        {/* Customer Info */}
                        <div className="mt-6 pt-4 border-t border-slate-200 flex items-center gap-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={
                              item.avatar ||
                              'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'
                            }
                            alt={item.name}
                            className="w-10 h-10 rounded-full object-cover border-2 border-indigo-200"
                          />
                          <div>
                            <div className="text-xs font-bold text-slate-900 flex items-center gap-1">
                              <span>{item.name}</span>
                              {item.isVerified && (
                                <span
                                  className="text-[10px] text-emerald-600 font-extrabold bg-emerald-50 px-1 rounded border border-emerald-200"
                                  title="Pembeli Terverifikasi"
                                >
                                  ✓ Verified
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 font-medium">
                              {item.location || 'Indonesia'} {item.date ? `· ${item.date}` : ''}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            );
          }

          // 6. FAQ SECTION
          if (section.type === 'faq') {
            const faq = section as FaqSectionData;
            return (
              <section key={faq.id} className="py-16 md:py-20 bg-slate-50 border-b border-slate-200">
                <div className="max-w-3xl mx-auto px-4">
                  <div className="text-center max-w-xl mx-auto mb-10">
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                      {faq.title}
                    </h2>
                    {faq.subtitle && (
                      <p className="mt-2 text-sm text-slate-600">{faq.subtitle}</p>
                    )}
                  </div>

                  <div className="space-y-3">
                    {faq.items.map((item) => {
                      const isOpen = openFaqId === item.id;
                      return (
                        <div
                          key={item.id}
                          className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden transition"
                        >
                          <button
                            type="button"
                            onClick={() => toggleFaq(item.id)}
                            className="w-full px-6 py-4 text-left font-bold text-slate-900 text-sm sm:text-base flex items-center justify-between gap-4 hover:text-indigo-600 transition"
                          >
                            <span>{item.question}</span>
                            <span className="text-slate-400 font-mono text-base">
                              {isOpen ? '−' : '+'}
                            </span>
                          </button>
                          {isOpen && (
                            <div className="px-6 pb-5 pt-1 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100">
                              {item.answer}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>
            );
          }

          return null;
        })}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-10 text-center text-xs text-slate-500">
        <div className="max-w-4xl mx-auto px-4 space-y-3">
          <p className="font-bold text-slate-700">{storeName}</p>
          <div className="flex items-center justify-center gap-4 text-slate-400">
            <Link href="/terms" className="hover:text-indigo-600">
              Syarat & Ketentuan
            </Link>
            <span>·</span>
            <Link href="/privacy" className="hover:text-indigo-600">
              Kebijakan Privasi
            </Link>
            <span>·</span>
            <Link href="/" className="hover:text-indigo-600">
              Katalog Toko
            </Link>
          </div>
          <p className="text-[11px] text-slate-400">
            © {new Date().getFullYear()} {storeName}. Seluruh hak cipta dilindungi.
          </p>
        </div>
      </footer>

      {/* Floating Sticky CTA Bar (Especially on mobile) */}
      {stickySection && (
        <div className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3 sm:p-4 shadow-2xl flex items-center justify-between gap-4 max-w-lg mx-auto sm:rounded-t-2xl sm:border-x">
          <div className="truncate">
            <p className="text-xs font-bold text-slate-900 truncate">
              {stickySection.text || 'Promo Terbatas Berakhir Hari Ini!'}
            </p>
            <p className="text-[10px] text-emerald-600 font-semibold">
              ✓ Garansi Uang Kembali & COD
            </p>
          </div>
          <a
            href={stickySection.buttonLink || '#offer'}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs sm:text-sm rounded-xl shadow-lg transition whitespace-nowrap active:scale-95"
          >
            {stickySection.buttonText || 'Beli Sekarang'}
          </a>
        </div>
      )}
    </div>
  );
}

