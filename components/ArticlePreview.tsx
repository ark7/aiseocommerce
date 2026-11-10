'use client';

import React, { useState } from 'react';

interface Article {
  id?: string;
  title: string;
  content: string;
  imageUrl?: string;
  seoDescription?: string;
  isFeatured?: boolean;
  products?: { id: string; name: string }[];
}

interface ArticlePreviewProps {
  article: Article;
}

export function ArticlePreview({ article }: ArticlePreviewProps) {
  const [viewMode, setViewMode] = useState<'detail' | 'card'>('detail');

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Switcher Tab Preview */}
      <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-gray-200">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2">
          Mode Pratinjau
        </span>
        <div className="flex space-x-1">
          <button
            type="button"
            onClick={() => setViewMode('detail')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              viewMode === 'detail'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Halaman Detail
          </button>
          <button
            type="button"
            onClick={() => setViewMode('card')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              viewMode === 'card'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Kartu Katalog (Card)
          </button>
        </div>
      </div>

      {/* MODE 1: DETAIL CONTENT PREVIEW */}
      {viewMode === 'detail' ? (
        <div className="p-6 md:p-8 bg-white rounded-xl shadow-sm border border-gray-100">
          <article className="prose prose-indigo max-w-none">
            {article.imageUrl && (
              <div className="mb-6 rounded-2xl overflow-hidden shadow-sm aspect-video bg-gray-100 border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={article.imageUrl}
                  alt={article.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4 leading-tight">
              {article.title || 'Judul Artikel'}
            </h1>

            <div className="text-gray-700 leading-relaxed space-y-4 whitespace-pre-wrap">
              {article.content || 'Konten artikel akan ditampilkan di sini...'}
            </div>

            {article.products && article.products.length > 0 && (
              <div className="mt-10 pt-6 border-t border-gray-100">
                <h3 className="text-base font-bold text-gray-900 mb-3">
                  Related Products
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {article.products.map((product) => (
                    <div
                      key={product.id}
                      className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-sm text-gray-700 font-medium"
                    >
                      {product.name}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </article>
        </div>
      ) : (
        /* MODE 2: CARD PREVIEW */
        <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100 flex justify-center">
          <div className="w-full max-w-sm rounded-2xl border border-gray-200 overflow-hidden shadow-sm bg-white">
            <div className="relative aspect-video w-full bg-gray-100 overflow-hidden">
              {article.imageUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={article.imageUrl}
                  alt={article.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-50 to-indigo-100 text-indigo-400">
                  <span className="text-4xl">📰</span>
                </div>
              )}
              {article.isFeatured && (
                <span className="absolute top-3 left-3 bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
                  Pilihan Editor
                </span>
              )}
            </div>

            <div className="p-5 space-y-2.5">
              <p className="text-[11px] text-gray-400">
                {new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
              <h3 className="font-bold text-gray-900 line-clamp-2 text-base leading-snug">
                {article.title || 'Judul Kartu Artikel'}
              </h3>
              <p className="text-xs text-gray-500 line-clamp-3 leading-relaxed">
                {article.seoDescription || (article.content ? article.content.replace(/<[^>]*>/g, '').substring(0, 120) + '...' : 'Deskripsi cuplikan artikel...')}
              </p>
              <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs font-semibold text-indigo-600">
                <span>Baca panduan</span>
                <span>&rarr;</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
