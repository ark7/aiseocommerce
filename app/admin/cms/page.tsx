'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getDefaultTerms, getDefaultPrivacy, DEFAULT_COOKIE_TITLE, DEFAULT_COOKIE_TEXT } from '@/lib/legalDefaults';
import LandingPageBuilder from '@/components/LandingPageBuilder';
import { LandingPageData } from '@/lib/landingPageTypes';

type CmsTab = 'landing-pages' | 'hero' | 'terms' | 'privacy' | 'cookie' | 'about' | 'articles';

interface HeroData {
  heroBadge: string;
  heroTitle: string;
  heroSubtitle: string;
  heroCtaText: string;
  heroCtaLink: string;
  heroCtaSecondaryText: string;
  heroCtaSecondaryLink: string;
  heroImageUrl: string;
}

interface LegalData {
  termsContent: string;
  privacyContent: string;
  cookieConsentEnabled: boolean;
  cookieConsentTitle: string;
  cookieConsentText: string;
}

interface AboutData {
  name: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  socialLinks: {
    instagram?: string;
    facebook?: string;
    tiktok?: string;
    youtube?: string;
    whatsapp?: string;
  };
}

export default function AdminCmsPage() {
  const [activeTab, setActiveTab] = useState<CmsTab>('landing-pages');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [articleCount, setArticleCount] = useState<number>(0);

  // Landing Page Builder States
  const [landingPages, setLandingPages] = useState<LandingPageData[]>([]);
  const [editingLp, setEditingLp] = useState<LandingPageData | null>(null);
  const [isCreatingLp, setIsCreatingLp] = useState(false);
  const [savingLp, setSavingLp] = useState(false);

  const [heroForm, setHeroForm] = useState<HeroData>({
    heroBadge: 'Koleksi Terbaru 2026',
    heroTitle: 'Tampil Percaya Diri dengan Produk Terbaik',
    heroSubtitle: 'Temukan pilihan produk berkualitas tinggi dengan penawaran eksklusif dan jaminan original.',
    heroCtaText: 'Mulai Belanja',
    heroCtaLink: '/products',
    heroCtaSecondaryText: 'Artikel & Panduan',
    heroCtaSecondaryLink: '/articles',
    heroImageUrl: '',
  });

  const [legalForm, setLegalForm] = useState<LegalData>({
    termsContent: '',
    privacyContent: '',
    cookieConsentEnabled: true,
    cookieConsentTitle: DEFAULT_COOKIE_TITLE,
    cookieConsentText: '',
  });

  const [aboutForm, setAboutForm] = useState<AboutData>({
    name: '',
    tagline: '',
    address: '',
    phone: '',
    email: '',
    socialLinks: {},
  });

  const authHeaders = useCallback((): Record<string, string> => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  const loadAllCmsData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const headers = authHeaders();

      // 1. Load General & Hero
      const resGeneral = await fetch('/api/admin/settings/general', { headers });
      if (resGeneral.ok) {
        const data = await resGeneral.json();
        const s = data.settings || {};
        const st = data.store || {};

        setHeroForm({
          heroBadge: s.heroBadge || 'Koleksi Terbaru 2026',
          heroTitle: s.heroTitle || 'Tampil Percaya Diri dengan Produk Terbaik',
          heroSubtitle: s.heroSubtitle || 'Temukan pilihan produk berkualitas tinggi dengan penawaran eksklusif.',
          heroCtaText: s.heroCtaText || 'Mulai Belanja',
          heroCtaLink: s.heroCtaLink || '/products',
          heroCtaSecondaryText: s.heroCtaSecondaryText || 'Artikel & Panduan',
          heroCtaSecondaryLink: s.heroCtaSecondaryLink || '/articles',
          heroImageUrl: s.heroImageUrl || '',
        });

        setAboutForm({
          name: st.name || '',
          tagline: s.tagline || '',
          address: st.address || '',
          phone: st.phone || '',
          email: st.email || '',
          socialLinks: s.socialLinks || {},
        });
      }

      // 2. Load Legal & Cookie
      const resLegal = await fetch('/api/admin/settings/legal', { headers });
      if (resLegal.ok) {
        const data = await resLegal.json();
        const s = data.settings || {};
        setLegalForm({
          termsContent: s.termsContent || '',
          privacyContent: s.privacyContent || '',
          cookieConsentEnabled: s.cookieConsentEnabled ?? true,
          cookieConsentTitle: s.cookieConsentTitle || DEFAULT_COOKIE_TITLE,
          cookieConsentText: s.cookieConsentText || '',
        });
      }

      // 3. Load Article Count
      const resArticles = await fetch('/api/articles', { headers });
      if (resArticles.ok) {
        const data = await resArticles.json();
        setArticleCount(data.articles?.length || 0);
      }

      // 4. Load Commercial Landing Pages
      const resLp = await fetch('/api/admin/landing-pages', { headers });
      if (resLp.ok) {
        const data = await resLp.json();
        setLandingPages(data.landingPages || []);
      }
    } catch (err: any) {
      setError(err.message || 'Gagal memuat data CMS.');
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => {
    loadAllCmsData();
  }, [loadAllCmsData]);

  const saveHero = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch('/api/admin/settings/general', {
        method: 'PUT',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(heroForm),
      });
      if (!res.ok) throw new Error('Gagal menyimpan Hero Banner');
      setNotice('Banner Beranda & Hero Section berhasil disimpan!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const saveLegal = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch('/api/admin/settings/legal', {
        method: 'PUT',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(legalForm),
      });
      if (!res.ok) throw new Error('Gagal menyimpan dokumen legal');
      setNotice('Dokumen Syarat & Ketentuan, Privasi, serta Cookie Consent berhasil diperbarui!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const saveAbout = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch('/api/admin/settings/general', {
        method: 'PUT',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(aboutForm),
      });
      if (!res.ok) throw new Error('Gagal menyimpan Profil Toko');
      setNotice('Profil toko dan informasi kontak berhasil diperbarui!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveLp = async (lpData: LandingPageData) => {
    setSavingLp(true);
    setError(null);
    setNotice(null);
    try {
      const isEdit = Boolean(lpData.id);
      const url = isEdit ? `/api/admin/landing-pages/${lpData.id}` : '/api/admin/landing-pages';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(lpData),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || json.error || 'Gagal menyimpan landing page');
      }

      setNotice(`Landing page "${lpData.title}" berhasil disimpan! Sitemap.xml dan cache telah diperbarui secara otomatis.`);
      setIsCreatingLp(false);
      setEditingLp(null);
      await loadAllCmsData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingLp(false);
    }
  };

  const handleDeleteLp = async (id: string, title: string) => {
    if (!confirm(`Yakin ingin menghapus landing page "${title}"? Halaman ini otomatis dibersihkan dari sitemap.xml.`)) {
      return;
    }
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/admin/landing-pages/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Gagal menghapus landing page');
      }
      setNotice(`Landing page "${title}" berhasil dihapus dan sitemap.xml telah diperbarui.`);
      await loadAllCmsData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-5xl mx-auto flex items-center justify-center min-h-[400px]">
        <div className="flex items-center space-x-3 text-gray-500">
          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <span>Memuat modul CMS & Konten Web...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-2xl">📝</span>
            <h1 className="text-2xl font-bold text-gray-900">Content Management System (CMS)</h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Pusat penulisan dan pengelolaan seluruh konten web: Banner Beranda, Syarat & Ketentuan, Kebijakan Privasi, dan Izin Cookie.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Link
            href="/"
            target="_blank"
            className="px-3.5 py-2 text-xs font-semibold rounded-lg border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 transition shadow-xs flex items-center space-x-1"
          >
            <span>Lihat Etalase Toko</span>
            <span>↗</span>
          </Link>
          <Link
            href="/admin/articles"
            className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition shadow-xs flex items-center space-x-1"
          >
            <span>Kelola Artikel ({articleCount})</span>
            <span>&rarr;</span>
          </Link>
        </div>
      </div>

      {/* Notifications */}
      {notice && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-sm flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-2">
            <span>✅</span>
            <span>{notice}</span>
          </div>
          <button onClick={() => setNotice(null)} className="text-emerald-600 hover:text-emerald-800 font-bold">&times;</button>
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl text-sm flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-600 hover:text-red-800 font-bold">&times;</button>
        </div>
      )}

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <button
          type="button"
          onClick={() => { setActiveTab('landing-pages'); setIsCreatingLp(false); setEditingLp(null); }}
          className={`p-4 rounded-xl border text-left transition ${
            activeTab === 'landing-pages' ? 'border-indigo-600 bg-indigo-50/50 shadow-sm' : 'border-gray-200 bg-white hover:border-gray-300'
          }`}
        >
          <span className="text-xl">🚀</span>
          <h2 className="text-sm font-bold text-gray-900 mt-2">Landing Pages</h2>
          <p className="text-xs text-indigo-600 font-semibold mt-0.5">{landingPages.length} Halaman Siap Jual</p>
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab('hero'); setIsCreatingLp(false); setEditingLp(null); }}
          className={`p-4 rounded-xl border text-left transition ${
            activeTab === 'hero' ? 'border-indigo-600 bg-indigo-50/50 shadow-sm' : 'border-gray-200 bg-white hover:border-gray-300'
          }`}
        >
          <span className="text-xl">🌟</span>
          <h2 className="text-sm font-bold text-gray-900 mt-2">Hero Banner</h2>
          <p className="text-xs text-gray-500 mt-0.5 truncate">{heroForm.heroTitle || 'Belum diisi'}</p>
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab('terms'); setIsCreatingLp(false); setEditingLp(null); }}
          className={`p-4 rounded-xl border text-left transition ${
            activeTab === 'terms' ? 'border-indigo-600 bg-indigo-50/50 shadow-sm' : 'border-gray-200 bg-white hover:border-gray-300'
          }`}
        >
          <span className="text-xl">📜</span>
          <h2 className="text-sm font-bold text-gray-900 mt-2">Syarat & Ketentuan</h2>
          <p className="text-xs text-gray-500 mt-0.5">{legalForm.termsContent ? 'Kustom aktif' : 'Template bawaan'}</p>
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab('privacy'); setIsCreatingLp(false); setEditingLp(null); }}
          className={`p-4 rounded-xl border text-left transition ${
            activeTab === 'privacy' ? 'border-indigo-600 bg-indigo-50/50 shadow-sm' : 'border-gray-200 bg-white hover:border-gray-300'
          }`}
        >
          <span className="text-xl">🔒</span>
          <h2 className="text-sm font-bold text-gray-900 mt-2">Kebijakan Privasi</h2>
          <p className="text-xs text-gray-500 mt-0.5">{legalForm.privacyContent ? 'Kustom aktif' : 'Standar UU PDP'}</p>
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab('cookie'); setIsCreatingLp(false); setEditingLp(null); }}
          className={`p-4 rounded-xl border text-left transition ${
            activeTab === 'cookie' ? 'border-indigo-600 bg-indigo-50/50 shadow-sm' : 'border-gray-200 bg-white hover:border-gray-300'
          }`}
        >
          <span className="text-xl">🍪</span>
          <h2 className="text-sm font-bold text-gray-900 mt-2">Izin Cookie</h2>
          <p className="text-xs text-gray-500 mt-0.5">{legalForm.cookieConsentEnabled ? '🟢 Banner Aktif' : '⚪ Nonaktif'}</p>
        </button>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex border-b border-gray-200 space-x-2 md:space-x-6 overflow-x-auto pb-1 text-sm font-medium">
        <button
          onClick={() => { setActiveTab('landing-pages'); setIsCreatingLp(false); setEditingLp(null); }}
          className={`py-3 px-2 border-b-2 whitespace-nowrap transition ${
            activeTab === 'landing-pages' ? 'border-indigo-600 text-indigo-600 font-bold' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          🚀 Landing Page Builder ({landingPages.length})
        </button>
        <button
          onClick={() => { setActiveTab('hero'); setIsCreatingLp(false); setEditingLp(null); }}
          className={`py-3 px-2 border-b-2 whitespace-nowrap transition ${
            activeTab === 'hero' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          🌟 Hero Banner Beranda
        </button>
        <button
          onClick={() => { setActiveTab('terms'); setIsCreatingLp(false); setEditingLp(null); }}
          className={`py-3 px-2 border-b-2 whitespace-nowrap transition ${
            activeTab === 'terms' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          📜 Syarat & Ketentuan
        </button>
        <button
          onClick={() => { setActiveTab('privacy'); setIsCreatingLp(false); setEditingLp(null); }}
          className={`py-3 px-2 border-b-2 whitespace-nowrap transition ${
            activeTab === 'privacy' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          🔒 Kebijakan Privasi
        </button>
        <button
          onClick={() => { setActiveTab('cookie'); setIsCreatingLp(false); setEditingLp(null); }}
          className={`py-3 px-2 border-b-2 whitespace-nowrap transition ${
            activeTab === 'cookie' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          🍪 Pemberitahuan Cookie
        </button>
        <button
          onClick={() => { setActiveTab('about'); setIsCreatingLp(false); setEditingLp(null); }}
          className={`py-3 px-2 border-b-2 whitespace-nowrap transition ${
            activeTab === 'about' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          🏢 Profil & Kontak Toko
        </button>
        <button
          onClick={() => { setActiveTab('articles'); setIsCreatingLp(false); setEditingLp(null); }}
          className={`py-3 px-2 border-b-2 whitespace-nowrap transition ${
            activeTab === 'articles' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          📰 Panduan & Artikel Blog
        </button>
      </div>

      {/* BUILDER EDITOR MODE */}
      {(isCreatingLp || editingLp !== null) && (
        <LandingPageBuilder
          initialData={editingLp}
          onSave={handleSaveLp}
          onCancel={() => {
            setIsCreatingLp(false);
            setEditingLp(null);
          }}
          saving={savingLp}
        />
      )}

      {/* TAB 0: LANDING PAGES OVERVIEW (When not in editor mode) */}
      {!isCreatingLp && editingLp === null && activeTab === 'landing-pages' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Landing Page Komersial & Promo</h2>
              <p className="text-xs text-gray-500 mt-1">
                Buat landing page berkonversi tinggi dengan ulasan, rating, bukti kepercayaan, hitung mundur scarcity, dan auto-sync ke sitemap.xml.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditingLp(null);
                setIsCreatingLp(true);
              }}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5 self-start sm:self-auto"
            >
              <span>+</span>
              <span>Buat Landing Page Baru</span>
            </button>
          </div>

          {landingPages.length === 0 ? (
            <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center space-y-4">
              <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center text-3xl mx-auto">
                🚀
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="text-base font-bold text-gray-900">Belum Ada Landing Page Komersial</h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Mulai buat landing page promosi produk pertama Anda untuk meningkatkan penjualan dengan ulasan terverifikasi dan SEO path kustom.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingLp(null);
                  setIsCreatingLp(true);
                }}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition"
              >
                + Mulai Buat Sekarang
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 text-gray-600 font-semibold uppercase tracking-wider border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3.5">Halaman & URL Slug</th>
                      <th className="px-6 py-3.5">Sections</th>
                      <th className="px-6 py-3.5">Status SEO & Sitemap</th>
                      <th className="px-6 py-3.5">Produk Terkait</th>
                      <th className="px-6 py-3.5">Terakhir Diperbarui</th>
                      <th className="px-6 py-3.5 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {landingPages.map((lp) => (
                      <tr key={lp.id} className="hover:bg-gray-50/80 transition">
                        <td className="px-6 py-4">
                          <div className="font-bold text-gray-900 text-sm">{lp.title}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="font-mono text-indigo-600 font-medium bg-indigo-50 px-2 py-0.5 rounded text-[11px]">
                              /lp/{lp.slug}
                            </span>
                            <a
                              href={`/lp/${lp.slug}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-gray-400 hover:text-indigo-600 transition"
                              title="Buka halaman publik di tab baru"
                            >
                              ↗
                            </a>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-600 font-medium">
                          <span className="inline-block px-2 py-1 bg-slate-100 rounded text-slate-700 font-semibold">
                            {Array.isArray(lp.sections) ? lp.sections.length : 0} Blok
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {lp.isPublished ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                              Terbit di Sitemap (0.9)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-600">
                              Draft (Nonaktif)
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-gray-700 font-medium">
                          {lp.product?.name ? (
                            <span className="text-gray-900 truncate max-w-xs block font-semibold">
                              🛍️ {lp.product.name}
                            </span>
                          ) : (
                            <span className="text-gray-400 italic">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                          {lp.updatedAt ? new Date(lp.updatedAt).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          }) : '-'}
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            <a
                              href={`/lp/${lp.slug}`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2.5 py-1 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded font-semibold text-xs transition"
                            >
                              👁️ Pratinjau
                            </a>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingLp(lp);
                                setIsCreatingLp(false);
                              }}
                              className="px-2.5 py-1 text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 rounded font-semibold text-xs transition"
                            >
                              ✏️ Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => lp.id && handleDeleteLp(lp.id, lp.title)}
                              className="px-2.5 py-1 text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 rounded font-semibold text-xs transition"
                            >
                              🗑️ Hapus
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 1: HERO BANNER BUILDER */}
      {activeTab === 'hero' && (
        <form onSubmit={saveHero} className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
            <div className="border-b border-gray-100 pb-4">
              <h2 className="text-lg font-bold text-gray-900">Hero Section Beranda</h2>
              <p className="text-xs text-gray-500 mt-1">
                Teks promosi, tombol aksi (Call to Action), dan visual utama yang pertama kali dilihat pembeli saat membuka website Anda.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">Badge Header</label>
                <input
                  type="text"
                  value={heroForm.heroBadge}
                  onChange={(e) => setHeroForm({ ...heroForm, heroBadge: e.target.value })}
                  placeholder="Misal: Promo Ramadhan 2026 atau Koleksi Terbaru"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">URL Gambar Banner (Hero Image)</label>
                <input
                  type="text"
                  value={heroForm.heroImageUrl}
                  onChange={(e) => setHeroForm({ ...heroForm, heroImageUrl: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">Judul Utama (Hero Headline)</label>
              <input
                type="text"
                value={heroForm.heroTitle}
                onChange={(e) => setHeroForm({ ...heroForm, heroTitle: e.target.value })}
                placeholder="Tampil Percaya Diri dengan Produk Terbaik"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">Sub-judul / Penjelasan Promo</label>
              <textarea
                rows={3}
                value={heroForm.heroSubtitle}
                onChange={(e) => setHeroForm({ ...heroForm, heroSubtitle: e.target.value })}
                placeholder="Deskripsi singkat yang meyakinkan pembeli..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-gray-100">
              <div className="space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-200">
                <span className="text-xs font-bold text-gray-700 block">Tombol Aksi Utama (Primary CTA)</span>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Teks Tombol</label>
                  <input
                    type="text"
                    value={heroForm.heroCtaText}
                    onChange={(e) => setHeroForm({ ...heroForm, heroCtaText: e.target.value })}
                    placeholder="Mulai Belanja"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Tujuan Link (URL)</label>
                  <input
                    type="text"
                    value={heroForm.heroCtaLink}
                    onChange={(e) => setHeroForm({ ...heroForm, heroCtaLink: e.target.value })}
                    placeholder="/products"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-200">
                <span className="text-xs font-bold text-gray-700 block">Tombol Aksi Sekunder (Secondary CTA)</span>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Teks Tombol</label>
                  <input
                    type="text"
                    value={heroForm.heroCtaSecondaryText}
                    onChange={(e) => setHeroForm({ ...heroForm, heroCtaSecondaryText: e.target.value })}
                    placeholder="Artikel & Rekomendasi"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Tujuan Link (URL)</label>
                  <input
                    type="text"
                    value={heroForm.heroCtaSecondaryLink}
                    onChange={(e) => setHeroForm({ ...heroForm, heroCtaSecondaryLink: e.target.value })}
                    placeholder="/articles"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Live Hero Preview */}
            <div className="pt-4 border-t border-gray-100">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-3">
                Pratinjau Visual Hero Section:
              </span>
              <div className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-900 rounded-2xl p-6 md:p-8 text-white shadow-md relative overflow-hidden">
                <div className="max-w-xl space-y-3 relative z-10">
                  {heroForm.heroBadge && (
                    <span className="inline-block bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold text-indigo-100">
                      {heroForm.heroBadge}
                    </span>
                  )}
                  <h3 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                    {heroForm.heroTitle || 'Judul Banner Toko'}
                  </h3>
                  <p className="text-xs md:text-sm text-indigo-100 leading-relaxed line-clamp-3">
                    {heroForm.heroSubtitle || 'Deskripsi banner hero...'}
                  </p>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <span className="px-4 py-2 bg-white text-indigo-900 rounded-lg text-xs font-bold shadow">
                      {heroForm.heroCtaText || 'Mulai Belanja'} &rarr;
                    </span>
                    {heroForm.heroCtaSecondaryText && (
                      <span className="px-4 py-2 bg-indigo-700/60 border border-white/20 text-white rounded-lg text-xs font-semibold">
                        {heroForm.heroCtaSecondaryText}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition shadow-sm"
            >
              {saving ? 'Menyimpan...' : 'Simpan Hero Section'}
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: TERMS & CONDITIONS */}
      {activeTab === 'terms' && (
        <form onSubmit={saveLegal} className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center space-x-2">
                  <span>📜 Syarat & Ketentuan (Terms & Conditions)</span>
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Aturan transaksi, kebijakan pengembalian, unboxing, dan hak cipta bagi pembeli di toko Anda.
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    const defaultText = getDefaultTerms(aboutForm.name || 'Toko Online', aboutForm.email, aboutForm.phone);
                    setLegalForm(prev => ({ ...prev, termsContent: defaultText }));
                  }}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition"
                >
                  Gunakan Template Standar
                </button>
                <Link
                  href="/terms"
                  target="_blank"
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
                >
                  Buka Halaman Live ↗
                </Link>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Isi Dokumen Syarat & Ketentuan (Mendukung Teks & Markdown)
              </label>
              <textarea
                rows={16}
                value={legalForm.termsContent}
                onChange={(e) => setLegalForm({ ...legalForm, termsContent: e.target.value })}
                placeholder="Tuliskan syarat & ketentuan toko Anda di sini, atau klik tombol 'Gunakan Template Standar' di atas..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono leading-relaxed focus:border-indigo-500 focus:ring-indigo-500"
              />
              <p className="text-xs text-gray-400 mt-1">
                URL publik toko: <code>/terms</code>
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition shadow-sm"
            >
              {saving ? 'Menyimpan...' : 'Simpan Syarat & Ketentuan'}
            </button>
          </div>
        </form>
      )}

      {/* TAB 3: PRIVACY POLICY */}
      {activeTab === 'privacy' && (
        <form onSubmit={saveLegal} className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center space-x-2">
                  <span>🔒 Kebijakan Privasi (Privacy Policy)</span>
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Pernyataan perlindungan data pribadi dan hak-hak pelanggan sesuai UU Perlindungan Data Pribadi (UU PDP).
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    const defaultText = getDefaultPrivacy(aboutForm.name || 'Toko Online', aboutForm.email);
                    setLegalForm(prev => ({ ...prev, privacyContent: defaultText }));
                  }}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition"
                >
                  Gunakan Template Standar
                </button>
                <Link
                  href="/privacy"
                  target="_blank"
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
                >
                  Buka Halaman Live ↗
                </Link>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Isi Dokumen Kebijakan Privasi (Mendukung Teks & Markdown)
              </label>
              <textarea
                rows={16}
                value={legalForm.privacyContent}
                onChange={(e) => setLegalForm({ ...legalForm, privacyContent: e.target.value })}
                placeholder="Tuliskan kebijakan privasi toko Anda di sini, atau klik tombol 'Gunakan Template Standar' di atas..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono leading-relaxed focus:border-indigo-500 focus:ring-indigo-500"
              />
              <p className="text-xs text-gray-400 mt-1">
                URL publik toko: <code>/privacy</code>
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition shadow-sm"
            >
              {saving ? 'Menyimpan...' : 'Simpan Kebijakan Privasi'}
            </button>
          </div>
        </form>
      )}

      {/* TAB 4: COOKIE PERMISSION */}
      {activeTab === 'cookie' && (
        <form onSubmit={saveLegal} className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
            <div className="border-b border-gray-100 pb-4">
              <h2 className="text-lg font-bold text-gray-900 flex items-center space-x-2">
                <span>🍪 Izin & Pemberitahuan Cookie (Cookie Consent Banner)</span>
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Banner perizinan cookie yang otomatis muncul mengambang di etalase toko untuk transparansi sesi dan keranjang belanja pembeli.
              </p>
            </div>

            <div className="flex items-center space-x-3 bg-gray-50 p-4 rounded-xl border border-gray-200">
              <input
                id="cookieConsentEnabled"
                type="checkbox"
                checked={legalForm.cookieConsentEnabled}
                onChange={(e) => setLegalForm({ ...legalForm, cookieConsentEnabled: e.target.checked })}
                className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300"
              />
              <label htmlFor="cookieConsentEnabled" className="text-sm font-medium text-gray-800 cursor-pointer">
                Aktifkan Cookie Consent Banner di Etalase Toko
              </label>
            </div>

            {legalForm.cookieConsentEnabled && (
              <div className="space-y-4 pt-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Judul Pemberitahuan Cookie
                  </label>
                  <input
                    type="text"
                    value={legalForm.cookieConsentTitle}
                    onChange={(e) => setLegalForm({ ...legalForm, cookieConsentTitle: e.target.value })}
                    placeholder="Pemberitahuan & Izin Penggunaan Cookie"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Isi Pesan Izin Cookie
                  </label>
                  <textarea
                    rows={3}
                    value={legalForm.cookieConsentText}
                    onChange={(e) => setLegalForm({ ...legalForm, cookieConsentText: e.target.value })}
                    placeholder={DEFAULT_COOKIE_TEXT}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Kosongkan jika ingin menggunakan pesan standar rekomendasi.
                  </p>
                </div>

                {/* Live Preview Box */}
                <div className="pt-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">
                    Pratinjau Banner Cookie di Etalase:
                  </span>
                  <div className="bg-gray-100 p-4 rounded-xl border border-dashed border-gray-300 flex justify-end">
                    <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-200 max-w-sm space-y-3">
                      <div className="flex items-start space-x-3">
                        <span className="text-2xl">🍪</span>
                        <div className="space-y-1">
                          <h3 className="text-xs font-bold text-gray-900">
                            {legalForm.cookieConsentTitle || DEFAULT_COOKIE_TITLE}
                          </h3>
                          <p className="text-[11px] text-gray-600 leading-relaxed">
                            {legalForm.cookieConsentText || DEFAULT_COOKIE_TEXT}{' '}
                            <span className="text-indigo-600 underline">Kebijakan Privasi</span>
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-end space-x-2 pt-2 border-t border-gray-100 text-xs">
                        <span className="px-2 py-1 text-gray-500 rounded border">Hanya yang Penting</span>
                        <span className="px-3 py-1 bg-indigo-600 text-white font-medium rounded shadow-xs">Setujui & Lanjutkan</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition shadow-sm"
            >
              {saving ? 'Menyimpan...' : 'Simpan Pengaturan Cookie'}
            </button>
          </div>
        </form>
      )}

      {/* TAB 5: ABOUT & BRAND PROFILE */}
      {activeTab === 'about' && (
        <form onSubmit={saveAbout} className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
            <div className="border-b border-gray-100 pb-4">
              <h2 className="text-lg font-bold text-gray-900 flex items-center space-x-2">
                <span>🏢 Profil Brand & Informasi Kontak Toko</span>
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Informasi identitas toko yang otomatis tampil di header, footer, dan dokumen pesanan pembeli.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">Nama Toko</label>
                <input
                  type="text"
                  value={aboutForm.name}
                  onChange={(e) => setAboutForm({ ...aboutForm, name: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">Slogan / Tagline</label>
                <input
                  type="text"
                  value={aboutForm.tagline}
                  onChange={(e) => setAboutForm({ ...aboutForm, tagline: e.target.value })}
                  placeholder="Misal: Belanja Hemat & Cepat Terpercaya"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">Alamat Fisik / Lokasi Toko</label>
              <textarea
                rows={2}
                value={aboutForm.address}
                onChange={(e) => setAboutForm({ ...aboutForm, address: e.target.value })}
                placeholder="Jl. Raya Utama No. 123..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">Nomor WhatsApp / Telepon</label>
                <input
                  type="text"
                  value={aboutForm.phone}
                  onChange={(e) => setAboutForm({ ...aboutForm, phone: e.target.value })}
                  placeholder="08123456789"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">Email Layanan Pelanggan</label>
                <input
                  type="email"
                  value={aboutForm.email}
                  onChange={(e) => setAboutForm({ ...aboutForm, email: e.target.value })}
                  placeholder="cs@toko.com"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition shadow-sm"
            >
              {saving ? 'Menyimpan...' : 'Simpan Profil & Kontak'}
            </button>
          </div>
        </form>
      )}

      {/* TAB 6: ARTICLES OVERVIEW */}
      {activeTab === 'articles' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 space-y-6 text-center">
          <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center text-3xl mx-auto">
            📰
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h2 className="text-xl font-bold text-gray-900">Manajemen Artikel & Rekomendasi SEO</h2>
            <p className="text-sm text-gray-500">
              Saat ini terdapat <strong>{articleCount} artikel</strong> terbit. Anda dapat menulis panduan belanja, rekomendasi produk, dan mengaitkan produk pilihan editor.
            </p>
          </div>
          <div className="flex justify-center gap-3">
            <Link
              href="/admin/articles"
              className="inline-flex items-center px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition shadow-sm"
            >
              Buka Panel Editor Artikel &rarr;
            </Link>
            <Link
              href="/articles"
              target="_blank"
              className="inline-flex items-center px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition"
            >
              Katalog Artikel Live ↗
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

