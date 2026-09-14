'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import StoreHeader from '@/components/StoreHeader';

/**
 * 404 inside a storefront. Keeps the store header so the customer can carry on
 * browsing instead of hitting a dead end.
 */
export default function StoreNotFound() {
  const pathname = usePathname();
  const storeDomain = pathname.split('/')[1] || '';

  return (
    <div className="min-h-screen bg-gray-50">
      {storeDomain && <StoreHeader storeDomain={storeDomain} />}

      <div className="flex items-center justify-center px-4 py-20">
        <div className="text-center max-w-md">
          <p className="text-6xl font-bold text-indigo-600">404</p>
          <h1 className="mt-4 text-xl font-semibold text-gray-900">Halaman tidak ditemukan</h1>
          <p className="mt-2 text-sm text-gray-600">
            Halaman yang Anda cari tidak ada di toko ini.
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href={`/${storeDomain}`}
              className="bg-indigo-600 text-white px-5 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Beranda Toko
            </Link>
            <Link
              href={`/${storeDomain}/orders`}
              className="border border-gray-300 text-gray-700 px-5 py-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Pesanan Saya
            </Link>
            <Link
              href={`/${storeDomain}/cart`}
              className="border border-gray-300 text-gray-700 px-5 py-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Keranjang
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
