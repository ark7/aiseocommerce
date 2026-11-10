'use client';

import { useState, useEffect, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import {
  ADMIN_GUIDE_CHAPTERS,
  getGuideChapterForPath,
  GuideChapter,
} from '@/lib/adminGuideContent';

interface AdminGuideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpen: () => void;
}

export default function AdminGuideDrawer({
  isOpen,
  onClose,
  onOpen,
}: AdminGuideDrawerProps) {
  const pathname = usePathname();

  // Find the natural chapter for the active route
  const currentPathChapter = useMemo(() => {
    return getGuideChapterForPath(pathname);
  }, [pathname]);

  // Selected chapter can be switched manually by user via dropdown
  const [selectedChapterId, setSelectedChapterId] = useState<string>(
    currentPathChapter.id
  );

  // Sync selected chapter when user navigates to a new route
  useEffect(() => {
    setSelectedChapterId(currentPathChapter.id);
  }, [currentPathChapter.id]);

  const activeChapter: GuideChapter = useMemo(() => {
    return (
      ADMIN_GUIDE_CHAPTERS.find((ch) => ch.id === selectedChapterId) ||
      currentPathChapter
    );
  }, [selectedChapterId, currentPathChapter]);

  // Tab navigation inside drawer
  const [activeTab, setActiveTab] = useState<'steps' | 'tips' | 'faq'>('steps');
  const [searchQuery, setSearchQuery] = useState('');

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Filtered steps based on search query
  const filteredSteps = useMemo(() => {
    if (!searchQuery.trim()) return activeChapter.steps;
    const query = searchQuery.toLowerCase();
    return activeChapter.steps.filter(
      (s) =>
        s.title.toLowerCase().includes(query) ||
        s.desc.toLowerCase().includes(query)
    );
  }, [activeChapter.steps, searchQuery]);

  // Filtered faqs based on search query
  const filteredFaqs = useMemo(() => {
    if (!searchQuery.trim()) return activeChapter.faqs;
    const query = searchQuery.toLowerCase();
    return activeChapter.faqs.filter(
      (f) =>
        f.q.toLowerCase().includes(query) || f.a.toLowerCase().includes(query)
    );
  }, [activeChapter.faqs, searchQuery]);

  return (
    <>
      {/* 1. Tab Melayang di Sisi Kanan Layar (Right-Edge Trigger Button) */}
      {!isOpen && (
        <button
          onClick={onOpen}
          aria-label="Buka Panduan Menu Ini"
          title={`Buka Panduan Pengguna: ${activeChapter.menuName}`}
          className="fixed right-0 top-1/2 -translate-y-1/2 z-40 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white py-3.5 px-2 rounded-l-2xl shadow-xl hover:shadow-2xl border-l border-t border-b border-white/20 flex flex-col items-center gap-1.5 transition-all duration-300 hover:pr-3.5 group cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-emerald-400"
        >
          <span className="text-base group-hover:scale-110 transition-transform">
            {activeChapter.icon || '📖'}
          </span>
          <span className="[writing-mode:vertical-rl] rotate-180 font-bold tracking-widest text-[11px] uppercase">
            PANDUAN
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-ping" />
        </button>
      )}

      {/* 2. Slide-Over Backdrop (Khusus Layar Mobile) */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 md:hidden transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* 3. Panel Sisi Kanan (Right-Side Drawer) */}
      <aside
        aria-label="Panel Panduan Pengguna Admin"
        className={`fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] md:w-[540px] bg-white dark:bg-slate-900 shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800 transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header Drawer */}
        <div className="px-5 py-4 bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900 text-white flex flex-col gap-3 shadow-md shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-lg shadow-inner">
                {activeChapter.icon}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-sm tracking-tight text-white">
                    Panduan Pengguna Admin
                  </h2>
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 border border-emerald-400/30">
                    {activeChapter.badge}
                  </span>
                </div>
                <p className="text-[11px] text-emerald-200/90 truncate max-w-[280px]">
                  Menu Aktif: <span className="font-semibold text-white">{activeChapter.menuName}</span>
                </p>
              </div>
            </div>

            {/* Tombol Hide / Tutup */}
            <button
              onClick={onClose}
              title="Tutup Panduan (Esc)"
              className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
              aria-label="Tutup Panduan"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Bab Switcher Dropdown */}
          <div className="flex items-center gap-2 bg-white/10 rounded-xl p-1.5 border border-white/10 text-xs">
            <span className="text-emerald-200 font-medium pl-1 shrink-0">Pilih Bab:</span>
            <select
              value={selectedChapterId}
              onChange={(e) => setSelectedChapterId(e.target.value)}
              className="w-full bg-transparent text-white font-semibold text-xs border-0 focus:ring-0 focus:outline-hidden cursor-pointer [&>option]:bg-slate-900 [&>option]:text-white"
            >
              {ADMIN_GUIDE_CHAPTERS.map((ch) => (
                <option key={ch.id} value={ch.id}>
                  {ch.icon} {ch.menuName} — {ch.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Ringkasan Fungsi Menu */}
        <div className="p-4 bg-emerald-50/80 dark:bg-emerald-950/40 border-b border-emerald-100 dark:border-emerald-900/50 flex items-start gap-3 shrink-0">
          <span className="text-xl shrink-0">💡</span>
          <div>
            <h3 className="text-xs font-bold text-emerald-950 dark:text-emerald-200 mb-0.5">
              {activeChapter.title}
            </h3>
            <p className="text-xs text-emerald-900/80 dark:text-emerald-300/80 leading-relaxed">
              {activeChapter.summary}
            </p>
          </div>
        </div>

        {/* Search & Tabs Navigation */}
        <div className="px-5 pt-3 pb-2 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
          {/* Quick Search */}
          <div className="relative mb-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari topik panduan ini (mis: resi, PO, promo)..."
              className="w-full text-xs pl-8 pr-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
            />
            <svg
              className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 -mb-2 space-x-4 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('steps')}
              className={`pb-2.5 transition-colors cursor-pointer border-b-2 ${
                activeTab === 'steps'
                  ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-bold'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              📋 Langkah Kerja ({activeChapter.steps.length})
            </button>
            <button
              onClick={() => setActiveTab('tips')}
              className={`pb-2.5 transition-colors cursor-pointer border-b-2 ${
                activeTab === 'tips'
                  ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-bold'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              💡 Tips & Peringatan ({activeChapter.tips.length + activeChapter.warnings.length})
            </button>
            <button
              onClick={() => setActiveTab('faq')}
              className={`pb-2.5 transition-colors cursor-pointer border-b-2 ${
                activeTab === 'faq'
                  ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-bold'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              ❓ FAQ ({activeChapter.faqs.length})
            </button>
          </div>
        </div>

        {/* Drawer Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* TAB 1: STEPS */}
          {activeTab === 'steps' && (
            <div className="space-y-3.5">
              {filteredSteps.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  Tidak ada langkah yang cocok dengan kata kunci &quot;{searchQuery}&quot;
                </div>
              ) : (
                filteredSteps.map((step, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all shadow-2xs"
                  >
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 mb-1 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 inline-flex items-center justify-center text-[10px] font-bold">
                        {idx + 1}
                      </span>
                      <span>{step.title.replace(/^\d+\.\s*/, '')}</span>
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pl-6.5">
                      {step.desc}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 2: TIPS & WARNINGS */}
          {activeTab === 'tips' && (
            <div className="space-y-4">
              {/* Warnings / Peringatan Penting */}
              {activeChapter.warnings.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1 px-1">
                    <span>⚠️</span>
                    <span>Peringatan Keamanan & Batasan:</span>
                  </h4>
                  {activeChapter.warnings.map((warn, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-200 leading-relaxed flex items-start gap-2"
                    >
                      <span className="text-amber-600 font-bold shrink-0">•</span>
                      <span>{warn}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Tips Praktis */}
              <div className="space-y-2">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1 px-1">
                  <span>💡</span>
                  <span>Tips Praktis Mempercepat Kerja:</span>
                </h4>
                {activeChapter.tips.map((tip, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/50 text-xs text-emerald-900 dark:text-emerald-200 leading-relaxed flex items-start gap-2"
                  >
                    <span className="text-emerald-600 font-bold shrink-0">✓</span>
                    <span>{tip}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: FAQ */}
          {activeTab === 'faq' && (
            <div className="space-y-3">
              {filteredFaqs.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  Tidak ada FAQ yang cocok dengan kata kunci &quot;{searchQuery}&quot;
                </div>
              ) : (
                filteredFaqs.map((faq, idx) => (
                  <details
                    key={idx}
                    open={idx === 0}
                    className="group rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 p-3.5 transition-colors cursor-pointer"
                  >
                    <summary className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between list-none">
                      <span className="flex items-center gap-1.5">
                        <span className="text-emerald-600">Q:</span>
                        <span>{faq.q}</span>
                      </span>
                      <span className="text-slate-400 group-open:rotate-180 transition-transform">
                        ▼
                      </span>
                    </summary>
                    <p className="mt-2.5 pt-2 border-t border-slate-200/80 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-300 leading-relaxed pl-5">
                      <span className="font-semibold text-emerald-700 dark:text-emerald-400">A: </span>
                      {faq.a}
                    </p>
                  </details>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer Drawer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs shrink-0">
          <div className="text-slate-500 dark:text-slate-400 text-[11px]">
            <span>Didukung oleh </span>
            <strong className="text-slate-700 dark:text-slate-200">LarisManis.online</strong>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition"
            >
              Sembunyikan
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

