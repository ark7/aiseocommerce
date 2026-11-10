'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import StoreHeader from '@/components/StoreHeader';

/**
 * Root storefront error boundary.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Storefront error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <StoreHeader />

      <div className="flex-1 flex items-center justify-center px-4 py-20">
        <div className="text-center max-w-md">
          <p className="text-5xl font-bold text-red-600">Ups</p>
          <h1 className="mt-4 text-xl font-semibold text-gray-900">Halaman gagal dimuat</h1>
          <p className="mt-2 text-sm text-gray-600">
            Terjadi kesalahan saat memuat halaman. Silakan coba lagi atau kembali ke beranda.
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              onClick={reset}
              className="bg-indigo-600 text-white px-5 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Coba Lagi
            </button>
            <Link
              href="/"
              className="border border-gray-300 text-gray-700 px-5 py-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Beranda Toko
            </Link>
            <Link
              href="/orders"
              className="border border-gray-300 text-gray-700 px-5 py-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Pesanan Saya
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

