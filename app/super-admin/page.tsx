'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface TenantItem {
  id: string;
  name: string;
  domain: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  createdAt: string;
  primaryColor: string;
  fontFamily: string;
  tagline: string;
  defaultPageSize: number;
  adminUser: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
  counts: {
    products: number;
    orders: number;
    users: number;
    categories: number;
    landingPages: number;
  };
}

interface DuplicationSuccessResult {
  store: {
    id: string;
    name: string;
    domain: string;
    email: string | null;
    phone: string | null;
  };
  adminUser: {
    id: string;
    email: string;
    name: string;
    initialPassword: string;
  };
  seededCounts: {
    ledgerCategories: number;
    categories: number;
    products: number;
  };
  deployment: {
    databaseMode: string;
    deployMode: string;
    envContent: string;
    handoverMessage: string;
  };
}

function generateStrongPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  let res = 'Toko#';
  for (let i = 0; i < 10; i++) {
    res += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return res;
}

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function SuperAdminControlPlanePage() {
  const [authChecking, setAuthChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [ownerEmail, setOwnerEmail] = useState('');
  const [token, setToken] = useState<string | null>(null);

  // Login Form State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  // Navigation Tab
  const [activeTab, setActiveTab] = useState<'list' | 'duplicate'>('list');

  // Tenant List State
  const [tenants, setTenants] = useState<TenantItem[]>([]);
  const [loadingTenants, setLoadingTenants] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // 7-Group Duplication Form State
  // Grup 1: Identitas & Domain
  const [storeName, setStoreName] = useState('');
  const [tenantSlug, setTenantSlug] = useState('');
  const [domain, setDomain] = useState('');
  const [tagline, setTagline] = useState('');
  const [storeEmail, setStoreEmail] = useState('');
  const [storePhone, setStorePhone] = useState('');
  const [storeAddress, setStoreAddress] = useState('');

  // Grup 2: Akun Owner / Admin Pelanggan
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState(() => generateStrongPassword());

  // Grup 3: Branding, Tema Visual & Pengaturan List
  const [primaryColor, setPrimaryColor] = useState('#4F46E5');
  const [fontFamily, setFontFamily] = useState('inter');
  const [defaultPageSize, setDefaultPageSize] = useState(10);
  const [logoUrl, setLogoUrl] = useState('');
  const [faviconUrl, setFaviconUrl] = useState('');
  const [heroBadge, setHeroBadge] = useState('Koleksi Pilihan');
  const [heroTitle, setHeroTitle] = useState('');
  const [heroSubtitle, setHeroSubtitle] = useState('');
  const [heroCtaText, setHeroCtaText] = useState('Belanja Sekarang');
  const [heroImageUrl, setHeroImageUrl] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [whatsappUrl, setWhatsappUrl] = useState('');
  const [tiktokUrl, setTiktokUrl] = useState('');
  const [shopeeUrl, setShopeeUrl] = useState('');

  // Grup 4: Preset Konten Awal & Seeding
  const [seedPreset, setSeedPreset] = useState<
    'CLEAN' | 'STARTER_FASHION' | 'STARTER_FNB' | 'STARTER_ELECTRONICS' | 'STARTER_GENERAL'
  >('CLEAN');
  const [seedLedgerCategories, setSeedLedgerCategories] = useState(true);
  const [generateLegalPages, setGenerateLegalPages] = useState(true);
  const [cookieConsentEnabled, setCookieConsentEnabled] = useState(true);

  // Grup 5: SEO Dasar & Tracking Pixel
  const [defaultSeoTitle, setDefaultSeoTitle] = useState('');
  const [defaultSeoDescription, setDefaultSeoDescription] = useState('');
  const [ga4Id, setGa4Id] = useState('');
  const [metaPixelId, setMetaPixelId] = useState('');
  const [tiktokPixelId, setTiktokPixelId] = useState('');

  // Grup 6: Payment Gateway & Bot Security
  const [midtransMerchantId, setMidtransMerchantId] = useState('');
  const [midtransClientKey, setMidtransClientKey] = useState('');
  const [midtransServerKey, setMidtransServerKey] = useState('');
  const [flipApiKey, setFlipApiKey] = useState('');
  const [turnstileEnabled, setTurnstileEnabled] = useState(false);
  const [turnstileSiteKey, setTurnstileSiteKey] = useState('');
  const [turnstileSecretKey, setTurnstileSecretKey] = useState('');

  // Grup 7: Infrastruktur & Langganan
  const [dbMode, setDbMode] = useState<'CURRENT_DB' | 'CUSTOM_DB_URL'>('CURRENT_DB');
  const [customDatabaseUrl, setCustomDatabaseUrl] = useState('');
  const [deployMode, setDeployMode] = useState<'MANUAL_EXPORT' | 'AUTO_VERCEL' | 'AUTO_COOLIFY'>(
    'MANUAL_EXPORT'
  );
  const [subscriptionPlan, setSubscriptionPlan] = useState<'STARTER' | 'BUSINESS' | 'ENTERPRISE'>(
    'BUSINESS'
  );
  const [expiresAt, setExpiresAt] = useState('');
  const [internalNotes, setInternalNotes] = useState('');

  // Submission & Output State
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [duplicationResult, setDuplicationResult] = useState<DuplicationSuccessResult | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Quick Password Reset Modal State
  const [resetModalTenant, setResetModalTenant] = useState<TenantItem | null>(null);
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);

  // Edit Tenant Modal State
  const [editModalTenant, setEditModalTenant] = useState<TenantItem | null>(null);
  const [editLoadingDetail, setEditLoadingDetail] = useState(false);
  const [editStoreName, setEditStoreName] = useState('');
  const [editDomain, setEditDomain] = useState('');
  const [editTagline, setEditTagline] = useState('');
  const [editStoreEmail, setEditStoreEmail] = useState('');
  const [editStorePhone, setEditStorePhone] = useState('');
  const [editStoreAddress, setEditStoreAddress] = useState('');
  const [editAdminName, setEditAdminName] = useState('');
  const [editAdminEmail, setEditAdminEmail] = useState('');
  const [editNewPassword, setEditNewPassword] = useState('');
  const [editPrimaryColor, setEditPrimaryColor] = useState('#4F46E5');
  const [editFontFamily, setEditFontFamily] = useState('inter');
  const [editDefaultPageSize, setEditDefaultPageSize] = useState(10);
  const [editLogoUrl, setEditLogoUrl] = useState('');
  const [editHeroTitle, setEditHeroTitle] = useState('');
  const [editHeroSubtitle, setEditHeroSubtitle] = useState('');
  const [editHeroCtaText, setEditHeroCtaText] = useState('Belanja Sekarang');
  const [editGa4Id, setEditGa4Id] = useState('');
  const [editMetaPixelId, setEditMetaPixelId] = useState('');
  const [editTiktokPixelId, setEditTiktokPixelId] = useState('');
  const [editMidtransMerchantId, setEditMidtransMerchantId] = useState('');
  const [editMidtransClientKey, setEditMidtransClientKey] = useState('');
  const [editMidtransServerKey, setEditMidtransServerKey] = useState('');
  const [editFlipApiKey, setEditFlipApiKey] = useState('');
  const [editTurnstileEnabled, setEditTurnstileEnabled] = useState(false);
  const [editTurnstileSiteKey, setEditTurnstileSiteKey] = useState('');
  const [editTurnstileSecretKey, setEditTurnstileSecretKey] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccessNotice, setEditSuccessNotice] = useState<string | null>(null);

  const fetchTenants = useCallback(async (activeToken?: string | null) => {
    try {
      setLoadingTenants(true);
      const headers: Record<string, string> = {};
      if (activeToken) headers.Authorization = `Bearer ${activeToken}`;
      const res = await fetch('/api/super-admin/tenants', { headers });
      if (res.ok) {
        const data = await res.json();
        setTenants(data.tenants || []);
      }
    } catch {
      // ignore
    } finally {
      setLoadingTenants(false);
    }
  }, []);

  useEffect(() => {
    const savedToken = localStorage.getItem('super_admin_token');
    const headers: Record<string, string> = {};
    if (savedToken) headers.Authorization = `Bearer ${savedToken}`;

    fetch('/api/super-admin/auth', { headers })
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          setIsAuthenticated(true);
          setOwnerEmail(data.owner?.email || '');
          setToken(savedToken);
          fetchTenants(savedToken);
        } else {
          localStorage.removeItem('super_admin_token');
          setIsAuthenticated(false);
        }
      })
      .catch(() => {
        setIsAuthenticated(false);
      })
      .finally(() => {
        setAuthChecking(false);
      });
  }, [fetchTenants]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);
    try {
      const res = await fetch('/api/super-admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal login ke Control Plane');
      }
      localStorage.setItem('super_admin_token', data.token);
      setToken(data.token);
      setOwnerEmail(data.owner?.email || loginEmail);
      setIsAuthenticated(true);
      fetchTenants(data.token);
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Gagal login');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/super-admin/auth', { method: 'DELETE' }).catch(() => {});
    localStorage.removeItem('super_admin_token');
    setToken(null);
    setIsAuthenticated(false);
  };

  const handleStoreNameChange = (val: string) => {
    setStoreName(val);
    const slug = toSlug(val);
    setTenantSlug(slug);
    if (!domain || domain.endsWith('.com')) {
      setDomain(slug ? `${slug.replace(/-/g, '')}.com` : '');
    }
    if (!storeEmail && slug) {
      setStoreEmail(`cs@${slug.replace(/-/g, '')}.com`);
    }
    if (!adminEmail && slug) {
      setAdminEmail(`owner@${slug.replace(/-/g, '')}.com`);
    }
  };

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  // Open Quick Reset Password Modal
  const openResetPasswordModal = (tenant: TenantItem) => {
    setResetModalTenant(tenant);
    setResetNewPassword(generateStrongPassword());
    setResetError(null);
    setResetSuccessMessage(null);
  };

  // Submit Quick Password Reset
  const handleQuickResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetModalTenant) return;
    setResetSubmitting(true);
    setResetError(null);
    setResetSuccessMessage(null);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch(`/api/super-admin/tenants/${resetModalTenant.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          newAdminPassword: resetNewPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal mereset password pelanggan');
      }

      setResetSuccessMessage(data.resetPasswordMessage);
      fetchTenants(token);
    } catch (err) {
      setResetError(err instanceof Error ? err.message : 'Terjadi kesalahan saat reset password');
    } finally {
      setResetSubmitting(false);
    }
  };

  // Open Edit Tenant Modal
  const openEditTenantModal = async (tenant: TenantItem) => {
    setEditModalTenant(tenant);
    setEditLoadingDetail(true);
    setEditError(null);
    setEditSuccessNotice(null);
    setEditNewPassword('');

    // Prepopulate known basic fields
    setEditStoreName(tenant.name);
    setEditDomain(tenant.domain);
    setEditTagline(tenant.tagline || '');
    setEditStoreEmail(tenant.email || '');
    setEditStorePhone(tenant.phone || '');
    setEditStoreAddress(tenant.address || '');
    setEditAdminName(
      [tenant.adminUser?.firstName, tenant.adminUser?.lastName].filter(Boolean).join(' ') || ''
    );
    setEditAdminEmail(tenant.adminUser?.email || '');
    setEditPrimaryColor(tenant.primaryColor || '#4F46E5');
    setEditFontFamily(tenant.fontFamily || 'inter');
    setEditDefaultPageSize(tenant.defaultPageSize || 10);

    // Fetch full detail for settings and keys
    try {
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(`/api/super-admin/tenants/${tenant.id}`, { headers });
      if (res.ok) {
        const data = await res.json();
        const s = data.store?.settings || {};
        setEditLogoUrl(data.store?.logo || '');
        setEditHeroTitle(s.heroTitle || '');
        setEditHeroSubtitle(s.heroSubtitle || '');
        setEditHeroCtaText(s.heroCtaText || 'Belanja Sekarang');
        setEditGa4Id(s.googleTagId || s.analyticsConfig?.ga4MeasurementId || '');
        setEditMetaPixelId(s.analyticsConfig?.metaPixelId || '');
        setEditTiktokPixelId(s.analyticsConfig?.tiktokPixelId || '');
        setEditMidtransMerchantId(s.midtransMerchantId || '');
        setEditMidtransClientKey(s.midtransClientKey || '');
        setEditMidtransServerKey(s.midtransServerKey || '');
        setEditFlipApiKey(s.flipApiKey || '');
        setEditTurnstileEnabled(Boolean(s.turnstileEnabled));
        setEditTurnstileSiteKey(s.turnstileSiteKey || '');
        setEditTurnstileSecretKey(s.turnstileSecretKey || '');
      }
    } catch {
      // ignore
    } finally {
      setEditLoadingDetail(false);
    }
  };

  // Submit Full Tenant Edit
  const handleEditTenantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModalTenant) return;
    setEditSubmitting(true);
    setEditError(null);
    setEditSuccessNotice(null);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const payload: any = {
        storeName: editStoreName,
        domain: editDomain,
        tagline: editTagline,
        storeEmail: editStoreEmail,
        storePhone: editStorePhone,
        storeAddress: editStoreAddress,
        adminName: editAdminName,
        adminEmail: editAdminEmail,
        primaryColor: editPrimaryColor,
        fontFamily: editFontFamily,
        defaultPageSize: editDefaultPageSize,
        logoUrl: editLogoUrl,
        heroTitle: editHeroTitle,
        heroSubtitle: editHeroSubtitle,
        heroCtaText: editHeroCtaText,
        ga4Id: editGa4Id,
        metaPixelId: editMetaPixelId,
        tiktokPixelId: editTiktokPixelId,
        midtransMerchantId: editMidtransMerchantId,
        midtransClientKey: editMidtransClientKey,
        midtransServerKey: editMidtransServerKey,
        flipApiKey: editFlipApiKey,
        turnstileEnabled: editTurnstileEnabled,
        turnstileSiteKey: editTurnstileSiteKey,
        turnstileSecretKey: editTurnstileSecretKey,
      };

      if (editNewPassword && editNewPassword.trim()) {
        payload.newAdminPassword = editNewPassword.trim();
      }

      const res = await fetch(`/api/super-admin/tenants/${editModalTenant.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal memperbarui data website pelanggan');
      }

      setEditSuccessNotice(
        data.resetPasswordMessage
          ? `Perubahan disimpan! Pesan reset password telah disiapkan di bawah.`
          : `Perubahan data website pelanggan berhasil disimpan!`
      );
      if (data.resetPasswordMessage) {
        setResetSuccessMessage(data.resetPasswordMessage);
      }
      fetchTenants(token);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Gagal memperbarui data pelanggan');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDuplicateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setDuplicationResult(null);
    setSubmitting(true);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const payload = {
        storeName,
        tenantSlug,
        domain,
        tagline,
        storeEmail,
        storePhone,
        storeAddress,
        adminName,
        adminEmail,
        adminPassword,
        primaryColor,
        fontFamily,
        defaultPageSize,
        logoUrl,
        faviconUrl,
        heroBadge,
        heroTitle,
        heroSubtitle,
        heroCtaText,
        heroImageUrl,
        socialLinks: {
          instagram: instagramUrl,
          whatsapp: whatsappUrl,
          tiktok: tiktokUrl,
          shopee: shopeeUrl,
        },
        seedPreset,
        seedLedgerCategories,
        generateLegalPages,
        cookieConsentEnabled,
        defaultSeoTitle,
        defaultSeoDescription,
        ga4Id,
        metaPixelId,
        tiktokPixelId,
        midtransMerchantId,
        midtransClientKey,
        midtransServerKey,
        flipApiKey,
        turnstileEnabled,
        turnstileSiteKey,
        turnstileSecretKey,
        dbMode,
        customDatabaseUrl: dbMode === 'CUSTOM_DB_URL' ? customDatabaseUrl : null,
        deployMode,
        subscriptionPlan,
        expiresAt,
        internalNotes,
      };

      const res = await fetch('/api/super-admin/tenants', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal memproses duplikasi website pelanggan');
      }

      setDuplicationResult(data.result);
      fetchTenants(token);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Terjadi kesalahan saat duplikasi');
    } finally {
      setSubmitting(false);
    }
  };

  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-300">
        Memeriksa otorisasi Super-Admin Control Plane...
      </div>
    );
  }

  // 1. EXCLUSIVE OWNER LOGIN VIEW
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
            ⚡
          </div>
          <h1 className="mt-5 text-center text-2xl font-extrabold text-white">
            Super-Admin Control Plane
          </h1>
          <p className="mt-2 text-center text-sm text-slate-400">
            Portal Eksklusif Pemilik Utama untuk Duplikasi & Provisioning Website Pelanggan
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-slate-900 py-8 px-6 shadow-2xl rounded-2xl border border-slate-800">
            <div className="mb-6 p-3.5 rounded-xl bg-indigo-950/60 border border-indigo-800/60 text-xs text-indigo-200 space-y-1">
              <p className="font-semibold text-indigo-300">🔒 Single-Owner Authentication</p>
              <p>
                Halaman ini terpisah dari akun Admin Toko Pelanggan. Hanya kredensial pemilik utama (
                <code>SUPER_ADMIN_EMAIL</code>) yang dapat masuk dan menduplikasi website baru.
              </p>
            </div>

            {loginError && (
              <div className="mb-4 p-3 rounded-lg bg-red-950/80 border border-red-800 text-red-200 text-sm">
                {loginError}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Email Pemilik (Super-Admin)
                </label>
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="owner@master-control.local"
                  className="w-full rounded-lg bg-slate-800 border border-slate-700 text-white px-3.5 py-2.5 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Password Super-Admin
                </label>
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-lg bg-slate-800 border border-slate-700 text-white px-3.5 py-2.5 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow transition disabled:opacity-50"
              >
                {loginLoading ? 'Memverifikasi Otorisasi...' : 'Masuk ke Control Plane'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const filteredTenants = tenants.filter(
    (t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.domain.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.adminUser?.email || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 2. AUTHENTICATED SUPER-ADMIN OWNER CONTROL PLANE
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Bar */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-lg">
              ⚡
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-base sm:text-lg">Super-Admin Control Plane</h1>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] px-2 py-0.5 rounded-full font-semibold">
                  OWNER ONLY
                </span>
              </div>
              <p className="text-xs text-slate-400">Login sebagai: {ownerEmail}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setActiveTab('list')}
              className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition ${
                activeTab === 'list'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              📋 Daftar Pelanggan ({tenants.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setDuplicationResult(null);
                setActiveTab('duplicate');
              }}
              className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition ${
                activeTab === 'duplicate'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 text-indigo-300 hover:bg-slate-700'
              }`}
            >
              + Duplikasi Website Pelanggan
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="px-3 py-2 rounded-lg text-xs font-medium text-red-300 hover:bg-red-950/60 border border-red-800/40"
            >
              Keluar
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'list' ? (
          <div className="space-y-6">
            {/* Summary KPI */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
                <p className="text-xs font-semibold uppercase text-gray-500">
                  Total Website Pelanggan
                </p>
                <p className="mt-2 text-3xl font-extrabold text-gray-900">{tenants.length}</p>
              </div>
              <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
                <p className="text-xs font-semibold uppercase text-gray-500">
                  Total Produk Lintas Tenant
                </p>
                <p className="mt-2 text-3xl font-extrabold text-indigo-600">
                  {tenants.reduce((acc, t) => acc + t.counts.products, 0)}
                </p>
              </div>
              <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
                <p className="text-xs font-semibold uppercase text-gray-500">
                  Total Transaksi Pesanan
                </p>
                <p className="mt-2 text-3xl font-extrabold text-emerald-600">
                  {tenants.reduce((acc, t) => acc + t.counts.orders, 0)}
                </p>
              </div>
            </div>

            {/* Search & Action Bar */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama toko, domain, atau email admin klien..."
                className="flex-1 rounded-lg border-gray-300 text-sm px-3.5 py-2"
              />
              <button
                type="button"
                onClick={() => {
                  setDuplicationResult(null);
                  setActiveTab('duplicate');
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold shadow-xs"
              >
                + Buat / Duplikasi Website Pelanggan Baru
              </button>
            </div>

            {/* Tenant Table */}
            {loadingTenants ? (
              <div className="bg-white p-12 rounded-xl border text-center text-gray-500">
                Memuat daftar website pelanggan...
              </div>
            ) : filteredTenants.length === 0 ? (
              <div className="bg-white p-12 rounded-xl border text-center text-gray-500">
                Belum ada website pelanggan yang cocok.
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-600">
                      <tr>
                        <th className="px-4 py-3.5 text-left">Toko & Domain</th>
                        <th className="px-4 py-3.5 text-left">Akun Admin Klien</th>
                        <th className="px-4 py-3.5 text-left">Tema & Default List</th>
                        <th className="px-4 py-3.5 text-center">Statistik Data</th>
                        <th className="px-4 py-3.5 text-right">Tanggal Dibuat</th>
                        <th className="px-4 py-3.5 text-center">Aksi / Manajemen</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredTenants.map((tenant) => (
                        <tr key={tenant.id} className="hover:bg-gray-50">
                          <td className="px-4 py-4">
                            <div className="font-bold text-gray-900">{tenant.name}</div>
                            <div className="text-xs text-indigo-600 font-medium">
                              🌐 {tenant.domain}
                            </div>
                            {tenant.tagline && (
                              <div className="text-xs text-gray-500 mt-0.5">{tenant.tagline}</div>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            {tenant.adminUser ? (
                              <div>
                                <div className="font-medium text-gray-900">
                                  {[tenant.adminUser.firstName, tenant.adminUser.lastName]
                                    .filter(Boolean)
                                    .join(' ') || 'Admin Toko'}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {tenant.adminUser.email}
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">-</span>
                            )}
                            {tenant.phone && (
                              <div className="text-xs text-gray-500 mt-0.5">📱 {tenant.phone}</div>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-4 h-4 rounded-full border border-gray-300 inline-block"
                                style={{ backgroundColor: tenant.primaryColor }}
                              />
                              <span className="text-xs font-mono text-gray-700">
                                {tenant.primaryColor}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              Font: <span className="font-medium">{tenant.fontFamily}</span> •{' '}
                              {tenant.defaultPageSize} item/hal
                            </div>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <div className="inline-flex flex-wrap gap-1.5 justify-center text-xs">
                              <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-medium">
                                {tenant.counts.products} Produk
                              </span>
                              <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-medium">
                                {tenant.counts.orders} Order
                              </span>
                              <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 font-medium">
                                {tenant.counts.landingPages} LP
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-right text-xs text-gray-500">
                            {new Date(tenant.createdAt).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </td>
                          <td className="px-4 py-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <a
                                href={`/api/super-admin/preview?domain=${encodeURIComponent(tenant.domain)}&redirect=/`}
                                target="_blank"
                                rel="noreferrer"
                                title="Lihat Tampilan Website Toko (Preview)"
                                className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-semibold flex items-center gap-1 transition"
                              >
                                <span>👁️</span>
                                <span>Preview</span>
                              </a>
                              <button
                                type="button"
                                onClick={() => openResetPasswordModal(tenant)}
                                title="Reset Password Admin Klien"
                                className="px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-xs font-semibold flex items-center gap-1 transition"
                              >
                                <span>🔑</span>
                                <span>Reset Pass</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => openEditTenantModal(tenant)}
                                title="Edit Data & Pengaturan Toko"
                                className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold flex items-center gap-1 transition"
                              >
                                <span>✏️</span>
                                <span>Edit Toko</span>
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
        ) : (
          /* 7-GROUP DUPLICATION WIZARD FORM */
          <div className="space-y-8">
            <div className="bg-indigo-900 text-white p-6 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold">
                  Formulir Duplikasi & Provisioning Website Pelanggan Baru
                </h2>
                <p className="text-sm text-indigo-200 mt-1">
                  Isi 7 grup konfigurasi di bawah ini untuk mencetak toko online baru lengkap dengan
                  Pengaturan Tema, Halaman Legal otomatis, Kategori Keuangan, dan Akun Admin Klien.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('list')}
                className="self-start md:self-auto px-4 py-2 rounded-lg bg-indigo-800 hover:bg-indigo-700 text-xs font-semibold"
              >
                &larr; Kembali ke Daftar Klien
              </button>
            </div>

            {submitError && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
                ❌ {submitError}
              </div>
            )}

            {/* SUCCESS HANDOVER MODAL / PANEL */}
            {duplicationResult && (
              <div className="bg-emerald-50 border-2 border-emerald-500 rounded-2xl p-6 space-y-6 shadow-md">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-emerald-200 pb-4">
                  <div>
                    <span className="inline-block bg-emerald-600 text-white text-xs font-bold px-2.5 py-1 rounded-full mb-2">
                      ✓ DUPLIKASI BERHASIL
                    </span>
                    <h3 className="text-xl font-extrabold text-emerald-950">
                      Website &ldquo;{duplicationResult.store.name}&rdquo; (
                      {duplicationResult.store.domain}) Siap Digunakan!
                    </h3>
                    <p className="text-xs text-emerald-800 mt-1">
                      ID Toko: <code>{duplicationResult.store.id}</code> •{' '}
                      {duplicationResult.seededCounts.ledgerCategories} Kategori Keuangan •{' '}
                      {duplicationResult.seededCounts.categories} Kategori Produk •{' '}
                      {duplicationResult.seededCounts.products} Produk Awal
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={`/api/super-admin/preview?domain=${encodeURIComponent(duplicationResult.store.domain)}&redirect=/`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition"
                    >
                      <span>👁️</span>
                      <span>Buka & Cek Website Sekarang</span>
                    </a>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* WhatsApp Handover Card */}
                  <div className="bg-white p-4 rounded-xl border border-emerald-200 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-bold text-sm text-gray-900">
                          📲 Kartu Serah Terima Klien (Siap Kirim ke WhatsApp)
                        </h4>
                        <button
                          type="button"
                          onClick={() =>
                            handleCopy('handover', duplicationResult.deployment.handoverMessage)
                          }
                          className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                        >
                          {copiedKey === 'handover' ? '✓ Tersalin!' : '📋 Copy Pesan WA'}
                        </button>
                      </div>
                      <pre className="text-xs bg-gray-50 p-3.5 rounded-lg border text-gray-800 whitespace-pre-wrap font-sans leading-relaxed">
                        {duplicationResult.deployment.handoverMessage}
                      </pre>
                    </div>
                  </div>

                  {/* Environment Variables Config */}
                  <div className="bg-white p-4 rounded-xl border border-emerald-200 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-bold text-sm text-gray-900">
                          ⚙️ Konfigurasi Environment (.env) Instance Pelanggan
                        </h4>
                        <button
                          type="button"
                          onClick={() => handleCopy('env', duplicationResult.deployment.envContent)}
                          className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
                        >
                          {copiedKey === 'env' ? '✓ Tersalin!' : '📋 Copy .env'}
                        </button>
                      </div>
                      <pre className="text-xs bg-slate-900 text-emerald-300 p-3.5 rounded-lg overflow-x-auto font-mono leading-relaxed">
                        {duplicationResult.deployment.envContent}
                      </pre>
                      <p className="text-[11px] text-gray-500 mt-2">
                        Catatan: Variabel <code>ENABLE_SUPER_ADMIN_CONTROL_PLANE=&quot;false&quot;</code>{' '}
                        otomatis disematkan agar klien tidak dapat mengakses portal duplikasi ini.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleDuplicateSubmit} className="space-y-8">
              {/* GRUP 1: IDENTITAS TOKO & DOMAIN */}
              <section className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
                <div className="border-b pb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                    Grup 1 (Wajib)
                  </span>
                  <h3 className="text-lg font-bold text-gray-900">Identitas Toko & Domain</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Nama Toko Pelanggan *
                    </label>
                    <input
                      type="text"
                      required
                      value={storeName}
                      onChange={(e) => handleStoreNameChange(e.target.value)}
                      placeholder="Contoh: Berkah Hijab Official"
                      className="w-full rounded-lg border-gray-300 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Slug / Kode Tenant *
                    </label>
                    <input
                      type="text"
                      required
                      value={tenantSlug}
                      onChange={(e) => setTenantSlug(toSlug(e.target.value))}
                      placeholder="berkah-hijab"
                      className="w-full rounded-lg border-gray-300 text-sm font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Domain Utama Pelanggan *
                    </label>
                    <input
                      type="text"
                      required
                      value={domain}
                      onChange={(e) => setDomain(e.target.value)}
                      placeholder="berkahhijab.com"
                      className="w-full rounded-lg border-gray-300 text-sm font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Email CS / Bisnis Toko *
                    </label>
                    <input
                      type="email"
                      required
                      value={storeEmail}
                      onChange={(e) => setStoreEmail(e.target.value)}
                      placeholder="cs@berkahhijab.com"
                      className="w-full rounded-lg border-gray-300 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      No. WhatsApp / Telepon Toko *
                    </label>
                    <input
                      type="tel"
                      required
                      value={storePhone}
                      onChange={(e) => setStorePhone(e.target.value)}
                      placeholder="081234567890"
                      className="w-full rounded-lg border-gray-300 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Tagline / Slogan Toko
                    </label>
                    <input
                      type="text"
                      value={tagline}
                      onChange={(e) => setTagline(e.target.value)}
                      placeholder="Pusat Hijab Premium & Nyaman"
                      className="w-full rounded-lg border-gray-300 text-sm"
                    />
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Alamat Lengkap Toko / Gudang
                    </label>
                    <input
                      type="text"
                      value={storeAddress}
                      onChange={(e) => setStoreAddress(e.target.value)}
                      placeholder="Jl. Melati No. 12, Kota Bandung, Jawa Barat"
                      className="w-full rounded-lg border-gray-300 text-sm"
                    />
                  </div>
                </div>
              </section>

              {/* GRUP 2: AKUN OWNER / ADMIN PELANGGAN */}
              <section className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
                <div className="border-b pb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                    Grup 2 (Wajib)
                  </span>
                  <h3 className="text-lg font-bold text-gray-900">
                    Akun Login Owner / Admin Pelanggan
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Nama Lengkap Owner / Admin *
                    </label>
                    <input
                      type="text"
                      required
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                      placeholder="Siti Aminah"
                      className="w-full rounded-lg border-gray-300 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Email Login Admin Klien *
                    </label>
                    <input
                      type="email"
                      required
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      placeholder="owner@berkahhijab.com"
                      className="w-full rounded-lg border-gray-300 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Password Awal Admin Klien *
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        required
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        className="flex-1 rounded-lg border-gray-300 text-sm font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setAdminPassword(generateStrongPassword())}
                        className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold whitespace-nowrap"
                      >
                        🎲 Acak
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              {/* GRUP 3: BRANDING, TEMA VISUAL & DEFAULT PAGINATION */}
              <section className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
                <div className="border-b pb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                    Grup 3
                  </span>
                  <h3 className="text-lg font-bold text-gray-900">
                    Branding, Tema Visual & Pengaturan List Default
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Warna Utama Brand (Primary Color)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="h-10 w-14 rounded border border-gray-300 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="flex-1 rounded-lg border-gray-300 text-sm font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Tipografi / Font Utama
                    </label>
                    <select
                      value={fontFamily}
                      onChange={(e) => setFontFamily(e.target.value)}
                      className="w-full rounded-lg border-gray-300 text-sm"
                    >
                      <option value="inter">Inter (Modern & Bersih)</option>
                      <option value="poppins">Poppins (Ramah & Geometris)</option>
                      <option value="plus-jakarta-sans">Plus Jakarta Sans (Profesional)</option>
                      <option value="playfair-display">Playfair Display (Butik & Elegan)</option>
                      <option value="montserrat">Montserrat (Tegas & Kontemporer)</option>
                      <option value="roboto">Roboto (Klasik)</option>
                      <option value="lora">Lora (Editorial)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Default Item per Halaman (Pagination)
                    </label>
                    <select
                      value={defaultPageSize}
                      onChange={(e) => setDefaultPageSize(Number(e.target.value))}
                      className="w-full rounded-lg border-gray-300 text-sm"
                    >
                      <option value={10}>10 Item per Halaman (Rekomendasi Default)</option>
                      <option value={20}>20 Item per Halaman</option>
                      <option value={25}>25 Item per Halaman</option>
                      <option value={50}>50 Item per Halaman</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      URL Logo Toko (Opsional)
                    </label>
                    <input
                      type="url"
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                      placeholder="https://.../logo.png"
                      className="w-full rounded-lg border-gray-300 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Judul Hero Banner Beranda
                    </label>
                    <input
                      type="text"
                      value={heroTitle}
                      onChange={(e) => setHeroTitle(e.target.value)}
                      placeholder="Kosongkan untuk otomatis dari Nama Toko"
                      className="w-full rounded-lg border-gray-300 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Teks Tombol CTA Hero
                    </label>
                    <input
                      type="text"
                      value={heroCtaText}
                      onChange={(e) => setHeroCtaText(e.target.value)}
                      placeholder="Belanja Sekarang"
                      className="w-full rounded-lg border-gray-300 text-sm"
                    />
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Subjudul Hero Banner Beranda
                    </label>
                    <input
                      type="text"
                      value={heroSubtitle}
                      onChange={(e) => setHeroSubtitle(e.target.value)}
                      placeholder="Kosongkan untuk otomatis dibuat dari Nama Toko & Tagline"
                      className="w-full rounded-lg border-gray-300 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Link Instagram (Opsional)
                    </label>
                    <input
                      type="url"
                      value={instagramUrl}
                      onChange={(e) => setInstagramUrl(e.target.value)}
                      placeholder="https://instagram.com/..."
                      className="w-full rounded-lg border-gray-300 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Link TikTok (Opsional)
                    </label>
                    <input
                      type="url"
                      value={tiktokUrl}
                      onChange={(e) => setTiktokUrl(e.target.value)}
                      placeholder="https://tiktok.com/@..."
                      className="w-full rounded-lg border-gray-300 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Link Shopee / Marketplace (Opsional)
                    </label>
                    <input
                      type="url"
                      value={shopeeUrl}
                      onChange={(e) => setShopeeUrl(e.target.value)}
                      placeholder="https://shopee.co.id/..."
                      className="w-full rounded-lg border-gray-300 text-sm"
                    />
                  </div>
                </div>
              </section>

              {/* GRUP 4: PRESET KONTEN AWAL & SEEDING OTOMATIS */}
              <section className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
                <div className="border-b pb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                    Grup 4
                  </span>
                  <h3 className="text-lg font-bold text-gray-900">
                    Preset Konten Awal, Kategori Keuangan & Halaman Legal Otomatis
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-2">
                      Mode Data Katalog Produk Awal (Seed Preset)
                    </label>
                    <select
                      value={seedPreset}
                      onChange={(e) => setSeedPreset(e.target.value as any)}
                      className="w-full rounded-lg border-gray-300 text-sm"
                    >
                      <option value="CLEAN">
                        1. Kosong Bersih (Siap Produksi - Tanpa Produk Contoh)
                      </option>
                      <option value="STARTER_FASHION">
                        2. Starter Pack: Fashion & Butik (Termasuk Contoh Produk Ready & PO)
                      </option>
                      <option value="STARTER_FNB">
                        3. Starter Pack: Makanan, Minuman & Hampers
                      </option>
                      <option value="STARTER_ELECTRONICS">
                        4. Starter Pack: Gadget & Elektronik
                      </option>
                      <option value="STARTER_GENERAL">
                        5. Starter Pack: Toko Umum
                      </option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1.5">
                      Pilih <strong>Kosong Bersih</strong> jika klien ingin langsung menginput
                      produk asli mereka, atau pilih <strong>Starter Pack</strong> agar tampilan
                      toko langsung terisi contoh produk sesuai bidang bisnisnya.
                    </p>
                  </div>

                  <div className="space-y-3 pt-1">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={seedLedgerCategories}
                        onChange={(e) => setSeedLedgerCategories(e.target.checked)}
                        className="mt-0.5 rounded border-gray-300 text-indigo-600"
                      />
                      <span className="text-xs text-gray-700">
                        <strong className="block text-sm text-gray-900">
                          Buat Kategori Buku Besar Keuangan Standar
                        </strong>
                        Otomatis mengisi 7 kategori pemasukan & pengeluaran dasar (Penjualan Produk,
                        HPP, Biaya Iklan, Gaji & Operasional, dll).
                      </span>
                    </label>

                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={generateLegalPages}
                        onChange={(e) => setGenerateLegalPages(e.target.checked)}
                        className="mt-0.5 rounded border-gray-300 text-indigo-600"
                      />
                      <span className="text-xs text-gray-700">
                        <strong className="block text-sm text-gray-900">
                          Generate Otomatis Halaman Syarat & Ketentuan + Kebijakan Privasi
                        </strong>
                        Menyusun dokumen legal Bahasa Indonesia yang sudah menyisipkan Nama Toko,
                        Domain, Email, dan Nomor Telepon pelanggan.
                      </span>
                    </label>

                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={cookieConsentEnabled}
                        onChange={(e) => setCookieConsentEnabled(e.target.checked)}
                        className="mt-0.5 rounded border-gray-300 text-indigo-600"
                      />
                      <span className="text-xs text-gray-700">
                        <strong className="block text-sm text-gray-900">
                          Aktifkan Banner Persetujuan Cookie (Cookie Consent)
                        </strong>
                      </span>
                    </label>
                  </div>
                </div>
              </section>

              {/* GRUP 5: SEO DASAR & TRACKING PIXEL */}
              <section className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
                <div className="border-b pb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                    Grup 5 (Opsional)
                  </span>
                  <h3 className="text-lg font-bold text-gray-900">
                    SEO Dasar & Integrasi Pixel Iklan
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Google Analytics 4 (GA4 Measurement ID)
                    </label>
                    <input
                      type="text"
                      value={ga4Id}
                      onChange={(e) => setGa4Id(e.target.value)}
                      placeholder="G-XXXXXXXXXX"
                      className="w-full rounded-lg border-gray-300 text-sm font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Meta (Facebook) Pixel ID
                    </label>
                    <input
                      type="text"
                      value={metaPixelId}
                      onChange={(e) => setMetaPixelId(e.target.value)}
                      placeholder="123456789012345"
                      className="w-full rounded-lg border-gray-300 text-sm font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      TikTok Pixel ID
                    </label>
                    <input
                      type="text"
                      value={tiktokPixelId}
                      onChange={(e) => setTiktokPixelId(e.target.value)}
                      placeholder="CXXXXXXXXXXXXXXX"
                      className="w-full rounded-lg border-gray-300 text-sm font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Default SEO Title
                    </label>
                    <input
                      type="text"
                      value={defaultSeoTitle}
                      onChange={(e) => setDefaultSeoTitle(e.target.value)}
                      placeholder="Otomatis jika dikosongkan"
                      className="w-full rounded-lg border-gray-300 text-sm"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Default SEO Description
                    </label>
                    <input
                      type="text"
                      value={defaultSeoDescription}
                      onChange={(e) => setDefaultSeoDescription(e.target.value)}
                      placeholder="Otomatis jika dikosongkan"
                      className="w-full rounded-lg border-gray-300 text-sm"
                    />
                  </div>
                </div>
              </section>

              {/* GRUP 6: PAYMENT GATEWAY & PROTEKSI BOT */}
              <section className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
                <div className="border-b pb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                    Grup 6 (Opsional - Bisa Diisi Klien Belakangan)
                  </span>
                  <h3 className="text-lg font-bold text-gray-900">
                    Payment Gateway (Midtrans / Flip) & Cloudflare Turnstile
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Midtrans Merchant ID
                    </label>
                    <input
                      type="text"
                      value={midtransMerchantId}
                      onChange={(e) => setMidtransMerchantId(e.target.value)}
                      placeholder="G123456789"
                      className="w-full rounded-lg border-gray-300 text-sm font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Midtrans Client Key
                    </label>
                    <input
                      type="text"
                      value={midtransClientKey}
                      onChange={(e) => setMidtransClientKey(e.target.value)}
                      placeholder="SB-Mid-client-..."
                      className="w-full rounded-lg border-gray-300 text-sm font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Midtrans Server Key
                    </label>
                    <input
                      type="password"
                      value={midtransServerKey}
                      onChange={(e) => setMidtransServerKey(e.target.value)}
                      placeholder="SB-Mid-server-..."
                      className="w-full rounded-lg border-gray-300 text-sm font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Flip API Secret Key
                    </label>
                    <input
                      type="password"
                      value={flipApiKey}
                      onChange={(e) => setFlipApiKey(e.target.value)}
                      placeholder="Flip secret key..."
                      className="w-full rounded-lg border-gray-300 text-sm font-mono"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-100 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={turnstileEnabled}
                      onChange={(e) => setTurnstileEnabled(e.target.checked)}
                      className="rounded border-gray-300 text-indigo-600"
                    />
                    <span className="text-xs font-semibold text-gray-800">
                      Aktifkan Proteksi Bot Cloudflare Turnstile
                    </span>
                  </label>

                  {turnstileEnabled && (
                    <>
                      <input
                        type="text"
                        value={turnstileSiteKey}
                        onChange={(e) => setTurnstileSiteKey(e.target.value)}
                        placeholder="Turnstile Site Key (0x4AAAAAA...)"
                        className="w-full rounded-lg border-gray-300 text-sm font-mono"
                      />
                      <input
                        type="password"
                        value={turnstileSecretKey}
                        onChange={(e) => setTurnstileSecretKey(e.target.value)}
                        placeholder="Turnstile Secret Key"
                        className="w-full rounded-lg border-gray-300 text-sm font-mono"
                      />
                    </>
                  )}
                </div>
              </section>

              {/* GRUP 7: INFRASTRUKTUR DATABASE & LANGGANAN KLIEN */}
              <section className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
                <div className="border-b pb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                    Grup 7 (Internal Super-Admin)
                  </span>
                  <h3 className="text-lg font-bold text-gray-900">
                    Target Database, Deployment & Pencatatan Langganan Klien
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Target Database Pelanggan
                    </label>
                    <select
                      value={dbMode}
                      onChange={(e) => setDbMode(e.target.value as any)}
                      className="w-full rounded-lg border-gray-300 text-sm"
                    >
                      <option value="CURRENT_DB">
                        Gunakan Cluster Database Saat Ini (Multi-Tenant via storeId)
                      </option>
                      <option value="CUSTOM_DB_URL">
                        Database Terpisah Khusus Klien (Masukkan DATABASE_URL Baru)
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Paket Layanan Klien
                    </label>
                    <select
                      value={subscriptionPlan}
                      onChange={(e) => setSubscriptionPlan(e.target.value as any)}
                      className="w-full rounded-lg border-gray-300 text-sm"
                    >
                      <option value="STARTER">Paket Starter</option>
                      <option value="BUSINESS">Paket Business (Rekomendasi)</option>
                      <option value="ENTERPRISE">Paket Enterprise / Custom</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Jatuh Tempo Sewa / Maintenance
                    </label>
                    <input
                      type="date"
                      value={expiresAt}
                      onChange={(e) => setExpiresAt(e.target.value)}
                      className="w-full rounded-lg border-gray-300 text-sm"
                    />
                  </div>

                  {dbMode === 'CUSTOM_DB_URL' && (
                    <div className="md:col-span-3">
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Connection String PostgreSQL Pelanggan (DATABASE_URL) *
                      </label>
                      <input
                        type="text"
                        required
                        value={customDatabaseUrl}
                        onChange={(e) => setCustomDatabaseUrl(e.target.value)}
                        placeholder="postgresql://user:pass@ep-xxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
                        className="w-full rounded-lg border-gray-300 text-sm font-mono"
                      />
                      <p className="text-[11px] text-gray-500 mt-1">
                        Pastikan skema tabel sudah di-push (<code>npx prisma db push</code>) pada
                        database baru tersebut sebelum menjalankan inisialisasi data.
                      </p>
                    </div>
                  )}

                  <div className="md:col-span-3">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Catatan Internal Klien (Hanya Dilihat oleh Anda)
                    </label>
                    <input
                      type="text"
                      value={internalNotes}
                      onChange={(e) => setInternalNotes(e.target.value)}
                      placeholder="Contoh: Klien minta bantuan upload 10 produk pertama..."
                      className="w-full rounded-lg border-gray-300 text-sm"
                    />
                  </div>
                </div>
              </section>

              <div className="flex items-center justify-end gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('list')}
                  className="px-5 py-3 rounded-xl border border-gray-300 bg-white text-gray-700 text-sm font-semibold hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-8 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-lg transition disabled:opacity-50"
                >
                  {submitting
                    ? '⏳ Sedang Menduplikasi & Menginisialisasi Toko...'
                    : '🚀 Proses Duplikasi Website Pelanggan Sekarang'}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>

      {/* QUICK RESET PASSWORD MODAL */}
      {resetModalTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <span>🔑</span>
                  <span>Reset Password Admin Klien</span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Toko: <strong>{resetModalTenant.name}</strong> ({resetModalTenant.domain})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setResetModalTenant(null)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                &times;
              </button>
            </div>

            {resetError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-medium">
                {resetError}
              </div>
            )}

            {resetSuccessMessage ? (
              <div className="space-y-4">
                <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl">
                  <span className="text-xs font-bold text-emerald-800 uppercase block mb-1">
                    ✓ Password Berhasil Direset!
                  </span>
                  <p className="text-xs text-emerald-700">
                    Password baru telah aktif di database. Anda dapat menyalin pesan berikut dan
                    mengirimkannya langsung ke WhatsApp pelanggan:
                  </p>
                </div>

                <div className="relative">
                  <pre className="text-xs bg-gray-50 p-3.5 rounded-xl border text-gray-800 whitespace-pre-wrap font-sans leading-relaxed">
                    {resetSuccessMessage}
                  </pre>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => handleCopy('reset_wa', resetSuccessMessage)}
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5"
                  >
                    <span>{copiedKey === 'reset_wa' ? '✓ Tersalin!' : '📋 Copy Pesan WhatsApp'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setResetModalTenant(null)}
                    className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleQuickResetPassword} className="space-y-4">
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                  <p className="font-semibold text-amber-900">
                    Target Admin: {resetModalTenant.adminUser?.email || resetModalTenant.email}
                  </p>
                  <p className="mt-0.5">
                    Gunakan password yang telah dibuat otomatis di bawah, atau ketik password baru
                    secara manual.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Password Baru Admin *
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={resetNewPassword}
                      onChange={(e) => setResetNewPassword(e.target.value)}
                      placeholder="Password baru minimal 8 karakter..."
                      className="flex-1 rounded-lg border-gray-300 text-sm font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setResetNewPassword(generateStrongPassword())}
                      className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold whitespace-nowrap"
                    >
                      🎲 Acak Baru
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t">
                  <button
                    type="button"
                    onClick={() => setResetModalTenant(null)}
                    className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-xs font-semibold hover:bg-gray-50"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={resetSubmitting}
                    className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow disabled:opacity-50"
                  >
                    {resetSubmitting ? 'Memperbarui...' : 'Simpan & Siapkan Pesan WA'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* FULL EDIT TENANT MODAL */}
      {editModalTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-gray-200 space-y-6 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3 sticky top-0 bg-white z-10">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">
                  Manajemen Toko Pelanggan
                </span>
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <span>✏️</span>
                  <span>Edit Data: {editModalTenant.name}</span>
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditModalTenant(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold leading-none"
              >
                &times;
              </button>
            </div>

            {editLoadingDetail && (
              <div className="p-3 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-xs">
                Mengambil rincian pengaturan lengkap toko...
              </div>
            )}

            {editError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-medium">
                {editError}
              </div>
            )}

            {editSuccessNotice && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-medium space-y-2">
                <p className="font-bold">✓ {editSuccessNotice}</p>
                {resetSuccessMessage && (
                  <div>
                    <pre className="text-xs bg-white p-3 rounded-lg border text-gray-800 whitespace-pre-wrap font-sans mt-2">
                      {resetSuccessMessage}
                    </pre>
                    <button
                      type="button"
                      onClick={() => handleCopy('edit_wa', resetSuccessMessage)}
                      className="mt-2 px-3 py-1 bg-emerald-600 text-white rounded text-xs font-bold"
                    >
                      {copiedKey === 'edit_wa' ? '✓ Tersalin!' : '📋 Copy Pesan WA'}
                    </button>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleEditTenantSubmit} className="space-y-6">
              {/* Bagian 1: Identitas & Domain */}
              <div className="space-y-3">
                <h4 className="font-bold text-sm text-gray-900 border-b pb-1.5 text-indigo-700">
                  1. Identitas Toko & Kontak
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Nama Toko Pelanggan *
                    </label>
                    <input
                      type="text"
                      required
                      value={editStoreName}
                      onChange={(e) => setEditStoreName(e.target.value)}
                      className="w-full rounded-lg border-gray-300 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Domain Toko *
                    </label>
                    <input
                      type="text"
                      required
                      value={editDomain}
                      onChange={(e) => setEditDomain(e.target.value)}
                      className="w-full rounded-lg border-gray-300 text-sm font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Tagline / Slogan
                    </label>
                    <input
                      type="text"
                      value={editTagline}
                      onChange={(e) => setEditTagline(e.target.value)}
                      className="w-full rounded-lg border-gray-300 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Email Toko / CS *
                    </label>
                    <input
                      type="email"
                      required
                      value={editStoreEmail}
                      onChange={(e) => setEditStoreEmail(e.target.value)}
                      className="w-full rounded-lg border-gray-300 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      No. WhatsApp / Telepon *
                    </label>
                    <input
                      type="tel"
                      required
                      value={editStorePhone}
                      onChange={(e) => setEditStorePhone(e.target.value)}
                      className="w-full rounded-lg border-gray-300 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      URL Logo Toko
                    </label>
                    <input
                      type="url"
                      value={editLogoUrl}
                      onChange={(e) => setEditLogoUrl(e.target.value)}
                      placeholder="https://.../logo.png"
                      className="w-full rounded-lg border-gray-300 text-sm"
                    />
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Alamat Lengkap Toko
                    </label>
                    <input
                      type="text"
                      value={editStoreAddress}
                      onChange={(e) => setEditStoreAddress(e.target.value)}
                      className="w-full rounded-lg border-gray-300 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Bagian 2: Akun Admin Klien & Reset Password */}
              <div className="space-y-3 bg-amber-50/60 p-4 rounded-xl border border-amber-200">
                <h4 className="font-bold text-sm text-amber-900 border-b border-amber-200 pb-1.5 flex items-center gap-1.5">
                  <span>🔑</span>
                  <span>2. Akun Admin Klien & Reset Password</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Nama Admin / Owner *
                    </label>
                    <input
                      type="text"
                      required
                      value={editAdminName}
                      onChange={(e) => setEditAdminName(e.target.value)}
                      className="w-full rounded-lg border-gray-300 text-sm bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Email Login Admin *
                    </label>
                    <input
                      type="email"
                      required
                      value={editAdminEmail}
                      onChange={(e) => setEditAdminEmail(e.target.value)}
                      className="w-full rounded-lg border-gray-300 text-sm bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Reset Password Baru (Kosongkan jika tidak diubah)
                    </label>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={editNewPassword}
                        onChange={(e) => setEditNewPassword(e.target.value)}
                        placeholder="Ketik password baru..."
                        className="flex-1 rounded-lg border-gray-300 text-sm font-mono bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => setEditNewPassword(generateStrongPassword())}
                        className="px-2.5 py-1.5 bg-amber-200 hover:bg-amber-300 text-amber-900 rounded-lg text-xs font-bold whitespace-nowrap"
                      >
                        🎲 Acak
                      </button>
                    </div>
                  </div>
                </div>
                <p className="text-[11px] text-amber-800">
                  💡 Jika password diisi, sistem akan otomatis mengenkripsi password baru dan
                  menghasilkan format pesan WhatsApp serah-terima untuk klien.
                </p>
              </div>

              {/* Bagian 3: Tema, Tampilan & List Default */}
              <div className="space-y-3">
                <h4 className="font-bold text-sm text-gray-900 border-b pb-1.5 text-indigo-700">
                  3. Branding, Tema & Default Item Pagination
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Warna Utama Brand
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={editPrimaryColor}
                        onChange={(e) => setEditPrimaryColor(e.target.value)}
                        className="h-10 w-12 rounded border border-gray-300 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={editPrimaryColor}
                        onChange={(e) => setEditPrimaryColor(e.target.value)}
                        className="flex-1 rounded-lg border-gray-300 text-sm font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Font Utama
                    </label>
                    <select
                      value={editFontFamily}
                      onChange={(e) => setEditFontFamily(e.target.value)}
                      className="w-full rounded-lg border-gray-300 text-sm"
                    >
                      <option value="inter">Inter</option>
                      <option value="poppins">Poppins</option>
                      <option value="plus-jakarta-sans">Plus Jakarta Sans</option>
                      <option value="playfair-display">Playfair Display</option>
                      <option value="montserrat">Montserrat</option>
                      <option value="roboto">Roboto</option>
                      <option value="lora">Lora</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Default Item per Halaman
                    </label>
                    <select
                      value={editDefaultPageSize}
                      onChange={(e) => setEditDefaultPageSize(Number(e.target.value))}
                      className="w-full rounded-lg border-gray-300 text-sm"
                    >
                      <option value={10}>10 Item per Halaman</option>
                      <option value={20}>20 Item per Halaman</option>
                      <option value={25}>25 Item per Halaman</option>
                      <option value={50}>50 Item per Halaman</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Judul Hero Banner
                    </label>
                    <input
                      type="text"
                      value={editHeroTitle}
                      onChange={(e) => setEditHeroTitle(e.target.value)}
                      className="w-full rounded-lg border-gray-300 text-sm"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Subjudul Hero Banner
                    </label>
                    <input
                      type="text"
                      value={editHeroSubtitle}
                      onChange={(e) => setEditHeroSubtitle(e.target.value)}
                      className="w-full rounded-lg border-gray-300 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Bagian 4: SEO, Tracking Pixel & Payment Gateway */}
              <div className="space-y-3">
                <h4 className="font-bold text-sm text-gray-900 border-b pb-1.5 text-indigo-700">
                  4. Pixel Iklan & Payment Gateway
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Google Analytics 4 (GA4)
                    </label>
                    <input
                      type="text"
                      value={editGa4Id}
                      onChange={(e) => setEditGa4Id(e.target.value)}
                      placeholder="G-XXXXXXXXXX"
                      className="w-full rounded-lg border-gray-300 text-sm font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Meta (Facebook) Pixel ID
                    </label>
                    <input
                      type="text"
                      value={editMetaPixelId}
                      onChange={(e) => setEditMetaPixelId(e.target.value)}
                      placeholder="1234567890"
                      className="w-full rounded-lg border-gray-300 text-sm font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      TikTok Pixel ID
                    </label>
                    <input
                      type="text"
                      value={editTiktokPixelId}
                      onChange={(e) => setEditTiktokPixelId(e.target.value)}
                      placeholder="CXXXXXXXXXXXXXXX"
                      className="w-full rounded-lg border-gray-300 text-sm font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Midtrans Merchant ID
                    </label>
                    <input
                      type="text"
                      value={editMidtransMerchantId}
                      onChange={(e) => setEditMidtransMerchantId(e.target.value)}
                      className="w-full rounded-lg border-gray-300 text-sm font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Midtrans Client Key
                    </label>
                    <input
                      type="text"
                      value={editMidtransClientKey}
                      onChange={(e) => setEditMidtransClientKey(e.target.value)}
                      className="w-full rounded-lg border-gray-300 text-sm font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Flip API Secret Key
                    </label>
                    <input
                      type="password"
                      value={editFlipApiKey}
                      onChange={(e) => setEditFlipApiKey(e.target.value)}
                      className="w-full rounded-lg border-gray-300 text-sm font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t sticky bottom-0 bg-white">
                <button
                  type="button"
                  onClick={() => setEditModalTenant(null)}
                  className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 text-xs font-semibold hover:bg-gray-50"
                >
                  Tutup
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="px-7 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow transition disabled:opacity-50"
                >
                  {editSubmitting ? 'Menyimpan Perubahan...' : 'Simpan Semua Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
