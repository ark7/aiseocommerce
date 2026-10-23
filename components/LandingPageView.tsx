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
  EventDetailsSectionData,
  SpeakersSectionData,
  EventScheduleSectionData,
  DigitalCurriculumSectionData,
  PricingTiersSectionData,
} from '@/lib/landingPageTypes';

interface LandingPageViewProps {
  landingPage: LandingPageData;
  storeName: string;
  storeDomain: string;
}

function formatIDR(amount: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatDateIndonesian(dateStr: string) {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function formatTimeIndonesian(dateStr: string) {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
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
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-500 selection:text-white pb-20">
      {/* Top Notification Bar */}
      <div className="bg-slate-900 text-white text-[11px] sm:text-xs py-2 px-4 text-center font-medium">
        <span>⚡ Penawaran Terbatas untuk </span>
        <span className="font-bold text-amber-400 underline decoration-amber-400">
          {storeName}
        </span>
        <span> · Dapatkan Diskon & Bonus Spesial Hari Ini!</span>
      </div>

      {/* Main Content Sections */}
      <main className="divide-y divide-slate-100">
        {sections.map((section) => {
          // 1. HERO SECTION
          if (section.type === 'hero') {
            const hero = section as HeroSectionData;
            return (
              <section
                key={hero.id}
                id="hero"
                className="relative overflow-hidden bg-gradient-to-b from-indigo-50/70 via-white to-slate-50 pt-12 pb-16 sm:pt-20 sm:pb-24"
              >
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                  {hero.badge && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700 mb-6 shadow-xs">
                      <span>{hero.badge}</span>
                    </div>
                  )}

                  <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-tight max-w-4xl mx-auto">
                    {hero.title}
                  </h1>

                  <p className="mt-4 sm:mt-6 text-sm sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
                    {hero.subtitle}
                  </p>

                  {/* Hero Media Preview */}
                  {hero.imageUrl && (
                    <div className="mt-8 sm:mt-12 max-w-3xl mx-auto rounded-2xl overflow-hidden shadow-2xl border-4 border-white bg-slate-100 group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={hero.imageUrl}
                        alt={hero.title}
                        className="w-full h-auto object-cover max-h-[500px] hover:scale-102 transition duration-500"
                      />
                    </div>
                  )}

                  {/* Hero CTAs */}
                  <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 max-w-md mx-auto">
                    <a
                      href={hero.ctaLink || '#offer'}
                      className="w-full sm:w-auto px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm sm:text-base rounded-xl shadow-lg shadow-indigo-600/30 transition transform hover:-translate-y-0.5 active:translate-y-0 text-center"
                    >
                      {hero.ctaText || 'Pesan Sekarang'}
                    </a>
                    {hero.secondaryCtaText && (
                      <a
                        href={hero.secondaryCtaLink || '#testimonials'}
                        className="w-full sm:w-auto px-6 py-3.5 bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm sm:text-base rounded-xl border border-slate-200 shadow-xs transition text-center"
                      >
                        {hero.secondaryCtaText}
                      </a>
                    )}
                  </div>
                </div>
              </section>
            );
          }

          // 2. SOCIAL PROOF & TRUST SECTION
          if (section.type === 'proof_trust') {
            const proof = section as ProofTrustSectionData;
            return (
              <section
                key={proof.id}
                id="proof"
                className="py-12 sm:py-16 bg-white border-y border-slate-100"
              >
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                  {/* Rating Header */}
                  <div className="text-center max-w-2xl mx-auto mb-10">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <div className="flex text-amber-400 text-lg">
                        {'★'.repeat(Math.round(proof.aggregateRating || 5))}
                      </div>
                      <span className="text-xl font-black text-slate-900">
                        {proof.aggregateRating} / 5.0
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm font-semibold text-slate-500">
                      Berdasarkan {proof.totalReviews} di seluruh Indonesia
                    </p>
                    <h2 className="text-xl sm:text-3xl font-extrabold text-slate-900 mt-2">
                      {proof.title}
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-600 mt-1">
                      {proof.subtitle}
                    </p>
                  </div>

                  {/* Highlights Stats */}
                  {proof.statHighlights && proof.statHighlights.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6 mb-12">
                      {proof.statHighlights.map((stat, i) => (
                        <div
                          key={i}
                          className="bg-slate-50 p-4 sm:p-6 rounded-2xl text-center border border-slate-100"
                        >
                          <div className="text-2xl sm:text-4xl font-black text-indigo-600">
                            {stat.value}
                          </div>
                          <div className="text-xs sm:text-sm font-bold text-slate-700 mt-1">
                            {stat.label}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Trust Badges 4 Pillars */}
                  {proof.trustBadges && proof.trustBadges.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {proof.trustBadges.map((badge, idx) => (
                        <div
                          key={idx}
                          className="p-5 rounded-2xl bg-slate-50 border border-slate-100/80 hover:border-indigo-200 transition"
                        >
                          <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center text-lg mb-3">
                            {badge.icon === 'shield' && '🛡️'}
                            {badge.icon === 'truck' && '🚚'}
                            {badge.icon === 'badge' && '🎖️'}
                            {badge.icon === 'chat' && '💬'}
                            {badge.icon === 'star' && '⭐'}
                            {badge.icon === 'check' && '✅'}
                          </div>
                          <h4 className="font-bold text-sm text-slate-900 mb-1">
                            {badge.title}
                          </h4>
                          <p className="text-xs text-slate-500 leading-relaxed">
                            {badge.desc}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Real Proof Delivery Photos */}
                  {proof.proofImages && proof.proofImages.length > 0 && (
                    <div className="mt-12">
                      <h4 className="text-center font-bold text-xs uppercase tracking-wider text-slate-400 mb-4">
                        Foto Bukti Pengiriman & Kepuasan Pelanggan
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {proof.proofImages.map((img, idx) => (
                          <div
                            key={idx}
                            className="rounded-xl overflow-hidden shadow-md border border-slate-200 bg-white"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={img.url}
                              alt={img.caption || 'Bukti Nyata'}
                              className="w-full h-48 sm:h-64 object-cover"
                            />
                            {img.caption && (
                              <p className="p-3 text-xs text-slate-600 font-medium bg-slate-50 border-t border-slate-100">
                                📸 {img.caption}
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

          // 3. FEATURES SECTION
          if (section.type === 'features') {
            const feat = section as FeaturesSectionData;
            return (
              <section
                key={feat.id}
                id="features"
                className="py-12 sm:py-20 bg-slate-50"
              >
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                  <div className="max-w-2xl mx-auto mb-12">
                    <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                      {feat.title}
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-600 mt-2">
                      {feat.subtitle}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
                    {feat.items.map((item) => (
                      <div
                        key={item.id}
                        className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80 hover:shadow-md transition"
                      >
                        <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-2xl mb-4">
                          {item.icon || '✨'}
                        </div>
                        <h3 className="font-bold text-base text-slate-900 mb-2">
                          {item.title}
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                          {item.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            );
          }

          // 4. FLASH SALE / OFFER SCARCITY SECTION
          if (section.type === 'offer') {
            const offer = section as OfferSectionData;
            const discountPct = Math.round(
              ((offer.originalPrice - offer.discountPrice) / offer.originalPrice) * 100
            );

            return (
              <section
                key={offer.id}
                id="offer"
                className="py-12 sm:py-20 bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 text-white relative overflow-hidden"
              >
                <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center relative z-10">
                  {offer.badge && (
                    <span className="inline-block px-3 py-1 bg-amber-400 text-slate-950 text-xs font-black uppercase tracking-wider rounded-full mb-4">
                      {offer.badge}
                    </span>
                  )}

                  <h2 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
                    {offer.title}
                  </h2>
                  <p className="text-xs sm:text-sm text-indigo-200 mt-2 max-w-xl mx-auto">
                    {offer.subtitle}
                  </p>

                  {/* Scarcity Countdown Timer */}
                  <div className="mt-6 flex items-center justify-center gap-2 sm:gap-3 text-slate-900">
                    <div className="bg-white px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl shadow-md min-w-[54px]">
                      <div className="text-lg sm:text-2xl font-black font-mono">
                        {String(timeLeft.hours).padStart(2, '0')}
                      </div>
                      <div className="text-[10px] uppercase font-bold text-slate-400">Jam</div>
                    </div>
                    <span className="text-white font-bold text-xl">:</span>
                    <div className="bg-white px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl shadow-md min-w-[54px]">
                      <div className="text-lg sm:text-2xl font-black font-mono">
                        {String(timeLeft.minutes).padStart(2, '0')}
                      </div>
                      <div className="text-[10px] uppercase font-bold text-slate-400">Menit</div>
                    </div>
                    <span className="text-white font-bold text-xl">:</span>
                    <div className="bg-white px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl shadow-md min-w-[54px]">
                      <div className="text-lg sm:text-2xl font-black font-mono text-rose-600">
                        {String(timeLeft.seconds).padStart(2, '0')}
                      </div>
                      <div className="text-[10px] uppercase font-bold text-slate-400">Detik</div>
                    </div>
                  </div>

                  {offer.scarcityText && (
                    <p className="text-xs sm:text-sm font-bold text-amber-300 mt-4 animate-pulse">
                      {offer.scarcityText}
                    </p>
                  )}

                  {/* Pricing Box */}
                  <div className="mt-8 bg-white text-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border-4 border-amber-400 max-w-lg mx-auto">
                    <div className="flex items-center justify-center gap-3">
                      <span className="text-sm sm:text-base text-slate-400 line-through font-semibold">
                        {formatIDR(offer.originalPrice)}
                      </span>
                      <span className="px-2 py-0.5 bg-rose-100 text-rose-700 font-extrabold text-xs rounded-full">
                        Hemat {discountPct}%
                      </span>
                    </div>

                    <div className="text-3xl sm:text-5xl font-black text-indigo-700 mt-1 mb-4">
                      {formatIDR(offer.discountPrice)}
                    </div>

                    <div className="space-y-3">
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

          // 5. TESTIMONIALS SECTION
          if (section.type === 'testimonials') {
            const testi = section as TestimonialsSectionData;
            return (
              <section
                key={testi.id}
                id="testimonials"
                className="py-12 sm:py-20 bg-white"
              >
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="text-center max-w-2xl mx-auto mb-12">
                    <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                      {testi.title}
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-600 mt-2">
                      {testi.subtitle}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {testi.items.map((item) => (
                      <div
                        key={item.id}
                        className="bg-slate-50 rounded-2xl p-6 border border-slate-200/80 flex flex-col justify-between"
                      >
                        <div>
                          {/* Rating & Verified badge */}
                          <div className="flex items-center justify-between mb-3">
                            <div className="text-amber-400 text-sm">
                              {'★'.repeat(item.rating || 5)}
                            </div>
                            {item.isVerified && (
                              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full flex items-center gap-1">
                                ✓ Pembeli Terverifikasi
                              </span>
                            )}
                          </div>

                          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed italic">
                            &ldquo;{item.comment}&rdquo;
                          </p>
                        </div>

                        {/* Customer Avatar & Info */}
                        <div className="mt-6 pt-4 border-t border-slate-200/60 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {item.avatar ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={item.avatar}
                                alt={item.name}
                                className="w-10 h-10 rounded-full object-cover border border-slate-300"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
                                {item.name?.[0] || 'U'}
                              </div>
                            )}
                            <div>
                              <h4 className="font-bold text-xs sm:text-sm text-slate-900">
                                {item.name}
                              </h4>
                              {item.location && (
                                <p className="text-[11px] text-slate-400">
                                  {item.location}
                                </p>
                              )}
                            </div>
                          </div>
                          {item.date && (
                            <span className="text-[10px] text-slate-400">
                              {item.date}
                            </span>
                          )}
                        </div>

                        {/* Optional photo sent by customer */}
                        {item.reviewImage && (
                          <div className="mt-3 rounded-lg overflow-hidden border border-slate-200">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={item.reviewImage}
                              alt="Foto Ulasan"
                              className="w-full h-36 object-cover"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            );
          }

          // 6. EVENT DETAILS SECTION (NEW)
          if (section.type === 'event_details') {
            const ev = section as EventDetailsSectionData;
            return (
              <section
                key={ev.id}
                id="event_details"
                className="py-12 sm:py-16 bg-white border-y border-slate-100"
              >
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="text-center max-w-2xl mx-auto mb-10">
                    {ev.platformBadge && (
                      <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-100 text-purple-700 mb-3">
                        {ev.platformBadge}
                      </span>
                    )}
                    <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                      {ev.title}
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-600 mt-2">
                      {ev.subtitle}
                    </p>
                  </div>

                  {/* 4 Info Metric Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 text-center">
                      <div className="text-2xl mb-2">📅</div>
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Tanggal Acara</div>
                      <div className="font-extrabold text-sm sm:text-base text-slate-900 mt-1">
                        {formatDateIndonesian(ev.eventStartDate)}
                      </div>
                    </div>

                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 text-center">
                      <div className="text-2xl mb-2">⏰</div>
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Waktu Pelaksanaan</div>
                      <div className="font-extrabold text-sm sm:text-base text-slate-900 mt-1">
                        {formatTimeIndonesian(ev.eventStartDate)} - {ev.eventEndDate ? formatTimeIndonesian(ev.eventEndDate) : 'Selesai'} {ev.timezone || 'WIB'}
                      </div>
                    </div>

                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 text-center">
                      <div className="text-2xl mb-2">
                        {ev.locationType === 'ONLINE' ? '💻' : '📍'}
                      </div>
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        {ev.locationType === 'ONLINE' ? 'Platform Online' : 'Lokasi Venue'}
                      </div>
                      <div className="font-extrabold text-sm sm:text-base text-slate-900 mt-1">
                        {ev.venueName || 'Online Webinar'}
                      </div>
                    </div>

                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 text-center">
                      <div className="text-2xl mb-2">🎟️</div>
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Status Kuota</div>
                      <div className="font-extrabold text-sm sm:text-base text-rose-600 mt-1">
                        {ev.quotaRemaining !== undefined ? `Tersisa ${ev.quotaRemaining} Kursi` : 'Pendaftaran Dibuka'}
                      </div>
                    </div>
                  </div>

                  {/* Benefits & Facilities Checklist */}
                  {ev.benefits && ev.benefits.length > 0 && (
                    <div className="bg-indigo-50/60 border border-indigo-100 rounded-3xl p-6 sm:p-8">
                      <h3 className="font-bold text-slate-900 text-sm sm:text-base mb-4 flex items-center gap-2">
                        <span>✨</span>
                        <span>Fasilitas & Keuntungan Eksklusif Peserta:</span>
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {ev.benefits.map((b, idx) => (
                          <div key={idx} className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-800">
                            <span className="text-emerald-600 font-bold">✓</span>
                            <span>{b}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </section>
            );
          }

          // 7. SPEAKERS SHOWCASE SECTION (NEW)
          if (section.type === 'speakers') {
            const spk = section as SpeakersSectionData;
            return (
              <section
                key={spk.id}
                id="speakers"
                className="py-12 sm:py-20 bg-slate-50"
              >
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="text-center max-w-2xl mx-auto mb-12">
                    <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                      {spk.title}
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-600 mt-2">
                      {spk.subtitle}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {spk.speakers.map((s) => (
                      <div
                        key={s.id}
                        className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 text-center hover:shadow-md transition flex flex-col items-center"
                      >
                        <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-indigo-100 mb-4 shadow-sm">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={s.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80'}
                            alt={s.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <h3 className="font-extrabold text-base text-slate-900">
                          {s.name}
                        </h3>
                        <p className="text-xs font-semibold text-indigo-600 mt-0.5">
                          {s.role}
                        </p>
                        {s.company && (
                          <p className="text-[11px] text-slate-400 font-medium">
                            {s.company}
                          </p>
                        )}
                        {s.bio && (
                          <p className="text-xs text-slate-600 mt-3 leading-relaxed border-t border-slate-100 pt-3">
                            {s.bio}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            );
          }

          // 8. EVENT SCHEDULE / RUNDOWN SECTION (NEW)
          if (section.type === 'event_schedule') {
            const sch = section as EventScheduleSectionData;
            return (
              <section
                key={sch.id}
                id="event_schedule"
                className="py-12 sm:py-20 bg-white"
              >
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="text-center max-w-2xl mx-auto mb-12">
                    <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                      {sch.title}
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-600 mt-2">
                      {sch.subtitle}
                    </p>
                    {sch.dateLabel && (
                      <span className="inline-block mt-3 px-3 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg">
                        🗓️ {sch.dateLabel}
                      </span>
                    )}
                  </div>

                  <div className="space-y-4">
                    {sch.sessions.map((sess, idx) => (
                      <div
                        key={sess.id}
                        className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-start gap-4 hover:border-indigo-200 transition"
                      >
                        <div className="sm:w-36 flex-shrink-0">
                          <span className="inline-block px-2.5 py-1 bg-indigo-100 text-indigo-700 font-mono text-xs font-bold rounded-md">
                            ⏰ {sess.time}
                          </span>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-extrabold text-sm sm:text-base text-slate-900">
                            {sess.title}
                          </h4>
                          {sess.speaker && (
                            <p className="text-xs text-indigo-600 font-semibold mt-0.5">
                              Pembicara: {sess.speaker}
                            </p>
                          )}
                          {sess.description && (
                            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                              {sess.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            );
          }

          // 9. DIGITAL CURRICULUM / SILABUS SECTION (NEW)
          if (section.type === 'digital_curriculum') {
            const cur = section as DigitalCurriculumSectionData;
            return (
              <section
                key={cur.id}
                id="digital_curriculum"
                className="py-12 sm:py-20 bg-slate-50"
              >
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="text-center max-w-2xl mx-auto mb-10">
                    <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                      {cur.title}
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-600 mt-2">
                      {cur.subtitle}
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                      {cur.totalModulesText && (
                        <span className="px-3 py-1 bg-indigo-100 text-indigo-800 text-xs font-bold rounded-full">
                          📚 {cur.totalModulesText}
                        </span>
                      )}
                      {cur.downloadInfoBadge && (
                        <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full">
                          ⚡ {cur.downloadInfoBadge}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    {cur.modules.map((m, idx) => (
                      <div
                        key={m.id}
                        className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                          <h4 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-bold">
                              {idx + 1}
                            </span>
                            <span>{m.title}</span>
                          </h4>
                          <div className="flex items-center gap-2">
                            {m.isFreePreview && (
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded">
                                Gratis Preview
                              </span>
                            )}
                            {m.durationOrPages && (
                              <span className="text-xs font-mono text-slate-400">
                                {m.durationOrPages}
                              </span>
                            )}
                          </div>
                        </div>

                        {m.description && (
                          <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                            {m.description}
                          </p>
                        )}

                        {m.topics && m.topics.length > 0 && (
                          <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-2">
                            {m.topics.map((t, tIdx) => (
                              <span
                                key={tIdx}
                                className="px-2 py-1 bg-slate-50 text-slate-700 text-[11px] rounded-md font-medium border border-slate-200/60"
                              >
                                • {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            );
          }

          // 10. PRICING TIERS / TIKET & LISENSI SECTION (NEW)
          if (section.type === 'pricing_tiers') {
            const tiers = section as PricingTiersSectionData;
            return (
              <section
                key={tiers.id}
                id="pricing_tiers"
                className="py-12 sm:py-20 bg-white"
              >
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="text-center max-w-2xl mx-auto mb-12">
                    <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                      {tiers.title}
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-600 mt-2">
                      {tiers.subtitle}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
                    {tiers.tiers.map((t) => (
                      <div
                        key={t.id}
                        className={`rounded-3xl p-6 sm:p-8 flex flex-col justify-between transition ${
                          t.isPopular
                            ? 'bg-gradient-to-b from-indigo-50 to-white border-2 border-indigo-600 shadow-xl relative'
                            : 'bg-slate-50 border border-slate-200/80 shadow-xs hover:shadow-md'
                        }`}
                      >
                        {t.isPopular && (
                          <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-indigo-600 text-white text-[11px] font-extrabold uppercase tracking-wider rounded-full shadow-md">
                            {t.badge || 'Paling Populer'}
                          </span>
                        )}

                        <div>
                          {!t.isPopular && t.badge && (
                            <span className="inline-block px-2.5 py-0.5 bg-slate-200 text-slate-700 text-[10px] font-bold uppercase rounded mb-2">
                              {t.badge}
                            </span>
                          )}

                          <h3 className="font-black text-lg text-slate-900 mt-1">
                            {t.name}
                          </h3>
                          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                            {t.description}
                          </p>

                          <div className="mt-4 mb-6">
                            {t.originalPrice && (
                              <div className="text-xs text-slate-400 line-through">
                                {formatIDR(t.originalPrice)}
                              </div>
                            )}
                            <div className="text-3xl font-black text-slate-900">
                              {formatIDR(t.price)}
                            </div>
                          </div>

                          <div className="space-y-2.5 border-t border-slate-200/60 pt-4 mb-6">
                            {t.features.map((feat, fIdx) => (
                              <div key={fIdx} className="flex items-start gap-2 text-xs sm:text-sm text-slate-700">
                                <span className="text-emerald-600 font-bold mt-0.5">✓</span>
                                <span>{feat}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <a
                          href={t.buttonLink || '/cart'}
                          className={`w-full py-3.5 text-center font-bold text-sm rounded-xl transition shadow-md block ${
                            t.isPopular
                              ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                              : 'bg-slate-900 hover:bg-slate-800 text-white'
                          }`}
                        >
                          {t.buttonText || 'Beli Paket Ini'}
                        </a>
                      </div>
                    ))}
                  </div>

                  {tiers.guaranteeText && (
                    <p className="text-center text-xs text-slate-500 mt-8 font-medium">
                      {tiers.guaranteeText}
                    </p>
                  )}
                </div>
              </section>
            );
          }

          // 11. FAQ SECTION
          if (section.type === 'faq') {
            const faq = section as FaqSectionData;
            return (
              <section
                key={faq.id}
                id="faq"
                className="py-12 sm:py-20 bg-slate-50"
              >
                <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="text-center mb-12">
                    <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                      {faq.title}
                    </h2>
                    {faq.subtitle && (
                      <p className="text-xs sm:text-sm text-slate-600 mt-2">
                        {faq.subtitle}
                      </p>
                    )}
                  </div>

                  <div className="space-y-3">
                    {faq.items.map((item) => {
                      const isOpen = openFaqId === item.id;
                      return (
                        <div
                          key={item.id}
                          className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs transition"
                        >
                          <button
                            type="button"
                            onClick={() => toggleFaq(item.id)}
                            className="w-full px-6 py-4 text-left font-bold text-xs sm:text-sm text-slate-900 flex items-center justify-between gap-4 hover:bg-slate-50"
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
              ✓ Garansi Resmi & Akses Cepat
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
