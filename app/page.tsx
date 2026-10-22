import { prisma } from '@/lib/prisma';
import { GatedLink } from '@/components/GatedLink';
import { headers } from 'next/headers';
import Image from 'next/image';
import Link from 'next/link';
import StoreHeader from '@/components/StoreHeader';
import StoreFooter from '@/components/StoreFooter';
import { Prisma } from '@prisma/client';

export const revalidate = 300;

type LandingStore = Prisma.StoreGetPayload<{
  include: {
    settings: true;
    products: {
      include: { images: true };
    };
    articles: true;
  };
}>;

export default async function LandingPage() {
  let store: LandingStore | null = null;
  try {
    const landingStoreDomain = process.env.LANDING_STORE_DOMAIN || process.env.DEFAULT_STORE_DOMAIN;
    store = await prisma.store.findFirst({
      where: landingStoreDomain ? { domain: landingStoreDomain } : {},
      orderBy: { createdAt: 'asc' },
      include: {
        settings: true,
        products: {
          where: { isPublished: true, sandboxEnabled: false, isFeatured: true },
          take: 8,
          orderBy: { createdAt: 'desc' },
          include: { images: { where: { isPrimary: true }, take: 1 } },
        },
        articles: {
          where: { isFeatured: true },
          take: 6,
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  } catch {
    store = null;
  }

  if (!store) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Store not found</p>
      </div>
    );
  }

  // Extract role from headers (set by middleware)
  const headersList = headers();
  const role = (headersList.get('x-user-role') as any) || 'GUEST';

  const s = store.settings;
  const primaryColor = s?.primaryColor || '#4F46E5';

  const heroBadge = s?.heroBadge || 'Koleksi Terbaru 2026';
  const heroTitle = s?.heroTitle || `Selamat Datang di ${store.name}`;
  const heroSubtitle = s?.heroSubtitle || s?.tagline || 'Temukan berbagai produk berkualitas tinggi dengan penawaran terbaik dan garansi kepuasan pelanggan.';
  const heroCtaText = s?.heroCtaText || 'Mulai Belanja';
  const heroCtaLink = s?.heroCtaLink || '/products';
  const heroCtaSecondaryText = s?.heroCtaSecondaryText || 'Baca Artikel Rekomendasi';
  const heroCtaSecondaryLink = s?.heroCtaSecondaryLink || '/articles';
  const heroImageUrl = s?.heroImageUrl;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <StoreHeader
        storeDomain={store.domain}
        storeName={store.name}
        storeLogo={store.logo}
        storeAddress={store.address}
      />

      <main className="flex-1 max-w-7xl mx-auto px-4 py-8 md:py-12 flex flex-col gap-16 w-full">
        {/* HERO SECTION BUILDER */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-white via-gray-50 to-indigo-50/20 border border-gray-200/80 shadow-sm p-6 sm:p-10 md:p-14">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Sisi Kiri: Teks & Call-to-Action */}
            <div className="lg:col-span-7 space-y-6 text-left">
              {heroBadge && (
                <div
                  style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wide"
                >
                  <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: primaryColor }} />
                  {heroBadge}
                </div>
              )}

              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-gray-900 tracking-tight leading-[1.15]">
                {heroTitle}
              </h1>

              <p className="text-base sm:text-lg text-gray-600 max-w-xl leading-relaxed">
                {heroSubtitle}
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Link
                  href={heroCtaLink}
                  style={{ backgroundColor: primaryColor }}
                  className="text-white px-6 py-3.5 rounded-xl font-semibold text-sm sm:text-base shadow-sm hover:opacity-95 transition-all flex items-center gap-2 group"
                >
                  <span>{heroCtaText}</span>
                  <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
                </Link>

                {heroCtaSecondaryText && (
                  <Link
                    href={heroCtaSecondaryLink}
                    className="bg-white border border-gray-300 text-gray-700 px-6 py-3.5 rounded-xl font-medium text-sm sm:text-base hover:bg-gray-50 hover:border-gray-400 transition-colors"
                  >
                    {heroCtaSecondaryText}
                  </Link>
                )}
              </div>

              {/* USP / Feature Badges */}
              <div className="pt-4 border-t border-gray-200/60 grid grid-cols-3 gap-3 text-xs text-gray-500">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span>Produk Original</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span>Pengiriman Aman</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span>Layanan Responsif</span>
                </div>
              </div>
            </div>

            {/* Sisi Kanan: Visual Banner Image / Showcase Card */}
            <div className="lg:col-span-5 relative">
              <div className="relative aspect-[4/3] sm:aspect-[16/10] lg:aspect-square w-full rounded-2xl overflow-hidden bg-gradient-to-tr from-gray-100 to-gray-200 border border-gray-200 shadow-md">
                {heroImageUrl ? (
                  <Image
                    src={heroImageUrl}
                    alt={heroTitle}
                    fill
                    className="object-cover"
                    priority
                    unoptimized
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full p-6 text-center space-y-3 bg-gradient-to-br from-indigo-50/40 via-white to-gray-50">
                    <div
                      style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
                      className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-inner"
                    >
                      🛍️
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-base">{store.name}</p>
                      <p className="text-xs text-gray-500 max-w-xs mt-1">
                        {s?.tagline || 'Pusat belanja online terpercaya dengan katalog kurasi terbaik.'}
                      </p>
                    </div>
                    <span
                      style={{ borderColor: primaryColor, color: primaryColor }}
                      className="inline-block border text-[11px] font-semibold px-3 py-1 rounded-full bg-white shadow-xs"
                    >
                      Katalog Resmi Toko
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Featured Products (Pilihan Editor) */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg">⭐</span>
                <h2 className="text-2xl font-bold text-gray-900">Produk Pilihan (Editor&apos;s Pick)</h2>
              </div>
              <p className="text-sm text-gray-500 mt-1">Produk-produk unggulan terbaik yang kami kurasi khusus untuk Anda</p>
            </div>
            <Link
              href="/products"
              style={{ color: primaryColor }}
              className="text-sm font-semibold hover:underline"
            >
              Lihat semua &rarr;
            </Link>
          </div>

          {store.products.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
              <p className="text-gray-500 text-sm">Belum ada produk pilihan yang ditampilkan di beranda.</p>
              <Link href="/products" className="text-sm font-medium text-indigo-600 hover:underline mt-2 inline-block">
                Jelajahi seluruh katalog &rarr;
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {store.products.map((product) => (
                <GatedLink
                  key={product.id}
                  href={`/product/${product.slug}`}
                  role={role}
                  className="group relative overflow-hidden rounded-2xl border border-gray-200 p-3.5 transition-all hover:shadow-lg hover:border-gray-300 bg-white block"
                >
                  <div className="aspect-square relative overflow-hidden rounded-xl bg-gray-100">
                    {product.images[0] ? (
                      <Image
                        src={product.images[0].url}
                        alt={product.name}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-gray-400 text-xs">
                        No Image
                      </div>
                    )}
                    {product.isPreOrder ? (
                      <span
                        className="absolute top-2 left-2 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow bg-amber-500"
                      >
                        PRE-ORDER
                      </span>
                    ) : (
                      <span
                        style={{ backgroundColor: primaryColor }}
                        className="absolute top-2 left-2 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow"
                      >
                        PILIHAN
                      </span>
                    )}
                  </div>
                  <div className="mt-3.5 space-y-1.5">
                    <h3 className="text-sm font-medium text-gray-900 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                      {product.name}
                    </h3>
                    <p style={{ color: primaryColor }} className="text-base font-bold">
                      Rp {product.sellingPrice.toLocaleString('id-ID')}
                    </p>
                    {product.isPreOrder && (
                      <p className="text-[11px] text-amber-700 font-medium">
                        ⏳ Pre-Order {product.preOrderDays ? `(${product.preOrderDays} hari)` : ''}
                      </p>
                    )}
                  </div>
                </GatedLink>
              ))}
            </div>
          )}
        </section>

        {/* Featured Articles (Artikel & Rekomendasi) */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg">📰</span>
                <h2 className="text-2xl font-bold text-gray-900">Artikel & Panduan Belanja</h2>
              </div>
              <p className="text-sm text-gray-500 mt-1">Tips, wawasan gaya hidup, dan rekomendasi pembelian pilihan editor</p>
            </div>
            <Link
              href="/articles"
              style={{ color: primaryColor }}
              className="text-sm font-semibold hover:underline"
            >
              Lihat semua artikel &rarr;
            </Link>
          </div>

          {store.articles.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
              <p className="text-gray-500 text-sm">Belum ada artikel yang disematkan di beranda.</p>
              <Link href="/articles" className="text-sm font-medium text-indigo-600 hover:underline mt-2 inline-block">
                Buka halaman artikel &rarr;
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {store.articles.map((article) => (
                <GatedLink
                  key={article.id}
                  href={`/articles/${article.slug}`}
                  role={role}
                  className="group flex flex-col rounded-2xl border border-gray-200 overflow-hidden bg-white hover:shadow-lg transition-all"
                >
                  <div className="aspect-[16/9] relative bg-gray-100 overflow-hidden">
                    {article.imageUrl ? (
                      <Image
                        src={article.imageUrl}
                        alt={article.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                        No Thumbnail
                      </div>
                    )}
                    <span className="absolute top-2 left-2 bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow">
                      PILIHAN EDITOR
                    </span>
                  </div>
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-2">
                        {article.title}
                      </h3>
                      <p className="mt-2 text-xs text-gray-500 line-clamp-2">
                        {article.seoDescription || article.content.replace(/<[^>]*>/g, '').substring(0, 100)}
                      </p>
                    </div>
                    <div className="pt-4 mt-4 text-xs text-gray-400 flex items-center justify-between border-t border-gray-100">
                      <span>{new Date(article.createdAt).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                      <span style={{ color: primaryColor }} className="font-semibold group-hover:underline">
                        Baca panduan &rarr;
                      </span>
                    </div>
                  </div>
                </GatedLink>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* FOOTER TOKO INTEGRASI CMS */}
      <StoreFooter
        storeName={store.name}
        storeLogo={store.logo}
        tagline={s?.tagline}
        address={store.address}
        phone={store.phone}
        email={store.email}
        socialLinks={s?.socialLinks as Record<string, string>}
      />
    </div>
  );
}
