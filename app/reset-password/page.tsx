import { Suspense } from 'react';
import { ResetPasswordForm } from '@/components/ResetPasswordForm';

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
              <span className="text-white font-bold text-2xl">🛡️</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Buat Kata Sandi Baru</h1>
            <p className="text-gray-500 mt-2 text-sm">
              Silakan masukkan kata sandi baru untuk mengamankan akun toko Anda.
            </p>
          </div>

          <Suspense
            fallback={
              <div className="py-8 text-center text-gray-500 text-sm">
                Memuat formulir keamanan...
              </div>
            }
          >
            <ResetPasswordForm />
          </Suspense>
        </div>

        <div className="mt-6 text-center text-xs text-gray-500">
          Didukung oleh <strong className="text-gray-700">LarisManis.online</strong> — Webcommerce Pemersatu Jalur Pemasaran Anda.
        </div>
      </div>
    </div>
  );
}
