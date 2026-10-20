import { prisma } from '@/lib/prisma';
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

  // In a real scenario, we might resolve the store from the 'from' path or a default
  // For now, we fetch the first store to get the Turnstile site key.
  const store = await prisma.store.findFirst({
    include: { settings: true },
  });

  if (!store) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-xl font-bold">Store configuration missing</h1>
          <p className="text-gray-500">Please contact administrator.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-2xl">A</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">AI SEO E-Commerce</h1>
            <p className="text-gray-500 mt-2">
              {fromPath?.startsWith('/admin') ? 'Masuk ke panel admin toko' : 'Masuk ke akun Anda'}
            </p>
          </div>

          <LoginForm
            storeId={store.id}
            storeDomain={store.domain}
            fromPath={fromPath || null}
            siteKey={store.settings?.turnstileEnabled ? (store.settings?.turnstileSiteKey ?? undefined) : undefined}
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
