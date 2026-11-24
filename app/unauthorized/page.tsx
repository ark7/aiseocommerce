import Link from 'next/link';
import StoreHeader from '@/components/StoreHeader';

/**
 * Fallback page rendered when a user lacks permission for a restricted route.
 */
export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex flex-col">
      <StoreHeader />

      <div className="flex-1 flex items-center justify-center px-4 py-20">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-red-100 dark:border-red-900/50 p-8 text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m0 0v2m0-2h2m-2 0H10m9-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Akses Ditolak</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            Akun Anda tidak memiliki izin untuk membuka halaman ini. Silakan kembali ke beranda toko atau masuk menggunakan akun yang berwenang.
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/"
              className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
            >
              Kembali ke Beranda
            </Link>
            <Link
              href="/login"
              className="border border-gray-300 dark:border-slate-700 text-gray-700 dark:text-gray-200 px-5 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors text-sm font-medium"
            >
              Login dengan Akun Lain
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
