import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import StoreHeader from '@/components/StoreHeader';

const PAGE_SIZE = 12;

interface ProductsPageProps {
  params: { storeDomain: string };
  searchParams: { search?: string; categoryId?: string; page?: string };
}

function formatIDR(amount: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
}

export default async function ProductsPage({ params, searchParams }: ProductsPageProps) {
  const store = await prisma.store.findUnique({
    where: { domain: params.storeDomain },
    select: { id: true, name: true, logo: true, address: true },
  });
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
        stock: true,
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
  const base = `/${params.storeDomain}/products`;

  // Filters live in the URL so the page needs no client state and survives a reload.
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
    <div className="min-h-screen bg-gray-50">
      <StoreHeader
        storeDomain={params.storeDomain}
        storeName={store.name}
        storeLogo={store.logo}
        storeAddress={store.address}
      />

      <main className="max-w-7xl mx-auto px-4 py-8">
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
                const price = product.discountPrice ?? product.sellingPrice;
                const image = product.images[0];

                return (
                  <Link
                    key={product.id}
                    href={`/${params.storeDomain}/product/${product.slug}`}
                    className="block bg-white rounded-lg shadow border overflow-hidden hover:shadow-md transition-shadow"
                  >
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

                    <div className="p-4">
                      <h3 className="font-medium text-gray-900 mb-1">{product.name}</h3>
                      <p className="font-semibold text-gray-900">{formatIDR(price)}</p>
                      {product.discountPrice && (
                        <p className="text-sm text-gray-400 line-through">
                          {formatIDR(product.sellingPrice)}
                        </p>
                      )}
                      {product.stock <= 0 && (
                        <p className="mt-1 text-xs text-red-600">Stok habis</p>
                      )}
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
    </div>
  );
}
