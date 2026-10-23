import { notFound } from 'next/navigation';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getActiveStore } from '@/lib/store';
import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import StoreHeader from '@/components/StoreHeader';
import StoreFooter from '@/components/StoreFooter';
import Pagination from '@/components/common/Pagination';

interface ArticlesListPageProps {
  searchParams?: {
    page?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
  };
}

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

function formatDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default async function ArticlesListPage({ searchParams }: ArticlesListPageProps) {
  const store = await getActiveStore();
  if (!store) notFound();

  const search = searchParams?.search?.trim() || '';
  const page = Math.max(1, Number(searchParams?.page) || 1);
  const pageSize = Math.max(1, store.settings?.defaultPageSize || 10);
  const skip = (page - 1) * pageSize;
  const startDate = searchParams?.startDate;
  const endDate = searchParams?.endDate;

  const whereCondition: Prisma.ArticleWhereInput = {
    storeId: store.id,
  };

  if (search) {
    whereCondition.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { content: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (startDate || endDate) {
    whereCondition.createdAt = {};
    if (startDate) {
      const s = new Date(startDate);
      s.setHours(0, 0, 0, 0);
      whereCondition.createdAt.gte = s;
    }
    if (endDate) {
      const e = new Date(endDate);
      e.setHours(23, 59, 59, 999);
      whereCondition.createdAt.lte = e;
    }
  }

  const [articles, total] = await Promise.all([
    prisma.article.findMany({
      where: whereCondition,
      orderBy: [
        { isFeatured: 'desc' },
        { createdAt: 'desc' },
      ],
      skip,
      take: pageSize,
    }),
    prisma.article.count({ where: whereCondition }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const base = '/articles';

  const queryFor = (overrides: { page?: number | string; search?: string; startDate?: string; endDate?: string }) => {
    const sp = new URLSearchParams();
    const nextSearch = overrides.search !== undefined ? overrides.search : search;
    if (nextSearch) sp.set('search', nextSearch);
    const nextStart = overrides.startDate !== undefined ? overrides.startDate : startDate;
    if (nextStart) sp.set('startDate', nextStart);
    const nextEnd = overrides.endDate !== undefined ? overrides.endDate : endDate;
    if (nextEnd) sp.set('endDate', nextEnd);
    const nextPage = overrides.page !== undefined ? overrides.page : page;
    if (typeof nextPage === 'string' || nextPage > 1) sp.set('page', String(nextPage));
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

          <form method="get" action={base} className="mt-6 flex max-w-md mx-auto gap-2">
            {startDate && <input type="hidden" name="startDate" value={startDate} />}
            {endDate && <input type="hidden" name="endDate" value={endDate} />}
            <input
              type="search"
              name="search"
              defaultValue={search}
              placeholder="Cari artikel..."
              className="flex-1 rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm px-4 py-2"
            />
            <button
              type="submit"
              className="bg-indigo-600 text-white px-5 py-2 rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
            >
              Cari
            </button>
            {search && (
              <Link
                href={queryFor({ search: '', page: 1 })}
                className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium flex items-center"
              >
                Reset
              </Link>
            )}
          </form>
        </div>

        {/* Date Filter Quick Links */}
        <div className="mb-6 flex flex-wrap items-center justify-center gap-1.5 text-xs">
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

        {articles.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
            <span className="text-4xl mb-3 block">📰</span>
            <h3 className="text-lg font-medium text-gray-900">
              {search ? `Tidak ada artikel cocok dengan "${search}"` : 'Belum ada artikel'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {search
                ? 'Silakan coba kata kunci lain atau pilih rentang waktu berbeda.'
                : 'Artikel dan panduan terbaru akan segera hadir di sini.'}
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
          <>
            <p className="text-xs text-gray-500 mb-4">{total} artikel ditemukan</p>
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

            <div className="mt-8">
              <Pagination
                page={page}
                totalPages={totalPages}
                totalItems={total}
                limit={pageSize}
                pageUrlPattern={queryFor({ page: '__PAGE__' })}
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
