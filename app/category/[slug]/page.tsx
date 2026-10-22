import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getActiveStore } from '@/lib/store';
import { resolveUnitPrice } from '@/lib/pricing';
import { generateCategorySEO } from '@/lib/seo';
import StoreHeader from '@/components/StoreHeader';
import StoreFooter from '@/components/StoreFooter';
import Pagination from '@/components/common/Pagination';

interface CategoryPageProps {
  params: { slug: string };
  searchParams?: {
    page?: string;
    startDate?: string;
    endDate?: string;
  };
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

function formatDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  try {
    const store = await getActiveStore();
    if (!store) return { title: 'Category Not Found' };

    const category = await prisma.category.findUnique({
      where: { storeId_slug: { storeId: store.id, slug: params.slug } },
      select: { name: true, slug: true, description: true },
    });
    if (!category) return { title: 'Category Not Found' };

    const seo = generateCategorySEO(
      category.name,
      store.name,
      category.description ?? undefined
    );

    return {
      title: seo.title,
      description: seo.description,
      keywords: seo.keywords,
      openGraph: {
        title: seo.ogTitle || seo.title,
        description: seo.ogDescription || seo.description,
        url: `/category/${category.slug}`,
        type: 'website',
        siteName: store.name,
      },
      alternates: { canonical: `/category/${category.slug}` },
      robots: { index: true, follow: true },
    };
  } catch {
    return { title: 'Category', description: 'Browse products by category' };
  }
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const store = await getActiveStore();
  if (!store) return notFound();

  const category = await prisma.category.findUnique({
    where: { storeId_slug: { storeId: store.id, slug: params.slug } },
  });
  if (!category) return notFound();

  const page = Math.max(1, Number(searchParams?.page) || 1);
  const pageSize = Math.max(1, store.settings?.defaultPageSize || 10);
  const skip = (page - 1) * pageSize;
  const startDate = searchParams?.startDate;
  const endDate = searchParams?.endDate;

  const whereProduct: Prisma.ProductWhereInput = {
    storeId: store.id,
    categoryId: category.id,
    isPublished: true,
    sandboxEnabled: false,
  };

  if (startDate || endDate) {
    whereProduct.createdAt = {};
    if (startDate) {
      const s = new Date(startDate);
      s.setHours(0, 0, 0, 0);
      whereProduct.createdAt.gte = s;
    }
    if (endDate) {
      const e = new Date(endDate);
      e.setHours(23, 59, 59, 999);
      whereProduct.createdAt.lte = e;
    }
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where: whereProduct,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
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
        stock: true,
        isPreOrder: true,
        preOrderDays: true,
        images: { where: { isPrimary: true }, take: 1 },
      },
    }),
    prisma.product.count({ where: whereProduct }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const base = `/category/${category.slug}`;

  const queryFor = (overrides: { page?: number; startDate?: string; endDate?: string }) => {
    const sp = new URLSearchParams();
    const nextStart = overrides.startDate !== undefined ? overrides.startDate : startDate;
    if (nextStart) sp.set('startDate', nextStart);
    const nextEnd = overrides.endDate !== undefined ? overrides.endDate : endDate;
    if (nextEnd) sp.set('endDate', nextEnd);
    const nextPage = overrides.page !== undefined ? overrides.page : page;
    if (nextPage > 1) sp.set('page', String(nextPage));
    const qs = sp.toString();
    return qs ? `${base}?${qs}` : base;
  };

  const now = new Date();
  const todayStr = formatDateString(now);
  const p7 = new Date(now);
  p7.setDate(p7.getDate() - 6);
  const p7Str = formatDateString(p7);
  const p30 = new Date(now);
  p30.setDate(p30.getDate() - 29);
  const p30Str = formatDateString(p30);

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
            <Link href="/products" className="text-gray-400 hover:text-gray-600">
              Produk
            </Link>
          </li>
          <li className="flex items-center">
            <span className="text-gray-300 mx-2">/</span>
            <span className="text-gray-900 font-medium">{category.name}</span>
          </li>
        </ol>
      </nav>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">{category.name}</h1>
            {category.description && <p className="mt-1 text-gray-600">{category.description}</p>}
          </div>
          <p className="text-sm text-gray-500 font-medium">{total} produk ditemukan</p>
        </div>

        {/* Date Filter Quick Links */}
        <div className="mb-6 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-gray-500 font-medium mr-1">📅 Periode:</span>
          <Link
            href={queryFor({ startDate: '', endDate: '', page: 1 })}
            className={`px-3 py-1 rounded-full border transition-colors ${
              !startDate && !endDate
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
            }`}
          >
            Semua Waktu
          </Link>
          <Link
            href={queryFor({ startDate: todayStr, endDate: todayStr, page: 1 })}
            className={`px-3 py-1 rounded-full border transition-colors ${
              startDate === todayStr && endDate === todayStr
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
            }`}
          >
            Hari Ini
          </Link>
          <Link
            href={queryFor({ startDate: p7Str, endDate: todayStr, page: 1 })}
            className={`px-3 py-1 rounded-full border transition-colors ${
              startDate === p7Str && endDate === todayStr
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
            }`}
          >
            7 Hari Terakhir
          </Link>
          <Link
            href={queryFor({ startDate: p30Str, endDate: todayStr, page: 1 })}
            className={`px-3 py-1 rounded-full border transition-colors ${
              startDate === p30Str && endDate === todayStr
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
            }`}
          >
            30 Hari Terakhir
          </Link>
        </div>

        {products.length === 0 ? (
          <div className="bg-white rounded-lg shadow border px-4 py-16 text-center">
            <p className="text-gray-500">Belum ada produk di kategori ini untuk filter yang dipilih.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {products.map((product) => {
                const price = resolveUnitPrice(product);
                const image = product.images?.[0];

                return (
                  <Link
                    key={product.id}
                    href={`/product/${product.slug}`}
                    className="block bg-white rounded-lg shadow border overflow-hidden hover:shadow-md transition-shadow"
                  >
                    <div className="relative">
                      {image?.url ? (
                        <Image
                          src={image.url}
                          alt={product.name}
                          width={400}
                          height={400}
                          className="w-full h-48 object-cover"
                        />
                      ) : (
                        <div className="w-full h-48 bg-gray-100 flex items-center justify-center">
                          <span className="text-sm text-gray-400">Tanpa gambar</span>
                        </div>
                      )}
                      {product.isPreOrder && (
                        <span className="absolute top-2 left-2 z-10 bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded shadow">
                          PRE-ORDER
                        </span>
                      )}
                    </div>

                    <div className="p-4">
                      <h3 className="font-medium text-gray-900 mb-1">{product.name}</h3>
                      <p className="font-semibold text-gray-900">{formatIDR(price)}</p>
                      {product.isPreOrder ? (
                        <p className="mt-1 text-xs text-amber-700 font-medium">
                          ⏳ Pre-Order {product.preOrderDays ? `(${product.preOrderDays} hari)` : ''}
                        </p>
                      ) : product.stock <= 0 ? (
                        <p className="mt-1 text-xs text-red-600">Stok habis</p>
                      ) : null}
                    </div>
                  </Link>
                );
              })}
            </div>

            <div className="mt-8">
              <Pagination
                page={page}
                totalPages={totalPages}
                totalItems={total}
                limit={pageSize}
                createPageUrl={(p) => queryFor({ page: p })}
                showLimitSelector={false}
              />
            </div>
          </>
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
