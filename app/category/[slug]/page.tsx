import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { getActiveStore } from '@/lib/store';
import { resolveUnitPrice } from '@/lib/pricing';
import { generateCategorySEO } from '@/lib/seo';
import StoreHeader from '@/components/StoreHeader';
import StoreFooter from '@/components/StoreFooter';

interface CategoryPageProps {
  params: { slug: string };
}

export const revalidate = 300;
export const dynamicParams = true;

function formatIDR(amount: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
}

async function loadCategory(slug: string) {
  const store = await getActiveStore();
  if (!store) return null;

  const category = await prisma.category.findUnique({
    where: { storeId_slug: { storeId: store.id, slug } },
    include: {
      products: {
        where: { isPublished: true },
        orderBy: { createdAt: 'desc' },
        take: 48,
        select: {
          id: true,
          name: true,
          slug: true,
          sellingPrice: true,
          discountPrice: true,
          saleStartsAt: true,
          saleEndsAt: true,
          saleQuota: true,
          saleSold: true,
          images: { where: { isPrimary: true }, take: 1 },
        },
      },
    },
  });
  if (!category) return null;

  return { store, category };
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  try {
    const data = await loadCategory(params.slug);
    if (!data) return { title: 'Category Not Found' };

    const seo = generateCategorySEO(
      data.category.name,
      data.store.name,
      data.category.description ?? undefined
    );

    return {
      title: seo.title,
      description: seo.description,
      keywords: seo.keywords,
      openGraph: {
        title: seo.ogTitle || seo.title,
        description: seo.ogDescription || seo.description,
        url: `/category/${data.category.slug}`,
        type: 'website',
        siteName: data.store.name,
      },
      alternates: { canonical: `/category/${data.category.slug}` },
      robots: { index: true, follow: true },
    };
  } catch {
    return { title: 'Category', description: 'Browse products by category' };
  }
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const data = await loadCategory(params.slug);
  if (!data) return notFound();

  const { store, category } = data;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <StoreHeader
        storeDomain={store.domain}
        storeName={store.name}
        storeLogo={store.logo}
        storeAddress={store.address}
      />

      <nav aria-label="Breadcrumb" className="bg-white border-b">
        <ol className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center space-x-2 text-sm">
          <li>
            <Link href="/" className="text-gray-400 hover:text-gray-600">
              Home
            </Link>
          </li>
          <li className="flex items-center">
            <span className="text-gray-300 mx-2">/</span>
            <span className="text-gray-900 font-medium">{category.name}</span>
          </li>
        </ol>
      </nav>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">{category.name}</h1>
        {category.description && <p className="mt-2 text-gray-600">{category.description}</p>}

        {category.products.length === 0 ? (
          <p className="mt-8 text-gray-500">Belum ada produk di kategori ini.</p>
        ) : (
          <div className="mt-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {category.products.map((product) => (
              <Link
                key={product.id}
                href={`/product/${product.slug}`}
                className="group block bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition"
              >
                <div className="w-full h-48 bg-gray-100 overflow-hidden">
                  {product.images?.[0]?.url ? (
                    <Image
                      src={product.images[0].url}
                      alt={product.name}
                      width={300}
                      height={300}
                      className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400 text-sm">
                      No image
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h2 className="text-sm font-medium text-gray-900 line-clamp-1 group-hover:text-indigo-600">{product.name}</h2>
                  <p className="mt-1 text-sm font-bold text-indigo-600">
                    {formatIDR(resolveUnitPrice(product))}
                  </p>
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

