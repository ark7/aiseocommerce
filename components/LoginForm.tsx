'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface LoginFormProps {
  storeId: string;
  storeDomain?: string;
  fromPath: string | null;
  siteKey?: string;
  isDemo?: boolean;
}

export function LoginForm({ storeId, storeDomain, fromPath, siteKey, isDemo = false }: LoginFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    turnstileToken: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!siteKey) return;
    (window as any).onLoginTurnstileSuccess = (token: string) => {
      setFormData(prev => ({ ...prev, turnstileToken: token }));
    };
    if (!document.getElementById('cf-turnstile-script')) {
      const script = document.createElement('script');
      script.id = 'cf-turnstile-script';
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  }, [siteKey]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          turnstileToken: formData.turnstileToken,
          storeId,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.token) localStorage.setItem('token', data.token);
        if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
        if (data.user) localStorage.setItem('user', JSON.stringify(data.user));

        if (fromPath) {
          router.push(fromPath);
        } else if (data.user?.role === 'ADMIN' || data.user?.role === 'STAFF') {
          router.push('/admin');
        } else {
          router.push('/');
        }
      } else {
        setError(data.error || 'Login gagal. Silahkan coba lagi.');
      }
    } catch (err) {
      setError('Terjadi kesalahan. Silahkan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoCredentials = (email: string, pass: string) => {
    setFormData(prev => ({ ...prev, email, password: pass }));
    setError(null);
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 bg-red-50 dark:bg-rose-900/30 text-red-700 dark:text-rose-300 text-sm rounded-lg border border-red-200 dark:border-rose-800">
          ⚠️ {error}
        </div>
      )}

      {isDemo && (
        <div
          data-testid="demo-credentials-card"
          className="p-4 rounded-xl bg-gradient-to-br from-indigo-50/90 via-purple-50/80 to-blue-50/90 dark:from-slate-800 dark:to-slate-850 border border-indigo-100 dark:border-slate-700 space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 flex items-center space-x-1.5">
              <span>⚡</span>
              <span>Akses Cepat Demo Toko</span>
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-semibold">
              1-Klik Auto-Fill
            </span>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-300">
            Pilih salah satu peran demo untuk menguji sistem tanpa mengetik manual:
          </p>

          <div className="grid grid-cols-1 gap-2">
            {/* Admin Toko */}
            <button
              type="button"
              data-testid="demo-admin-btn"
              onClick={() => fillDemoCredentials('admin@demo-store.local', 'password')}
              className="w-full text-left p-2.5 rounded-lg bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 hover:border-indigo-500 hover:shadow-sm transition flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center space-x-2.5 min-w-0">
                <span className="w-7 h-7 shrink-0 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-bold">
                  👑
                </span>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-gray-900 dark:text-white flex items-center space-x-1.5 truncate">
                    <span>Admin Toko</span>
                    <span className="text-[10px] text-gray-400 font-mono font-normal">admin@demo-store.local</span>
                  </div>
                  <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                    Akses penuh: Dashboard, Produk, Keuangan, Staf, AI & Pengaturan
                  </div>
                </div>
              </div>
              <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 shrink-0 ml-2 group-hover:translate-x-0.5 transition-transform">
                Pilih →
              </span>
            </button>

            {/* Staf Toko */}
            <button
              type="button"
              data-testid="demo-staff-btn"
              onClick={() => fillDemoCredentials('staff@demo-store.local', 'password')}
              className="w-full text-left p-2.5 rounded-lg bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 hover:border-indigo-500 hover:shadow-sm transition flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center space-x-2.5 min-w-0">
                <span className="w-7 h-7 shrink-0 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
                  👔
                </span>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-gray-900 dark:text-white flex items-center space-x-1.5 truncate">
                    <span>Staf Operasional</span>
                    <span className="text-[10px] text-gray-400 font-mono font-normal">staff@demo-store.local</span>
                  </div>
                  <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                    Akses operasional: Pesanan & Resi, Katalog Produk & Stok
                  </div>
                </div>
              </div>
              <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 shrink-0 ml-2 group-hover:translate-x-0.5 transition-transform">
                Pilih →
              </span>
            </button>

            {/* Pembeli / Pelanggan */}
            <button
              type="button"
              data-testid="demo-customer-btn"
              onClick={() => fillDemoCredentials('customer1@demo-store.local', 'password')}
              className="w-full text-left p-2.5 rounded-lg bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 hover:border-indigo-500 hover:shadow-sm transition flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center space-x-2.5 min-w-0">
                <span className="w-7 h-7 shrink-0 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">
                  🛍️
                </span>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-gray-900 dark:text-white flex items-center space-x-1.5 truncate">
                    <span>Pelanggan / Pembeli</span>
                    <span className="text-[10px] text-gray-400 font-mono font-normal">customer1@demo-store.local</span>
                  </div>
                  <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                    Akses belanja storefront: Katalog, Keranjang, Checkout & Riwayat
                  </div>
                </div>
              </div>
              <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 shrink-0 ml-2 group-hover:translate-x-0.5 transition-transform">
                Pilih →
              </span>
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700 dark:text-slate-200">Email</label>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          required
          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white bg-white dark:bg-slate-800 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="admin@toko.com"
        />
      </div>

      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700 dark:text-slate-200">Password</label>
        <input
          type="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          required
          minLength={6}
          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white bg-white dark:bg-slate-800 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="Masukkan password"
        />
      </div>

      {siteKey && (
        <div className="turnstile-container my-3 flex justify-center">
          <div
            className="cf-turnstile"
            data-sitekey={siteKey}
            data-callback="onLoginTurnstileSuccess"
          />
        </div>
      )}

      <div className="flex items-center justify-between">
        <Link href="/forgot-password" className="text-sm text-indigo-600 hover:underline">
          Lupa password?
        </Link>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
      >
        {loading ? (
          <>
            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>Masuk...</span>
          </>
        ) : (
          <span>Masuk</span>
        )}
      </button>
    </form>
  </div>
  );
}
