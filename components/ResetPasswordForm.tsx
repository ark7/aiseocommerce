'use client';

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError('Token pengaturan ulang kata sandi tidak ditemukan pada tautan ini.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password baru minimal 6 karakter.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Konfirmasi password baru tidak cocok.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword, confirmPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Gagal mengatur ulang kata sandi.');
        return;
      }

      setSuccess(true);
    } catch {
      setError('Terjadi gangguan koneksi. Silakan coba kembali.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="space-y-4 text-center">
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-sm">
          <p className="font-semibold text-base mb-1">🎉 Kata Sandi Berhasil Diperbarui!</p>
          <p>Kata sandi baru Anda telah aktif. Silakan masuk kembali ke akun Anda.</p>
        </div>

        <Link
          href="/login"
          className="inline-block w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-4 rounded-lg text-sm transition-colors"
        >
          Masuk ke Akun Sekarang &rarr;
        </Link>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg text-sm">
          <p className="font-semibold mb-1">⚠️ Token Tidak Ditemukan</p>
          <p>
            Tautan reset password ini tidak valid karena tidak menyertakan token keamanan. Pastikan Anda membuka tautan lengkap yang kami kirimkan ke email Anda.
          </p>
        </div>

        <Link
          href="/forgot-password"
          className="inline-block w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-4 rounded-lg text-sm text-center transition-colors"
        >
          Kirim Ulang Permintaan Reset &rarr;
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
          Kata Sandi Baru
        </label>
        <div className="relative">
          <input
            id="newPassword"
            type={showPassword ? 'text' : 'password'}
            required
            minLength={6}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Minimal 6 karakter"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm pr-10"
            disabled={loading}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-gray-500 hover:text-gray-700"
          >
            {showPassword ? 'Sembunyikan' : 'Lihat'}
          </button>
        </div>
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
          Ulangi Kata Sandi Baru
        </label>
        <input
          id="confirmPassword"
          type={showPassword ? 'text' : 'password'}
          required
          minLength={6}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Ketik ulang password baru"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
          disabled={loading}
        />
        {newPassword && confirmPassword && (
          <p className={`text-xs mt-1 font-medium ${
            newPassword === confirmPassword ? 'text-emerald-600' : 'text-red-500'
          }`}>
            {newPassword === confirmPassword ? '✓ Kata sandi cocok' : '✗ Kata sandi belum cocok'}
          </p>
        )}
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
            <span>Menyimpan Kata Sandi...</span>
          </>
        ) : (
          'Simpan Kata Sandi Baru'
        )}
      </button>

      <div className="pt-2 text-center">
        <Link
          href="/login"
          className="text-sm font-medium text-gray-600 hover:text-gray-800 hover:underline"
        >
          Batal & Kembali ke Login
        </Link>
      </div>
    </form>
  );
}
