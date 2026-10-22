'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import ImageUploader from '@/components/ImageUploader';
import { getDefaultTerms, getDefaultPrivacy, DEFAULT_COOKIE_TITLE, DEFAULT_COOKIE_TEXT } from '@/lib/legalDefaults';

interface SocialLinks {
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  youtube?: string;
  whatsapp?: string;
}

interface StoreForm {
  name: string;
  tagline: string;
  logo: string;
  favicon: string;
  address: string;
  phone: string;
  email: string;
  socialLinks: SocialLinks;
  defaultPageSize: number;
  defaultSeoTitle: string;
  defaultSeoDescription: string;
}

interface HeroForm {
  heroBadge: string;
  heroTitle: string;
  heroSubtitle: string;
  heroCtaText: string;
  heroCtaLink: string;
  heroCtaSecondaryText: string;
  heroCtaSecondaryLink: string;
  heroImageUrl: string;
}

interface ThemeForm {
  primaryColor: string;
  fontFamily: 'inter' | 'plus-jakarta-sans' | 'poppins' | 'roboto' | 'playfair';
}

interface AnalyticsForm {
  googleTagId: string;
  tiktokPixelId: string;
  facebookPixelId: string;
  instagramAccountId: string;
  youtubeChannelId: string;
}

interface TurnstileForm {
  turnstileSiteKey: string;
  turnstileSecretKey: string;
  turnstileEnabled: boolean;
}

interface PaymentForm {
  sandboxPaymentEnabled: boolean;
  midtransMerchantId: string;
  midtransClientKey: string;
  midtransServerKey: string;
  flipApiKey: string;
  midtransSandboxMerchantId: string;
  midtransSandboxClientKey: string;
  midtransSandboxServerKey: string;
  flipSandboxApiKey: string;
}

const EMPTY_PAYMENT_FORM: PaymentForm = {
  sandboxPaymentEnabled: false,
  midtransMerchantId: '',
  midtransClientKey: '',
  midtransServerKey: '',
  flipApiKey: '',
  midtransSandboxMerchantId: '',
  midtransSandboxClientKey: '',
  midtransSandboxServerKey: '',
  flipSandboxApiKey: '',
};

const COLOR_PRESETS = [
  { name: 'Indigo (Modern Tech)', hex: '#4F46E5', bgClass: 'bg-indigo-600' },
  { name: 'Emerald (Natural / Eco)', hex: '#059669', bgClass: 'bg-emerald-600' },
  { name: 'Rose (Beauty / Fashion)', hex: '#E11D48', bgClass: 'bg-rose-600' },
  { name: 'Amber (Food / Warm)', hex: '#D97706', bgClass: 'bg-amber-600' },
  { name: 'Blue (Corporate / Gadget)', hex: '#2563EB', bgClass: 'bg-blue-600' },
  { name: 'Slate (Minimalist Luxury)', hex: '#0F172A', bgClass: 'bg-slate-900' },
  { name: 'Teal (Fresh / Modern)', hex: '#0D9488', bgClass: 'bg-teal-600' },
  { name: 'Violet (Creative / Trend)', hex: '#7C3AED', bgClass: 'bg-violet-600' },
];

const FONT_PRESETS = [
  { id: 'inter', name: 'Inter', desc: 'Bersih, netral, sangat mudah dibaca di layar HP & desktop' },
  { id: 'plus-jakarta-sans', name: 'Plus Jakarta Sans', desc: 'Modern, trendi, populer untuk brand masa kini' },
  { id: 'poppins', name: 'Poppins', desc: 'Geometris, playful, eye-catching untuk promo & lifestyle' },
  { id: 'roboto', name: 'Roboto', desc: 'Klasik, stabil, standar industri digital' },
  { id: 'playfair', name: 'Playfair Display', desc: 'Serif elegan, mewah, cocok untuk butik & fashion premium' },
];

const EMPTY_STORE_FORM: StoreForm = {
  name: '',
  tagline: '',
  logo: '',
  favicon: '',
  address: '',
  phone: '',
  email: '',
  socialLinks: { instagram: '', facebook: '', tiktok: '', youtube: '', whatsapp: '' },
  defaultPageSize: 10,
  defaultSeoTitle: '',
  defaultSeoDescription: '',
};

const EMPTY_HERO_FORM: HeroForm = {
  heroBadge: 'Koleksi Terbaru 2026',
  heroTitle: 'Tampil Percaya Diri dengan Produk Terbaik',
  heroSubtitle: 'Temukan pilihan produk berkualitas tinggi dengan penawaran eksklusif dan jaminan original.',
  heroCtaText: 'Mulai Belanja',
  heroCtaLink: '/products',
  heroCtaSecondaryText: 'Artikel & Panduan',
  heroCtaSecondaryLink: '/articles',
  heroImageUrl: '',
};

const EMPTY_THEME_FORM: ThemeForm = {
  primaryColor: '#4F46E5',
  fontFamily: 'inter',
};

const EMPTY_ANALYTICS: AnalyticsForm = {
  googleTagId: '',
  tiktokPixelId: '',
  facebookPixelId: '',
  instagramAccountId: '',
  youtubeChannelId: '',
};

const EMPTY_TURNSTILE: TurnstileForm = {
  turnstileSiteKey: '',
  turnstileSecretKey: '',
  turnstileEnabled: false,
};

interface LegalForm {
  termsContent: string;
  privacyContent: string;
  cookieConsentEnabled: boolean;
  cookieConsentTitle: string;
  cookieConsentText: string;
}

const EMPTY_LEGAL_FORM: LegalForm = {
  termsContent: '',
  privacyContent: '',
  cookieConsentEnabled: true,
  cookieConsentTitle: DEFAULT_COOKIE_TITLE,
  cookieConsentText: '',
};

type SettingsTab = 'general' | 'hero' | 'theme' | 'integrations' | 'legal';

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [storeForm, setStoreForm] = useState<StoreForm>(EMPTY_STORE_FORM);
  const [heroForm, setHeroForm] = useState<HeroForm>(EMPTY_HERO_FORM);
  const [themeForm, setThemeForm] = useState<ThemeForm>(EMPTY_THEME_FORM);
  const [analyticsForm, setAnalyticsForm] = useState<AnalyticsForm>(EMPTY_ANALYTICS);
  const [turnstileForm, setTurnstileForm] = useState<TurnstileForm>(EMPTY_TURNSTILE);
  const [paymentForm, setPaymentForm] = useState<PaymentForm>(EMPTY_PAYMENT_FORM);
  const [legalForm, setLegalForm] = useState<LegalForm>(EMPTY_LEGAL_FORM);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const authHeaders = useCallback(() => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : null;
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const headers = authHeaders();
      if (!headers) {
        setError('Sesi login telah berakhir, silakan login kembali.');
        return;
      }

      // 1. Load General, Hero, & Theme Settings
      const resGeneral = await fetch('/api/admin/settings/general', { headers });
      if (resGeneral.ok) {
        const data = await resGeneral.json();
        const store = data.store || {};
        const s = data.settings || {};

        setStoreForm({
          name: store.name || '',
          tagline: s.tagline || '',
          logo: store.logo || '',
          favicon: s.favicon || '',
          address: store.address || '',
          phone: store.phone || '',
          email: store.email || '',
          socialLinks: s.socialLinks || {},
          defaultPageSize: s.defaultPageSize ?? 10,
          defaultSeoTitle: s.defaultSeoTitle || '',
          defaultSeoDescription: s.defaultSeoDescription || '',
        });

        setHeroForm({
          heroBadge: s.heroBadge || EMPTY_HERO_FORM.heroBadge,
          heroTitle: s.heroTitle || EMPTY_HERO_FORM.heroTitle,
          heroSubtitle: s.heroSubtitle || EMPTY_HERO_FORM.heroSubtitle,
          heroCtaText: s.heroCtaText || EMPTY_HERO_FORM.heroCtaText,
          heroCtaLink: s.heroCtaLink || EMPTY_HERO_FORM.heroCtaLink,
          heroCtaSecondaryText: s.heroCtaSecondaryText || EMPTY_HERO_FORM.heroCtaSecondaryText,
          heroCtaSecondaryLink: s.heroCtaSecondaryLink || EMPTY_HERO_FORM.heroCtaSecondaryLink,
          heroImageUrl: s.heroImageUrl || '',
        });

        setThemeForm({
          primaryColor: s.primaryColor || '#4F46E5',
          fontFamily: s.fontFamily || 'inter',
        });

        setPaymentForm({
          sandboxPaymentEnabled: s.sandboxPaymentEnabled ?? false,
          midtransMerchantId: s.midtransMerchantId || '',
          midtransClientKey: s.midtransClientKey || '',
          midtransServerKey: s.midtransServerKey || '',
          flipApiKey: s.flipApiKey || '',
          midtransSandboxMerchantId: s.midtransSandboxMerchantId || '',
          midtransSandboxClientKey: s.midtransSandboxClientKey || '',
          midtransSandboxServerKey: s.midtransSandboxServerKey || '',
          flipSandboxApiKey: s.flipSandboxApiKey || '',
        });
      }

      // 2. Load Analytics
      const resAnalytics = await fetch('/api/admin/settings/analytics', { headers });
      if (resAnalytics.ok) {
        const data = await resAnalytics.json();
        setAnalyticsForm({ ...EMPTY_ANALYTICS, ...(data.analytics || {}) });
      }

      // 3. Load Turnstile
      const resTurnstile = await fetch('/api/admin/settings/turnstile', { headers });
      if (resTurnstile.ok) {
        const data = await resTurnstile.json();
        const s = data.settings;
        setTurnstileForm({
          turnstileSiteKey: s.turnstileSiteKey || '',
          turnstileSecretKey: s.hasSecret ? '********' : '',
          turnstileEnabled: s.turnstileEnabled ?? false,
        });
      }

      // 4. Load Legal & Cookie Settings
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat pengaturan toko.');
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const saveLegal = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      const headers = authHeaders();
      if (!headers) throw new Error('Anda harus login terlebih dahulu.');

      const res = await fetch('/api/admin/settings/legal', {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(legalForm),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Gagal menyimpan pengaturan legal dan cookie.');
      }

      setNotice('Dokumen legal dan izin cookie berhasil disimpan.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat menyimpan.');
    } finally {
      setSaving(false);
    }
  };

  const saveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      const headers = authHeaders();
      if (!headers) throw new Error('Anda harus login terlebih dahulu.');

      const payload = {
        name: storeForm.name,
        tagline: storeForm.tagline,
        logo: storeForm.logo,
        favicon: storeForm.favicon,
        address: storeForm.address,
        phone: storeForm.phone,
        email: storeForm.email,
        socialLinks: storeForm.socialLinks,
        defaultPageSize: Number(storeForm.defaultPageSize) || 10,
        defaultSeoTitle: storeForm.defaultSeoTitle,
        defaultSeoDescription: storeForm.defaultSeoDescription,
      };

      const res = await fetch('/api/admin/settings/general', {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Gagal menyimpan identitas toko.');
      }

      setNotice('Identitas dan profil toko berhasil diperbarui.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat menyimpan.');
    } finally {
      setSaving(false);
    }
  };

  const saveHero = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      const headers = authHeaders();
      if (!headers) throw new Error('Anda harus login terlebih dahulu.');

      const res = await fetch('/api/admin/settings/general', {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(heroForm),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Gagal menyimpan pengaturan Hero Section.');
      }

      setNotice('Banner Hero Section berhasil diperbarui.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat menyimpan.');
    } finally {
      setSaving(false);
    }
  };

  const saveTheme = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      const headers = authHeaders();
      if (!headers) throw new Error('Anda harus login terlebih dahulu.');

      const res = await fetch('/api/admin/settings/general', {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(themeForm),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Gagal menyimpan tema dan font.');
      }

      setNotice('Warna tema dan font berhasil diperbarui untuk seluruh website.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat menyimpan.');
    } finally {
      setSaving(false);
    }
  };

  const saveAnalytics = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      const headers = authHeaders();
      if (!headers) throw new Error('Anda harus login terlebih dahulu.');

      const payload = Object.fromEntries(
        Object.entries(analyticsForm)
          .map(([k, v]) => [k, v.trim()])
          .filter(([, v]) => v !== '')
      );

      const res = await fetch('/api/admin/settings/analytics', {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Gagal menyimpan analitik pixel.');
      }

      setNotice('Pengaturan analitik berhasil disimpan.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat menyimpan.');
    } finally {
      setSaving(false);
    }
  };

  const saveTurnstile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      const headers = authHeaders();
      if (!headers) throw new Error('Anda harus login terlebih dahulu.');

      const res = await fetch('/api/admin/settings/turnstile', {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(turnstileForm),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Gagal menyimpan Turnstile.');
      }

      setNotice('Pengaturan Cloudflare Turnstile berhasil disimpan.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat menyimpan.');
    } finally {
      setSaving(false);
    }
  };

  const savePaymentSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      const headers = authHeaders();
      if (!headers) throw new Error('Anda harus login terlebih dahulu.');

      const res = await fetch('/api/admin/settings/general', {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentForm),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Gagal menyimpan pengaturan payment gateway.');
      }

      setNotice('Pengaturan Payment Gateway & Mode Sandbox berhasil disimpan.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat menyimpan.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-5xl mx-auto flex items-center justify-center min-h-[400px]">
        <div className="flex items-center space-x-3 text-gray-500">
          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <span>Memuat konfigurasi toko...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header Halaman */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pengaturan Toko & Identitas Digital</h1>
        <p className="text-sm text-gray-500 mt-1">
          Kelola profil toko, banner beranda, tampilan tema warna, font tipografi, dan integrasi analitik.
        </p>
      </div>

      {/* Pesan Notifikasi & Error */}
      {notice && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-lg text-sm flex items-center justify-between">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} className="text-emerald-600 hover:text-emerald-800 font-bold">&times;</button>
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-600 hover:text-red-800 font-bold">&times;</button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 space-x-2 md:space-x-8 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('general')}
          className={`py-3 px-2 font-medium text-sm border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'general'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Identitas & Kontak Toko
        </button>
        <button
          onClick={() => setActiveTab('hero')}
          className={`py-3 px-2 font-medium text-sm border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'hero'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Hero Section Builder
        </button>
        <button
          onClick={() => setActiveTab('theme')}
          className={`py-3 px-2 font-medium text-sm border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'theme'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Tema Warna & Font
        </button>
        <button
          onClick={() => setActiveTab('integrations')}
          className={`py-3 px-2 font-medium text-sm border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'integrations'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Pixel & Keamanan
        </button>
        <button
          onClick={() => setActiveTab('legal')}
          className={`py-3 px-2 font-medium text-sm border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'legal'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          📄 Halaman Legal & Cookie
        </button>
      </div>

      {/* TAB 1: IDENTITAS TOKO */}
      {activeTab === 'general' && (
        <form onSubmit={saveGeneral} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
          <div className="border-b border-gray-100 pb-4">
            <h2 className="text-lg font-semibold text-gray-900">Profil & Branding</h2>
            <p className="text-sm text-gray-500">Nama toko, slogan, dan logo yang tampil di header dan footer.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Nama Toko *</label>
              <input
                type="text"
                required
                value={storeForm.name}
                onChange={(e) => setStoreForm({ ...storeForm, name: e.target.value })}
                placeholder="Contoh: Toko Sepatu Cantik"
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Tagline / Slogan</label>
              <input
                type="text"
                value={storeForm.tagline}
                onChange={(e) => setStoreForm({ ...storeForm, tagline: e.target.value })}
                placeholder="Contoh: Pusat Sepatu Original & Bergaransi"
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>

            <div className="md:col-span-2">
              <ImageUploader
                label="Logo Toko"
                description="Logo resmi yang tampil di header dan footer website toko Anda."
                type="logo"
                value={storeForm.logo}
                onChange={(url) => setStoreForm({ ...storeForm, logo: url })}
                placeholderUrl="https://example.com/logo.png"
              />
            </div>

            <div>
              <ImageUploader
                label="Favicon Toko (.ico / .png)"
                description="Ikon kecil yang tampil pada tab browser pembeli."
                type="favicon"
                value={storeForm.favicon}
                onChange={(url) => setStoreForm({ ...storeForm, favicon: url })}
                placeholderUrl="https://example.com/favicon.ico"
              />
            </div>
          </div>

          <div className="border-b border-gray-100 pt-4 pb-4">
            <h2 className="text-lg font-semibold text-gray-900">Kontak Bisnis & Alamat Fisik</h2>
            <p className="text-sm text-gray-500">Informasi ini akan muncul di footer dan halaman checkout.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Nomor Telepon / WhatsApp</label>
              <input
                type="text"
                value={storeForm.phone}
                onChange={(e) => setStoreForm({ ...storeForm, phone: e.target.value })}
                placeholder="081234567890"
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Email Resmi Toko</label>
              <input
                type="email"
                value={storeForm.email}
                onChange={(e) => setStoreForm({ ...storeForm, email: e.target.value })}
                placeholder="cs@tokosaya.com"
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Alamat Lengkap Toko / Gudang</label>
              <textarea
                rows={2}
                value={storeForm.address}
                onChange={(e) => setStoreForm({ ...storeForm, address: e.target.value })}
                placeholder="Jl. Sudirman No. 123, Jakarta Selatan, 12190"
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="border-b border-gray-100 pt-4 pb-4">
            <h2 className="text-lg font-semibold text-gray-900">Tautan Media Sosial</h2>
            <p className="text-sm text-gray-500">Kanal media sosial resmi yang akan ditampilkan sebagai ikon di footer.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Instagram Username / Link</label>
              <input
                type="text"
                value={storeForm.socialLinks?.instagram || ''}
                onChange={(e) => setStoreForm({
                  ...storeForm,
                  socialLinks: { ...storeForm.socialLinks, instagram: e.target.value }
                })}
                placeholder="tokosaya (atau link lengkap)"
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">TikTok Username / Link</label>
              <input
                type="text"
                value={storeForm.socialLinks?.tiktok || ''}
                onChange={(e) => setStoreForm({
                  ...storeForm,
                  socialLinks: { ...storeForm.socialLinks, tiktok: e.target.value }
                })}
                placeholder="@tokosaya"
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">WhatsApp Bisnis</label>
              <input
                type="text"
                value={storeForm.socialLinks?.whatsapp || ''}
                onChange={(e) => setStoreForm({
                  ...storeForm,
                  socialLinks: { ...storeForm.socialLinks, whatsapp: e.target.value }
                })}
                placeholder="628123456789"
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="border-b border-gray-100 pt-4 pb-4">
            <h2 className="text-lg font-semibold text-gray-900">Pengaturan Tampilan Daftar &amp; SEO Default</h2>
            <p className="text-sm text-gray-500">Konfigurasi pagination tabel/list serta judul dan deskripsi default toko.</p>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Default Jumlah Item per Halaman (Pagination)
              </label>
              <p className="text-xs text-gray-500 mt-0.5 mb-2.5">
                Menentukan jumlah baris data default per halaman untuk seluruh tabel dan daftar (produk, pesanan, pelanggan, artikel, dll). Default bawaan: 10.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {[10, 20, 25, 50, 100].map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setStoreForm({ ...storeForm, defaultPageSize: size })}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                      Number(storeForm.defaultPageSize) === size
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {size} item
                  </button>
                ))}
                <div className="flex items-center gap-1.5 ml-2">
                  <span className="text-xs text-gray-500">Kustom:</span>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={storeForm.defaultPageSize || 10}
                    onChange={(e) =>
                      setStoreForm({
                        ...storeForm,
                        defaultPageSize: Math.max(1, Math.min(100, parseInt(e.target.value) || 10)),
                      })
                    }
                    className="w-20 rounded-lg border border-gray-300 px-2.5 py-1 text-xs focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Default Meta Title</label>
              <input
                type="text"
                value={storeForm.defaultSeoTitle}
                onChange={(e) => setStoreForm({ ...storeForm, defaultSeoTitle: e.target.value })}
                placeholder="Toko Sepatu Online Terlengkap & Terpercaya"
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Default Meta Description</label>
              <textarea
                rows={2}
                value={storeForm.defaultSeoDescription}
                onChange={(e) => setStoreForm({ ...storeForm, defaultSeoDescription: e.target.value })}
                placeholder="Belanja berbagai produk fashion sepatu original dengan garansi uang kembali dan gratis ongkir se-Indonesia."
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={saving}
              className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              {saving ? 'Menyimpan...' : 'Simpan Identitas Toko'}
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: HERO SECTION BUILDER */}
      {activeTab === 'hero' && (
        <div className="space-y-8">
          <form onSubmit={saveHero} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
            <div className="border-b border-gray-100 pb-4">
              <h2 className="text-lg font-semibold text-gray-900">Hero Banner Beranda</h2>
              <p className="text-sm text-gray-500">
                Atur headline utama, promo badge, ajakan bertindak (CTA), dan gambar visual di bagian paling atas beranda toko.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Promo Badge Text</label>
                <input
                  type="text"
                  value={heroForm.heroBadge}
                  onChange={(e) => setHeroForm({ ...heroForm, heroBadge: e.target.value })}
                  placeholder="Contoh: Koleksi Terbaru 2026 atau Promo Terbatas"
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Headline Utama (Hero Title) *</label>
                <input
                  type="text"
                  required
                  value={heroForm.heroTitle}
                  onChange={(e) => setHeroForm({ ...heroForm, heroTitle: e.target.value })}
                  placeholder="Contoh: Tampil Percaya Diri dengan Gaya Terbaik"
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Deskripsi Pendukung (Subtitle)</label>
                <textarea
                  rows={2}
                  value={heroForm.heroSubtitle}
                  onChange={(e) => setHeroForm({ ...heroForm, heroSubtitle: e.target.value })}
                  placeholder="Jelaskan nilai lebih produk atau penawaran toko Anda dalam 1-2 kalimat menarik."
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Teks Tombol CTA Utama</label>
                <input
                  type="text"
                  value={heroForm.heroCtaText}
                  onChange={(e) => setHeroForm({ ...heroForm, heroCtaText: e.target.value })}
                  placeholder="Belanja Sekarang"
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Link Tujuan CTA Utama</label>
                <input
                  type="text"
                  value={heroForm.heroCtaLink}
                  onChange={(e) => setHeroForm({ ...heroForm, heroCtaLink: e.target.value })}
                  placeholder="/products"
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Teks Tombol CTA Sekunder (Opsional)</label>
                <input
                  type="text"
                  value={heroForm.heroCtaSecondaryText}
                  onChange={(e) => setHeroForm({ ...heroForm, heroCtaSecondaryText: e.target.value })}
                  placeholder="Baca Artikel & Panduan"
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Link Tujuan CTA Sekunder</label>
                <input
                  type="text"
                  value={heroForm.heroCtaSecondaryLink}
                  onChange={(e) => setHeroForm({ ...heroForm, heroCtaSecondaryLink: e.target.value })}
                  placeholder="/articles"
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>

              <div className="md:col-span-2">
                <ImageUploader
                  label="Gambar Banner Hero / Ilustrasi"
                  description="Foto atau ilustrasi banner utama (maksimal 1920x1080px, otomatis dikompres ke WebP)."
                  type="banner"
                  value={heroForm.heroImageUrl}
                  onChange={(url) => setHeroForm({ ...heroForm, heroImageUrl: url })}
                  placeholderUrl="https://images.unsplash.com/photo-..."
                />
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={saving}
                className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                {saving ? 'Menyimpan...' : 'Simpan Hero Section'}
              </button>
            </div>
          </form>

          {/* Live Interactive Preview Box */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-semibold text-gray-900">Live Preview: Tampilan Hero di Beranda</h3>
              <span className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full font-medium">
                Pratinjau Otomatis
              </span>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 via-white to-gray-50 p-6 md:p-12 overflow-hidden relative">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div className="space-y-4">
                  {heroForm.heroBadge && (
                    <span
                      style={{ backgroundColor: `${themeForm.primaryColor}15`, color: themeForm.primaryColor }}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
                    >
                      <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: themeForm.primaryColor }} />
                      {heroForm.heroBadge}
                    </span>
                  )}
                  <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight leading-tight">
                    {heroForm.heroTitle || 'Judul Utama Toko'}
                  </h1>
                  <p className="text-sm md:text-base text-gray-600 leading-relaxed">
                    {heroForm.heroSubtitle || 'Deskripsi singkat mengenai toko dan produk unggulan yang ditawarkan.'}
                  </p>
                  <div className="flex flex-wrap gap-3 pt-2">
                    <button
                      type="button"
                      style={{ backgroundColor: themeForm.primaryColor }}
                      className="text-white px-5 py-2.5 rounded-lg text-sm font-medium shadow-sm pointer-events-none"
                    >
                      {heroForm.heroCtaText || 'Belanja Sekarang'} &rarr;
                    </button>
                    {heroForm.heroCtaSecondaryText && (
                      <button
                        type="button"
                        className="bg-white border border-gray-300 text-gray-700 px-5 py-2.5 rounded-lg text-sm font-medium pointer-events-none"
                      >
                        {heroForm.heroCtaSecondaryText}
                      </button>
                    )}
                  </div>
                </div>

                <div className="relative h-64 md:h-72 rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center border shadow-inner">
                  {heroForm.heroImageUrl ? (
                    <Image
                      src={heroForm.heroImageUrl}
                      alt="Banner Hero Preview"
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="text-center p-6 text-gray-400 space-y-2">
                      <div className="w-12 h-12 mx-auto rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                        🛍️
                      </div>
                      <p className="text-xs">Gambar Banner Default Toko</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: TEMA WARNA & FONT */}
      {activeTab === 'theme' && (
        <form onSubmit={saveTheme} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-8">
          <div className="border-b border-gray-100 pb-4">
            <h2 className="text-lg font-semibold text-gray-900">Tema Warna & Tipografi</h2>
            <p className="text-sm text-gray-500">
              Ubah warna aksen utama (tombol, badge, link) dan gaya font di seluruh toko klien Anda secara instan.
            </p>
          </div>

          {/* Palet Warna Aksen */}
          <div className="space-y-4">
            <label className="block text-sm font-semibold text-gray-900">
              1. Pilih Warna Brand Utama (Primary Color)
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {COLOR_PRESETS.map((color) => {
                const isSelected = themeForm.primaryColor.toLowerCase() === color.hex.toLowerCase();
                return (
                  <button
                    key={color.hex}
                    type="button"
                    onClick={() => setThemeForm({ ...themeForm, primaryColor: color.hex })}
                    className={`flex items-center space-x-3 p-3 rounded-lg border text-left transition-all ${
                      isSelected
                        ? 'border-gray-900 ring-2 ring-gray-900 ring-offset-1 bg-gray-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className={`w-6 h-6 rounded-full flex-shrink-0 ${color.bgClass}`} />
                    <div className="truncate">
                      <p className="text-xs font-medium text-gray-900 truncate">{color.name}</p>
                      <p className="text-[11px] text-gray-500">{color.hex}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <span className="text-sm text-gray-600">Atau pilih warna kustom:</span>
              <input
                type="color"
                value={themeForm.primaryColor}
                onChange={(e) => setThemeForm({ ...themeForm, primaryColor: e.target.value })}
                className="w-10 h-10 border rounded cursor-pointer"
              />
              <input
                type="text"
                value={themeForm.primaryColor}
                onChange={(e) => setThemeForm({ ...themeForm, primaryColor: e.target.value })}
                className="w-28 rounded-lg border border-gray-300 px-3 py-1.5 text-sm uppercase font-mono"
              />
            </div>
          </div>

          {/* Pilihan Font Tipografi */}
          <div className="space-y-4 border-t pt-6">
            <label className="block text-sm font-semibold text-gray-900">
              2. Pilih Jenis Huruf (Font Family)
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {FONT_PRESETS.map((font) => {
                const isSelected = themeForm.fontFamily === font.id;
                return (
                  <button
                    key={font.id}
                    type="button"
                    onClick={() => setThemeForm({ ...themeForm, fontFamily: font.id as any })}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-indigo-600 ring-2 ring-indigo-600 ring-offset-1 bg-indigo-50/30'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-base font-bold text-gray-900">{font.name}</span>
                      {isSelected && (
                        <span className="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded font-medium">Aktif</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{font.desc}</p>
                    <p className="text-sm text-gray-700 mt-2 font-medium">
                      The quick brown fox jumps over the lazy dog. 1234567890
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Pratinjau Desain Komponen */}
          <div className="space-y-3 border-t pt-6">
            <label className="block text-sm font-semibold text-gray-900">
              Pratinjau Elemen Tombol & Badge
            </label>
            <div className="p-6 rounded-xl border bg-gray-50 flex flex-wrap gap-4 items-center">
              <button
                type="button"
                style={{ backgroundColor: themeForm.primaryColor }}
                className="text-white px-5 py-2.5 rounded-lg text-sm font-medium shadow-sm pointer-events-none"
              >
                Tombol Utama Toko
              </button>
              <button
                type="button"
                style={{ borderColor: themeForm.primaryColor, color: themeForm.primaryColor }}
                className="bg-white border px-5 py-2.5 rounded-lg text-sm font-medium pointer-events-none"
              >
                Tombol Outline
              </button>
              <span
                style={{ backgroundColor: `${themeForm.primaryColor}20`, color: themeForm.primaryColor }}
                className="px-3 py-1 rounded-full text-xs font-semibold"
              >
                Badge Promo Toko
              </span>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={saving}
              className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              {saving ? 'Menyimpan...' : 'Terapkan Tema & Font'}
            </button>
          </div>
        </form>
      )}

      {/* TAB 4: INTEGRASI PIXEL & KEAMANAN */}
      {activeTab === 'integrations' && (
        <div className="space-y-8">
          {/* Analytics Pixel */}
          <form onSubmit={saveAnalytics} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
            <div className="border-b border-gray-100 pb-4">
              <h2 className="text-lg font-semibold text-gray-900">Pelacak Analitik & Iklan</h2>
              <p className="text-sm text-gray-500">
                Pixel pelacakan yang otomatis terinjeksi di setiap halaman toko untuk konversi iklan.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">Google Tag / GA4 / GTM</label>
                <input
                  type="text"
                  value={analyticsForm.googleTagId}
                  onChange={(e) => setAnalyticsForm({ ...analyticsForm, googleTagId: e.target.value })}
                  placeholder="G-ABCDE12345"
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">TikTok Pixel</label>
                <input
                  type="text"
                  value={analyticsForm.tiktokPixelId}
                  onChange={(e) => setAnalyticsForm({ ...analyticsForm, tiktokPixelId: e.target.value })}
                  placeholder="C1A2B3D4E5F6G7H8"
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Meta (Facebook) Pixel</label>
                <input
                  type="text"
                  value={analyticsForm.facebookPixelId}
                  onChange={(e) => setAnalyticsForm({ ...analyticsForm, facebookPixelId: e.target.value })}
                  placeholder="123456789012345"
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={saving}
                className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                {saving ? 'Menyimpan...' : 'Simpan Analitik'}
              </button>
            </div>
          </form>

          {/* Payment Gateway & Sandbox Testing Mode */}
          <form onSubmit={savePaymentSettings} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <span>💳 Payment Gateway & Mode Pengujian Sandbox</span>
                  {paymentForm.sandboxPaymentEnabled ? (
                    <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                      🧪 SANDBOX AKTIF
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                      🟢 LIVE PRODUCTION
                    </span>
                  )}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Atur kredensial payment gateway (Midtrans & Flip) serta aktifkan mode sandbox untuk simulasi dan pengujian pembayaran tanpa risiko.
                </p>
              </div>
            </div>

            {/* Sandbox Toggle Box */}
            <div className={`p-4 rounded-xl border ${paymentForm.sandboxPaymentEnabled ? 'bg-amber-50/70 border-amber-300' : 'bg-gray-50 border-gray-200'}`}>
              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="sandboxPaymentEnabled"
                  checked={paymentForm.sandboxPaymentEnabled}
                  onChange={(e) => setPaymentForm({ ...paymentForm, sandboxPaymentEnabled: e.target.checked })}
                  className="h-5 w-5 rounded border-gray-300 text-amber-600 focus:ring-amber-500 mt-0.5"
                />
                <div className="flex-1">
                  <label htmlFor="sandboxPaymentEnabled" className="text-sm font-bold text-gray-900 cursor-pointer">
                    Aktifkan Mode Sandbox (Pengujian Payment Gateway)
                  </label>
                  <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                    Saat mode ini aktif, produk yang memiliki label <strong>🧪 Sandbox</strong> dapat dibeli menggunakan simulator / gateway sandbox. 
                    <span className="block mt-1 text-amber-900 font-medium">
                      🔒 Keamanan Laporan: Seluruh transaksi sandbox terisolasi penuh dan tidak akan pernah dihitung ke dalam omset, revenue, saldo kas, atau laporan keuangan riil toko.
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Sandbox Credentials */}
            {paymentForm.sandboxPaymentEnabled && (
              <div className="bg-amber-50/40 border border-amber-200 rounded-xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-amber-900 flex items-center gap-1.5">
                  <span>🧪 Kredensial Sandbox (Test Keys)</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700">Midtrans Sandbox Merchant ID</label>
                    <input
                      type="text"
                      value={paymentForm.midtransSandboxMerchantId}
                      onChange={(e) => setPaymentForm({ ...paymentForm, midtransSandboxMerchantId: e.target.value })}
                      placeholder="G123456789 (Sandbox)"
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700">Midtrans Sandbox Client Key</label>
                    <input
                      type="text"
                      value={paymentForm.midtransSandboxClientKey}
                      onChange={(e) => setPaymentForm({ ...paymentForm, midtransSandboxClientKey: e.target.value })}
                      placeholder="SB-Mid-client-..."
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700">Midtrans Sandbox Server Key</label>
                    <input
                      type="password"
                      value={paymentForm.midtransSandboxServerKey}
                      onChange={(e) => setPaymentForm({ ...paymentForm, midtransSandboxServerKey: e.target.value })}
                      placeholder="SB-Mid-server-..."
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700">Flip Sandbox API Key</label>
                    <input
                      type="password"
                      value={paymentForm.flipSandboxApiKey}
                      onChange={(e) => setPaymentForm({ ...paymentForm, flipSandboxApiKey: e.target.value })}
                      placeholder="Sandbox Secret Key"
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:ring-amber-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Production Credentials */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-gray-900">
                🟢 Kredensial Produksi (Live Keys)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700">Midtrans Merchant ID</label>
                  <input
                    type="text"
                    value={paymentForm.midtransMerchantId}
                    onChange={(e) => setPaymentForm({ ...paymentForm, midtransMerchantId: e.target.value })}
                    placeholder="M123456789"
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">Midtrans Client Key</label>
                  <input
                    type="text"
                    value={paymentForm.midtransClientKey}
                    onChange={(e) => setPaymentForm({ ...paymentForm, midtransClientKey: e.target.value })}
                    placeholder="Mid-client-..."
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">Midtrans Server Key</label>
                  <input
                    type="password"
                    value={paymentForm.midtransServerKey}
                    onChange={(e) => setPaymentForm({ ...paymentForm, midtransServerKey: e.target.value })}
                    placeholder="Mid-server-..."
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">Flip API Key (Production)</label>
                  <input
                    type="password"
                    value={paymentForm.flipApiKey}
                    onChange={(e) => setPaymentForm({ ...paymentForm, flipApiKey: e.target.value })}
                    placeholder="Live API Key"
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={saving}
                className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                {saving ? 'Menyimpan...' : 'Simpan Konfigurasi Payment Gateway'}
              </button>
            </div>
          </form>

          {/* Cloudflare Turnstile */}
          <form onSubmit={saveTurnstile} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
            <div className="border-b border-gray-100 pb-4">
              <h2 className="text-lg font-semibold text-gray-900">Cloudflare Turnstile (Anti-Bot / CAPTCHA)</h2>
              <p className="text-sm text-gray-500">
                Melindungi form checkout dan pendaftaran akun dari serangan bot otomatis.
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="turnstileEnabled"
                checked={turnstileForm.turnstileEnabled}
                onChange={(e) => setTurnstileForm({ ...turnstileForm, turnstileEnabled: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="turnstileEnabled" className="text-sm font-medium text-gray-700">
                Aktifkan proteksi bot Cloudflare Turnstile
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">Site Key</label>
                <input
                  type="text"
                  value={turnstileForm.turnstileSiteKey}
                  onChange={(e) => setTurnstileForm({ ...turnstileForm, turnstileSiteKey: e.target.value })}
                  placeholder="0x4AAAAAA..."
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Secret Key</label>
                <input
                  type="password"
                  value={turnstileForm.turnstileSecretKey}
                  onChange={(e) => setTurnstileForm({ ...turnstileForm, turnstileSecretKey: e.target.value })}
                  placeholder="0x4AAAAAA..."
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={saving}
                className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                {saving ? 'Menyimpan...' : 'Simpan Turnstile'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 5: HALAMAN LEGAL & COOKIE CONSENT */}
      {activeTab === 'legal' && (
        <form onSubmit={saveLegal} className="space-y-6">
          {/* Bagian 1: Syarat & Ketentuan */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center space-x-2">
                  <span>📜 Syarat & Ketentuan (Terms & Conditions)</span>
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Aturan transaksi, kebijakan pengembalian, dan hak cipta untuk pembeli di toko Anda.
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    const defaultText = getDefaultTerms(storeForm.name || 'Toko Online', storeForm.email, storeForm.phone);
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
                Isi Dokumen Syarat & Ketentuan (Mendukung Teks Biasa & Markdown)
              </label>
              <textarea
                rows={12}
                value={legalForm.termsContent}
                onChange={(e) => setLegalForm({ ...legalForm, termsContent: e.target.value })}
                placeholder="Tuliskan syarat & ketentuan toko Anda di sini, atau klik tombol 'Gunakan Template Standar' di atas..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono leading-relaxed focus:border-indigo-500 focus:ring-indigo-500"
              />
              <p className="text-xs text-gray-400 mt-1">
                Dapat diakses publik oleh seluruh pengunjung toko di URL <code>/terms</code>.
              </p>
            </div>
          </div>

          {/* Bagian 2: Kebijakan Privasi */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center space-x-2">
                  <span>🔒 Kebijakan Privasi (Privacy Policy)</span>
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Pernyataan perlindungan data pribadi dan hak-hak pelanggan sesuai regulasi UU PDP.
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    const defaultText = getDefaultPrivacy(storeForm.name || 'Toko Online', storeForm.email);
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
                Isi Dokumen Kebijakan Privasi (Mendukung Teks Biasa & Markdown)
              </label>
              <textarea
                rows={12}
                value={legalForm.privacyContent}
                onChange={(e) => setLegalForm({ ...legalForm, privacyContent: e.target.value })}
                placeholder="Tuliskan kebijakan privasi toko Anda di sini, atau klik tombol 'Gunakan Template Standar' di atas..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono leading-relaxed focus:border-indigo-500 focus:ring-indigo-500"
              />
              <p className="text-xs text-gray-400 mt-1">
                Dapat diakses publik oleh seluruh pengunjung toko di URL <code>/privacy</code>.
              </p>
            </div>
          </div>

          {/* Bagian 3: Izin & Pemberitahuan Cookie */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
            <div className="border-b border-gray-100 pb-4">
              <h2 className="text-lg font-bold text-gray-900 flex items-center space-x-2">
                <span>🍪 Izin & Pemberitahuan Cookie (Cookie Consent Banner)</span>
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Banner perizinan cookie yang otomatis muncul mengambang di etalase toko untuk transparansi sesi dan keranjang belanja.
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
                          <h4 className="text-xs font-bold text-gray-900">
                            {legalForm.cookieConsentTitle || DEFAULT_COOKIE_TITLE}
                          </h4>
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

          {/* Tombol Simpan */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition shadow-sm"
            >
              {saving ? 'Menyimpan...' : 'Simpan Pengaturan Legal & Cookie'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
