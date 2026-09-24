import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { generateCategorySEO } from '@/lib/seo';
import StoreHeader from '@/components/StoreHeader';

interface CategoryPageProps {
  params: { storeDomain: string; slug: string };
}

/** Safety net; lib/revalidate.ts purges this page on every category mutation. */
export const revalidate = 300;
export const dynamicParams = true;

function formatIDR(amount: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
}

async function loadCategory(params: CategoryPageProps['params']) {
  const store = await prisma.store.findUnique({ where: { domain: params.storeDomain } });
  if (!store) return null;

  const category = await prisma.category.findUnique({
    where: { storeId_slug: { storeId: store.id, slug: params.slug } },
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
    const data = await loadCategory(params);
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
        url: `https://${data.store.domain}/category/${data.category.slug}`,
        type: 'website',
        siteName: data.store.name,
      },
      alternates: { canonical: `https://${data.store.domain}/category/${data.category.slug}` },
      robots: { index: true, follow: true },
    };
  } catch {
    return { title: 'Category', description: 'Browse products by category' };
  }
}

/** Prerender known categories so every URL listed in sitemap.xml resolves. */
export async function generateStaticParams() {
  try {
    const categories = await prisma.category.findMany({
      select: { slug: true, store: { select: { domain: true } } },
      take: 500,
    });

    return categories.map((category) => ({
      storeDomain: category.store.domain,
      slug: category.slug,
    }));
  } catch {
    return [];
  }
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const data = await loadCategory(params);
  if (!data) return notFound();

  const { store, category } = data;

  return (
    <div className="min-h-screen bg-gray-50">
      <StoreHeader
        storeDomain={params.storeDomain}
        storeName={store.name}
        storeLogo={store.logo}
        storeAddress={store.address}
      />

      <nav aria-label="Breadcrumb" className="bg-white border-b">
        <ol className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center space-x-2 text-sm">
          <li>
            <Link href={`/${params.storeDomain}`} className="text-gray-400 hover:text-gray-600">
              Home
            </Link>
          </li>
          <li className="flex items-center">
            <span className="text-gray-300 mx-2">/</span>
            <span className="text-gray-900">{category.name}</span>
          </li>
        </ol>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">{category.name}</h1>
        {category.description && <p className="mt-2 text-gray-600">{category.description}</p>}

        {category.products.length === 0 ? (
          <p className="mt-8 text-gray-500">Belum ada produk di kategori ini.</p>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-y-10 gap-x-6 sm:grid-cols-2 lg:grid-cols-4 xl:gap-x-8">
            {category.products.map((product) => (
              <Link
                key={product.id}
                href={`/${params.storeDomain}/product/${product.slug}`}
                className="group relative"
              >
                <div className="w-full min-h-80 bg-gray-200 rounded-md overflow-hidden group-hover:opacity-75 lg:h-80">
                  {product.images?.[0]?.url ? (
                    <Image
                      src={product.images[0].url}
                      alt={product.name}
                      width={300}
                      height={300}
                      className="w-full h-full object-cover object-center"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-300 flex items-center justify-center">
                      <span className="text-gray-500 text-sm">No image</span>
                    </div>
                  )}
                </div>
                <div className="mt-4 flex justify-between">
                  <h2 className="text-sm text-gray-700">{product.name}</h2>
                  <p className="text-sm font-medium text-gray-900">
                    {formatIDR(product.discountPrice ?? product.sellingPrice)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
