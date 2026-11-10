'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

const ArticleSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  slug: z.string().min(1, 'Slug is required'),
  content: z.string().min(1, 'Content is required'),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  imageUrl: z.string().url('Invalid image URL').optional().or(z.literal('')),
  isFeatured: z.boolean().optional(),
  targetKeywords: z.string().optional(),
});

type ArticleFormValues = z.infer<typeof ArticleSchema>;

interface ArticleFormProps {
  initialData?: {
    id: string;
    title: string;
    slug: string;
    content: string;
    seoTitle?: string;
    seoDescription?: string;
    imageUrl?: string;
    isFeatured?: boolean;
    products: { id: string; name: string }[];
  };
  onSuccess: () => void;
  onChangePreview?: (data: any) => void;
}

export function ArticleForm({ initialData, onSuccess, onChangePreview }: ArticleFormProps) {
  const router = useRouter();
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>(initialData?.products.map(p => p.id) || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // SEO Analysis State
  const [targetKeywords, setTargetKeywords] = useState<string>('');

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<ArticleFormValues>({
    resolver: zodResolver(ArticleSchema),
    defaultValues: initialData ? {
      title: initialData.title,
      slug: initialData.slug,
      content: initialData.content,
      seoTitle: initialData.seoTitle,
      seoDescription: initialData.seoDescription,
      imageUrl: initialData.imageUrl || '',
      isFeatured: initialData.isFeatured ?? false,
    } : {
      isFeatured: false,
    },
  });

  const content = watch('content') || '';
  const title = watch('title') || '';
  const seoTitle = watch('seoTitle') || '';
  const seoDesc = watch('seoDescription') || '';
  const imageUrl = watch('imageUrl') || '';
  const isFeatured = watch('isFeatured') || false;

  useEffect(() => {
    if (onChangePreview) {
      const selectedProductObjects = products.filter(p => selectedProducts.includes(p.id));
      onChangePreview({
        title,
        content,
        imageUrl,
        seoTitle,
        seoDescription: seoDesc,
        isFeatured,
        products: selectedProductObjects,
      });
    }
  }, [title, content, imageUrl, seoTitle, seoDesc, isFeatured, selectedProducts, products, onChangePreview]);

  // SEO Analysis Calculation
  const seoAnalysis = useMemo(() => {
    if (!targetKeywords) return null;

    const keywords = targetKeywords.split(',').map(k => k.trim().toLowerCase()).filter(Boolean);
    const contentLower = content.toLowerCase();
    const titleLower = title.toLowerCase();
    const fullText = `${titleLower} ${contentLower}`;

    const stats = keywords.map(kw => {
      const regex = new RegExp(`\\b${kw}\\b`, 'gi');
      const count = (fullText.match(regex) || []).length;
      return {
        keyword: kw,
        count,
        inTitle: titleLower.includes(kw),
      };
    });

    const totalWords = content.split(/\s+/).filter(Boolean).length;
    const avgDensity = stats.length
      ? stats.reduce((acc, s) => acc + (s.count / (totalWords || 1)), 0) / stats.length
      : 0;

    // AI-SEO Scoring Logic
    let score = 0;
    if (totalWords > 300) score += 20;
    if (totalWords > 600) score += 20;
    if (stats.some(s => s.count > 0 && s.inTitle)) score += 30;
    if (seoTitle.length >= 30 && seoTitle.length <= 60) score += 15;
    if (seoDesc.length >= 120 && seoDesc.length <= 160) score += 15;

    return {
      stats,
      totalWords,
      avgDensity,
      score,
    };
  }, [content, title, seoTitle, seoDesc, targetKeywords]);

  useEffect(() => {
    async function fetchProducts() {
      try {
        const res = await fetch('/api/products');
        const data = await res.json();
        if (data.success) {
          setProducts(data.products.map((p: any) => ({ id: p.id, name: p.name })));
        }
      } catch (err) {
        console.error('Failed to load products', err);
      }
    }
    fetchProducts();
  }, []);

  const onSubmit = async (data: ArticleFormValues) => {
    setLoading(true);
    setError(null);
    try {
      const url = initialData
        ? `/api/articles/${initialData.id}`
        : '/api/articles';
      const method = initialData ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to save article');
      }

      const resData = await res.json();
      const articleId = initialData ? initialData.id : resData.article?.id;

      if (articleId) {
        const currentProducts = initialData?.products || [];
        await Promise.all([
          ...currentProducts
            .filter(p => !selectedProducts.includes(p.id))
            .map(p => fetch(`/api/articles/${articleId}/products`, {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ productId: p.id }),
            })),
          ...selectedProducts
            .filter(id => !currentProducts.some(p => p.id === id))
            .map(id => fetch(`/api/articles/${articleId}/products`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ productId: id }),
            })),
        ]);
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* SEO Analysis Panel */}
      <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-100 space-y-4">
        <h3 className="text-sm font-bold text-indigo-900 flex items-center justify-between">
          <span>🚀 AI-SEO Content Analyzer</span>
          {seoAnalysis && (
            <span className={`px-2 py-1 rounded text-xs font-bold ${seoAnalysis.score > 70 ? 'bg-green-200 text-green-800' : 'bg-yellow-200 text-yellow-800'}`}>
              Score: {seoAnalysis.score}/100
            </span>
          )}
        </h3>
        <div className="space-y-3">
          <div>
            <label htmlFor="targetKeywords" className="block text-xs font-medium text-indigo-700">Target Keywords (comma separated)</label>
            <input
              id="targetKeywords"
              type="text"
              value={targetKeywords}
              onChange={(e) => setTargetKeywords(e.target.value)}
              placeholder="e.g. sepatu lari, harga murah, toko sepatu"
              className="mt-1 w-full px-3 py-2 text-sm border border-indigo-200 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          {seoAnalysis && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-2 bg-white rounded border border-indigo-100">
                <p className="text-gray-500">Word Count</p>
                <p className="font-bold text-lg">{seoAnalysis.totalWords}</p>
              </div>
              <div className="p-2 bg-white rounded border border-indigo-100">
                <p className="text-gray-500">Avg Density</p>
                <p className="font-bold text-lg">{(seoAnalysis.avgDensity * 100).toFixed(2)}%</p>
              </div>
              <div className="p-2 bg-white rounded border border-indigo-100">
                <p className="text-gray-500">Keyword Matches</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {seoAnalysis.stats.map(s => (
                    <span key={s.keyword} className={`px-1 rounded ${s.count > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {s.keyword}: {s.count}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">Title</label>
            <input
              id="title"
              {...register('title')}
              className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
            {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
          </div>
          <div className="space-y-1">
            <label htmlFor="slug" className="block text-sm font-medium text-gray-700">Slug</label>
            <input
              id="slug"
              {...register('slug')}
              className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
            {errors.slug && <p className="text-red-500 text-xs mt-1">{errors.slug.message}</p>}
          </div>
          <div className="space-y-1">
            <label htmlFor="imageUrl" className="block text-sm font-medium text-gray-700">
              Gambar Cover Artikel (Card & Detail Banner)
            </label>
            <p className="text-xs text-gray-500">
              URL gambar cover yang tampil pada kartu artikel di katalog/beranda dan sebagai banner utama di halaman detail.
            </p>
            <input
              id="imageUrl"
              {...register('imageUrl')}
              placeholder="https://images.unsplash.com/... atau https://picsum.photos/..."
              className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
            />
            {errors.imageUrl && <p className="text-red-500 text-xs mt-1">{errors.imageUrl.message}</p>}

            {imageUrl && (
              <div className="mt-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
                <span className="text-[11px] font-semibold text-gray-500 block mb-1">Pratinjau Cover:</span>
                <div className="relative aspect-video w-full rounded-md overflow-hidden bg-gray-200 border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageUrl}
                    alt="Pratinjau cover"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-2 pt-2">
            <input
              id="isFeatured"
              type="checkbox"
              {...register('isFeatured')}
              className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
            />
            <label htmlFor="isFeatured" className="text-sm font-medium text-gray-700">
              Tampilkan di Beranda (Featured on Homepage)
            </label>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="seoTitle" className="block text-sm font-medium text-gray-700">SEO Title</label>
            <input
              id="seoTitle"
              {...register('seoTitle')}
              className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
            <p className="text-xs text-gray-400 text-right">{seoTitle.length}/60</p>
          </div>
          <div className="space-y-1">
            <label htmlFor="seoDescription" className="block text-sm font-medium text-gray-700">SEO Description</label>
            <textarea
              id="seoDescription"
              {...register('seoDescription')}
              className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              rows={3}
            />
            <p className="text-xs text-gray-400 text-right">{seoDesc.length}/160</p>
          </div>
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor="content" className="block text-sm font-medium text-gray-700">Content</label>
        <textarea
          id="content"
          {...register('content')}
          className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          rows={10}
        />
        {errors.content && <p className="text-red-500 text-xs mt-1">{errors.content.message}</p>}
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Associated Products</label>
        <div className="max-h-48 overflow-y-auto border rounded-md p-2 space-y-2 bg-gray-50">
          {products.map(p => (
            <label key={p.id} className="flex items-center space-x-2 p-1 hover:bg-gray-100 rounded cursor-pointer">
              <input
                type="checkbox"
                checked={selectedProducts.includes(p.id)}
                onChange={(e) => {
                  if (e.target.checked) setSelectedProducts([...selectedProducts, p.id]);
                  else setSelectedProducts(selectedProducts.filter(id => id !== p.id));
                }}
                className="rounded text-indigo-600"
              />
              <span className="text-sm text-gray-700">{p.name}</span>
            </label>
          ))}
        </div>
      </div>

      {error && <div className="p-3 bg-red-50 text-red-600 rounded-md text-sm">{error}</div>}

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onSuccess}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save Article'}
        </button>
      </div>
    </form>
  );
}
