import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getActiveStore } from '@/lib/store';
import { isSaleActive, resolveUnitPrice } from '@/lib/pricing';
import StoreHeader from '@/components/StoreHeader';
import StoreFooter from '@/components/StoreFooter';

const PAGE_SIZE = 12;

interface ProductsPageProps {
  searchParams: { search?: string; categoryId?: string; page?: string };
}

function formatIDR(amount: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const store = await getActiveStore();
  if (!store) notFound();

  const search = searchParams.search?.trim() || '';
  const categoryId = searchParams.categoryId || '';
  const page = Math.max(1, Number(searchParams.page) || 1);

  const where: Prisma.ProductWhereInput = { storeId: store.id, isPublished: true };
  if (categoryId) where.categoryId = categoryId;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { sku: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [products, total, categories] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
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
        images: { orderBy: { order: 'asc' }, take: 1, select: { url: true, altText: true } },
      },
    }),
    prisma.product.count({ where }),
    prisma.category.findMany({
      where: { storeId: store.id },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const base = '/products';

  const queryFor = (overrides: { categoryId?: string; page?: number }) => {
    const sp = new URLSearchParams();
    if (search) sp.set('search', search);
    const nextCategory = overrides.categoryId ?? categoryId;
    if (nextCategory) sp.set('categoryId', nextCategory);
    const nextPage = overrides.page ?? page;
    if (nextPage > 1) sp.set('page', String(nextPage));
    const qs = sp.toString();
    return qs ? `${base}?${qs}` : base;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <StoreHeader
        storeDomain={store.domain}
        storeName={store.name}
        storeLogo={store.logo}
        storeAddress={store.address}
      />

      <main className="flex-1 max-w-7xl mx-auto px-4 py-8 w-full">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Semua Produk</h1>

        <form method="get" action={base} className="mb-6 flex flex-wrap gap-2">
          {categoryId && <input type="hidden" name="categoryId" value={categoryId} />}
          <input
            type="search"
            name="search"
            defaultValue={search}
            placeholder="Cari produk..."
            className="flex-1 min-w-[12rem] rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
          />
          <button
            type="submit"
            className="bg-indigo-600 text-white px-5 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Cari
          </button>
        </form>

        {categories.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-2">
            <Link
              href={queryFor({ categoryId: '', page: 1 })}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                categoryId ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-indigo-600 text-white'
              }`}
            >
              Semua Kategori
            </Link>
            {categories.map((category) => (
              <Link
                key={category.id}
                href={queryFor({ categoryId: category.id, page: 1 })}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  categoryId === category.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category.name}
              </Link>
            ))}
          </div>
        )}

        {products.length === 0 ? (
          <div className="bg-white rounded-lg shadow border px-4 py-16 text-center">
            <p className="text-gray-500">
              {search ? `Tidak ada produk yang cocok dengan "${search}".` : 'Belum ada produk.'}
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-4">{total} produk ditemukan</p>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {products.map((product) => {
                const onSale = isSaleActive(product);
                const price = resolveUnitPrice(product);
                const image = product.images[0];

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
                          alt={image.altText || product.name}
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
                      {onSale && (
                        <p className="text-sm text-gray-400 line-through">
                          {formatIDR(product.sellingPrice)}
                        </p>
                      )}
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

            {totalPages > 1 && (
              <nav className="mt-8 flex items-center justify-center gap-2">
                {page > 1 && (
                  <Link
                    href={queryFor({ page: page - 1 })}
                    className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    &larr; Sebelumnya
                  </Link>
                )}
                <span className="px-4 py-2 text-sm text-gray-600">
                  Halaman {page} dari {totalPages}
                </span>
                {page < totalPages && (
                  <Link
                    href={queryFor({ page: page + 1 })}
                    className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    Berikutnya &rarr;
                  </Link>
                )}
              </nav>
            )}
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

