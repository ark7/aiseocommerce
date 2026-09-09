'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

export default function StoreHome() {
  const pathname = usePathname();
  const storeDomain = pathname.split('/')[1];
  const [store, setStore] = useState<any>(null);
  const [products, setProducts] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cartItemCount, setCartItemCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  useEffect(() => {
    fetchStoreData();
    updateCartCount();
    
    // Listen for storage changes (cart updates)
    window.addEventListener('storage', updateCartCount);
    return () => window.removeEventListener('storage', updateCartCount);
  }, [storeDomain]);

  useEffect(() => {
    if (storeDomain) {
      fetchProducts();
    }
  }, [storeDomain, searchQuery, selectedCategory]);

  const updateCartCount = () => {
    const cart = localStorage.getItem(`cart_${storeDomain}`);
    if (cart) {
      const cartItems = JSON.parse(cart);
      const totalItems = cartItems.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0);
      setCartItemCount(totalItems);
    } else {
      setCartItemCount(0);
    }
  };

  const fetchStoreData = async () => {
    try {
      const response = await fetch(`/api/stores/${storeDomain}`);
      if (response.ok) {
        const data = await response.json();
        setStore(data.store);
      }
    } catch (err) {
      console.error('Failed to fetch store:', err);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        storeId: store?.id || '',
        isPublished: 'true',
        limit: '8',
      });
      
      if (searchQuery) params.append('search', searchQuery);
      if (selectedCategory) params.append('categoryId', selectedCategory);
      
      // Fetch all products
      const productsResponse = await fetch(`/api/products?${params.toString()}`);
      if (productsResponse.ok) {
        const data = await productsResponse.json();
        setProducts(data.products || []);
      }
      
      // Fetch featured products
      params.set('isFeatured', 'true');
      params.set('limit', '4');
      const featuredResponse = await fetch(`/api/products?${params.toString()}`);
      if (featuredResponse.ok) {
        const data = await featuredResponse.json();
        setFeaturedProducts(data.products || []);
      }
      
      // Fetch categories
      const categoriesResponse = await fetch(`/api/categories?storeId=${store?.id || ''}`);
      if (categoriesResponse.ok) {
        const data = await categoriesResponse.json();
        setCategories(data.categories || []);
      }
      
      setLoading(false);
    } catch (err) {
      setError('Gagal memuat produk');
      setLoading(false);
    }
  };

  if (loading && products.length === 0) {
    return (
      <div className="min-h-screen">
        <header className="bg-white shadow-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex justify-between items-center">
              <div className="animate-pulse w-48 h-8 bg-gray-200 rounded"></div>
              <div className="animate-pulse w-24 h-8 bg-gray-200 rounded"></div>
            </div>
          </div>
        </header>
        
        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="animate-pulse w-64 h-10 bg-gray-200 rounded mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="bg-white rounded-lg shadow animate-pulse p-4">
                <div className="w-full h-48 bg-gray-200 rounded mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-100 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <svg className="w-12 h-12 mx-auto mb-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h3 className="text-lg font-semibold text-red-600 mb-2">Error</h3>
          <p className="text-red-600">{error}</p>
          <button
            onClick={fetchProducts}
            className="mt-4 bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <Link href={`/${storeDomain}`} className="flex items-center space-x-2">
              {store?.logo && (
                <Image
                  src={store.logo}
                  alt={store.name}
                  width={40}
                  height={40}
                  className="w-10 h-10 rounded"
                  unoptimized
                />
              )}
              {!store?.logo && (
                <div className="w-10 h-10 bg-indigo-600 rounded flex items-center justify-center">
                  <span className="text-white font-bold text-lg">{store?.name?.[0]}</span>
                </div>
              )}
              <div>
                <h1 className="text-xl font-bold text-gray-900">{store?.name || 'Toko Online'}</h1>
                {store?.address && (
                  <p className="text-sm text-gray-500 truncate max-w-md">{store.address}</p>
                )}
              </div>
            </Link>
            
            <nav className="hidden md:flex items-center space-x-6">
              <Link href={`/${storeDomain}`} className="text-gray-600 hover:text-indigo-600">Beranda</Link>
              <Link href={`/${storeDomain}/products`} className="text-gray-600 hover:text-indigo-600">Produk</Link>
              <Link href={`/${storeDomain}/categories`} className="text-gray-600 hover:text-indigo-600">Kategori</Link>
              <Link href={`/${storeDomain}/contact`} className="text-gray-600 hover:text-indigo-600">Kontak</Link>
            </nav>
            
            <div className="flex items-center space-x-4">
              <button className="p-2 rounded-full hover:bg-gray-100">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
              <Link
                href={`/${storeDomain}/cart`}
                className="relative p-2 rounded-full hover:bg-gray-100"
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                {cartItemCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-indigo-600 text-white text-xs rounded-full flex items-center justify-center">
                    {cartItemCount}
                  </span>
                )}
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Selamat Datang di {store?.name || 'Toko Online'}
          </h2>
          <p className="text-xl md:text-2xl mb-8 opacity-90">
            {store?.settings?.businessName || 'Temukan produk berkualitas dengan harga terbaik'}
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <input
              type="text"
              placeholder="Cari produk..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-4 py-3 rounded-lg text-gray-900 flex-1"
            />
            <button className="bg-white text-indigo-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100">
              Cari
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Featured Products */}
        {featuredProducts.length > 0 && (
          <section className="mb-12">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Produk Unggulan</h2>
              <Link href={`/${storeDomain}/products`} className="text-indigo-600 hover:underline">
                Lihat semua
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredProducts.map((product: any) => (
                <div key={product.id} className="bg-white rounded-lg shadow border overflow-hidden hover:shadow-lg transition-shadow">
                  <Link href={`/${storeDomain}/product/${product.slug}`} className="block">
                    <div className="relative">
                      {product.images?.[0] && (
                        <Image
                          src={product.images[0].url}
                          alt={product.name}
                          width={300}
                          height={200}
                          className="w-full h-48 object-cover"
                          unoptimized
                        />
                      )}
                      {!product.images?.[0] && (
                        <div className="w-full h-48 bg-gray-100 flex items-center justify-center">
                          <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                      {product.isFeatured && (
                        <span className="absolute top-2 left-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded">
                          UNGGULAN
                        </span>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900 truncate">{product.name}</h3>
                      <div className="mt-2 flex justify-between items-center">
                        <div className="text-lg font-bold text-indigo-600">
                          Rp {product.sellingPrice.toLocaleString('id-ID')}
                        </div>
                        {product.stock <= 0 && (
                          <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">Habis</span>
                        )}
                      </div>
                      {product.shortDescription && (
                        <p className="text-sm text-gray-500 mt-2 line-clamp-2">{product.shortDescription}</p>
                      )}
                    </div>
                  </Link>
                  <div className="p-4 border-t">
                    <AddToCartButton
                      productId={product.id}
                      storeId={store?.id || ''}
                      price={product.sellingPrice}
                      name={product.name}
                      stock={product.stock}
                      storeDomain={storeDomain}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Categories */}
        {categories.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Kategori Produk</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {categories.map((category: any) => (
                <Link
                  key={category.id}
                  href={`/${storeDomain}/products?category=${category.slug}`}
                  className="bg-white p-4 rounded-lg shadow border hover:shadow-md transition-shadow text-center"
                >
                  <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-gray-900">{category.name}</span>
                  <p className="text-xs text-gray-500 mt-1">{category.products?.length || 0} produk</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* All Products */}
        <section>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Semua Produk</h2>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">Semua Kategori</option>
              {categories.map((cat: any) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          
          {products.length === 0 ? (
            <div className="bg-white p-8 rounded-lg shadow border text-center">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Produk tidak ditemukan</h3>
              <p className="text-gray-500">Coba cari dengan kata kunci lain atau pilih kategori</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {products.map((product: any) => (
                <div key={product.id} className="bg-white rounded-lg shadow border overflow-hidden hover:shadow-lg transition-shadow">
                  <Link href={`/${storeDomain}/product/${product.slug}`} className="block">
                    <div className="relative">
                      {product.images?.[0] && (
                        <Image
                          src={product.images[0].url}
                          alt={product.name}
                          width={300}
                          height={200}
                          className="w-full h-48 object-cover"
                          unoptimized
                        />
                      )}
                      {!product.images?.[0] && (
                        <div className="w-full h-48 bg-gray-100 flex items-center justify-center">
                          <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                      {product.isFeatured && (
                        <span className="absolute top-2 left-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded">
                          UNGGULAN
                        </span>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900 truncate">{product.name}</h3>
                      <div className="mt-2 flex justify-between items-center">
                        <div className="text-lg font-bold text-indigo-600">
                          Rp {product.sellingPrice.toLocaleString('id-ID')}
                        </div>
                        {product.stock <= 0 && (
                          <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">Habis</span>
                        )}
                      </div>
                      {product.shortDescription && (
                        <p className="text-sm text-gray-500 mt-2 line-clamp-2">{product.shortDescription}</p>
                      )}
                    </div>
                  </Link>
                  <div className="p-4 border-t">
                    <AddToCartButton
                      productId={product.id}
                      storeId={store?.id || ''}
                      price={product.sellingPrice}
                      name={product.name}
                      stock={product.stock}
                      storeDomain={storeDomain}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 mt-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">{store?.name || 'Toko Online'}</h3>
              <p className="text-gray-400 text-sm">{store?.settings?.businessDescription || 'Platform e-commerce terpercaya'}</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Link Cepat</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href={`/${storeDomain}`} className="hover:text-white">Beranda</Link></li>
                <li><Link href={`/${storeDomain}/products`} className="hover:text-white">Produk</Link></li>
                <li><Link href={`/${storeDomain}/categories`} className="hover:text-white">Kategori</Link></li>
                <li><Link href={`/${storeDomain}/contact`} className="hover:text-white">Kontak</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Kontak Kami</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                {store?.phone && <li>Telepon: {store.phone}</li>}
                {store?.email && <li>Email: {store.email}</li>}
                {store?.address && <li>Alamat: {store.address}</li>}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Ikuti Kami</h4>
              <div className="flex space-x-4">
                <a href="#" className="p-2 bg-gray-800 rounded-full hover:bg-gray-700">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
                  </svg>
                </a>
                <a href="#" className="p-2 bg-gray-800 rounded-full hover:bg-gray-700">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M22.46 6c-.77.35-1.6.58-2.46.69.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15 0 1.49.75 2.81 1.91 3.56-.71 0-1.37-.2-1.95-.5v.03c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 0 1-1.93.07 4.28 4.28 0 0 0 4 2.98 8.521 8.521 0 0 1-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21 16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z"/>
                  </svg>
                </a>
              </div>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-800 text-center text-sm text-gray-400">
            <p>&copy; {new Date().getFullYear()} {store?.name || 'AI SEO E-Commerce'}. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// AddToCartButton component inline for storefront
function AddToCartButton({ productId, storeId, price, name, stock, storeDomain }: any) {
  const [isLoading, setIsLoading] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const handleAddToCart = async () => {
    if (stock < quantity) {
      setError('Maaf, stok tidak mencukupi');
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      const cartItem = { productId, name, price, quantity, storeId };
      const existingCart = localStorage.getItem(`cart_${storeDomain}`);
      const cart = existingCart ? JSON.parse(existingCart) : [];
      const existingItemIndex = cart.findIndex((item: any) => item.productId === productId);
      
      if (existingItemIndex >= 0) {
        cart[existingItemIndex].quantity += quantity;
      } else {
        cart.push(cartItem);
      }
      localStorage.setItem(`cart_${storeDomain}`, JSON.stringify(cart));
      
      // Dispatch storage event to update cart count
      window.dispatchEvent(new Event('storage'));
    } catch {
      setError('Gagal menambahkan ke keranjang');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      {stock <= 0 ? (
        <button
          type="button"
          disabled
          className="w-full bg-gray-200 text-gray-500 px-3 py-2 rounded text-sm cursor-not-allowed"
        >
          Stok Habis
        </button>
      ) : (
        <>
          <div className="flex items-center border border-gray-300 rounded mb-2">
            <button
              type="button"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="px-2 py-1 text-gray-600 disabled:text-gray-300"
              disabled={quantity <= 1}
            >-</button>
            <span className="px-3 py-1 border-l border-r border-gray-300">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity(Math.min(stock, quantity + 1))}
              className="px-2 py-1 text-gray-600 disabled:text-gray-300"
              disabled={quantity >= stock}
            >+</button>
          </div>
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={isLoading || stock < 1}
            className={`w-full bg-indigo-600 text-white px-3 py-2 rounded text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isLoading ? 'Menambahkan...' : `+ Keranjang`}
          </button>
        </>
      )}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
