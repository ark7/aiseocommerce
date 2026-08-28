import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { generateProductSEO, generateProductStructuredData, generateBreadcrumbStructuredData } from '@/lib/seo';
import { Metadata } from 'next';
import Image from 'next/image';
import AddToCartButton from '@/components/AddToCartButton';

interface ProductPageProps {
  params: { storeDomain: string; slug: string };
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  try {
    const store = await prisma.store.findUnique({ where: { domain: params.storeDomain } });
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
        url: `https://${params.storeDomain}/product/${params.slug}`,
        type: 'website',
        siteName: store.name,
      },
      twitter: {
        card: 'summary_large_image',
        title: seo.title,
        description: seo.description,
        images: product.images?.[0]?.url ? [product.images[0].url] : [],
      },
      alternates: { canonical: `https://${params.storeDomain}/product/${params.slug}` },
      robots: { index: true, follow: true },
    };
  } catch {
    return { title: 'Product', description: 'View product details' };
  }
}

export default async function ProductPage({ params }: ProductPageProps) {
  try {
    const store = await prisma.store.findUnique({ where: { domain: params.storeDomain }, include: { settings: true } });
    if (!store) return notFound();
    
    const product = await prisma.product.findUnique({
      where: { storeId_slug: { storeId: store.id, slug: params.slug } },
      include: { images: { orderBy: { order: 'asc' } }, category: true, store: true },
    });
    if (!product || !product.isPublished) return notFound();
    
    const relatedProducts = await prisma.product.findMany({
      where: { storeId: store.id, isPublished: true, id: { not: product.id }, categoryId: product.categoryId },
      take: 4,
      select: { id: true, name: true, slug: true, sellingPrice: true, images: { where: { isPrimary: true }, take: 1 } },
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
    
    const formattedPrice = new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(product.sellingPrice);
    
    const formattedDiscountPrice = product.discountPrice
      ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(product.discountPrice)
      : null;
    
    return (
      <div className="min-h-screen bg-gray-50">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: productStructuredData }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: breadcrumbStructuredData }} />
        
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <nav className="flex" aria-label="Breadcrumb">
                <ol className="flex items-center space-x-2">
                  <li><a href={`https://${params.storeDomain}`} className="text-gray-400 hover:text-gray-600">Home</a></li>
                  {product.category && (
                    <li className="flex items-center">
                      <span className="text-gray-300 mx-2">/</span>
                      <a href={`https://${params.storeDomain}/category/${product.category.slug}`} className="text-gray-400 hover:text-gray-600">{product.category.name}</a>
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
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="lg:grid lg:grid-cols-2 lg:gap-x-8 lg:items-start">
            <div className="flex flex-col-reverse">
              <div className="hidden mt-6 w-full max-w-2xl mx-auto sm:block lg:max-w-none">
                <div className="grid grid-cols-4 gap-6">
                  {product.images.map((image, index) => (
                    <button key={image.id} className="relative h-24 bg-white rounded-md flex items-center justify-center text-sm font-medium uppercase text-gray-900 cursor-pointer hover:bg-gray-50">
                      <span className="absolute -inset-0.5 rounded-md overflow-hidden">
                        <Image src={image.url} alt={image.altText || `Product image ${index + 1}`} width={200} height={200} className="w-full h-full object-cover object-center" />
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="w-full aspect-w-1 aspect-h-1">
                <div className="bg-white rounded-lg overflow-hidden">
                  {product.images.length > 0 ? (
                    <Image src={product.images[0].url} alt={product.images[0].altText || product.name} width={800} height={800} className="w-full h-full object-cover object-center" priority />
                  ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                      <span className="text-gray-500">No image available</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="mt-10 px-4 sm:px-0 sm:mt-16 lg:mt-0">
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">{product.name}</h1>
              <div className="mt-3">
                <p className="text-3xl text-gray-900">
                  {formattedDiscountPrice ? (
                    <><span className="line-through text-gray-500">{formattedPrice}</span><span className="ml-2">{formattedDiscountPrice}</span></>
                  ) : formattedPrice}
                </p>
              </div>
              
              <div className="mt-3">
                <div className="flex items-center">
                  <div className="flex items-center">
                    {[0, 1, 2, 3, 4].map(rating => (
                      <svg key={rating} className="text-yellow-400 h-5 w-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <p className="ml-2 text-sm text-gray-500">0 reviews</p>
                </div>
              </div>
              
              <div className="mt-6">
                <h3 className="sr-only">Description</h3>
                <div className="text-base text-gray-700 space-y-6">
                  {product.shortDescription && <p className="font-medium">{product.shortDescription}</p>}
                  {product.description && <div dangerouslySetInnerHTML={{ __html: product.description }} />}
                </div>
              </div>
              
              <div className="mt-6">
                <div className="mb-4">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${product.stock > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {product.stock > 0 ? 'In Stock' : 'Out of Stock'}
                    {product.stock > 0 && <span className="ml-1">{product.stock} available</span>}
                  </span>
                </div>
                <AddToCartButton productId={product.id} storeId={store.id} price={product.sellingPrice} name={product.name} stock={product.stock} />
              </div>
              
              <section className="mt-10 border-t border-gray-200 pt-10">
                <h2 className="text-sm font-medium text-gray-900">Sold by {store.name}</h2>
                <div className="mt-4">
                  <p className="text-sm text-gray-600">{store.settings?.businessAddress}</p>
                  <p className="text-sm text-gray-600">{store.settings?.businessPhone}</p>
                </div>
              </section>
            </div>
          </div>
          
          {relatedProducts.length > 0 && (
            <section className="mt-16">
              <h2 className="text-2xl font-bold tracking-tight text-gray-900">Related Products</h2>
              <div className="mt-6 grid grid-cols-1 gap-y-10 gap-x-6 sm:grid-cols-2 lg:grid-cols-4 xl:gap-x-8">
                {relatedProducts.map(relatedProduct => (
                  <div key={relatedProduct.id} className="group relative">
                    <div className="w-full min-h-80 bg-gray-200 aspect-w-1 aspect-h-1 rounded-md overflow-hidden group-hover:opacity-75 lg:h-80 lg:aspect-none">
                      {relatedProduct.images?.[0]?.url ? (
                        <Image src={relatedProduct.images[0].url} alt={relatedProduct.name} width={300} height={300} className="w-full h-full object-cover object-center" />
                      ) : (
                        <div className="w-full h-full bg-gray-300 flex items-center justify-center">
                          <span className="text-gray-500 text-sm">No image</span>
                        </div>
                      )}
                    </div>
                    <div className="mt-4 flex justify-between">
                      <h3 className="text-sm text-gray-700">{relatedProduct.name}</h3>
                      <p className="text-sm font-medium text-gray-900">
                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(relatedProduct.sellingPrice)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    );
  } catch {
    return notFound();
  }
}
