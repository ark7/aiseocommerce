import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getActiveStore } from '@/lib/store';
import type { Metadata } from 'next';
import Link from 'next/link';
import StoreHeader from '@/components/StoreHeader';
import StoreFooter from '@/components/StoreFooter';

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const store = await getActiveStore();
  if (!store) return {};

  return {
    title: `Kategori Produk | ${store.name}`,
    description: `Jelajahi kategori produk terlengkap dari ${store.name}.`,
    openGraph: {
      title: `Kategori Produk | ${store.name}`,
      description: `Jelajahi kategori produk terlengkap dari ${store.name}.`,
    },
  };
}

export default async function CategoriesListPage() {
  const store = await getActiveStore();
  if (!store) notFound();

  const categories = await prisma.category.findMany({
    where: { storeId: store.id },
    include: {
      _count: {
        select: {
          products: {
            where: { isPublished: true },
          },
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <StoreHeader
        storeName={store.name}
        storeDomain={store.domain}
        storeLogo={store.logo}
        storeAddress={store.address}
      />

      <main className="flex-1 max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8 w-full">
        <div className="mb-8 text-center max-w-2xl mx-auto">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight sm:text-4xl">
            Kategori Produk
          </h1>
          <p className="mt-3 text-lg text-gray-500">
            Temukan produk yang Anda cari berdasarkan kategori pilihan kami.
          </p>
        </div>

        {categories.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
            <span className="text-4xl mb-3 block">📁</span>
            <h3 className="text-lg font-medium text-gray-900">Belum ada kategori</h3>
            <p className="mt-1 text-sm text-gray-500">
              Kategori produk akan segera ditambahkan oleh pengelola toko.
            </p>
            <div className="mt-6">
              <Link
                href="/"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Kembali ke Beranda
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/category/${category.slug}`}
                className="group flex flex-col bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all text-center"
              >
                <div className="w-16 h-16 mx-auto mb-4 bg-indigo-50 group-hover:bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 transition-colors">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h2 className="text-lg font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                  {category.name}
                </h2>
                {category.description && (
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                    {category.description}
                  </p>
                )}
                <div className="mt-4 pt-3 border-t border-gray-100 text-xs font-medium text-gray-400 group-hover:text-indigo-600">
                  {category._count.products} produk tersedia &rarr;
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <StoreFooter
        storeName={store.name}
        storeLogo={store.logo}
        tagline={store.settings?.tagline}
        address={store.address}
        phone={store.phone}
        email={store.email}
        socialLinks={store.settings?.socialLinks as Record<string, string>}
      />
    </div>
  );
}

