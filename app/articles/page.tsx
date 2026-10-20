import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getActiveStore } from '@/lib/store';
import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import StoreHeader from '@/components/StoreHeader';
import StoreFooter from '@/components/StoreFooter';

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const store = await getActiveStore();
  if (!store) return {};

  return {
    title: `Artikel & Panduan | ${store.name}`,
    description: `Kumpulan artikel, tips, dan panduan pilihan terbaik dari ${store.name}.`,
    openGraph: {
      title: `Artikel & Panduan | ${store.name}`,
      description: `Kumpulan artikel, tips, dan panduan pilihan terbaik dari ${store.name}.`,
    },
  };
}

export default async function ArticlesListPage() {
  const store = await getActiveStore();
  if (!store) notFound();

  const articles = await prisma.article.findMany({
    where: { storeId: store.id },
    orderBy: [
      { isFeatured: 'desc' },
      { createdAt: 'desc' },
    ],
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
            Artikel & Panduan Belanja
          </h1>
          <p className="mt-3 text-lg text-gray-500">
            Temukan tips, ulasan produk, dan rekomendasi pilihan editor untuk kebutuhan Anda.
          </p>
        </div>

        {articles.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
            <span className="text-4xl mb-3 block">📰</span>
            <h3 className="text-lg font-medium text-gray-900">Belum ada artikel</h3>
            <p className="mt-1 text-sm text-gray-500">
              Artikel dan panduan terbaru akan segera hadir di sini.
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {articles.map((article) => (
              <Link
                key={article.id}
                href={`/articles/${article.slug}`}
                className="group flex flex-col bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-lg transition-all"
              >
                <div className="relative aspect-video w-full bg-gray-100 overflow-hidden">
                  {article.imageUrl ? (
                    <Image
                      src={article.imageUrl}
                      alt={article.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-50 to-indigo-100 text-indigo-400">
                      <span className="text-4xl">📰</span>
                    </div>
                  )}
                  {article.isFeatured && (
                    <span className="absolute top-3 left-3 bg-indigo-600 text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow">
                      Pilihan Editor
                    </span>
                  )}
                </div>

                <div className="p-6 flex flex-col flex-1 justify-between">
                  <div className="space-y-3">
                    <p className="text-xs text-gray-400">
                      {new Date(article.createdAt).toLocaleDateString('id-ID', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                    <h2 className="text-xl font-bold text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-2">
                      {article.title}
                    </h2>
                    <p className="text-sm text-gray-600 line-clamp-3">
                      {article.seoDescription || (article.content ? article.content.replace(/<[^>]*>/g, '').substring(0, 140) + '...' : '')}
                    </p>
                  </div>

                  <div className="pt-4 mt-4 border-t border-gray-100 flex items-center justify-between text-sm font-medium text-indigo-600 group-hover:underline">
                    <span>Baca selengkapnya</span>
                    <span>&rarr;</span>
                  </div>
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

