import { prisma } from '@/lib/prisma';
import { getActiveStore } from '@/lib/store';
import { RegisterForm } from '@/components/RegisterForm';
import Link from 'next/link';

export default async function RegisterPage({
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
    console.warn('Database connection fallback on RegisterPage:', err);
  }

  const effectiveStore = store || {
    id: 'demo-store-001',
    name: 'AI SEO E-Commerce Store',
    domain: 'demo-store.local',
    settings: { turnstileEnabled: false, turnstileSiteKey: '' },
  };

  const siteKey = effectiveStore.settings?.turnstileEnabled
    ? (effectiveStore.settings?.turnstileSiteKey ?? undefined)
    : undefined;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-6">
            <div className="mx-auto w-12 h-12 bg-indigo-600 rounded-lg flex items-center justify-center mb-3">
              <span className="text-white font-bold text-xl">A</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Buat Akun</h1>
            <p className="text-gray-500 mt-1">Daftar untuk mulai berbelanja</p>
          </div>

          <RegisterForm
            storeId={effectiveStore.id}
            storeDomain={effectiveStore.domain}
            fromPath={fromPath || null}
            siteKey={siteKey}
          />

          <p className="text-center text-sm text-gray-600 mt-6">
            Sudah punya akun?{' '}
            <Link
              href={fromPath ? `/login?from=${encodeURIComponent(fromPath)}` : '/login'}
              className="text-indigo-600 font-medium hover:underline"
            >
              Masuk di sini
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
