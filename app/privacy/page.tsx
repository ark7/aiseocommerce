import { getActiveStore } from '@/lib/store';
import { Metadata } from 'next';
import Link from 'next/link';
import StoreHeader from '@/components/StoreHeader';
import StoreFooter from '@/components/StoreFooter';
import { getDefaultPrivacy } from '@/lib/legalDefaults';

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const store = await getActiveStore();
  const storeName = store?.name || 'Toko Online';

  return {
    title: `Kebijakan Privasi | ${storeName}`,
    description: `Halaman kebijakan privasi resmi dan perlindungan data pribadi pengguna di ${storeName}.`,
    alternates: { canonical: '/privacy' },
    openGraph: {
      title: `Kebijakan Privasi | ${storeName}`,
      description: `Halaman kebijakan privasi resmi dan perlindungan data pribadi pengguna di ${storeName}.`,
      url: '/privacy',
      siteName: storeName,
    },
  };
}

export default async function PrivacyPage() {
  const store = await getActiveStore();
  const storeName = store?.name || 'Toko Online';
  const content = store?.settings?.privacyContent || getDefaultPrivacy(storeName, store?.email || undefined);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-between">
      <StoreHeader
        storeDomain={store?.domain}
        storeName={store?.name}
        storeLogo={store?.logo}
        storeAddress={store?.address}
      />

      <main className="max-w-4xl mx-auto px-4 py-8 md:py-12 w-full flex-1">
        {/* Breadcrumb */}
        <nav className="flex text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-indigo-600 transition">
            Beranda
          </Link>
          <span className="mx-2 text-gray-400">/</span>
          <span className="text-gray-800 font-medium">Kebijakan Privasi</span>
        </nav>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 md:p-12 shadow-sm space-y-8">
          <header className="border-b border-gray-100 pb-6">
            <div className="inline-flex items-center space-x-2 text-xs font-semibold px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full mb-3">
              <span>🔒 Privasi & Keamanan Data</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">
              Kebijakan Privasi
            </h1>
            <p className="text-sm text-gray-500 mt-2">
              Terakhir diperbarui pada {new Date(store?.settings?.updatedAt || Date.now()).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </header>

          <div className="prose prose-indigo max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap">
            {content}
          </div>

          <div className="pt-8 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between text-sm text-gray-500 gap-4">
            <p>Privasi Anda adalah prioritas utama kami.</p>
            <Link
              href="/"
              className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold bg-gray-900 text-white hover:bg-gray-800 transition"
            >
              Kembali ke Beranda &rarr;
            </Link>
          </div>
        </div>
      </main>

      <StoreFooter
        storeName={store?.name}
        storeLogo={store?.logo}
        tagline={store?.settings?.tagline}
        address={store?.address}
        phone={store?.phone}
        email={store?.email}
        socialLinks={store?.settings?.socialLinks as any}
      />
    </div>
  );
}

