'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import ImageUploader from '@/components/ImageUploader';
import AddressLocationSelector, { SelectedLocationData } from '@/components/AddressLocationSelector';
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

interface AiForm {
  aiProvider: 'GEMINI' | 'OPENAI';
  aiApiKey: string;
  aiModel: string;
  aiCustomPrompt: string;
}

const EMPTY_AI_FORM: AiForm = {
  aiProvider: 'GEMINI',
  aiApiKey: '',
  aiModel: 'gemini-2.5-flash',
  aiCustomPrompt: '',
};

interface AvailableAiModel {
  id: string;
  name: string;
  description?: string;
  isRecommended?: boolean;
}

const DEFAULT_GEMINI_MODELS: AvailableAiModel[] = [
  { id: 'gemini-2.5-flash', name: 'gemini-2.5-flash (Generasi Terbaru - Super Cepat & Cerdas)', isRecommended: true },
  { id: 'gemini-2.5-pro', name: 'gemini-2.5-pro (Penalaran Kompleks & Analisis Mendalam)' },
  { id: 'gemini-2.0-flash', name: 'gemini-2.0-flash (Multimodal Kecepatan Tinggi)' },
  { id: 'gemini-1.5-flash', name: 'gemini-1.5-flash (Model Cepat Stabil, Kuota Gratis)' },
  { id: 'gemini-1.5-pro', name: 'gemini-1.5-pro (Penalaran Panjang 1M Token)' },
];

const DEFAULT_OPENAI_MODELS: AvailableAiModel[] = [
  { id: 'gpt-4o-mini', name: 'gpt-4o-mini (Cepat, Ringan & Hemat Biaya)', isRecommended: true },
  { id: 'gpt-4o', name: 'gpt-4o (Model Flagship Cerdas Multimodal)' },
  { id: 'o3-mini', name: 'o3-mini (Model Penalaran Reasoning Terbaru)' },
  { id: 'o1-mini', name: 'o1-mini (Model Penalaran Cepat STEM)' },
  { id: 'gpt-4-turbo', name: 'gpt-4-turbo (Model GPT-4 Konteks 128k)' },
];

interface NotificationForm {
  notifyTelegramEnabled: boolean;
  notifyTelegramBotToken: string;
  notifyTelegramChatId: string;
  notifyWhatsappEnabled: boolean;
  notifyWhatsappProvider: 'FONNTE' | 'GENERIC_WEBHOOK';
  notifyWhatsappToken: string;
  notifyWhatsappTargetPhone: string;
  notifyLowStockThreshold: number;
  notifyOnNewOrder: boolean;
  notifyOnPaymentProof: boolean;
  notifyOnPaymentSuccess: boolean;
  notifyOnLowStock: boolean;
}

const EMPTY_NOTIFICATION_FORM: NotificationForm = {
  notifyTelegramEnabled: false,
  notifyTelegramBotToken: '',
  notifyTelegramChatId: '',
  notifyWhatsappEnabled: false,
  notifyWhatsappProvider: 'FONNTE',
  notifyWhatsappToken: '',
  notifyWhatsappTargetPhone: '',
  notifyLowStockThreshold: 3,
  notifyOnNewOrder: true,
  notifyOnPaymentProof: true,
  notifyOnPaymentSuccess: true,
  notifyOnLowStock: true,
};

interface ShippingForm {
  shippingOriginCity: string;
  shippingFlatRateInner: number;
  shippingFlatRateOuter: number;
  shippingFreeThreshold: number | '';
  // Ekspedisi Otomatis Biteship API
  biteshipEnabled: boolean;
  biteshipApiKey: string;
  biteshipSandbox: boolean;
  biteshipOriginAreaId: string;
  biteshipOriginAddress: string;
  biteshipOriginPostalCode: string;
  biteshipOriginContactName: string;
  biteshipOriginContactPhone: string;
  biteshipEnabledCouriers: string;
}

const EMPTY_SHIPPING_FORM: ShippingForm = {
  shippingOriginCity: '',
  shippingFlatRateInner: 0,
  shippingFlatRateOuter: 0,
  shippingFreeThreshold: '',
  biteshipEnabled: false,
  biteshipApiKey: '',
  biteshipSandbox: true,
  biteshipOriginAreaId: '',
  biteshipOriginAddress: '',
  biteshipOriginPostalCode: '',
  biteshipOriginContactName: '',
  biteshipOriginContactPhone: '',
  biteshipEnabledCouriers: 'jne,sicepat,jnt,anteraja,tiki,pos',
};

interface EmailForm {
  smtpEnabled: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPass: string;
  smtpFromName: string;
  smtpFromEmail: string;
  smtpReplyTo: string;
  smtpVerified: boolean;
  smtpVerifiedAt: string | null;
}

const EMPTY_EMAIL_FORM: EmailForm = {
  smtpEnabled: false,
  smtpHost: '',
  smtpPort: 587,
  smtpSecure: false,
  smtpUser: '',
  smtpPass: '',
  smtpFromName: '',
  smtpFromEmail: '',
  smtpReplyTo: '',
  smtpVerified: false,
  smtpVerifiedAt: null,
};

type SettingsTab = 'general' | 'hero' | 'theme' | 'integrations' | 'legal' | 'ai' | 'notifications' | 'shipping' | 'email';

interface SettingsCategory {
  id: SettingsTab;
  title: string;
  subtitle: string;
  icon: string;
  badge?: string;
}

const SETTINGS_CATEGORIES: SettingsCategory[] = [
  {
    id: 'general',
    title: 'Identitas & Kontak',
    subtitle: 'Profil toko, kontak, dan logo',
    icon: '🏢',
  },
  {
    id: 'hero',
    title: 'Hero Section Builder',
    subtitle: 'Headline, banner & tombol CTA',
    icon: '🖼️',
  },
  {
    id: 'theme',
    title: 'Tema Warna & Font',
    subtitle: 'Warna brand & tipografi',
    icon: '🎨',
  },
  {
    id: 'shipping',
    title: 'Tarif Ongkir Manual',
    subtitle: 'Biaya kirim dalam & luar kota',
    icon: '🚚',
    badge: 'Baru',
  },
  {
    id: 'integrations',
    title: 'Pixel & Keamanan',
    subtitle: 'Meta Pixel, Turnstile, & Sandbox',
    icon: '🛡️',
  },
  {
    id: 'legal',
    title: 'Legal & Cookie',
    subtitle: 'Syarat ketentuan & banner privasi',
    icon: '📄',
  },
  {
    id: 'ai',
    title: 'AI Assistant (BYOK)',
    subtitle: 'Model AI, API Key, & Copilot Toko',
    icon: '✨',
    badge: 'Baru',
  },
  {
    id: 'notifications',
    title: 'Notifikasi Otomatis',
    subtitle: 'Alert pesanan WhatsApp & Telegram',
    icon: '📲',
    badge: 'Baru',
  },
  {
    id: 'email',
    title: 'Email & SMTP',
    subtitle: 'Server SMTP, verifikasi domain & DNS',
    icon: '✉️',
    badge: 'Baru',
  },
];

function AdminSettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab') as SettingsTab | null;
  const initialTab: SettingsTab =
    tabParam && SETTINGS_CATEGORIES.some((c) => c.id === tabParam)
      ? tabParam
      : 'general';

  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);

  useEffect(() => {
    if (tabParam && SETTINGS_CATEGORIES.some((c) => c.id === tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (newTab: SettingsTab) => {
    setActiveTab(newTab);
    router.replace(`/admin/settings?tab=${newTab}`, { scroll: false });
  };
  const [storeForm, setStoreForm] = useState<StoreForm>(EMPTY_STORE_FORM);
  const [heroForm, setHeroForm] = useState<HeroForm>(EMPTY_HERO_FORM);
  const [themeForm, setThemeForm] = useState<ThemeForm>(EMPTY_THEME_FORM);
  const [analyticsForm, setAnalyticsForm] = useState<AnalyticsForm>(EMPTY_ANALYTICS);
  const [turnstileForm, setTurnstileForm] = useState<TurnstileForm>(EMPTY_TURNSTILE);
  const [paymentForm, setPaymentForm] = useState<PaymentForm>(EMPTY_PAYMENT_FORM);
  const [legalForm, setLegalForm] = useState<LegalForm>(EMPTY_LEGAL_FORM);
  const [aiForm, setAiForm] = useState<AiForm>(EMPTY_AI_FORM);
  const [showAiApiKey, setShowAiApiKey] = useState(false);
  const [fetchingAiModels, setFetchingAiModels] = useState(false);
  const [aiModelsNotice, setAiModelsNotice] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [fetchedAiModels, setFetchedAiModels] = useState<Record<'GEMINI' | 'OPENAI', AvailableAiModel[]>>({
    GEMINI: DEFAULT_GEMINI_MODELS,
    OPENAI: DEFAULT_OPENAI_MODELS,
  });
  const [isCustomAiModel, setIsCustomAiModel] = useState(false);
  const [notificationForm, setNotificationForm] = useState<NotificationForm>(EMPTY_NOTIFICATION_FORM);
  const [shippingForm, setShippingForm] = useState<ShippingForm>(EMPTY_SHIPPING_FORM);
  const [emailForm, setEmailForm] = useState<EmailForm>(EMPTY_EMAIL_FORM);
  const [showSmtpPass, setShowSmtpPass] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [sendingVerification, setSendingVerification] = useState(false);
  const [confirmingCode, setConfirmingCode] = useState(false);
  const [verificationNotice, setVerificationNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [testRecipient, setTestRecipient] = useState('');
  const [testingEmail, setTestingEmail] = useState(false);
  const [emailTestResult, setEmailTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [checkingDns, setCheckingDns] = useState(false);
  const [dnsResult, setDnsResult] = useState<any | null>(null);

  const [testingAi, setTestingAi] = useState(false);
  const [aiTestResult, setAiTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const [testingNotify, setTestingNotify] = useState<'TELEGRAM' | 'WHATSAPP' | null>(null);
  const [notifyTestResult, setNotifyTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordChangeNotice, setPasswordChangeNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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

        const savedProvider = (s.aiProvider as 'GEMINI' | 'OPENAI') || 'GEMINI';
        const defaultModel = savedProvider === 'OPENAI' ? 'gpt-4o-mini' : 'gemini-2.5-flash';
        const savedModel = s.aiModel || defaultModel;
        setAiForm({
          aiProvider: savedProvider,
          aiApiKey: s.aiApiKey || '',
          aiModel: savedModel,
          aiCustomPrompt: s.aiCustomPrompt || '',
        });
        const currentList = savedProvider === 'OPENAI' ? DEFAULT_OPENAI_MODELS : DEFAULT_GEMINI_MODELS;
        const existsInList = currentList.some((m) => m.id === savedModel);
        if (!existsInList && savedModel) {
          setIsCustomAiModel(true);
        }

        setNotificationForm({
          notifyTelegramEnabled: s.notifyTelegramEnabled ?? false,
          notifyTelegramBotToken: s.notifyTelegramBotToken || '',
          notifyTelegramChatId: s.notifyTelegramChatId || '',
          notifyWhatsappEnabled: s.notifyWhatsappEnabled ?? false,
          notifyWhatsappProvider: s.notifyWhatsappProvider || 'FONNTE',
          notifyWhatsappToken: s.notifyWhatsappToken || '',
          notifyWhatsappTargetPhone: s.notifyWhatsappTargetPhone || '',
          notifyLowStockThreshold: s.notifyLowStockThreshold ?? 3,
          notifyOnNewOrder: s.notifyOnNewOrder ?? true,
          notifyOnPaymentProof: s.notifyOnPaymentProof ?? true,
          notifyOnPaymentSuccess: s.notifyOnPaymentSuccess ?? true,
          notifyOnLowStock: s.notifyOnLowStock ?? true,
        });

        setShippingForm({
          shippingOriginCity: s.shippingOriginCity || '',
          shippingFlatRateInner: typeof s.shippingFlatRateInner === 'number' ? s.shippingFlatRateInner : 0,
          shippingFlatRateOuter: typeof s.shippingFlatRateOuter === 'number' ? s.shippingFlatRateOuter : 0,
          shippingFreeThreshold: typeof s.shippingFreeThreshold === 'number' ? s.shippingFreeThreshold : '',
          biteshipEnabled: Boolean(s.biteshipEnabled),
          biteshipApiKey: s.biteshipApiKey || '',
          biteshipSandbox: s.biteshipSandbox ?? true,
          biteshipOriginAreaId: s.biteshipOriginAreaId || '',
          biteshipOriginAddress: s.biteshipOriginAddress || '',
          biteshipOriginPostalCode: s.biteshipOriginPostalCode || '',
          biteshipOriginContactName: s.biteshipOriginContactName || '',
          biteshipOriginContactPhone: s.biteshipOriginContactPhone || '',
          biteshipEnabledCouriers: s.biteshipEnabledCouriers || 'jne,sicepat,jnt,anteraja,tiki,pos',
        });

        setEmailForm({
          smtpEnabled: Boolean(s.smtpEnabled),
          smtpHost: s.smtpHost || '',
          smtpPort: s.smtpPort || 587,
          smtpSecure: Boolean(s.smtpSecure),
          smtpUser: s.smtpUser || '',
          smtpPass: s.smtpPass || '',
          smtpFromName: s.smtpFromName || '',
          smtpFromEmail: s.smtpFromEmail || '',
          smtpReplyTo: s.smtpReplyTo || '',
          smtpVerified: Boolean(s.smtpVerified),
          smtpVerifiedAt: s.smtpVerifiedAt || null,
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

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordChangeNotice(null);

    if (passwordForm.newPassword.length < 6) {
      setPasswordChangeNotice({ type: 'error', text: 'Password baru minimal 6 karakter.' });
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordChangeNotice({ type: 'error', text: 'Konfirmasi password baru tidak cocok.' });
      return;
    }

    setChangingPassword(true);
    try {
      const headers = authHeaders();
      if (!headers) {
        setPasswordChangeNotice({ type: 'error', text: 'Anda harus login terlebih dahulu.' });
        return;
      }

      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(passwordForm),
      });

      const data = await res.json();
      if (!res.ok) {
        setPasswordChangeNotice({ type: 'error', text: data.error || 'Gagal memperbarui password.' });
        return;
      }

      setPasswordChangeNotice({ type: 'success', text: data.message || 'Password berhasil diperbarui!' });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch {
      setPasswordChangeNotice({ type: 'error', text: 'Terjadi gangguan jaringan saat mengubah password.' });
    } finally {
      setChangingPassword(false);
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

  const saveShipping = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      const headers = authHeaders();
      if (!headers) throw new Error('Anda harus login terlebih dahulu.');

      const payload = {
        shippingOriginCity: shippingForm.shippingOriginCity ? shippingForm.shippingOriginCity.trim() : null,
        shippingFlatRateInner: Number(shippingForm.shippingFlatRateInner) || 0,
        shippingFlatRateOuter: Number(shippingForm.shippingFlatRateOuter) || 0,
        shippingFreeThreshold:
          shippingForm.shippingFreeThreshold !== '' && Number(shippingForm.shippingFreeThreshold) > 0
            ? Number(shippingForm.shippingFreeThreshold)
            : null,
        biteshipEnabled: Boolean(shippingForm.biteshipEnabled),
        biteshipApiKey: shippingForm.biteshipApiKey ? shippingForm.biteshipApiKey.trim() : null,
        biteshipSandbox: Boolean(shippingForm.biteshipSandbox),
        biteshipOriginAreaId: shippingForm.biteshipOriginAreaId ? shippingForm.biteshipOriginAreaId.trim() : null,
        biteshipOriginAddress: shippingForm.biteshipOriginAddress ? shippingForm.biteshipOriginAddress.trim() : null,
        biteshipOriginPostalCode: shippingForm.biteshipOriginPostalCode ? shippingForm.biteshipOriginPostalCode.trim() : null,
        biteshipOriginContactName: shippingForm.biteshipOriginContactName ? shippingForm.biteshipOriginContactName.trim() : null,
        biteshipOriginContactPhone: shippingForm.biteshipOriginContactPhone ? shippingForm.biteshipOriginContactPhone.trim() : null,
        biteshipEnabledCouriers: shippingForm.biteshipEnabledCouriers ? shippingForm.biteshipEnabledCouriers.trim() : 'jne,sicepat,jnt,anteraja,tiki,pos',
      };

      const res = await fetch('/api/admin/settings/general', {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Gagal menyimpan pengaturan tarif ongkir.');
      }

      setNotice('Pengaturan tarif ongkir manual berhasil disimpan.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat menyimpan pengaturan ongkir.');
    } finally {
      setSaving(false);
    }
  };

  const saveEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      const headers = authHeaders();
      if (!headers) throw new Error('Anda harus login terlebih dahulu.');

      const payload = {
        smtpEnabled: Boolean(emailForm.smtpEnabled),
        smtpHost: emailForm.smtpHost ? emailForm.smtpHost.trim() : null,
        smtpPort: Number(emailForm.smtpPort) || 587,
        smtpSecure: Boolean(emailForm.smtpSecure),
        smtpUser: emailForm.smtpUser ? emailForm.smtpUser.trim() : null,
        smtpPass: emailForm.smtpPass ? emailForm.smtpPass.trim() : null,
        smtpFromName: emailForm.smtpFromName ? emailForm.smtpFromName.trim() : null,
        smtpFromEmail: emailForm.smtpFromEmail ? emailForm.smtpFromEmail.trim() : null,
        smtpReplyTo: emailForm.smtpReplyTo ? emailForm.smtpReplyTo.trim() : null,
      };

      const res = await fetch('/api/admin/settings/general', {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Gagal menyimpan konfigurasi server SMTP.');
      }

      setNotice('Konfigurasi server SMTP berhasil disimpan!');
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat menyimpan pengaturan email.');
    } finally {
      setSaving(false);
    }
  };

  const handleSendVerificationCode = async () => {
    if (!emailForm.smtpFromEmail) {
      setVerificationNotice({ type: 'error', text: 'Masukkan alamat email pengirim terlebih dahulu' });
      return;
    }
    setSendingVerification(true);
    setVerificationNotice(null);
    try {
      const headers = authHeaders();
      const res = await fetch('/api/admin/settings/email/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          email: emailForm.smtpFromEmail,
          host: emailForm.smtpHost,
          port: Number(emailForm.smtpPort),
          secure: emailForm.smtpSecure,
          user: emailForm.smtpUser,
          pass: emailForm.smtpPass,
          fromName: emailForm.smtpFromName,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mengirim kode verifikasi');
      setVerificationNotice({ type: 'success', text: data.message });
    } catch (err: any) {
      setVerificationNotice({ type: 'error', text: err.message || 'Gagal mengirim kode verifikasi' });
    } finally {
      setSendingVerification(false);
    }
  };

  const handleConfirmVerificationCode = async () => {
    if (!verificationCode) {
      setVerificationNotice({ type: 'error', text: 'Masukkan 6-digit kode verifikasi' });
      return;
    }
    setConfirmingCode(true);
    setVerificationNotice(null);
    try {
      const headers = authHeaders();
      const res = await fetch('/api/admin/settings/email/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ code: verificationCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Kode verifikasi tidak valid');
      setVerificationNotice({ type: 'success', text: data.message });
      setEmailForm((prev) => ({ ...prev, smtpVerified: true, smtpVerifiedAt: new Date().toISOString() }));
      setVerificationCode('');
    } catch (err: any) {
      setVerificationNotice({ type: 'error', text: err.message || 'Gagal memverifikasi kode' });
    } finally {
      setConfirmingCode(false);
    }
  };

  const handleCheckDns = async () => {
    const domain = emailForm.smtpFromEmail ? emailForm.smtpFromEmail.split('@')[1] : '';
    if (!domain) {
      setError('Masukkan alamat email pengirim yang valid untuk memeriksa DNS domain');
      return;
    }
    setCheckingDns(true);
    setError(null);
    try {
      const headers = authHeaders();
      const res = await fetch('/api/admin/settings/email/check-dns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ domain }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memeriksa DNS domain');
      setDnsResult(data.dns);
    } catch (err: any) {
      setError(err.message || 'Gagal memeriksa DNS domain');
    } finally {
      setCheckingDns(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testRecipient) {
      setEmailTestResult({ success: false, message: 'Masukkan alamat email penerima uji coba' });
      return;
    }
    setTestingEmail(true);
    setEmailTestResult(null);
    try {
      const headers = authHeaders();
      const res = await fetch('/api/admin/settings/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          recipient: testRecipient,
          host: emailForm.smtpHost,
          port: Number(emailForm.smtpPort),
          secure: emailForm.smtpSecure,
          user: emailForm.smtpUser,
          pass: emailForm.smtpPass,
          fromName: emailForm.smtpFromName,
          fromEmail: emailForm.smtpFromEmail,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mengirim email uji coba');
      setEmailTestResult({ success: true, message: data.message });
    } catch (err: any) {
      setEmailTestResult({ success: false, message: err.message || 'Error pengiriman email uji coba' });
    } finally {
      setTestingEmail(false);
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

  const saveAi = async (e: React.FormEvent) => {
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
        body: JSON.stringify(aiForm),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Gagal menyimpan pengaturan AI.');
      }

      setNotice('Pengaturan Asisten AI (BYOK) berhasil disimpan.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat menyimpan.');
    } finally {
      setSaving(false);
    }
  };

  const handleTestAi = async () => {
    setTestingAi(true);
    setAiTestResult(null);

    try {
      const headers = authHeaders();
      if (!headers) throw new Error('Anda harus login terlebih dahulu.');

      const res = await fetch('/api/admin/ai/test', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: aiForm.aiProvider,
          apiKey: aiForm.aiApiKey,
          model: aiForm.aiModel,
        }),
      });

      const data = await res.json();
      setAiTestResult({
        success: res.ok && data.success,
        message: data.message || (res.ok ? 'Koneksi AI berhasil!' : 'Gagal terhubung ke AI.'),
      });
    } catch (err: any) {
      setAiTestResult({
        success: false,
        message: err.message || 'Gagal menguji koneksi AI.',
      });
    } finally {
      setTestingAi(false);
    }
  };

  const handleFetchAiModels = async () => {
    setFetchingAiModels(true);
    setAiModelsNotice(null);
    try {
      const headers = authHeaders();
      if (!headers) throw new Error('Anda harus login terlebih dahulu.');

      const res = await fetch('/api/admin/ai/models', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: aiForm.aiProvider,
          apiKey: aiForm.aiApiKey,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setAiModelsNotice({
          type: 'error',
          text: data.error || 'Gagal memuat daftar model dari provider. Menampilkan daftar standar.',
        });
        if (data.models && data.models.length > 0) {
          setFetchedAiModels((prev) => ({
            ...prev,
            [aiForm.aiProvider]: data.models,
          }));
        }
      } else {
        const models: AvailableAiModel[] = data.models || [];
        setFetchedAiModels((prev) => ({
          ...prev,
          [aiForm.aiProvider]: models,
        }));
        setAiModelsNotice({
          type: 'success',
          text: `Berhasil memuat ${models.length} model aktif dari ${aiForm.aiProvider === 'GEMINI' ? 'Google Gemini' : 'OpenAI'}!`,
        });

        // If current model is not found in fetched models and not custom, switch to recommended or first
        const exists = models.some((m) => m.id === aiForm.aiModel);
        if (!exists && models.length > 0 && !isCustomAiModel) {
          const rec = models.find((m) => m.isRecommended) || models[0];
          setAiForm((prev) => ({ ...prev, aiModel: rec.id }));
        }
      }
    } catch (err: any) {
      setAiModelsNotice({
        type: 'error',
        text: err.message || 'Terjadi kesalahan saat memuat model AI.',
      });
    } finally {
      setFetchingAiModels(false);
    }
  };

  const saveNotifications = async (e: React.FormEvent) => {
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
        body: JSON.stringify(notificationForm),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Gagal menyimpan pengaturan notifikasi.');
      }

      setNotice('Pengaturan Notifikasi Pesanan berhasil disimpan.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat menyimpan.');
    } finally {
      setSaving(false);
    }
  };

  const handleTestNotification = async (channel: 'TELEGRAM' | 'WHATSAPP') => {
    setTestingNotify(channel);
    setNotifyTestResult(null);

    try {
      const headers = authHeaders();
      if (!headers) throw new Error('Anda harus login terlebih dahulu.');

      const res = await fetch('/api/admin/notifications/test', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel,
          telegramBotToken: notificationForm.notifyTelegramBotToken,
          telegramChatId: notificationForm.notifyTelegramChatId,
          whatsappProvider: notificationForm.notifyWhatsappProvider,
          whatsappToken: notificationForm.notifyWhatsappToken,
          whatsappTargetPhone: notificationForm.notifyWhatsappTargetPhone,
        }),
      });

      const data = await res.json();
      setNotifyTestResult({
        success: res.ok && data.success,
        message: data.message || (res.ok ? 'Notifikasi uji coba berhasil dikirim!' : 'Gagal mengirim notifikasi uji coba.'),
      });
    } catch (err: any) {
      setNotifyTestResult({
        success: false,
        message: err.message || 'Gagal mengirim notifikasi uji coba.',
      });
    } finally {
      setTestingNotify(null);
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
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
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

      {/* Mobile Navigation Dropdown (< md) */}
      <div className="block md:hidden">
        <label htmlFor="settings-mobile-nav" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Kategori Pengaturan
        </label>
        <div className="relative">
          <select
            id="settings-mobile-nav"
            value={activeTab}
            onChange={(e) => handleTabChange(e.target.value as SettingsTab)}
            className="w-full bg-white border border-gray-300 rounded-xl py-3 px-4 text-sm font-medium text-gray-900 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 appearance-none pr-10"
          >
            {SETTINGS_CATEGORIES.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.icon} {cat.title} {cat.badge ? `(${cat.badge})` : ''}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-gray-500">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {/* Main Grid: Kolom Kiri (Navigasi Vertikal) + Kolom Kanan (Konten Formulir) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Kolom Kiri: Sidebar Pengaturan Vertikal (Desktop >= md) */}
        <aside className="hidden md:block md:col-span-4 lg:col-span-3 sticky top-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-2.5 space-y-1">
            <div className="px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
              Menu Pengaturan
            </div>
            {SETTINGS_CATEGORIES.map((cat) => {
              const isActive = activeTab === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleTabChange(cat.id)}
                  className={`w-full text-left p-3 rounded-xl transition-all flex items-start space-x-3 ${
                    isActive
                      ? 'bg-indigo-50/80 text-indigo-700 font-semibold border border-indigo-200/70 shadow-xs'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 border border-transparent'
                  }`}
                >
                  <span className="text-xl flex-shrink-0 mt-0.5">{cat.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium truncate">{cat.title}</span>
                      {cat.badge && (
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ml-1.5 flex-shrink-0 ${
                            isActive ? 'bg-indigo-200 text-indigo-800' : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {cat.badge}
                        </span>
                      )}
                    </div>
                    <p className={`text-xs mt-0.5 line-clamp-1 ${isActive ? 'text-indigo-600/80' : 'text-gray-400'}`}>
                      {cat.subtitle}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Kolom Kanan: Konten Formulir */}
        <div className="md:col-span-8 lg:col-span-9 space-y-6">

      {/* TAB 1: IDENTITAS TOKO */}
      {activeTab === 'general' && (
        <>
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

        {/* KARTU KEAMANAN AKUN & GANTI PASSWORD ADMIN */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
          <div className="border-b border-gray-100 pb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <span>🔐</span> Keamanan Akun & Ganti Password Admin
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Perbarui kata sandi akun administrator Anda secara mandiri untuk menjaga keamanan akses toko.
            </p>
          </div>

          {passwordChangeNotice && (
            <div
              className={`p-3 text-sm rounded-lg ${
                passwordChangeNotice.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  : 'bg-red-50 border border-red-200 text-red-700'
              }`}
            >
              {passwordChangeNotice.text}
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4 max-w-xl">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kata Sandi Saat Ini
              </label>
              <input
                type="password"
                required
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                placeholder="Ketik kata sandi Anda saat ini"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-indigo-500 focus:ring-indigo-500"
                disabled={changingPassword}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kata Sandi Baru
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  placeholder="Minimal 6 karakter"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-indigo-500 focus:ring-indigo-500"
                  disabled={changingPassword}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Konfirmasi Kata Sandi Baru
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  placeholder="Ulangi kata sandi baru"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-indigo-500 focus:ring-indigo-500"
                  disabled={changingPassword}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={changingPassword || !passwordForm.currentPassword || !passwordForm.newPassword}
              className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors shadow-xs"
            >
              {changingPassword ? 'Memperbarui...' : 'Perbarui Password Admin'}
            </button>
          </form>
        </div>
        </>
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
            <div className="border-b border-gray-100 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Cloudflare Turnstile (Anti-Bot / CAPTCHA)</h2>
                <p className="text-sm text-gray-500">
                  Melindungi seluruh halaman publik, form login/register/lupa password, cek ongkir, dan katalog dari bot scraper serta DDoS ringan.
                </p>
              </div>
              {turnstileForm.turnstileEnabled && turnstileForm.turnstileSiteKey.trim() && turnstileForm.turnstileSecretKey.trim() ? (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
                  🟢 PROTEKSI AKTIF DI SEMUA PATH PUBLIK
                </span>
              ) : turnstileForm.turnstileEnabled ? (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 whitespace-nowrap">
                  🟡 MENUNGGU SITE KEY &amp; SECRET KEY
                </span>
              ) : (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200 whitespace-nowrap">
                  ⚪ BELUM DIAKTIFKAN
                </span>
              )}
            </div>

            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-3 text-sm text-slate-700">
              <div className="font-semibold text-slate-900 flex items-center gap-2">
                <span>📖</span>
                <span>Panduan Cara Mendapatkan &amp; Mengaktifkan Cloudflare Turnstile Key</span>
              </div>
              <ol className="list-decimal list-inside space-y-1.5 text-xs sm:text-sm text-slate-600">
                <li>
                  Masuk ke{' '}
                  <a
                    href="https://dash.cloudflare.com"
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-600 font-medium underline hover:text-indigo-800"
                  >
                    Cloudflare Dashboard
                  </a>
                  , pilih menu <strong>Turnstile</strong> di sidebar kiri, lalu klik <strong>Add widget</strong>.
                </li>
                <li>
                  Isi nama widget (misal: <em>Proteksi Toko Online</em>) dan tambahkan domain toko Anda di{' '}
                  <strong>Add Hostnames</strong> (misal: <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-xs">demo.larismanis.online</code> atau domain kustom toko Anda).
                </li>
                <li>
                  Pilih Widget Mode <strong>Managed (Recommended)</strong> agar pengunjung manusia terverifikasi otomatis tanpa puzzle mengganggu, lalu klik <strong>Create</strong>.
                </li>
                <li>
                  Salin <strong>Site Key</strong> (diawali <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-xs">0x4...</code>) dan <strong>Secret Key</strong> ke dua kolom di bawah ini, centang kotak aktivasi, lalu klik <strong>Simpan Turnstile</strong>.
                </li>
              </ol>
              <div className="pt-2 border-t border-slate-200 text-xs text-slate-600 leading-relaxed">
                <strong>Cakupan Proteksi Global &amp; Kenyamanan Pembeli:</strong> Setelah aktif, sistem otomatis memasang pelindung di seluruh path publik (Beranda <code className="bg-white px-1 rounded">/</code>, Katalog <code className="bg-white px-1 rounded">/products</code>, Detail Produk <code className="bg-white px-1 rounded">/product/*</code>, Kategori, Artikel, Penawaran/LP, Login/Register/Lupa Password, serta API Cek Ongkir &amp; Checkout). Pembeli cukup lolos verifikasi 1x dan mendapatkan cookie sesi terenkripsi <code className="bg-white px-1 rounded">cf_turnstile_pass</code> berlaku <strong>2 jam</strong> agar bebas menjelajah tanpa gangguan ulang.
              </div>
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
                Aktifkan proteksi bot Cloudflare Turnstile di seluruh path publik
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
                <p className="mt-1 text-xs text-gray-400">Kunci publik yang digunakan widget Turnstile di browser pengunjung.</p>
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
                <p className="mt-1 text-xs text-gray-400">Kunci rahasia server-side untuk memvalidasi token anti-bot ke Cloudflare.</p>
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

      {/* TAB 6: AI ASSISTANT (BYOK) */}
      {activeTab === 'ai' && (
        <form onSubmit={saveAi} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
          <div className="border-b border-gray-100 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                <span>✨ Integrasi AI Assistant (Bring Your Own Key)</span>
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Hubungkan API Key AI toko Anda untuk mengaktifkan AI Copilot di panel kanan, generator copywriting, dan analisa penjualan.
              </p>
            </div>
            {aiForm.aiProvider === 'GEMINI' ? (
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-medium rounded-lg hover:bg-blue-100 transition shrink-0"
              >
                <span>🔑 Dapatkan Gemini API Key Gratis di Google AI Studio</span>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            ) : (
              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium rounded-lg hover:bg-emerald-100 transition shrink-0"
              >
                <span>🔑 Dapatkan OpenAI API Key di OpenAI Platform</span>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                Provider AI
              </label>
              <select
                value={aiForm.aiProvider}
                onChange={(e) => {
                  const prov = e.target.value as 'GEMINI' | 'OPENAI';
                  const defaultModel = prov === 'GEMINI' ? 'gemini-2.5-flash' : 'gpt-4o-mini';
                  setAiForm({
                    ...aiForm,
                    aiProvider: prov,
                    aiModel: defaultModel,
                  });
                  setIsCustomAiModel(false);
                  setAiTestResult(null);
                  setAiModelsNotice(null);
                }}
                className="w-full text-sm border-gray-300 rounded-lg shadow-2xs focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="GEMINI">Google Gemini (Disarankan - Model Generasi Terbaru & Kuota Gratis)</option>
                <option value="OPENAI">OpenAI (ChatGPT / GPT-4o / Reasoning)</option>
              </select>
              <p className="text-xs text-gray-400 mt-1.5">
                {aiForm.aiProvider === 'GEMINI'
                  ? 'Google Gemini menyediakan kuota Free Tier resmi yang sangat besar tanpa biaya langganan bulanan.'
                  : 'OpenAI memerlukan akun OpenAI Platform dengan saldo kredit aktif untuk penggunaan API.'}
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Pilihan Model AI
                </label>
                <button
                  type="button"
                  onClick={handleFetchAiModels}
                  disabled={fetchingAiModels || !aiForm.aiApiKey}
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-800 disabled:opacity-40 flex items-center space-x-1"
                  title="Ambil daftar model aktif langsung dari API provider"
                >
                  {fetchingAiModels ? (
                    <>
                      <div className="w-3 h-3 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                      <span>Memuat Model...</span>
                    </>
                  ) : (
                    <span>🔄 Tarik Model Tersedia</span>
                  )}
                </button>
              </div>

              {!isCustomAiModel ? (
                <select
                  value={aiForm.aiModel}
                  onChange={(e) => {
                    if (e.target.value === '__custom__') {
                      setIsCustomAiModel(true);
                    } else {
                      setAiForm({ ...aiForm, aiModel: e.target.value });
                    }
                  }}
                  className="w-full text-sm border-gray-300 rounded-lg shadow-2xs focus:ring-indigo-500 focus:border-indigo-500"
                >
                  {(fetchedAiModels[aiForm.aiProvider] || []).map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name || m.id} {m.isRecommended ? '⭐ (Rekomendasi)' : ''}
                    </option>
                  ))}
                  <option value="__custom__">➕ Ketik ID Model Manual / Eksperimental...</option>
                </select>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={aiForm.aiModel}
                      onChange={(e) => setAiForm({ ...aiForm, aiModel: e.target.value.trim() })}
                      placeholder="Contoh: gemini-2.5-flash atau gpt-4o-mini"
                      className="flex-1 text-sm font-mono border-gray-300 rounded-lg shadow-2xs focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomAiModel(false);
                        const firstModel =
                          (fetchedAiModels[aiForm.aiProvider] || [])[0]?.id ||
                          (aiForm.aiProvider === 'GEMINI' ? 'gemini-2.5-flash' : 'gpt-4o-mini');
                        setAiForm({ ...aiForm, aiModel: firstModel });
                      }}
                      className="text-xs px-2.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition"
                    >
                      Kembali ke Pilihan
                    </button>
                  </div>
                  <p className="text-xs text-gray-400">
                    Mode input manual aktif. Anda dapat memasukkan ID model eksperimental atau fine-tuned model Anda.
                  </p>
                </div>
              )}

              <p className="text-xs text-gray-500 mt-1.5 flex items-center justify-between">
                <span>
                  Model aktif:{' '}
                  <span className="font-mono text-indigo-600 font-semibold">{aiForm.aiModel}</span>
                </span>
                {aiForm.aiApiKey && (
                  <span className="text-[11px] text-gray-400">
                    Klik &quot;Tarik Model Tersedia&quot; untuk sinkronisasi daftar API
                  </span>
                )}
              </p>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                API Key ({aiForm.aiProvider})
              </label>
              <button
                type="button"
                onClick={handleTestAi}
                disabled={testingAi || !aiForm.aiApiKey}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-800 disabled:opacity-40 flex items-center space-x-1"
              >
                {testingAi ? (
                  <>
                    <div className="w-3 h-3 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    <span>Menguji Koneksi...</span>
                  </>
                ) : (
                  <span>⚡ Uji Koneksi API Key</span>
                )}
              </button>
            </div>

            <div className="relative">
              <input
                type={showAiApiKey ? 'text' : 'password'}
                value={aiForm.aiApiKey}
                onChange={(e) => setAiForm({ ...aiForm, aiApiKey: e.target.value.trim() })}
                placeholder={aiForm.aiProvider === 'GEMINI' ? 'AIzaSy...' : 'sk-...'}
                className="w-full text-sm font-mono border-gray-300 rounded-lg shadow-2xs pr-10 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={() => setShowAiApiKey(!showAiApiKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-hidden p-1"
                title={showAiApiKey ? 'Sembunyikan API Key' : 'Tampilkan API Key'}
              >
                {showAiApiKey ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"
                    />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                )}
              </button>
            </div>

            {aiForm.aiApiKey === '********' ? (
              <p className="text-xs text-emerald-600 mt-1.5 flex items-center space-x-1">
                <span>🔒</span>
                <span>API Key tersimpan dengan aman di database. Ketik atau tempel kunci baru jika Anda ingin menggantinya.</span>
              </p>
            ) : (
              <p className="text-xs text-gray-400 mt-1.5">
                API Key disimpan terenkripsi di database toko Anda dan tidak dibagikan ke toko lain (Multi-Tenant BYOK).
              </p>
            )}

            {aiModelsNotice && (
              <div
                className={`mt-2 p-2.5 rounded-lg text-xs flex items-center space-x-2 ${
                  aiModelsNotice.type === 'success'
                    ? 'bg-blue-50 text-blue-800 border border-blue-200'
                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                }`}
              >
                <span>{aiModelsNotice.type === 'success' ? 'ℹ️' : '⚠️'}</span>
                <span>{aiModelsNotice.text}</span>
              </div>
            )}

            {aiTestResult && (
              <div
                className={`mt-2 p-2.5 rounded-lg text-xs flex items-center space-x-2 ${
                  aiTestResult.success
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}
              >
                <span>{aiTestResult.success ? '✅' : '❌'}</span>
                <span>{aiTestResult.message}</span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
              Persona & Gaya Bahasa Toko (Custom Prompt)
            </label>
            <textarea
              rows={3}
              value={aiForm.aiCustomPrompt}
              onChange={(e) => setAiForm({ ...aiForm, aiCustomPrompt: e.target.value })}
              placeholder="Contoh: Gunakan sapaan 'Kakak', gaya bicara santai, ceria, dan ramah. Tekankan bahwa semua produk kami berbahan 100% organik dan bergaransi resmi."
              className="w-full text-sm border-gray-300 rounded-lg shadow-2xs focus:ring-indigo-500 focus:border-indigo-500 placeholder-gray-400"
            />
            <p className="text-xs text-gray-400 mt-1">
              AI akan otomatis mengadopsi instruksi gaya bahasa ini setiap kali merespon di panel chat kanan atau membuat deskripsi produk.
            </p>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition shadow-sm"
            >
              {saving ? 'Menyimpan...' : 'Simpan Pengaturan AI Assistant'}
            </button>
          </div>
        </form>
      )}

      {/* TAB 7: NOTIFIKASI PESANAN (TELEGRAM & WHATSAPP) */}
      {activeTab === 'notifications' && (
        <form onSubmit={saveNotifications} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-8">
          <div className="border-b border-gray-100 pb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
              <span>📲 Notifikasi Pesanan Real-Time (Telegram & WhatsApp)</span>
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Dapatkan peringatan instan di HP Anda ketika ada pesanan baru, bukti transfer diunggah, atau stok produk menipis.
            </p>
          </div>

          {/* Alert hasil uji coba notifikasi jika ada */}
          {notifyTestResult && (
            <div
              className={`p-3 rounded-lg text-xs flex items-center space-x-2 ${
                notifyTestResult.success
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              <span>{notifyTestResult.success ? '✅' : '❌'}</span>
              <span>{notifyTestResult.message}</span>
            </div>
          )}

          {/* KANAL 1: TELEGRAM BOT */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white text-xl shadow-sm">
                  ✈️
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Telegram Bot (Gratis & Unlimited)</h3>
                  <p className="text-xs text-gray-500">Kirim notifikasi ke akun pribadi Anda atau ke Grup Tim Staf Toko.</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notificationForm.notifyTelegramEnabled}
                  onChange={(e) =>
                    setNotificationForm({ ...notificationForm, notifyTelegramEnabled: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            {notificationForm.notifyTelegramEnabled && (
              <div className="pt-3 border-t border-slate-200/60 space-y-4">
                <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg text-xs text-blue-800 leading-relaxed">
                  <div className="font-semibold mb-1">Panduan Cepat Buat Bot Telegram (2 Menit):</div>
                  <ol className="list-decimal list-inside space-y-1 text-[11px]">
                    <li>Buka aplikasi Telegram dan cari bot resmi <b>@BotFather</b>.</li>
                    <li>Ketik <code>/newbot</code>, beri nama bot toko Anda, lalu salin <b>Bot Token</b> yang diberikan.</li>
                    <li>Mulai chat dengan bot Anda (klik Start). Untuk mengetahui <b>Chat ID</b> Anda, kirim pesan ke <b>@userinfobot</b>.</li>
                  </ol>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                      Telegram Bot Token
                    </label>
                    <input
                      type="password"
                      value={notificationForm.notifyTelegramBotToken}
                      onChange={(e) =>
                        setNotificationForm({ ...notificationForm, notifyTelegramBotToken: e.target.value })
                      }
                      placeholder="123456789:ABCdefGhIJKlmNoPQRst..."
                      className="w-full text-xs font-mono border-gray-300 rounded-lg shadow-2xs focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                      Telegram Chat ID (Akun atau Grup)
                    </label>
                    <input
                      type="text"
                      value={notificationForm.notifyTelegramChatId}
                      onChange={(e) =>
                        setNotificationForm({ ...notificationForm, notifyTelegramChatId: e.target.value })
                      }
                      placeholder="Contoh: 12345678 atau -100123456789 (grup)"
                      className="w-full text-xs font-mono border-gray-300 rounded-lg shadow-2xs focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleTestNotification('TELEGRAM')}
                    disabled={testingNotify === 'TELEGRAM' || !notificationForm.notifyTelegramBotToken || !notificationForm.notifyTelegramChatId}
                    className="px-3.5 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-40 flex items-center space-x-1.5 shadow-2xs"
                  >
                    {testingNotify === 'TELEGRAM' ? (
                      <>
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Mengirim Uji Coba...</span>
                      </>
                    ) : (
                      <>
                        <span>🔔 Kirim Pesan Uji Coba Telegram</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* KANAL 2: WHATSAPP GATEWAY */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xl shadow-sm">
                  💬
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">WhatsApp Gateway (Fonnte / Webhook)</h3>
                  <p className="text-xs text-gray-500">Kirim notifikasi langsung ke nomor WhatsApp pribadi admin/owner.</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notificationForm.notifyWhatsappEnabled}
                  onChange={(e) =>
                    setNotificationForm({ ...notificationForm, notifyWhatsappEnabled: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            {notificationForm.notifyWhatsappEnabled && (
              <div className="pt-3 border-t border-slate-200/60 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                      Provider Gateway
                    </label>
                    <select
                      value={notificationForm.notifyWhatsappProvider}
                      onChange={(e) =>
                        setNotificationForm({
                          ...notificationForm,
                          notifyWhatsappProvider: e.target.value as 'FONNTE' | 'GENERIC_WEBHOOK',
                        })
                      }
                      className="w-full text-xs border-gray-300 rounded-lg shadow-2xs focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="FONNTE">Fonnte API (fonnte.com)</option>
                      <option value="GENERIC_WEBHOOK">Custom Webhook (HTTP POST)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                      Token API / Webhook URL
                    </label>
                    <input
                      type="password"
                      value={notificationForm.notifyWhatsappToken}
                      onChange={(e) =>
                        setNotificationForm({ ...notificationForm, notifyWhatsappToken: e.target.value })
                      }
                      placeholder="Token Fonnte atau URL Webhook"
                      className="w-full text-xs font-mono border-gray-300 rounded-lg shadow-2xs focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                      Nomor WhatsApp Tujuan
                    </label>
                    <input
                      type="text"
                      value={notificationForm.notifyWhatsappTargetPhone}
                      onChange={(e) =>
                        setNotificationForm({ ...notificationForm, notifyWhatsappTargetPhone: e.target.value })
                      }
                      placeholder="Contoh: 081234567890"
                      className="w-full text-xs font-mono border-gray-300 rounded-lg shadow-2xs focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleTestNotification('WHATSAPP')}
                    disabled={testingNotify === 'WHATSAPP' || !notificationForm.notifyWhatsappToken || !notificationForm.notifyWhatsappTargetPhone}
                    className="px-3.5 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 disabled:opacity-40 flex items-center space-x-1.5 shadow-2xs"
                  >
                    {testingNotify === 'WHATSAPP' ? (
                      <>
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Mengirim Uji Coba...</span>
                      </>
                    ) : (
                      <>
                        <span>🔔 Kirim Pesan Uji Coba WhatsApp</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* CHECKLIST EVENT NOTIFIKASI */}
          <div className="border border-gray-200 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-gray-900">Peristiwa Notifikasi yang Diaktifkan</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition">
                <input
                  type="checkbox"
                  checked={notificationForm.notifyOnNewOrder}
                  onChange={(e) =>
                    setNotificationForm({ ...notificationForm, notifyOnNewOrder: e.target.checked })
                  }
                  className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4 mt-0.5"
                />
                <div>
                  <div className="text-xs font-semibold text-gray-800">🛍️ Pesanan Baru Masuk</div>
                  <div className="text-[11px] text-gray-500">Kirim alert saat pembeli selesai membuat pesanan baru.</div>
                </div>
              </label>

              <label className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition">
                <input
                  type="checkbox"
                  checked={notificationForm.notifyOnPaymentProof}
                  onChange={(e) =>
                    setNotificationForm({ ...notificationForm, notifyOnPaymentProof: e.target.checked })
                  }
                  className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4 mt-0.5"
                />
                <div>
                  <div className="text-xs font-semibold text-gray-800">📸 Bukti Transfer Diunggah</div>
                  <div className="text-[11px] text-gray-500">Alert segera verifikasi struk transfer bank manual.</div>
                </div>
              </label>

              <label className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition">
                <input
                  type="checkbox"
                  checked={notificationForm.notifyOnPaymentSuccess}
                  onChange={(e) =>
                    setNotificationForm({ ...notificationForm, notifyOnPaymentSuccess: e.target.checked })
                  }
                  className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4 mt-0.5"
                />
                <div>
                  <div className="text-xs font-semibold text-gray-800">🎉 Pembayaran Lunas</div>
                  <div className="text-[11px] text-gray-500">Pemberitahuan untuk segera mengemas & mengirimkan produk.</div>
                </div>
              </label>

              <div className="p-3 bg-gray-50 rounded-lg space-y-2">
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notificationForm.notifyOnLowStock}
                    onChange={(e) =>
                      setNotificationForm({ ...notificationForm, notifyOnLowStock: e.target.checked })
                    }
                    className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4 mt-0.5"
                  />
                  <div>
                    <div className="text-xs font-semibold text-gray-800">⚠️ Peringatan Stok Menipis</div>
                    <div className="text-[11px] text-gray-500">Kirim alert jika sisa stok produk mencapai ambang batas.</div>
                  </div>
                </label>
                {notificationForm.notifyOnLowStock && (
                  <div className="pl-7 flex items-center space-x-2 text-xs text-gray-600">
                    <span>Ambang batas minimum:</span>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={notificationForm.notifyLowStockThreshold}
                      onChange={(e) =>
                        setNotificationForm({
                          ...notificationForm,
                          notifyLowStockThreshold: parseInt(e.target.value) || 1,
                        })
                      }
                      className="w-16 text-xs p-1 border-gray-300 rounded text-center"
                    />
                    <span>unit</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition shadow-sm"
            >
              {saving ? 'Menyimpan...' : 'Simpan Pengaturan Notifikasi'}
            </button>
          </div>
        </form>
      )}

      {/* TAB 8: PENGATURAN PENGIRIMAN & EKSPEDISI (BITESHIP & FLAT RATE) */}
      {activeTab === 'shipping' && (
        <form onSubmit={saveShipping} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-8">
          <div className="border-b border-gray-100 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                  <span>🚚 Pengaturan Pengiriman & Ekspedisi (Biteship API)</span>
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Kelola tarif ongkos kirim otomatis multi-kurir (JNE, SiCepat, J&T, dll.) via Biteship API atau gunakan tarif flat manual.
                </p>
              </div>
              <div className="flex items-center gap-3 bg-gray-50 p-2.5 rounded-xl border border-gray-200">
                <span className="text-xs font-semibold text-gray-700">Integrasi Biteship:</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={shippingForm.biteshipEnabled}
                    onChange={(e) => setShippingForm({ ...shippingForm, biteshipEnabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${shippingForm.biteshipEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-600'}`}>
                  {shippingForm.biteshipEnabled ? 'AKTIF' : 'NONAKTIF'}
                </span>
              </div>
            </div>
          </div>

          {/* SECTION: BITESHIP CONFIGURATION */}
          {shippingForm.biteshipEnabled && (
            <div className="p-5 bg-indigo-50/50 rounded-2xl border border-indigo-100 space-y-6">
              <div className="flex items-center justify-between border-b border-indigo-100 pb-3">
                <h3 className="text-sm font-bold text-indigo-950 flex items-center gap-2">
                  <span>⚡ Kredensial & Lokasi Asal Biteship</span>
                </h3>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-indigo-900">
                  <input
                    type="checkbox"
                    checked={shippingForm.biteshipSandbox}
                    onChange={(e) => setShippingForm({ ...shippingForm, biteshipSandbox: e.target.checked })}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Mode Sandbox / Uji Coba (Biteship Simulator)</span>
                </label>
              </div>

              {/* SMART ORIGIN SELECTOR (EMSIFA WILAYAH INDONESIA) */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-700">
                  📍 Bantuan Penentuan Lokasi Gudang / Toko Asal (EMSIFA Wilayah Indonesia)
                </label>
                <AddressLocationSelector
                  compact={true}
                  initialPostalCode={shippingForm.biteshipOriginPostalCode}
                  initialStreetAddress={shippingForm.biteshipOriginAddress}
                  required={false}
                  onChange={(loc: SelectedLocationData) => {
                    setShippingForm((prev) => ({
                      ...prev,
                      biteshipOriginPostalCode: loc.postalCode,
                      biteshipOriginAddress: loc.fullFormattedAddress,
                      shippingOriginCity: loc.regencyName,
                    }));
                  }}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Biteship API Secret Key
                  </label>
                  <input
                    type="password"
                    value={shippingForm.biteshipApiKey}
                    onChange={(e) => setShippingForm({ ...shippingForm, biteshipApiKey: e.target.value })}
                    placeholder="biteship_test.xxx... atau biteship_live.xxx..."
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">
                    Dapatkan API Key di <a href="https://biteship.com/dashboard/api-keys" target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline">Dashboard Biteship</a>. Kosongkan jika ingin menggunakan simulator lokal otomatis.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Biteship Area ID Asal Pengirim (Origin Area ID)
                  </label>
                  <input
                    type="text"
                    value={shippingForm.biteshipOriginAreaId}
                    onChange={(e) => setShippingForm({ ...shippingForm, biteshipOriginAreaId: e.target.value })}
                    placeholder="Contoh: IDNP9IDNC167IDND5120"
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">
                    ID Area Biteship untuk tingkat akurasi tarif maksimal.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Nama Kontak Pengirim / Gudang
                  </label>
                  <input
                    type="text"
                    value={shippingForm.biteshipOriginContactName}
                    onChange={(e) => setShippingForm({ ...shippingForm, biteshipOriginContactName: e.target.value })}
                    placeholder="Nama Toko / Petugas Dispatch"
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    No. Telepon / WhatsApp Pengirim (Pickup)
                  </label>
                  <input
                    type="text"
                    value={shippingForm.biteshipOriginContactPhone}
                    onChange={(e) => setShippingForm({ ...shippingForm, biteshipOriginContactPhone: e.target.value })}
                    placeholder="081234567890"
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Kode Pos Asal Toko
                  </label>
                  <input
                    type="text"
                    value={shippingForm.biteshipOriginPostalCode}
                    onChange={(e) => setShippingForm({ ...shippingForm, biteshipOriginPostalCode: e.target.value })}
                    placeholder="Contoh: 40132"
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Alamat Lengkap Gudang / Toko Asal (Pick-up)
                  </label>
                  <input
                    type="text"
                    value={shippingForm.biteshipOriginAddress}
                    onChange={(e) => setShippingForm({ ...shippingForm, biteshipOriginAddress: e.target.value })}
                    placeholder="Jl. Sukajadi No. 123, Sukajadi, Kota Bandung"
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Kurir yang Diaktifkan */}
              <div className="pt-2">
                <label className="block text-xs font-bold text-gray-700 mb-2">
                  Pilihan Ekspedisi Kurir yang Ditawarkan ke Pelanggan:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { code: 'jne', label: 'JNE Express' },
                    { code: 'sicepat', label: 'SiCepat Ekspres' },
                    { code: 'jnt', label: 'J&T Express' },
                    { code: 'anteraja', label: 'Anteraja' },
                    { code: 'tiki', label: 'TIKI' },
                    { code: 'pos', label: 'POS Indonesia' },
                    { code: 'gojek', label: 'GoSend (Instant)' },
                    { code: 'grab', label: 'GrabExpress' },
                  ].map((courier) => {
                    const activeList = (shippingForm.biteshipEnabledCouriers || '').split(',').map((c) => c.trim().toLowerCase());
                    const isChecked = activeList.includes(courier.code);
                    return (
                      <label
                        key={courier.code}
                        className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs font-semibold cursor-pointer transition ${
                          isChecked
                            ? 'bg-white border-indigo-600 text-indigo-900 shadow-xs ring-1 ring-indigo-500'
                            : 'bg-white/60 border-gray-200 text-gray-600 hover:bg-white'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            let updated: string[];
                            if (e.target.checked) {
                              updated = [...activeList, courier.code];
                            } else {
                              updated = activeList.filter((c) => c !== courier.code);
                            }
                            setShippingForm({ ...shippingForm, biteshipEnabledCouriers: updated.filter(Boolean).join(',') });
                          }}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>{courier.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* SECTION: FLAT RATE & FALLBACK */}
          <div className="space-y-6 pt-2">
            <div className="border-b border-gray-100 pb-2">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <span>📦 Tarif Ongkir Flat Manual {shippingForm.biteshipEnabled ? '(Sebagai Cadangan / Fallback)' : ''}</span>
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {shippingForm.biteshipEnabled
                  ? 'Tarif ini akan otomatis digunakan bila layanan kurir Biteship tidak menjangkau lokasi pelanggan atau dinonaktifkan.'
                  : 'Tarif flat yang akan ditagihkan ke pelanggan berdasarkan pilihan zona Dalam Kota atau Luar Kota.'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kota / Kabupaten Asal Pengiriman Toko
              </label>
              <input
                type="text"
                value={shippingForm.shippingOriginCity}
                onChange={(e) => setShippingForm({ ...shippingForm, shippingOriginCity: e.target.value })}
                placeholder="Contoh: Bandung, Jawa Barat"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Akan ditampilkan pada halaman keranjang pelanggan sebagai acuan wilayah lokal toko.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <label className="block text-sm font-semibold text-gray-900 mb-1">
                  Tarif Ongkir Dalam Kota (Rp)
                </label>
                <p className="text-xs text-gray-500 mb-3">
                  Biaya kirim flat untuk pelanggan di dalam kota / area lokal toko.
                </p>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-sm font-semibold text-gray-500">
                    Rp
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={shippingForm.shippingFlatRateInner}
                    onChange={(e) => setShippingForm({ ...shippingForm, shippingFlatRateInner: Number(e.target.value) || 0 })}
                    placeholder="10000"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                  />
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <label className="block text-sm font-semibold text-gray-900 mb-1">
                  Tarif Ongkir Luar Kota (Rp)
                </label>
                <p className="text-xs text-gray-500 mb-3">
                  Biaya kirim flat untuk pengiriman antar kota atau luar provinsi.
                </p>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-sm font-semibold text-gray-500">
                    Rp
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={shippingForm.shippingFlatRateOuter}
                    onChange={(e) => setShippingForm({ ...shippingForm, shippingFlatRateOuter: Number(e.target.value) || 0 })}
                    placeholder="25000"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Minimal Belanja untuk Bebas Ongkir (Gratis Ongkir) — Opsional
              </label>
              <div className="relative max-w-md">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-sm font-semibold text-gray-500">
                  Rp
                </span>
                <input
                  type="number"
                  min="0"
                  step="10000"
                  value={shippingForm.shippingFreeThreshold}
                  onChange={(e) => setShippingForm({ ...shippingForm, shippingFreeThreshold: e.target.value === '' ? '' : Number(e.target.value) })}
                  placeholder="Kosongkan jika tidak ada gratis ongkir (misal: 200000)"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Jika subtotal pesanan pelanggan mencapai nominal ini, ongkos kirim akan otomatis menjadi Rp 0 (Gratis Ongkir).
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-gray-100">
            <button
              type="submit"
              disabled={saving}
              className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition shadow-sm"
            >
              {saving ? 'Menyimpan...' : 'Simpan Pengaturan Pengiriman'}
            </button>
          </div>
        </form>
      )}

      {/* TAB 9: EMAIL & SMTP SERVER */}
      {activeTab === 'email' && (
        <div className="space-y-8">
          {/* Bagian 1: Konfigurasi Server SMTP */}
          <form onSubmit={saveEmail} className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 p-6 space-y-6">
            <div className="border-b border-gray-100 dark:border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                  <span>✉️ Konfigurasi Server SMTP & Pengiriman Email</span>
                </h2>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  Gunakan server SMTP Anda sendiri (Gmail Workspace, Zoho, cPanel, Brevo, Mailgun, AWS SES) untuk mengirimkan invoice dan notifikasi pesanan.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={emailForm.smtpEnabled}
                  onChange={(e) => setEmailForm({ ...emailForm, smtpEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 dark:bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                <span className="ml-3 text-sm font-semibold text-gray-800 dark:text-slate-200">
                  {emailForm.smtpEnabled ? 'Aktif' : 'Nonaktif'}
                </span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">
                  Host Server SMTP <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={emailForm.smtpHost}
                  onChange={(e) => setEmailForm({ ...emailForm, smtpHost: e.target.value })}
                  placeholder="smtp.gmail.com atau mail.domainanda.com"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-sm text-gray-900 dark:text-white bg-white dark:bg-slate-800 placeholder-gray-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                  Contoh: <code>smtp.gmail.com</code> (Google), <code>smtp.zoho.com</code>, <code>smtp-relay.brevo.com</code>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">
                  Port Server <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={emailForm.smtpPort}
                  onChange={(e) => setEmailForm({ ...emailForm, smtpPort: Number(e.target.value) || 587 })}
                  placeholder="587"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-sm text-gray-900 dark:text-white bg-white dark:bg-slate-800 placeholder-gray-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Standar: <strong>587</strong> (STARTTLS) atau <strong>465</strong> (SSL)</p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="smtpSecure"
                checked={emailForm.smtpSecure}
                onChange={(e) => setEmailForm({ ...emailForm, smtpSecure: e.target.checked })}
                className="h-4 w-4 text-indigo-600 rounded border-gray-300 dark:border-slate-700 focus:ring-indigo-500"
              />
              <label htmlFor="smtpSecure" className="text-sm font-medium text-gray-700 dark:text-slate-200 cursor-pointer">
                Gunakan enkripsi SSL/TLS langsung (Centang jika menggunakan port 465)
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">
                  Username SMTP / Akun Email
                </label>
                <input
                  type="text"
                  value={emailForm.smtpUser}
                  onChange={(e) => setEmailForm({ ...emailForm, smtpUser: e.target.value })}
                  placeholder="admin@domainanda.com"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-sm text-gray-900 dark:text-white bg-white dark:bg-slate-800 placeholder-gray-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-200">
                    Password / App Password SMTP
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowSmtpPass(!showSmtpPass)}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition"
                  >
                    {showSmtpPass ? 'Sembunyikan' : 'Tampilkan'}
                  </button>
                </div>
                <input
                  type={showSmtpPass ? 'text' : 'password'}
                  value={emailForm.smtpPass}
                  onChange={(e) => setEmailForm({ ...emailForm, smtpPass: e.target.value })}
                  placeholder={emailForm.smtpPass === '********' ? '******** (Tersimpan)' : 'Masukkan password atau app password'}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-sm font-mono text-gray-900 dark:text-white bg-white dark:bg-slate-800 placeholder-gray-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                  Untuk Gmail pastikan menggunakan <em>App Password 16-digit</em> dari Google Account Security.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">
                  Nama Pengirim Toko
                </label>
                <input
                  type="text"
                  value={emailForm.smtpFromName}
                  onChange={(e) => setEmailForm({ ...emailForm, smtpFromName: e.target.value })}
                  placeholder="AI SEO Demo Store"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-sm text-gray-900 dark:text-white bg-white dark:bg-slate-800 placeholder-gray-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">
                  Alamat Email Pengirim (From Email) <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={emailForm.smtpFromEmail}
                  onChange={(e) => setEmailForm({ ...emailForm, smtpFromEmail: e.target.value })}
                  placeholder="halo@domainanda.com"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-sm text-gray-900 dark:text-white bg-white dark:bg-slate-800 placeholder-gray-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">
                  Alamat Reply-To (Opsional)
                </label>
                <input
                  type="email"
                  value={emailForm.smtpReplyTo}
                  onChange={(e) => setEmailForm({ ...emailForm, smtpReplyTo: e.target.value })}
                  placeholder="support@domainanda.com"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-sm text-gray-900 dark:text-white bg-white dark:bg-slate-800 placeholder-gray-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-slate-800">
              <button
                type="submit"
                disabled={saving}
                className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition shadow-sm"
              >
                {saving ? 'Menyimpan...' : 'Simpan Konfigurasi SMTP'}
              </button>
            </div>
          </form>

          {/* Bagian 2: Verifikasi Kepemilikan Email Pengirim */}
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 p-6 space-y-5">
            <div className="border-b border-gray-100 dark:border-slate-800 pb-4">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                <span>🔐 Verifikasi Kepemilikan Alamat Email (Ownership Challenge)</span>
              </h3>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                Pastikan Anda benar-benar memiliki akses ke kotak masuk email pengirim ini untuk mencegah penyalahgunaan alamat (anti-spoofing).
              </p>
            </div>

            {/* Status Badge */}
            {emailForm.smtpVerified ? (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-start gap-3 text-emerald-900 dark:text-emerald-200">
                <span className="text-2xl shrink-0">✅</span>
                <div>
                  <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-200">Kepemilikan Email Telah Terverifikasi</h4>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
                    Alamat <strong>{emailForm.smtpFromEmail}</strong> sah dan terhubung dengan toko ini.
                    {emailForm.smtpVerifiedAt && ` (Diverifikasi pada: ${new Date(emailForm.smtpVerifiedAt).toLocaleString('id-ID')})`}
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl flex items-start gap-3 text-amber-900 dark:text-amber-200">
                <span className="text-2xl shrink-0">⚠️</span>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">Alamat Email Belum Diverifikasi</h4>
                  <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5 leading-relaxed">
                    Sistem mewajibkan konfirmasi kepemilikan sebelum alamat ini digunakan untuk mengirimkan email resmi ke pelanggan.
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={handleSendVerificationCode}
                      disabled={sendingVerification || !emailForm.smtpFromEmail}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50 transition shadow-xs"
                    >
                      {sendingVerification ? 'Mengirim Kode...' : `Kirim Kode Verifikasi ke ${emailForm.smtpFromEmail || 'Email'}`}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Form Input Kode Verifikasi */}
            <div className="p-4 bg-gray-50 dark:bg-slate-800/60 rounded-xl border border-gray-200 dark:border-slate-700">
              <label className="block text-xs font-semibold text-gray-700 dark:text-slate-200 uppercase tracking-wider mb-2">
                Konfirmasi Kode 6-Digit OTP
              </label>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <input
                  type="text"
                  maxLength={6}
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="Contoh: 849201"
                  className="px-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-sm font-mono tracking-widest text-center sm:text-left focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 max-w-xs text-gray-900 dark:text-white bg-white dark:bg-slate-800 placeholder-gray-400 dark:placeholder-slate-500"
                />
                <button
                  type="button"
                  onClick={handleConfirmVerificationCode}
                  disabled={confirmingCode || verificationCode.length < 4}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50 transition shadow-xs"
                >
                  {confirmingCode ? 'Memverifikasi...' : 'Konfirmasi Kode'}
                </button>
              </div>

              {verificationNotice && (
                <p className={`text-xs mt-2 font-medium ${verificationNotice.type === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                  {verificationNotice.text}
                </p>
              )}
            </div>
          </div>

          {/* Bagian 3: Asisten Konfigurasi DNS & Petunjuk Provider Email */}
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 p-6 space-y-6">
            <div className="border-b border-gray-100 dark:border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                  <span>🛡️ Asisten DNS Deliverability (SPF, DKIM, DMARC, MX)</span>
                </h3>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                  Panduan konfigurasi DNS Record di Cloudflare / DNS Manager untuk memastikan email masuk ke kotak masuk (Inbox), bukan folder Spam.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCheckDns}
                disabled={checkingDns || !emailForm.smtpFromEmail}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50 transition shadow-xs shrink-0"
              >
                <span>🔍</span>
                <span>{checkingDns ? 'Memeriksa DNS...' : 'Periksa Record DNS'}</span>
              </button>
            </div>

            {/* DNS Records Table / Guidance Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* SPF Card */}
              <div className="p-4 border rounded-xl bg-gray-50/70 dark:bg-slate-800/50 border-gray-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-900 dark:text-white uppercase">1. Record SPF (Sender Policy)</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${dnsResult?.spf?.valid ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'}`}>
                    {dnsResult ? (dnsResult.spf.valid ? 'Aktif ✓' : 'Belum Terdeteksi') : 'Status: Siap Dicek'}
                  </span>
                </div>
                <p className="text-xs text-gray-600 dark:text-slate-300">
                  Otorisasi server yang berhak mengirim email atas nama domain Anda.
                </p>
                <div className="bg-white dark:bg-slate-900 p-2.5 rounded border border-gray-200 dark:border-slate-700 text-xs font-mono text-slate-800 dark:text-slate-200 break-all select-all">
                  Type: TXT | Name: @ | Value: v=spf1 include:_spf.google.com ~all
                </div>
                {dnsResult?.spf?.record && (
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400">Ditemukan di DNS: <code>{dnsResult.spf.record}</code></p>
                )}
              </div>

              {/* DMARC Card */}
              <div className="p-4 border rounded-xl bg-gray-50/70 dark:bg-slate-800/50 border-gray-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-900 dark:text-white uppercase">2. Record DMARC</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${dnsResult?.dmarc?.valid ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'}`}>
                    {dnsResult ? (dnsResult.dmarc.valid ? 'Aktif ✓' : 'Belum Terdeteksi') : 'Status: Siap Dicek'}
                  </span>
                </div>
                <p className="text-xs text-gray-600 dark:text-slate-300">
                  Melindungi domain dari pemalsuan email (phishing & email spoofing).
                </p>
                <div className="bg-white dark:bg-slate-900 p-2.5 rounded border border-gray-200 dark:border-slate-700 text-xs font-mono text-slate-800 dark:text-slate-200 break-all select-all">
                  Type: TXT | Name: _dmarc | Value: v=DMARC1; p=none;
                </div>
                {dnsResult?.dmarc?.record && (
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400">Ditemukan di DNS: <code>{dnsResult.dmarc.record}</code></p>
                )}
              </div>

              {/* DKIM Card */}
              <div className="p-4 border rounded-xl bg-gray-50/70 dark:bg-slate-800/50 border-gray-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-900 dark:text-white uppercase">3. Record DKIM (Signature)</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                    Dari Provider
                  </span>
                </div>
                <p className="text-xs text-gray-600 dark:text-slate-300">
                  Tanda tangan kriptografi pada email. Dapatkan TXT record DKIM dari dashboard penyedia email Anda (Google Workspace / Zoho / Brevo).
                </p>
                <div className="bg-white dark:bg-slate-900 p-2.5 rounded border border-gray-200 dark:border-slate-700 text-xs font-mono text-slate-600 dark:text-slate-400">
                  Type: TXT | Name: [selector]._domainkey | Value: [kunci_publik_dkim]
                </div>
              </div>

              {/* MX Card */}
              <div className="p-4 border rounded-xl bg-gray-50/70 dark:bg-slate-800/50 border-gray-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-900 dark:text-white uppercase">4. Record MX (Mail Exchange)</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${dnsResult?.mx?.valid ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-400'}`}>
                    {dnsResult ? (dnsResult.mx.valid ? 'Terhubung ✓' : 'Belum Ada') : 'Status: Siap Dicek'}
                  </span>
                </div>
                <p className="text-xs text-gray-600 dark:text-slate-300">
                  Menentukan server yang menangani penerimaan email pada domain toko Anda.
                </p>
                {dnsResult?.mx?.records && dnsResult.mx.records.length > 0 ? (
                  <div className="bg-white dark:bg-slate-900 p-2.5 rounded border border-gray-200 dark:border-slate-700 text-xs font-mono text-slate-800 dark:text-slate-200 space-y-1">
                    {dnsResult.mx.records.map((r: string, idx: number) => (
                      <div key={idx}>• {r}</div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white dark:bg-slate-900 p-2.5 rounded border border-gray-200 dark:border-slate-700 text-xs font-mono text-slate-500 dark:text-slate-400">
                    Klik tombol &quot;Periksa Record DNS&quot; untuk melihat server MX aktif domain.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bagian 4: Uji Coba Pengiriman Email (Test Email) */}
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 p-6 space-y-4">
            <div className="border-b border-gray-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                <span>🚀 Uji Coba Pengiriman Email (Test Connection)</span>
              </h3>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                Kirimkan email uji coba ke alamat email Anda untuk memastikan pesan berhasil masuk ke inbox.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <input
                type="email"
                value={testRecipient}
                onChange={(e) => setTestRecipient(e.target.value)}
                placeholder="Masukkan email penerima uji coba (misal: namaanda@gmail.com)"
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-sm text-gray-900 dark:text-white bg-white dark:bg-slate-800 placeholder-gray-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={handleSendTestEmail}
                disabled={testingEmail || !testRecipient}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50 transition shadow-xs shrink-0"
              >
                {testingEmail ? 'Mengirim...' : 'Kirim Email Uji Coba'}
              </button>
            </div>

            {emailTestResult && (
              <div
                className={`p-3.5 rounded-lg text-xs leading-relaxed ${
                  emailTestResult.success
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800'
                }`}
              >
                <strong>{emailTestResult.success ? 'Berhasil: ' : 'Gagal: '}</strong>
                {emailTestResult.message}
              </div>
            )}
          </div>
        </div>
      )}
        </div>
      </div>
    </div>
  );
}

export default function AdminSettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 max-w-7xl mx-auto flex items-center justify-center min-h-[300px]">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      }
    >
      <AdminSettingsContent />
    </Suspense>
  );
}
