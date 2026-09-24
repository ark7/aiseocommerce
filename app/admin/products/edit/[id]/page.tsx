'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

interface ProductImage {
  id: string;
  url: string;
  altText: string | null;
}

interface Category {
  id: string;
  name: string;
}

const EMPTY_FORM = {
  name: '',
  slug: '',
  description: '',
  shortDescription: '',
  basePrice: '',
  sellingPrice: '',
  discountPrice: '',
  sku: '',
  categoryId: '',
  stock: '',
  minStock: '',
  isPublished: true,
  isFeatured: false,
  seoTitle: '',
  seoDescription: '',
  seoKeywords: '',
};

/** null and undefined both mean "not set" in the API payload; the form only knows strings. */
function asText(value: unknown): string {
  return value === null || value === undefined ? '' : String(value);
}

export default function EditProduct() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [formData, setFormData] = useState(EMPTY_FORM);
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<ProductImage[]>([]);
  const [deletedImageIds, setDeletedImageIds] = useState<string[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const authHeaders = useCallback(() => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : null;
  }, []);

  const load = useCallback(async () => {
    const headers = authHeaders();
    if (!headers) {
      setError('Anda harus login terlebih dahulu');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/products/${id}`, { headers });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Gagal memuat produk');
      }

      const product = data.product;
      setFormData({
        name: asText(product.name),
        slug: asText(product.slug),
        description: asText(product.description),
        shortDescription: asText(product.shortDescription),
        basePrice: asText(product.basePrice),
        sellingPrice: asText(product.sellingPrice),
        discountPrice: asText(product.discountPrice),
        sku: asText(product.sku),
        categoryId: asText(product.categoryId),
        stock: asText(product.stock),
        minStock: asText(product.minStock),
        isPublished: Boolean(product.isPublished),
        isFeatured: Boolean(product.isFeatured),
        seoTitle: asText(product.seoTitle),
        seoDescription: asText(product.seoDescription),
        seoKeywords: asText(product.seoKeywords),
      });
      setExistingImages(product.images ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat produk');
    } finally {
      setLoading(false);
    }
  }, [id, authHeaders]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const headers = authHeaders();
    if (!headers) return;

    fetch('/api/categories', { headers })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data) setCategories(data.categories ?? []);
      })
      .catch(() => setError('Gagal memuat daftar kategori'));
  }, [authHeaders]);

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    setImages((prev) => [...prev, ...files]);
    setImagePreviews((prev) => [...prev, ...files.map((file) => URL.createObjectURL(file))]);
  };

  const handleRemoveNewImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  /**
   * Only marks the image. The file is unlinked server-side on save, so backing
   * out of the form leaves the product untouched.
   */
  const handleRemoveExistingImage = (imageId: string) => {
    setDeletedImageIds((prev) => [...prev, imageId]);
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = event.target;
    const checked = (event.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const headers = authHeaders();
    if (!headers) {
      setError('Anda harus login terlebih dahulu');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = new FormData();
      payload.append('id', id);

      // Blank fields are sent as '' on purpose: the API turns that into
      // undefined, which is how a description gets cleared.
      Object.entries(formData).forEach(([key, value]) => {
        payload.append(key, String(value));
      });

      deletedImageIds.forEach((imageId) => payload.append(`deleteImage_${imageId}`, imageId));
      images.forEach((image) => payload.append('images', image));

      const response = await fetch('/api/products', {
        method: 'PATCH',
        headers,
        body: payload,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Gagal menyimpan produk');
      }

      router.push('/admin/products');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan produk');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Edit Produk</h1>
        <div className="bg-white p-6 rounded-lg shadow border flex items-center space-x-3">
          <svg className="animate-spin h-5 w-5 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-gray-500">Memuat produk...</span>
        </div>
      </div>
    );
  }

  const visibleExistingImages = existingImages.filter((image) => !deletedImageIds.includes(image.id));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Produk</h1>
          <p className="text-gray-500 mt-1">Ubah detail produk lalu simpan perubahan</p>
        </div>
        <Link
          href="/admin/products"
          className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span>Kembali</span>
        </Link>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-red-600">{error}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow border space-y-6">
        {/* Product Information */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Informasi Produk</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="name">
                Nama Produk *
              </label>
              <input
                id="name"
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Masukkan nama produk"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="slug">
                Slug *
              </label>
              <input
                id="slug"
                type="text"
                name="slug"
                value={formData.slug}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="slug-produk"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="sku">
                SKU
              </label>
              <input
                id="sku"
                type="text"
                name="sku"
                value={formData.sku}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="SKU001"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="categoryId">
                Kategori
              </label>
              <select
                id="categoryId"
                name="categoryId"
                value={formData.categoryId}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Pilih Kategori</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Harga</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="basePrice">
                Harga Modal (Base Price) *
              </label>
              <input
                id="basePrice"
                type="number"
                name="basePrice"
                value={formData.basePrice}
                onChange={handleChange}
                required
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="sellingPrice">
                Harga Jual (Selling Price) *
              </label>
              <input
                id="sellingPrice"
                type="number"
                name="sellingPrice"
                value={formData.sellingPrice}
                onChange={handleChange}
                required
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="discountPrice">
                Harga Diskon (Optional)
              </label>
              <input
                id="discountPrice"
                type="number"
                name="discountPrice"
                value={formData.discountPrice}
                onChange={handleChange}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="0"
              />
            </div>
          </div>
        </div>

        {/* Inventory */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Persediaan</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="stock">
                Stok Tersedia *
              </label>
              <input
                id="stock"
                type="number"
                name="stock"
                value={formData.stock}
                onChange={handleChange}
                required
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="minStock">
                Stok Minimum
              </label>
              <input
                id="minStock"
                type="number"
                name="minStock"
                value={formData.minStock}
                onChange={handleChange}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="0"
              />
            </div>
          </div>
          <p className="text-sm text-gray-400 mt-2">
            Perubahan stok di sini tidak tercatat di riwayat stok. Pakai menu stok untuk penyesuaian yang perlu tercatat.
          </p>
        </div>

        {/* Description */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Deskripsi</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="shortDescription">
                Deskripsi Pendek (Short Description)
              </label>
              <textarea
                id="shortDescription"
                name="shortDescription"
                value={formData.shortDescription}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Deskripsi singkat yang akan ditampilkan di card produk"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="description">
                Deskripsi Lengkap *
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={6}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Deskripsi detail produk"
              />
            </div>
          </div>
        </div>

        {/* Images */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Gambar Produk</h2>
          <div className="space-y-4">
            {visibleExistingImages.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Gambar saat ini</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {visibleExistingImages.map((image, index) => (
                    <div key={image.id} className="relative">
                      <Image
                        src={image.url}
                        alt={image.altText || `Gambar ${index + 1}`}
                        width={400}
                        height={128}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveExistingImage(image.id)}
                        className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                        aria-label={`Hapus gambar ${index + 1}`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-gray-400 mt-2">
                  Gambar baru terhapus saat Anda menekan Simpan Perubahan.
                </p>
              </div>
            )}

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageChange}
                multiple
                accept="image/*"
                className="hidden"
                id="image-upload"
              />
              <label htmlFor="image-upload" className="cursor-pointer">
                <svg className="w-12 h-12 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                </svg>
                <p className="text-gray-500 mb-2">Drag & drop gambar atau klik untuk upload</p>
                <p className="text-sm text-gray-400">Max 2MB per gambar. Format: JPG, PNG, WEBP</p>
              </label>
            </div>

            {imagePreviews.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {imagePreviews.map((preview, index) => (
                  <div key={preview} className="relative">
                    <Image
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      width={400}
                      height={128}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveNewImage(index)}
                      className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                      aria-label={`Hapus gambar baru ${index + 1}`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                    <span className="absolute bottom-2 left-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                      Gambar baru {index + 1}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* SEO Settings */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Pengaturan SEO</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="seoTitle">
                SEO Title
              </label>
              <input
                id="seoTitle"
                type="text"
                name="seoTitle"
                value={formData.seoTitle}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Judul SEO untuk search engine"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="seoDescription">
                SEO Description
              </label>
              <textarea
                id="seoDescription"
                name="seoDescription"
                value={formData.seoDescription}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Deskripsi SEO untuk search engine"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="seoKeywords">
                SEO Keywords
              </label>
              <input
                id="seoKeywords"
                type="text"
                name="seoKeywords"
                value={formData.seoKeywords}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Kata kunci, dipisahkan dengan koma"
              />
            </div>
          </div>
        </div>

        {/* Publish Settings */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Pengaturan Publikasi</h2>
          <div className="space-y-4">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                name="isPublished"
                checked={formData.isPublished}
                onChange={handleChange}
                className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
              />
              <span className="text-gray-700">Produk tampil di storefront</span>
            </label>
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                name="isFeatured"
                checked={formData.isFeatured}
                onChange={handleChange}
                className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
              />
              <span className="text-gray-700">Tandai sebagai produk unggulan</span>
            </label>
          </div>
        </div>

        {/* Submit */}
        <div className="pt-4 border-t">
          <div className="flex justify-end space-x-4">
            <Link
              href="/admin/products"
              className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Batal
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {saving ? (
                <>
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  <span>Simpan Perubahan</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
