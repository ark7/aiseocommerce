'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function ProductsList() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [page, searchQuery, selectedCategory]);

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Anda harus login terlebih dahulu');
        return;
      }

      setLoading(true);
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '12',
      });
      
      if (searchQuery) params.append('search', searchQuery);
      if (selectedCategory) params.append('categoryId', selectedCategory);
      
      const response = await fetch(`/api/products?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        setProducts(data.products || []);
        setTotalPages(data.pagination?.totalPages || 1);
      } else {
        const data = await response.json();
        setError(data.error || 'Gagal memuat produk');
      }
    } catch (err) {
      setError('Gagal memuat data produk');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/categories', {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories || []);
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  };

  const handleDelete = async (productId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus produk ini?')) return;
    
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/products', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id: productId }),
      });
      
      if (response.ok) {
        fetchProducts();
      } else {
        const data = await response.json();
        alert(data.error || 'Gagal menghapus produk');
      }
    } catch (err) {
      alert('Gagal menghapus produk');
    }
  };

  const handleTogglePublish = async (productId: string, currentStatus: boolean) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const formData = new FormData();
      formData.append('id', productId);
      formData.append('isPublished', String(!currentStatus));

      const response = await fetch('/api/products', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      
      if (response.ok) {
        fetchProducts();
      } else {
        const data = await response.json();
        alert(data.error || 'Gagal update status');
      }
    } catch (err) {
      alert('Gagal update status');
    }
  };

  if (loading && page === 1) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Daftar Produk</h1>
          <Link
            href="/admin/products/add"
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>Tambah Produk</span>
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white p-4 rounded-lg shadow animate-pulse">
              <div className="w-full h-40 bg-gray-200 rounded mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-100 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600">{error}</p>
        <button
          onClick={fetchProducts}
          className="mt-2 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Daftar Produk</h1>
          <p className="text-gray-500 mt-1">Kelola semua produk toko Anda</p>
        </div>
        <Link
          href="/admin/products/add"
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span>Tambah Produk</span>
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow border">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cari Produk</label>
            <input
              type="text"
              placeholder="Cari by nama, deskripsi, SKU..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Semua Kategori</option>
              {categories.map((cat: any) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('');
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      {products.length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow border text-center">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Belum ada produk</h3>
          <p className="text-gray-500 mb-4">Tambahkan produk pertamamu untuk memulai</p>
          <Link
            href="/admin/products/add"
            className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Tambah Produk Sekarang
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product: any) => (
            <div key={product.id} className="bg-white rounded-lg shadow border overflow-hidden hover:shadow-lg transition-shadow">
              <div className="relative">
                {product.images?.[0] && (
                  <Image
                    src={product.images[0].url}
                    alt={product.name}
                    width={400}
                    height={250}
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
                
                <div className="absolute top-2 right-2 flex space-x-1">
                  {product.isFeatured && (
                    <span className="bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded">FEATURED</span>
                  )}
                  {!product.isPublished && (
                    <span className="bg-gray-600 text-white text-xs font-bold px-2 py-1 rounded">DRAFT</span>
                  )}
                </div>
              </div>
              
              <div className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 truncate">{product.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">SKU: {product.sku || '-'}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-indigo-600">
                      Rp {product.sellingPrice.toLocaleString('id-ID')}
                    </div>
                    {product.discountPrice && (
                      <div className="text-sm text-gray-500 line-through">
                        Rp {product.basePrice.toLocaleString('id-ID')}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="mt-3 flex justify-between items-center">
                  <div className="flex space-x-2">
                    <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded">
                      Stock: {product.stock}
                    </span>
                    {product.category && (
                      <span className="bg-indigo-100 text-indigo-800 text-xs px-2 py-1 rounded">
                        {product.category.name}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t flex justify-between items-center">
                  <Link
                    href={`/admin/products/edit/${product.id}`}
                    className="text-indigo-600 text-sm hover:underline flex items-center space-x-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <span>Edit</span>
                  </Link>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleTogglePublish(product.id, product.isPublished)}
                      className={`text-xs px-3 py-1 rounded ${product.isPublished ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}
                    >
                      {product.isPublished ? 'Published' : 'Draft'}
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="text-xs bg-red-100 text-red-800 px-3 py-1 rounded hover:bg-red-200"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-500">
              Halaman {page} dari {totalPages}
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => page > 1 && setPage(page - 1)}
                disabled={page === 1}
                className="px-3 py-1 bg-gray-100 text-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Sebelumnya
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const pageNum = Math.max(1, page - 2) + i;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`px-3 py-1 rounded ${pageNum === page ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'}`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => page < totalPages && setPage(page + 1)}
                disabled={page === totalPages}
                className="px-3 py-1 bg-gray-100 text-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
