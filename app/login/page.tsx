import { prisma } from '@/lib/prisma';
import { getActiveStore } from '@/lib/store';
import { LoginForm } from '@/components/LoginForm';
import { redirectPathFromUrl } from '@/lib/redirect';
import Link from 'next/link';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const fromPath = params.from as string | undefined;

  let store: any = null;
  try {
    store = await getActiveStore();
  } catch (err) {
    console.warn('Database connection fallback on LoginPage:', err);
  }

  const effectiveStore = store || {
    id: 'demo-store-001',
    name: 'AI SEO E-Commerce Store',
    domain: 'demo-store.local',
    settings: { turnstileEnabled: false, turnstileSiteKey: '' },
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-2xl">A</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{effectiveStore.name || 'AI SEO E-Commerce'}</h1>
            <p className="text-gray-500 mt-2">
              {fromPath?.startsWith('/admin') ? 'Masuk ke panel admin toko' : 'Masuk ke akun Anda'}
            </p>
          </div>

          <LoginForm
            storeId={effectiveStore.id}
            storeDomain={effectiveStore.domain}
            fromPath={fromPath || null}
            siteKey={effectiveStore.settings?.turnstileEnabled ? (effectiveStore.settings?.turnstileSiteKey ?? undefined) : undefined}
          />

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Belum punya akun?{' '}
              <Link
                href={`/register?from=${fromPath || ''}`}
                className="text-indigo-600 font-medium hover:underline"
              >
                Daftar sekarang
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Demo credentials: admin@demo-store.local / password
          </p>
        </div>
      </div>
    </div>
  );
}
