import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getActiveStore } from '@/lib/store';
import { generateProductSEO, generateProductStructuredData, generateBreadcrumbStructuredData } from '@/lib/seo';
import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import DOMPurify from 'isomorphic-dompurify';
import AddToCartButton from '@/components/AddToCartButton';
import ProductViewTracker from '@/components/ProductViewTracker';
import StoreHeader from '@/components/StoreHeader';
import StoreFooter from '@/components/StoreFooter';
import { isSaleActive, resolveUnitPrice, saleRemaining } from '@/lib/pricing';
import ProductImageGallery from './ProductImageGallery';

interface ProductPageProps {
  params: { slug: string };
}

export const revalidate = 300;
export const dynamicParams = true;

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  try {
    const store = await getActiveStore();
    if (!store) return { title: 'Store Not Found' };
    
    const product = await prisma.product.findUnique({
      where: { storeId_slug: { storeId: store.id, slug: params.slug } },
      include: { images: { orderBy: { order: 'asc' } }, category: true, store: true },
    });
    if (!product) return { title: 'Product Not Found' };
    
    const seo = await generateProductSEO({
      ...product,
      store: { name: store.name, domain: store.domain },
    });
    
    return {
      title: seo.title,
      description: seo.description,
      keywords: seo.keywords,
      openGraph: {
        title: seo.ogTitle || seo.title,
        description: seo.ogDescription || seo.description,
        images: product.images?.[0]?.url ? [{ url: product.images[0].url }] : [],
        url: `/product/${params.slug}`,
        type: 'website',
        siteName: store.name,
      },
      twitter: {
        card: 'summary_large_image',
        title: seo.title,
        description: seo.description,
        images: product.images?.[0]?.url ? [product.images[0].url] : [],
      },
      alternates: { canonical: `/product/${params.slug}` },
      robots: { index: true, follow: true },
    };
  } catch {
    return { title: 'Product', description: 'View product details' };
  }
}

async function loadProductPage(slug: string) {
  const store = await getActiveStore();
  if (!store) return null;

  const product = await prisma.product.findUnique({
    where: { storeId_slug: { storeId: store.id, slug } },
    include: { images: { orderBy: { order: 'asc' } }, category: true, store: true },
  });
  if (!product || !product.isPublished) return null;

  const relatedProducts = await prisma.product.findMany({
    where: { storeId: store.id, isPublished: true, id: { not: product.id }, categoryId: product.categoryId },
    take: 4,
    select: { id: true, name: true, slug: true, sellingPrice: true, isPreOrder: true, images: { where: { isPrimary: true }, take: 1 } },
  });

  const productStructuredData = generateProductStructuredData({
    ...product,
    store: { name: store.name, domain: store.domain },
  });
  const breadcrumbStructuredData = generateBreadcrumbStructuredData(
    store.name,
    product.category?.name,
    product.name
  );

  const now = new Date();
  const onSale = isSaleActive(product, now);
  const unitPrice = resolveUnitPrice(product, now);
  const saleLeft = saleRemaining(product);

  const formatIDR = (amount: number) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);

  const formattedPrice = formatIDR(product.sellingPrice);
  const formattedDiscountPrice = onSale ? formatIDR(unitPrice) : null;

  return {
    store,
    product,
    relatedProducts,
    productStructuredData,
    breadcrumbStructuredData,
    formattedPrice,
    formattedDiscountPrice,
    unitPrice,
    saleLeft,
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  let data;
  try {
    data = await loadProductPage(params.slug);
  } catch {
    return notFound();
  }
  if (!data) return notFound();

  const { store, product, relatedProducts, productStructuredData, breadcrumbStructuredData, formattedPrice, formattedDiscountPrice, unitPrice, saleLeft } = data;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: productStructuredData }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: breadcrumbStructuredData }} />

      <ProductViewTracker productId={product.id} storeDomain={store.domain} />

      <StoreHeader
        storeDomain={store.domain}
        storeName={store.name}
        storeLogo={store.logo}
        storeAddress={store.address}
      />

      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <nav className="flex" aria-label="Breadcrumb">
              <ol className="flex items-center space-x-2">
                <li><Link href="/" className="text-gray-400 hover:text-gray-600">Home</Link></li>
                {product.category && (
                  <li className="flex items-center">
                    <span className="text-gray-300 mx-2">/</span>
                    <Link href={`/category/${product.category.slug}`} className="text-gray-400 hover:text-gray-600">{product.category.name}</Link>
                  </li>
                )}
                <li className="flex items-center">
                  <span className="text-gray-300 mx-2">/</span>
                  <span className="text-gray-900">{product.name}</span>
                </li>
              </ol>
            </nav>
          </div>
        </div>
      </div>
      
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
        <div className="lg:grid lg:grid-cols-2 lg:gap-x-8 lg:items-start">
          <div className="flex flex-col-reverse">
            <ProductImageGallery images={product.images} name={product.name} />
          </div>
          
          <div className="mt-10 px-4 sm:px-0 sm:mt-16 lg:mt-0">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">{product.name}</h1>
            <div className="mt-3">
              <p className="text-3xl text-gray-900">
                {formattedDiscountPrice ? (
                  <><span className="line-through text-gray-500">{formattedPrice}</span><span className="ml-2 font-bold text-indigo-600">{formattedDiscountPrice}</span></>
                ) : formattedPrice}
              </p>
              {formattedDiscountPrice && saleLeft != null && (
                <p className="mt-1 text-sm text-orange-600 font-medium">
                  Sisa {saleLeft} unit di harga promo ini
                </p>
              )}
            </div>
            
            <div className="mt-6">
              <h3 className="sr-only">Description</h3>
              <div className="text-base text-gray-700 space-y-6">
                {product.shortDescription && <p className="font-medium text-gray-800">{product.shortDescription}</p>}
                {product.description && <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(product.description) }} />}
              </div>
            </div>
            
            <div className="mt-6">
              <div className="mb-4">
                {product.isPreOrder ? (
                  <div className="space-y-1.5">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                      ⏳ Pre-Order (PO)
                    </span>
                    {product.preOrderDays ? (
                      <p className="text-xs text-amber-800 font-medium">
                        Estimasi pengiriman: <strong>{product.preOrderDays} hari kerja</strong>
                        {product.preOrderMessage ? ` • ${product.preOrderMessage}` : ''}
                      </p>
                    ) : product.preOrderMessage ? (
                      <p className="text-xs text-amber-800 font-medium">
                        {product.preOrderMessage}
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${product.stock > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {product.stock > 0 ? 'Tersedia' : 'Stok Habis'}
                    {product.stock > 0 && <span className="ml-1">({product.stock} stok)</span>}
                  </span>
                )}
              </div>
              <AddToCartButton 
                productId={product.id} 
                storeDomain={store.domain} 
                price={unitPrice} 
                name={product.name} 
                stock={product.stock} 
                isPreOrder={product.isPreOrder}
                preOrderDays={product.preOrderDays}
              />
            </div>
            
            <section className="mt-10 border-t border-gray-200 pt-10">
              <h2 className="text-sm font-medium text-gray-900">{store.name}</h2>
              <div className="mt-4 space-y-1">
                {store.settings?.businessAddress && <p className="text-sm text-gray-600">{store.settings.businessAddress}</p>}
                {store.settings?.businessPhone && <p className="text-sm text-gray-600">{store.settings.businessPhone}</p>}
              </div>
            </section>
          </div>
        </div>
        
        {relatedProducts.length > 0 && (
          <section className="mt-16 pt-10 border-t border-gray-200">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900">Produk Terkait</h2>
            <div className="mt-6 grid grid-cols-2 gap-y-10 gap-x-6 sm:grid-cols-2 lg:grid-cols-4 xl:gap-x-8">
              {relatedProducts.map(relatedProduct => (
                <Link key={relatedProduct.id} href={`/product/${relatedProduct.slug}`} className="group relative block bg-white border rounded-xl overflow-hidden hover:shadow-md transition">
                  <div className="relative w-full h-48 bg-gray-100 overflow-hidden">
                    {relatedProduct.images?.[0]?.url ? (
                      <Image src={relatedProduct.images[0].url} alt={relatedProduct.name} width={300} height={300} className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                        No image
                      </div>
                    )}
                    {relatedProduct.isPreOrder && (
                      <span className="absolute top-2 left-2 z-10 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow">
                        PO
                      </span>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="text-sm font-medium text-gray-900 line-clamp-1 group-hover:text-indigo-600">{relatedProduct.name}</h3>
                    <p className="mt-1 text-sm font-bold text-indigo-600">
                      {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(relatedProduct.sellingPrice)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
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

