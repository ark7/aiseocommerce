import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getActiveStore } from '@/lib/store';
import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import StoreHeader from '@/components/StoreHeader';
import StoreFooter from '@/components/StoreFooter';
import DOMPurify from 'isomorphic-dompurify';

interface ArticlePageProps {
  params: { slug: string };
}

export const revalidate = 300;

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const store = await getActiveStore();
  if (!store) return {};

  const article = await prisma.article.findFirst({
    where: { slug: params.slug, storeId: store.id },
  });

  if (!article) return {};

  return {
    title: `${article.seoTitle || article.title} | ${store.name}`,
    description: article.seoDescription || undefined,
    openGraph: {
      title: article.seoTitle || article.title,
      description: article.seoDescription || undefined,
      images: article.imageUrl ? [{ url: article.imageUrl }] : [],
      url: `/articles/${params.slug}`,
      siteName: store.name,
    },
    alternates: { canonical: `/articles/${params.slug}` },
  };
}

export default async function ArticleDetailPage({ params }: ArticlePageProps) {
  const store = await getActiveStore();
  if (!store) notFound();

  const article = await prisma.article.findFirst({
    where: { slug: params.slug, storeId: store.id },
    include: {
      products: {
        include: {
          product: {
            include: {
              images: { where: { isPrimary: true }, take: 1 },
            },
          },
        },
      },
    },
  });

  if (!article) notFound();

  const sanitizedContent = DOMPurify.sanitize(article.content);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <StoreHeader
        storeName={store.name}
        storeDomain={store.domain}
        storeLogo={store.logo}
        storeAddress={store.address}
      />

      <main className="flex-1 max-w-4xl mx-auto py-10 px-4 sm:px-6 w-full">
        <nav className="text-sm text-gray-500 mb-6 flex items-center space-x-2">
          <Link href="/" className="hover:underline">Beranda</Link>
          <span>/</span>
          <Link href="/articles" className="hover:underline">Artikel</Link>
          <span>/</span>
          <span className="text-gray-900 font-medium truncate">{article.title}</span>
        </nav>

        <article className="bg-white rounded-2xl border p-6 md:p-10 shadow-sm space-y-6">
          <header className="space-y-4">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900">
              {article.title}
            </h1>
            <p className="text-sm text-gray-400">
              Dipublikasikan pada {new Date(article.createdAt).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </header>

          {article.imageUrl ? (
            <div className="aspect-[16/9] md:aspect-[21/9] relative rounded-2xl overflow-hidden bg-gray-100 shadow-sm border border-gray-100 my-2">
              <Image
                src={article.imageUrl}
                alt={article.title}
                fill
                className="object-cover"
                priority
                unoptimized
              />
            </div>
          ) : (
            <div className="aspect-[21/9] relative rounded-2xl overflow-hidden bg-gradient-to-br from-indigo-50 to-indigo-100 flex items-center justify-center text-indigo-400 my-2 border border-indigo-100">
              <span className="text-5xl">📰</span>
            </div>
          )}

          <div
            className="prose prose-indigo max-w-none text-gray-700 leading-relaxed space-y-4 prose-img:rounded-2xl prose-img:shadow-md prose-img:mx-auto prose-headings:font-bold prose-headings:text-gray-900"
            dangerouslySetInnerHTML={{ __html: sanitizedContent }}
          />

          {article.products.length > 0 && (
            <section className="pt-8 border-t mt-8 space-y-4">
              <h2 className="text-xl font-bold text-gray-900">Produk Terkait (Pilihan Editor)</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {article.products.map(({ product }) => (
                  <Link
                    key={product.id}
                    href={`/product/${product.slug}`}
                    className="group border rounded-lg p-3 hover:shadow-md transition bg-white block"
                  >
                    <div className="aspect-square relative rounded bg-gray-100 overflow-hidden mb-2">
                      {product.images[0] ? (
                        <Image
                          src={product.images[0].url}
                          alt={product.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-gray-400">
                          No Image
                        </div>
                      )}
                    </div>
                    <p className="text-sm font-medium line-clamp-1 group-hover:text-indigo-600">{product.name}</p>
                    <p className="text-sm font-bold text-indigo-600">Rp {product.sellingPrice.toLocaleString('id-ID')}</p>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </article>
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

