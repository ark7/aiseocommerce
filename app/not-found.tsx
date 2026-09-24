"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function NotFound() {
  const [storeHome, setStoreHome] = useState('/');

  useEffect(() => {
    // Only run on client
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      // Remove leading and trailing slashes, split
      const parts = path.split('/').filter(Boolean);
      if (parts.length >= 1) {
        const storeDomain = parts[0];
        setStoreHome(`/${storeDomain}/`);
      } else {
        // Fallback to root
        setStoreHome('/');
      }
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <p className="text-6xl font-bold text-indigo-600">404</p>
        <h1 className="mt-4 text-xl font-semibold text-gray-900">Halaman tidak ditemukan</h1>
        <p className="mt-2 text-sm text-gray-600">
          Alamat yang Anda buka tidak ada atau sudah dipindahkan.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href={storeHome}
            className="bg-indigo-600 text-white px-5 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Kembali ke Beranda
          </Link>
          <Link
            href="/login"
            className="border border-gray-300 text-gray-700 px-5 py-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Masuk
          </Link>
        </div>
      </div>
    </div>
  );
}
