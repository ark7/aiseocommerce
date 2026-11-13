import { prisma } from '@/lib/prisma';
import { GatedLink } from '@/components/GatedLink';
import { headers } from 'next/headers';
import Image from 'next/image';
import Link from 'next/link';
import StoreHeader from '@/components/StoreHeader';
import StoreFooter from '@/components/StoreFooter';
import HeroSlider from '@/components/HeroSlider';
import ProductPreviewThumb from '@/components/ProductPreviewThumb';
import { Prisma } from '@prisma/client';
import { getActiveStore } from '@/lib/store';
import { getCatalogDisplayPricing } from '@/lib/pricing';
import { extractPublicSocialLinks, resolveStoreHeroSlides } from '@/lib/heroSlides';

// Revalidate immediately so changes made in Super-Admin or Preview Mode reflect instantly
export const revalidate = 0;

type LandingStore = Prisma.StoreGetPayload<{
  include: {
    settings: true;
    products: {
      include: {
        images: true;
        category: { select: { name: true; slug: true } };
        priceTiers: true;
        variants: { include: { priceTiers: true } };
      };
    };
    articles: true;
  };
}>;

export default async function LandingPage() {
  let store: LandingStore | null = null;
  try {
    const active = await getActiveStore();
    if (active) {
      try {
        store = await prisma.store.findUnique({
          where: { id: active.id },
          include: {
            settings: true,
            products: {
              where: { isPublished: true, sandboxEnabled: false, isFeatured: true },
              take: 8,
              orderBy: { createdAt: 'desc' },
              include: {
                images: { orderBy: [{ isPrimary: 'desc' }, { order: 'asc' }], take: 1 },
                category: { select: { name: true, slug: true } },
                priceTiers: { where: { variantId: null }, orderBy: { minQty: 'asc' } },
                variants: { include: { priceTiers: { orderBy: { minQty: 'asc' } } } },
              },
            },
            articles: {
              where: { isFeatured: true },
              take: 6,
              orderBy: { createdAt: 'desc' },
            },
          },
        });
      } catch (relationError) {
        console.error('[LandingPage] Failed to load store relations, using active store fallback:', relationError);
        store = {
          ...active,
          products: [],
          articles: [],
        } as LandingStore;
      }
    }
  } catch (error) {
    console.error('[LandingPage] Failed to resolve active store:', error);
    store = null;
  }

  if (!store) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 text-center">
        <h1 className="text-xl font-bold text-gray-900 mb-2">Store not found</h1>
        <p className="text-sm text-gray-600 max-w-md">
          Pastikan koneksi database aktif dan toko telah terdaftar di sistem.
        </p>
      </div>
    );
  }

  // Extract role from headers (set by middleware)
  const headersList = headers();
  const role = (headersList.get('x-user-role') as any) || 'GUEST';

  const s = store.settings;
  const primaryColor = s?.primaryColor || '#4F46E5';
  const heroSlides = resolveStoreHeroSlides({
    storeName: store.name,
    tagline: s?.tagline,
    settings: s,
    fallbackProductImage: store.products[0]?.images[0]?.url || null,
  });
  const publicSocialLinks = extractPublicSocialLinks(s?.socialLinks);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <StoreHeader
        storeDomain={store.domain}
        storeName={store.name}
        storeLogo={store.logo}
        storeAddress={store.address}
      />

      <main className="flex-1 max-w-7xl mx-auto px-4 py-8 md:py-12 flex flex-col gap-16 w-full">
        {/* HERO SECTION MULTI-CARD SLIDER */}
        <HeroSlider
          slides={heroSlides}
          primaryColor={primaryColor}
          storeName={store.name}
          tagline={s?.tagline}
        />

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
              {store.products.map((product) => {
                const displayPricing = getCatalogDisplayPricing(product);
                return (
                <GatedLink
                  key={product.id}
                  href={`/product/${product.slug}`}
                  role={role}
                  className="group relative overflow-hidden rounded-2xl border border-gray-200 p-3.5 transition-all hover:shadow-lg hover:border-gray-300 bg-white block"
                >
                  <div className="aspect-square relative overflow-hidden rounded-xl bg-gray-100">
                    <ProductPreviewThumb
                      imageUrl={product.images[0]?.url}
                      alt={product.images[0]?.altText || product.name}
                      categoryName={product.category?.name}
                      primaryColor={primaryColor}
                    />
                    {displayPricing.isBatch ? (
                      <span
                        className="absolute top-2 left-2 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow bg-indigo-600"
                      >
                        HARGA GROSIR
                      </span>
                    ) : product.isPreOrder ? (
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
                      {displayPricing.isBatch
                        ? `Mulai Rp ${displayPricing.effectivePrice.toLocaleString('id-ID')}`
                        : `Rp ${displayPricing.effectivePrice.toLocaleString('id-ID')}`}
                    </p>
                    {displayPricing.isBatch && (
                      <p className="text-[11px] text-indigo-700 font-medium">
                        📦 Harga bertingkat sesuai qty
                      </p>
                    )}
                    {product.isPreOrder && (
                      <p className="text-[11px] text-amber-700 font-medium">
                        ⏳ Pre-Order {product.preOrderDays ? `(${product.preOrderDays} hari)` : ''}
                      </p>
                    )}
                  </div>
                </GatedLink>
                );
              })}
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
                        unoptimized
                        sizes="(max-width: 768px) 100vw, 33vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div
                        style={{
                          background: `linear-gradient(135deg, ${primaryColor}14 0%, #f8fafc 60%, ${primaryColor}20 100%)`,
                        }}
                        className="w-full h-full flex flex-col items-center justify-center text-gray-500 text-xs gap-1.5 p-4 text-center"
                      >
                        <span className="text-2xl" aria-hidden="true">📰</span>
                        <span className="font-medium line-clamp-1">{article.title}</span>
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
        socialLinks={publicSocialLinks}
      />
    </div>
  );
}
