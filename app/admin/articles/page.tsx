'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArticleForm } from '@/components/ArticleForm';
import { ArticlePreview } from '@/components/ArticlePreview';
import DateRangeFilter from '@/components/common/DateRangeFilter';
import Pagination from '@/components/common/Pagination';

interface ArticleItem {
  id: string;
  title: string;
  slug: string;
  content: string;
  seoTitle?: string;
  seoDescription?: string;
  imageUrl?: string;
  isFeatured?: boolean;
  createdAt: string;
  products: { id: string; name: string }[];
}

export default function AdminArticlesPage() {
  const [articles, setArticles] = useState<ArticleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [currentArticle, setCurrentArticle] = useState<ArticleItem | undefined>(undefined);
  const [previewData, setPreviewData] = useState<any>(null);

  // Pagination & filter state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    async function loadSettings() {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const res = await fetch('/api/admin/settings/general', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.settings?.defaultPageSize) {
            setLimit(data.settings.defaultPageSize);
          }
        }
      } catch {}
    }
    loadSettings();
  }, []);

  const authHeaders = useCallback((): Record<string, string> => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  const fetchArticles = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        paginate: 'true',
        page: String(page),
        limit: String(limit),
      });
      if (search) params.set('search', search);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const res = await fetch(`/api/articles?${params.toString()}`, { headers: authHeaders() });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error || 'Gagal memuat artikel');
      }
      const data = await res.json();
      setArticles(data.articles || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotal(data.pagination?.total || 0);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, startDate, endDate, authHeaders]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  const handleSaveSuccess = () => {
    setIsEditing(false);
    setCurrentArticle(undefined);
    setPreviewData(null);
    fetchArticles();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus artikel ini?')) return;

    try {
      const res = await fetch(`/api/articles/${id}`, { method: 'DELETE', headers: authHeaders() });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error || 'Gagal menghapus artikel');
      }
      fetchArticles();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (error) {
    return (
      <div className="p-6 space-y-4">
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
          <Link
            href="/login?from=/admin/articles"
            className="px-3.5 py-1.5 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition shadow-xs"
          >
            Login Ulang
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Articles CMS &amp; Editor&apos;s Pick</h1>
          <p className="text-sm text-gray-500 mt-0.5">Kelola artikel edukasi, ulasan produk, dan panduan belanja pembeli.</p>
        </div>
        {!isEditing && (
          <button
            onClick={() => {
              setCurrentArticle(undefined);
              setPreviewData({ title: '', content: '', imageUrl: '', products: [] });
              setIsEditing(true);
            }}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-sm transition-colors shadow-sm"
          >
            + Tulis Artikel Baru
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                setIsEditing(false);
                setCurrentArticle(undefined);
                setPreviewData(null);
              }}
              className="text-sm text-gray-600 hover:text-gray-900 flex items-center space-x-1"
            >
              <span>&larr; Kembali ke Daftar Artikel</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                {currentArticle ? 'Edit Artikel' : 'Tulis Artikel Baru'}
              </h2>
              <ArticleForm
                initialData={currentArticle}
                onSuccess={handleSaveSuccess}
                onChangePreview={setPreviewData}
              />
            </div>
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 sticky top-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-gray-900">Live Preview</h2>
                <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-medium">Real-time</span>
              </div>
              <ArticlePreview
                article={previewData || currentArticle || { title: 'Judul Artikel', content: '' }}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <input
              type="search"
              placeholder="Cari judul atau isi artikel..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="text-xs border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-1 focus:ring-indigo-500 w-full sm:w-64"
            />
            <DateRangeFilter
              compact
              startDate={startDate}
              endDate={endDate}
              onFilterChange={({ startDate: s, endDate: e }) => {
                setStartDate(s);
                setEndDate(e);
                setPage(1);
              }}
            />
          </div>
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Cover</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Judul Artikel</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Slug URL</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status Beranda</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Produk Terkait</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">Memuat artikel...</td></tr>
              ) : articles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <p className="text-base font-medium text-gray-700">Belum ada artikel yang dibuat.</p>
                    <p className="text-sm text-gray-400 mt-1">Klik tombol &ldquo;+ Tulis Artikel Baru&rdquo; di atas untuk mulai membuat artikel.</p>
                  </td>
                </tr>
              ) : (
                articles.map(article => (
                  <tr key={article.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      {article.imageUrl ? (
                        <div className="w-16 h-10 rounded-lg overflow-hidden relative bg-gray-100 border">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={article.imageUrl}
                            alt={article.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-16 h-10 rounded-lg bg-gray-100 border flex items-center justify-center text-gray-400 text-xs">
                          No Cover
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-gray-900 line-clamp-1">{article.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(article.createdAt).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-gray-500">
                      /{article.slug}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {article.isFeatured ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                          ⭐ Pilihan Editor
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">Standar</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {article.products?.length ? (
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded-md font-medium text-gray-700">
                          {article.products.length} Produk
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right space-x-3 text-sm">
                      <button
                        onClick={() => {
                          setCurrentArticle(article);
                          setPreviewData(article);
                          setIsEditing(true);
                        }}
                        className="text-indigo-600 hover:text-indigo-900 font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(article.id)}
                        className="text-red-600 hover:text-red-900 font-medium"
                      >
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div className="p-4 border-t border-gray-200">
            <Pagination
              page={page}
              totalPages={totalPages}
              totalItems={total}
              limit={limit}
              onPageChange={(p) => setPage(p)}
              onLimitChange={(l) => {
                setLimit(l);
                setPage(1);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
