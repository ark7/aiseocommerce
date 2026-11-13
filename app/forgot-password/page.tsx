import { cookies } from 'next/headers';
import { getActiveStore } from '@/lib/store';
import { ForgotPasswordForm } from '@/components/ForgotPasswordForm';
import {
  resolveTurnstileConfig,
  TURNSTILE_PASS_COOKIE,
  verifyTurnstilePassToken,
} from '@/lib/turnstile';
import Link from 'next/link';

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const storeParam = params.store as string | undefined;

  let store: any = null;
  try {
    store = await getActiveStore(storeParam);
  } catch (err) {
    console.warn('Database connection fallback on ForgotPasswordPage:', err);
  }

  const effectiveStore = store || {
    id: 'demo-store-001',
    name: 'LarisManis.online Store',
    domain: 'demo.larismanis.online',
  };

  const turnstileConfig = resolveTurnstileConfig(store?.settings);
  let isTurnstileVerified = false;
  if (turnstileConfig.enabled && turnstileConfig.siteKey) {
    try {
      const passCookie = cookies().get(TURNSTILE_PASS_COOKIE)?.value;
      isTurnstileVerified = verifyTurnstilePassToken(passCookie);
    } catch {
      // ignore outside request context
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
              <span className="text-white font-bold text-2xl">🔑</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Lupa Kata Sandi?</h1>
            <p className="text-gray-500 mt-2 text-sm">
              Atur ulang kata sandi akun toko <strong>{effectiveStore.name}</strong> Anda.
            </p>
          </div>

          <ForgotPasswordForm
            storeDomain={effectiveStore.domain}
            storeName={effectiveStore.name}
            turnstileSiteKey={turnstileConfig.siteKey}
            initiallyVerified={isTurnstileVerified}
          />
        </div>

        <div className="mt-6 text-center text-xs text-gray-500">
          Didukung oleh <strong className="text-gray-700">LarisManis.online</strong> — Webcommerce Pemersatu Jalur Pemasaran Anda.
        </div>
      </div>
    </div>
  );
}
