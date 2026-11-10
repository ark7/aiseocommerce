'use client';

import { useState } from 'react';
import Link from 'next/link';

interface ForgotPasswordFormProps {
  storeDomain?: string;
  storeName?: string;
}

export function ForgotPasswordForm({ storeDomain, storeName }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isDemoAccount, setIsDemoAccount] = useState(false);
  const [resetUrl, setResetUrl] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setResetUrl(null);
    setIsDemoAccount(false);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, storeDomain }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Gagal mengirim tautan reset password.');
        return;
      }

      setSuccessMessage(data.message || 'Tautan pemulihan kata sandi telah dikirim.');
      if (data.isDemo) {
        setIsDemoAccount(true);
      }
      if (data.resetUrl) {
        setResetUrl(data.resetUrl);
      }
    } catch {
      setError('Terjadi kesalahan jaringan. Silakan coba kembali.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
          {error}
        </div>
      )}

      {successMessage && (
        <div className={`p-4 border text-sm rounded-lg space-y-2 ${
          isDemoAccount
            ? 'bg-amber-50 border-amber-200 text-amber-900'
            : 'bg-emerald-50 border-emerald-200 text-emerald-800'
        }`}>
          <div className="font-semibold flex items-center gap-2">
            <span>{isDemoAccount ? 'ℹ️ Info Akun Demo' : '✓ Permintaan Berhasil'}</span>
          </div>
          <p>{successMessage}</p>

          {resetUrl && (
            <div className="mt-3 pt-3 border-t border-emerald-200">
              <p className="text-xs text-emerald-700 mb-1 font-medium">Tautan Langsung (Mode Uji / Development):</p>
              <a
                href={resetUrl}
                className="inline-block bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs px-3 py-1.5 rounded transition-colors"
              >
                Buka Halaman Reset Password &rarr;
              </a>
            </div>
          )}
        </div>
      )}

      {!successMessage && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Alamat Email Terdaftar
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@email.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              disabled={loading}
            />
            <p className="text-xs text-gray-500 mt-1">
              Kami akan mengirimkan tautan untuk mengatur ulang kata sandi akun Anda.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-4 rounded-lg text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Mengirim Tautan...</span>
              </>
            ) : (
              'Kirim Tautan Reset Password'
            )}
          </button>
        </form>
      )}

      <div className="pt-2 text-center">
        <Link
          href="/login"
          className="text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:underline flex items-center justify-center gap-1"
        >
          &larr; <span>Kembali ke Halaman Login</span>
        </Link>
      </div>
    </div>
  );
}
