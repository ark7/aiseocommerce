'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { SALES_IMAGE_PRESETS, SalesImageStyle } from '@/lib/aiPresets';

interface CatalogProduct {
  id: string;
  name: string;
  category?: { name: string } | null;
  images: { id: string; url: string; isPrimary: boolean }[];
}

export default function AdminAiStudioPage() {
  const [activeTab, setActiveTab] = useState<'image-studio' | 'copywriting'>('image-studio');

  // ==========================================
  // Image Studio States
  // ==========================================
  const [referenceMode, setReferenceMode] = useState<'upload' | 'catalog'>('upload');
  const [referenceImage, setReferenceImage] = useState<string>('');
  const [referencePreview, setReferencePreview] = useState<string>('');
  const [referenceName, setReferenceName] = useState<string>('');
  const [catalogProducts, setCatalogProducts] = useState<CatalogProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState<boolean>(false);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedStyle, setSelectedStyle] = useState<SalesImageStyle>('wooden-podium');
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '4:5' | '16:9'>('1:1');
  const [additionalPrompt, setAdditionalPrompt] = useState<string>('');

  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationStep, setGenerationStep] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [generatedResult, setGeneratedResult] = useState<{
    imageUrl: string;
    style: string;
    aspectRatio: string;
    promptUsed: string;
    attachedToProduct?: boolean;
    provider: string;
  } | null>(null);

  const [isAttaching, setIsAttaching] = useState<boolean>(false);
  const [attachMessage, setAttachMessage] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);

  // Side User Guide States
  const [sideGuideOpen, setSideGuideOpen] = useState<boolean>(true);
  const [guideTab, setGuideTab] = useState<'rules' | 'themes' | 'ratios' | 'faq'>('rules');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ==========================================
  // Copywriting Assistant States
  // ==========================================
  const [copywritingTopic, setCopywritingTopic] = useState<string>('');
  const [copywritingFormat, setCopywritingFormat] = useState<string>('aida');
  const [copywritingResult, setCopywritingResult] = useState<string>('');
  const [isGeneratingCopy, setIsGeneratingCopy] = useState<boolean>(false);
  const [copiedCopyText, setCopiedCopyText] = useState<boolean>(false);

  // Fetch catalog products for reference selection
  useEffect(() => {
    async function loadProducts() {
      setLoadingProducts(true);
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/products?limit=100', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          const prods = data.products || [];
          setCatalogProducts(prods);
          if (prods.length > 0 && !selectedProductId) {
            setSelectedProductId(prods[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load products for AI reference', err);
      } finally {
        setLoadingProducts(false);
      }
    }
    loadProducts();
  }, []);

  // Handle file upload for reference image
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Harap pilih berkas gambar yang valid (JPEG, PNG, atau WebP).');
      return;
    }

    setError(null);
    setReferenceName(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setReferenceImage(dataUrl);
      setReferencePreview(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  // Handle selecting product from catalog
  const handleCatalogProductSelect = (productId: string) => {
    setSelectedProductId(productId);
    const prod = catalogProducts.find((p) => p.id === productId);
    if (prod && prod.images && prod.images.length > 0) {
      const primary = prod.images.find((img) => img.isPrimary) || prod.images[0];
      setReferenceImage(primary.url);
      setReferencePreview(primary.url);
      setReferenceName(prod.name);
      setError(null);
    } else {
      setReferenceImage('');
      setReferencePreview('');
      setReferenceName(prod?.name || '');
      setError('Produk ini belum memiliki foto. Harap pilih produk lain atau unggah foto manual.');
    }
  };

  // Generate Sales Image
  const handleGenerateImage = async () => {
    if (!referenceImage) {
      setError('Foto referensi produk asli wajib disertakan sebelum membuat gambar jualan.');
      return;
    }

    setError(null);
    setIsGenerating(true);
    setAttachMessage(null);
    setGenerationStep('Menganalisis karakteristik visual produk...');

    try {
      const token = localStorage.getItem('token');

      // Visual progress feedback
      const step1 = setTimeout(() => {
        setGenerationStep('Menata komposisi panggung & pencahayaan studio...');
      }, 1200);

      const step2 = setTimeout(() => {
        setGenerationStep('Rendering foto jualan & optimasi format WebP...');
      }, 2400);

      const selectedProd = catalogProducts.find((p) => p.id === selectedProductId);

      const res = await fetch('/api/admin/ai/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          referenceImage,
          style: selectedStyle,
          aspectRatio,
          productName: referenceName || selectedProd?.name,
          categoryName: selectedProd?.category?.name,
          additionalPrompt,
          attachToProductId: referenceMode === 'catalog' ? selectedProductId : undefined,
        }),
      });

      clearTimeout(step1);
      clearTimeout(step2);

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal menghasilkan gambar jualan AI');
      }

      setGeneratedResult(data);
      if (data.attachedToProduct) {
        setAttachMessage('✓ Gambar otomatis ditambahkan ke galeri produk toko!');
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat memproses gambar.');
    } finally {
      setIsGenerating(false);
      setGenerationStep('');
    }
  };

  // Attach generated image to product manually
  const handleAttachToProduct = async (productIdToAttach: string) => {
    if (!generatedResult?.imageUrl || !productIdToAttach) return;

    setIsAttaching(true);
    setAttachMessage(null);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/products/${productIdToAttach}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          newImageUrl: generatedResult.imageUrl,
          altText: `Foto Komersial AI (${generatedResult.style})`,
        }),
      });

      if (!res.ok) {
        throw new Error('Gagal menautkan gambar ke produk.');
      }

      setAttachMessage('✓ Berhasil ditambahkan ke galeri produk!');
    } catch (err: any) {
      setAttachMessage(`Gagal: ${err.message}`);
    } finally {
      setIsAttaching(false);
    }
  };

  const handleCopyUrl = () => {
    if (!generatedResult?.imageUrl) return;
    const fullUrl = generatedResult.imageUrl.startsWith('http')
      ? generatedResult.imageUrl
      : `${window.location.origin}${generatedResult.imageUrl}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  // Quick Copywriting Generator
  const handleGenerateCopywriting = async (presetPrompt?: string) => {
    const topic = presetPrompt || copywritingTopic.trim();
    if (!topic || isGeneratingCopy) return;

    setIsGeneratingCopy(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: `Buatkan copywriting jualan e-commerce profesional format ${copywritingFormat.toUpperCase()} untuk topik/produk: "${topic}". Berikan hook pembuka yang menarik, deskripsi manfaat produk yang meyakinkan, dan Call To Action (CTA) tajam.`,
            },
          ],
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal membuat copywriting.');
      setCopywritingResult(data.reply);
    } catch (err: any) {
      setCopywritingResult(`Terjadi kesalahan: ${err.message}`);
    } finally {
      setIsGeneratingCopy(false);
    }
  };

  const handleCopyCopywritingText = () => {
    if (!copywritingResult) return;
    navigator.clipboard.writeText(copywritingResult);
    setCopiedCopyText(true);
    setTimeout(() => setCopiedCopyText(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-gray-200 dark:border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-2xl">✨</span>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI Studio Toko</h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              LarisManis AI Engine
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-600 dark:text-slate-400">
            Hasilkan foto produk komersial berkualitas studio foto dan teks penawaran berdaya konversi tinggi.
          </p>
        </div>

        {/* View / Hide Side Guide Toggle */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setSideGuideOpen(!sideGuideOpen)}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition shadow-xs"
          >
            <span>{sideGuideOpen ? '✕ Sembunyikan Panduan' : '📖 Buka Panduan Samping'}</span>
          </button>
        </div>
      </div>

      {/* Main Mode Tabs */}
      <div className="flex border-b border-gray-200 dark:border-slate-800 space-x-6">
        <button
          onClick={() => setActiveTab('image-studio')}
          className={`pb-3 text-sm font-semibold flex items-center space-x-2 border-b-2 transition-colors ${
            activeTab === 'image-studio'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <span>🎨 Studio Gambar Jualan AI</span>
          <span className="px-2 py-0.5 text-[10px] rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 font-bold">
            BARU
          </span>
        </button>
        <button
          onClick={() => setActiveTab('copywriting')}
          className={`pb-3 text-sm font-semibold flex items-center space-x-2 border-b-2 transition-colors ${
            activeTab === 'copywriting'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <span>📝 Asisten Copywriting & Konten</span>
        </button>
      </div>

      {/* ================================================================ */}
      {/* TAB 1: STUDIO GAMBAR JUALAN AI                                   */}
      {/* ================================================================ */}
      {activeTab === 'image-studio' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left / Main Workspace Column */}
          <div className={`${sideGuideOpen ? 'lg:col-span-8' : 'lg:col-span-12'} space-y-6 transition-all`}>
            {/* Step 1: Foto Referensi Produk Asli (Wajib!) */}
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-gray-200 dark:border-slate-800 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                    <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-bold">
                      1
                    </span>
                    <span>Foto Referensi Produk Fisik Asli</span>
                    <span className="text-xs text-red-500 font-bold bg-red-50 dark:bg-red-950/40 px-2 py-0.5 rounded border border-red-200 dark:border-red-800">
                      * WAJIB
                    </span>
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                    AI mewajibkan foto referensi produk asli agar bentuk, warna, dan proporsi produk Anda tetap akurat 100%.
                  </p>
                </div>

                {/* Switcher: Upload vs Katalog */}
                <div className="inline-flex rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 p-1 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setReferenceMode('upload');
                      setReferenceImage('');
                      setReferencePreview('');
                      setError(null);
                    }}
                    className={`px-3 py-1 rounded-md font-medium transition ${
                      referenceMode === 'upload'
                        ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                        : 'text-gray-600 dark:text-slate-400 hover:text-gray-900'
                    }`}
                  >
                    Unggah Foto Baru
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setReferenceMode('catalog');
                      if (catalogProducts.length > 0) {
                        handleCatalogProductSelect(selectedProductId || catalogProducts[0].id);
                      }
                    }}
                    className={`px-3 py-1 rounded-md font-medium transition ${
                      referenceMode === 'catalog'
                        ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                        : 'text-gray-600 dark:text-slate-400 hover:text-gray-900'
                    }`}
                  >
                    Pilih dari Katalog Toko
                  </button>
                </div>
              </div>

              {/* Mode 1: Upload File */}
              {referenceMode === 'upload' && (
                <div className="space-y-3">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                  />

                  {!referencePreview ? (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-xl p-8 text-center cursor-pointer hover:border-indigo-500 hover:bg-indigo-50/20 dark:hover:bg-slate-800/40 transition group"
                    >
                      <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        Klik untuk mengunggah foto produk asli
                      </p>
                      <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                        Format didukung: JPEG, PNG, WebP (Maksimal 10MB)
                      </p>
                      <span className="mt-3 inline-block px-3 py-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-xs text-gray-700 dark:text-slate-300 rounded-lg shadow-xs">
                        Pilih Berkas dari Perangkat
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-4 p-3 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
                      <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 shrink-0">
                        <Image
                          src={referencePreview}
                          alt="Foto Referensi"
                          fill
                          className="object-contain p-1"
                          unoptimized
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded">
                            ✓ Referensi Siap
                          </span>
                        </div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate mt-1">
                          {referenceName || 'Foto Produk Asli Terpilih'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-slate-400">
                          AI akan mempertahankan bentuk & label kemasan fisik produk ini.
                        </p>
                      </div>
                      <div className="flex flex-col space-y-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="text-xs px-2.5 py-1 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-md hover:bg-gray-100 transition"
                        >
                          Ganti Foto
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setReferenceImage('');
                            setReferencePreview('');
                            setReferenceName('');
                          }}
                          className="text-xs px-2.5 py-1 text-red-600 hover:text-red-700"
                        >
                          Hapus
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Mode 2: Pilih dari Katalog Toko */}
              {referenceMode === 'catalog' && (
                <div className="space-y-3">
                  {loadingProducts ? (
                    <p className="text-xs text-gray-500">Memuat daftar produk toko...</p>
                  ) : catalogProducts.length === 0 ? (
                    <p className="text-xs text-amber-600">
                      Belum ada produk terdaftar di toko Anda. Silakan gunakan opsi &quot;Unggah Foto Baru&quot;.
                    </p>
                  ) : (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1.5">
                        Pilih Produk Toko:
                      </label>
                      <select
                        value={selectedProductId}
                        onChange={(e) => handleCatalogProductSelect(e.target.value)}
                        className="w-full text-sm border border-gray-300 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                      >
                        {catalogProducts.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.images.length} foto)
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {referencePreview && (
                    <div className="flex items-center space-x-4 p-3 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
                      <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 shrink-0">
                        <Image
                          src={referencePreview}
                          alt="Foto Katalog"
                          fill
                          className="object-contain p-1"
                          unoptimized
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded">
                          ✓ Terhubung ke Katalog
                        </span>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate mt-1">
                          {referenceName}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-slate-400">
                          Hasil generate dapat langsung otomatis ditambahkan ke galeri produk ini.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Step 2: Pilih Preset Gaya Panggung Komersial */}
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-gray-200 dark:border-slate-800 p-5 space-y-4">
              <div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-bold">
                    2
                  </span>
                  <span>Pilih Gaya &amp; Panggung Komersial</span>
                </h2>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                  Tentukan tema visual dan tata cahaya studio yang paling cocok untuk segmen pasar Anda.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {SALES_IMAGE_PRESETS.map((preset) => {
                  const isSelected = selectedStyle === preset.id;
                  return (
                    <div
                      key={preset.id}
                      onClick={() => setSelectedStyle(preset.id)}
                      className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/30 dark:bg-indigo-950/20 ring-2 ring-indigo-500/20 shadow-xs'
                          : 'border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 hover:border-gray-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-2xl">{preset.icon}</span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300">
                          {preset.badge}
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                        {preset.name}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {preset.description}
                      </p>
                      <div className="mt-2.5 pt-2 border-t border-gray-100 dark:border-slate-700/60">
                        <span className="text-[10px] text-indigo-600 dark:text-indigo-400 block font-medium">
                          Cocok: {preset.recommendedCategory}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Step 3: Format Rasio & Instruksi Tambahan */}
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-gray-200 dark:border-slate-800 p-5 space-y-4">
              <div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-bold">
                    3
                  </span>
                  <span>Format Rasio &amp; Detail Tambahan</span>
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label
                  onClick={() => setAspectRatio('1:1')}
                  className={`p-3 rounded-lg border cursor-pointer flex items-center space-x-3 transition ${
                    aspectRatio === '1:1'
                      ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-300 font-semibold'
                      : 'border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="w-6 h-6 border-2 border-current rounded flex items-center justify-center text-[10px]">
                    1:1
                  </div>
                  <div>
                    <span className="block text-xs font-bold">Persegi (1:1)</span>
                    <span className="block text-[10px] text-gray-500 dark:text-slate-400">
                      Katalog, Shopee, Feed IG
                    </span>
                  </div>
                </label>

                <label
                  onClick={() => setAspectRatio('4:5')}
                  className={`p-3 rounded-lg border cursor-pointer flex items-center space-x-3 transition ${
                    aspectRatio === '4:5'
                      ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-300 font-semibold'
                      : 'border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="w-5 h-6 border-2 border-current rounded flex items-center justify-center text-[10px]">
                    4:5
                  </div>
                  <div>
                    <span className="block text-xs font-bold">Portrait (4:5)</span>
                    <span className="block text-[10px] text-gray-500 dark:text-slate-400">
                      TikTok, Story, Reels IG
                    </span>
                  </div>
                </label>

                <label
                  onClick={() => setAspectRatio('16:9')}
                  className={`p-3 rounded-lg border cursor-pointer flex items-center space-x-3 transition ${
                    aspectRatio === '16:9'
                      ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-300 font-semibold'
                      : 'border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="w-7 h-4 border-2 border-current rounded flex items-center justify-center text-[9px]">
                    16:9
                  </div>
                  <div>
                    <span className="block text-xs font-bold">Landscape (16:9)</span>
                    <span className="block text-[10px] text-gray-500 dark:text-slate-400">
                      Hero Banner Toko
                    </span>
                  </div>
                </label>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Instruksi Suasana &amp; Elemen Panggung Ekstra (Opsional):
                </label>
                <input
                  type="text"
                  value={additionalPrompt}
                  onChange={(e) => setAdditionalPrompt(e.target.value)}
                  placeholder="Contoh: Tambahkan percikan air segar di samping botol dan pencahayaan hangat dari samping"
                  className="w-full text-xs sm:text-sm border border-gray-300 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-xl text-xs flex items-center gap-2">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {/* Action Button */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-gray-200 dark:border-slate-800">
              <div className="text-xs text-gray-500 dark:text-slate-400">
                {!referenceImage ? (
                  <span className="text-amber-600 dark:text-amber-400 font-semibold">
                    🔒 Tombol terkunci: Harap sertakan foto referensi produk asli di Langkah 1.
                  </span>
                ) : (
                  <span>
                    ✓ Siap menghasilkan foto jualan komersial beresolusi tinggi (WebP).
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handleGenerateImage}
                disabled={!referenceImage || isGenerating}
                className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 text-white font-semibold text-sm rounded-xl shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.99] transition disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center space-x-2"
              >
                {isGenerating ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>{generationStep || 'Memproses AI Studio...'}</span>
                  </>
                ) : (
                  <>
                    <span>✨</span>
                    <span>Generate Foto Jualan AI</span>
                  </>
                )}
              </button>
            </div>

            {/* Generated Result Card & Comparison */}
            {generatedResult && (
              <div className="bg-white dark:bg-slate-900 rounded-xl shadow-md border-2 border-indigo-500/30 p-5 space-y-4 animate-in fade-in duration-300">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-slate-800">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">🎉</span>
                    <h3 className="font-bold text-gray-900 dark:text-white text-base">
                      Hasil Foto Jualan Siap Pakai
                    </h3>
                    <span className="text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 px-2 py-0.5 rounded font-medium">
                      WebP Terkompresi
                    </span>
                  </div>
                  {attachMessage && (
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 animate-pulse">
                      {attachMessage}
                    </span>
                  )}
                </div>

                {/* Komparasi: Foto Asli vs Foto Hasil AI */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                  <div className="space-y-1.5 text-center">
                    <span className="text-xs font-medium text-gray-500 dark:text-slate-400">
                      Foto Referensi Produk Asli:
                    </span>
                    <div className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
                      {referencePreview && (
                        <Image
                          src={referencePreview}
                          alt="Referensi Asli"
                          fill
                          className="object-contain p-2"
                          unoptimized
                        />
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5 text-center">
                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center justify-center gap-1">
                      <span>✨</span> Foto Jualan Berbasis AI ({generatedResult.style}):
                    </span>
                    <div className="relative aspect-square rounded-xl overflow-hidden border-2 border-indigo-600 bg-black shadow-lg">
                      <Image
                        src={generatedResult.imageUrl}
                        alt="Hasil Foto Jualan AI"
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  </div>
                </div>

                {/* Action Buttons for Result */}
                <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-gray-100 dark:border-slate-800">
                  {referenceMode === 'catalog' && selectedProductId && (
                    <button
                      type="button"
                      onClick={() => handleAttachToProduct(selectedProductId)}
                      disabled={isAttaching}
                      className="px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 transition flex items-center space-x-1.5 shadow-xs"
                    >
                      <span>📸</span>
                      <span>{isAttaching ? 'Menyimpan...' : 'Jadikan Foto Produk'}</span>
                    </button>
                  )}

                  <a
                    href={generatedResult.imageUrl}
                    download="foto-jualan-ai.webp"
                    className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition flex items-center space-x-1.5 shadow-xs"
                  >
                    <span>⬇️</span>
                    <span>Unduh Gambar (WebP)</span>
                  </a>

                  <button
                    type="button"
                    onClick={handleCopyUrl}
                    className="px-4 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 text-gray-700 dark:text-slate-200 text-xs font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition"
                  >
                    {copiedUrl ? '✓ URL Disalin!' : '📋 Salin Tautan'}
                  </button>

                  <button
                    type="button"
                    onClick={handleGenerateImage}
                    disabled={isGenerating}
                    className="px-4 py-2 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 text-xs font-medium rounded-lg hover:bg-gray-200 transition ml-auto"
                  >
                    🔄 Buat Variasi Lain
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right / Side User Guide Column (Like AdminGuideDrawer Design) */}
          {sideGuideOpen && (
            <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-gray-200 dark:border-slate-800 p-5 space-y-4 sticky top-20">
              <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-slate-800">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">📖</span>
                  <h3 className="font-bold text-sm text-gray-900 dark:text-white">
                    Panduan Foto Jualan AI
                  </h3>
                </div>
                <button
                  onClick={() => setSideGuideOpen(false)}
                  className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-slate-200"
                  aria-label="Tutup Panduan"
                >
                  ✕
                </button>
              </div>

              {/* Sub-tabs inside Side Guide */}
              <div className="flex space-x-1 p-1 bg-gray-100 dark:bg-slate-800 rounded-lg text-xs">
                <button
                  type="button"
                  onClick={() => setGuideTab('rules')}
                  className={`flex-1 py-1.5 rounded-md font-medium text-center transition ${
                    guideTab === 'rules'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs font-semibold'
                      : 'text-gray-600 dark:text-slate-400'
                  }`}
                >
                  Syarat
                </button>
                <button
                  type="button"
                  onClick={() => setGuideTab('themes')}
                  className={`flex-1 py-1.5 rounded-md font-medium text-center transition ${
                    guideTab === 'themes'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs font-semibold'
                      : 'text-gray-600 dark:text-slate-400'
                  }`}
                >
                  Tema
                </button>
                <button
                  type="button"
                  onClick={() => setGuideTab('ratios')}
                  className={`flex-1 py-1.5 rounded-md font-medium text-center transition ${
                    guideTab === 'ratios'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs font-semibold'
                      : 'text-gray-600 dark:text-slate-400'
                  }`}
                >
                  Rasio
                </button>
                <button
                  type="button"
                  onClick={() => setGuideTab('faq')}
                  className={`flex-1 py-1.5 rounded-md font-medium text-center transition ${
                    guideTab === 'faq'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs font-semibold'
                      : 'text-gray-600 dark:text-slate-400'
                  }`}
                >
                  FAQ
                </button>
              </div>

              {/* Guide Content: Rules */}
              {guideTab === 'rules' && (
                <div className="space-y-3 text-xs text-gray-600 dark:text-slate-300 leading-relaxed">
                  <div className="bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 space-y-1">
                    <p className="font-bold flex items-center gap-1">
                      <span>📌</span>
                      <span>Kenapa Foto Referensi Wajib?</span>
                    </p>
                    <p className="text-[11px] leading-normal">
                      Pembeli online ingin melihat barang yang persis sama dengan yang akan mereka terima. AI tidak membuat produk khayalan, melainkan meletakkan produk fisik asli Anda ke panggung studio profesional.
                    </p>
                  </div>

                  <h4 className="font-bold text-gray-900 dark:text-white pt-1">
                    Tips Foto Referensi Terbaik:
                  </h4>
                  <ul className="space-y-2 list-disc list-inside text-[11px]">
                    <li>
                      <strong>Cahaya Terang:</strong> Foto di tempat terang atau dekat jendela tanpa bayangan tajam.
                    </li>
                    <li>
                      <strong>Sudut Tegak / Isometrik:</strong> Ambil foto dari depan sejajar mata produk (front view) agar siluet tampak sempurna.
                    </li>
                    <li>
                      <strong>Latar Netral:</strong> Latar polos (misal meja putih/lantai) memudahkan AI membedakan batas produk.
                    </li>
                    <li>
                      <strong>Fokus Tajam:</strong> Pastikan merek, logo, dan tekstur tidak buram.
                    </li>
                  </ul>
                </div>
              )}

              {/* Guide Content: Themes */}
              {guideTab === 'themes' && (
                <div className="space-y-2.5 text-xs text-gray-600 dark:text-slate-300">
                  <p className="text-[11px] text-gray-500">
                    Panduan memilih panggung studio terbaik berdasarkan kategori produk jualan Anda:
                  </p>
                  <div className="space-y-2 text-[11px]">
                    <div className="p-2.5 rounded-lg bg-gray-50 dark:bg-slate-800/80 border border-gray-100 dark:border-slate-700">
                      <strong className="text-gray-900 dark:text-white block">🪵 Aesthetic Wooden Podium</strong>
                      <span className="text-gray-500 dark:text-slate-400">Cocok untuk: Skincare, serum, sabun organik, madu, dan suplemen herbal.</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-gray-50 dark:bg-slate-800/80 border border-gray-100 dark:border-slate-700">
                      <strong className="text-gray-900 dark:text-white block">🏛️ Luxury Marble &amp; Gold</strong>
                      <span className="text-gray-500 dark:text-slate-400">Cocok untuk: Parfum mewah, jam tangan, kacamata, dan perhiasan premium.</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-gray-50 dark:bg-slate-800/80 border border-gray-100 dark:border-slate-700">
                      <strong className="text-gray-900 dark:text-white block">⚪ Studio White Minimalist</strong>
                      <span className="text-gray-500 dark:text-slate-400">Cocok untuk: Sepatu sneakers, tas, pakaian fashion, dan perabot dapur.</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-gray-50 dark:bg-slate-800/80 border border-gray-100 dark:border-slate-700">
                      <strong className="text-gray-900 dark:text-white block">⚡ Cyber Neon Tech</strong>
                      <span className="text-gray-500 dark:text-slate-400">Cocok untuk: Headphone, smartwatch, mouse gaming, dan perangkat gadget.</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Guide Content: Ratios */}
              {guideTab === 'ratios' && (
                <div className="space-y-2.5 text-xs text-gray-600 dark:text-slate-300 text-[11px]">
                  <p className="text-gray-500">
                    Pilih ukuran sesuai target jalur pemasaran yang ingin Anda tuju:
                  </p>
                  <div className="space-y-2">
                    <div className="p-2.5 rounded-lg bg-gray-50 dark:bg-slate-800 border">
                      <strong className="text-indigo-600 dark:text-indigo-400 block">1:1 Persegi (1080 x 1080 px)</strong>
                      <span>Katalog utama toko online, thumbnail Shopee &amp; Tokopedia, serta Feed Instagram.</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-gray-50 dark:bg-slate-800 border">
                      <strong className="text-indigo-600 dark:text-indigo-400 block">4:5 Portrait (1080 x 1350 px)</strong>
                      <span>Ukuran ideal untuk iklan Instagram Story, Reels, dan video TikTok Shop.</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-gray-50 dark:bg-slate-800 border">
                      <strong className="text-indigo-600 dark:text-indigo-400 block">16:9 Landscape (1920 x 1080 px)</strong>
                      <span>Spanduk promosi Hero Banner beranda toko online dan artikel landing page.</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Guide Content: FAQ */}
              {guideTab === 'faq' && (
                <div className="space-y-2 text-xs text-[11px] text-gray-600 dark:text-slate-300">
                  <div className="border-b pb-2">
                    <strong className="text-gray-900 dark:text-white block mb-0.5">
                      Q: Bagaimana cara menyimpan gambar hasil AI?
                    </strong>
                    <span>
                      Anda bisa langsung menekan tombol &quot;Jadikan Foto Produk&quot; untuk memasukkannya ke katalog toko, atau klik &quot;Unduh Gambar&quot; untuk menyimpan file WebP ke HP/laptop Anda.
                    </span>
                  </div>
                  <div className="border-b pb-2">
                    <strong className="text-gray-900 dark:text-white block mb-0.5">
                      Q: Apakah foto hasil AI aman dari hak cipta?
                    </strong>
                    <span>
                      Ya, karena foto dihasilkan dari referensi barang dagangan asli Anda sendiri yang dipadukan dengan panggung studio AI.
                    </span>
                  </div>
                  <div>
                    <strong className="text-gray-900 dark:text-white block mb-0.5">
                      Q: Di mana saya mengatur API Key AI?
                    </strong>
                    <span>
                      Kunci API Gemini atau OpenAI dapat diisi di menu Pengaturan &gt; AI Assistant.
                    </span>
                  </div>
                </div>
              )}

              {/* Link to Full Master Guide */}
              <div className="pt-3 border-t border-gray-100 dark:border-slate-800 text-center">
                <Link
                  href="/admin/products"
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                >
                  ← Kembali ke Katalog Produk
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================================================================ */}
      {/* TAB 2: ASISTEN COPYWRITING & KONTEN                              */}
      {/* ================================================================ */}
      {activeTab === 'copywriting' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-gray-200 dark:border-slate-800 p-5 space-y-4">
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                Buat Copywriting Jualan Otomatis
              </h2>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                Pilih format penulisan penawaran dan berikan nama produk untuk dibuatkan teks jualan dalam hitungan detik.
              </p>
            </div>

            {/* Format selector */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'aida', name: 'Formula AIDA', desc: 'Attention, Interest, Desire, Action' },
                { id: 'pas', name: 'Formula PAS', desc: 'Problem, Agitate, Solution' },
                { id: 'wa', name: 'Template WA', desc: 'Pesan closing WhatsApp ramah' },
                { id: 'seo', name: 'SEO & Keyword', desc: 'Meta description & 5 keyword' },
              ].map((fmt) => (
                <button
                  key={fmt.id}
                  type="button"
                  onClick={() => setCopywritingFormat(fmt.id)}
                  className={`p-2.5 rounded-lg border text-left transition ${
                    copywritingFormat === fmt.id
                      ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-300 font-semibold'
                      : 'border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-50'
                  }`}
                >
                  <span className="block text-xs font-bold">{fmt.name}</span>
                  <span className="block text-[10px] text-gray-400">{fmt.desc}</span>
                </button>
              ))}
            </div>

            {/* Input topic */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">
                Topik / Nama Produk / Target Pembeli:
              </label>
              <textarea
                rows={3}
                value={copywritingTopic}
                onChange={(e) => setCopywritingTopic(e.target.value)}
                placeholder="Misal: Sepatu Sneakers Running Pria Ringan Anti-Slip untuk Olahraga dan Kuliah, bahan mesh bernapas, harga promo Rp 199.000"
                className="w-full text-xs sm:text-sm border border-gray-300 dark:border-slate-700 rounded-lg p-3 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Preset chips */}
            <div className="flex flex-wrap gap-1.5">
              {[
                '👟 Sepatu sneakers kasual gaya kekinian',
                '🌿 Serum wajah pencerah alami kulit kusam',
                '☕ Kopi arabika premium single origin',
                '👗 Dress gamis muslimah bahan jatuh adem',
              ].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setCopywritingTopic(chip)}
                  className="px-2.5 py-1 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 text-xs rounded-full hover:bg-gray-200 transition"
                >
                  {chip}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => handleGenerateCopywriting()}
              disabled={!copywritingTopic.trim() || isGeneratingCopy}
              className="w-full py-2.5 bg-indigo-600 text-white font-semibold text-xs sm:text-sm rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
            >
              {isGeneratingCopy ? 'Sedang Menyusun Copywriting...' : '✨ Tulis Copywriting Otomatis'}
            </button>
          </div>

          {/* Copywriting Result Column */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-gray-200 dark:border-slate-800 p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-slate-800">
              <h3 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-1.5">
                <span>📋</span>
                <span>Hasil Copywriting Siap Pakai</span>
              </h3>
              {copywritingResult && (
                <button
                  type="button"
                  onClick={handleCopyCopywritingText}
                  className="text-xs px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 rounded font-medium hover:bg-indigo-100 transition"
                >
                  {copiedCopyText ? '✓ Tersalin!' : 'Salin Teks'}
                </button>
              )}
            </div>

            {copywritingResult ? (
              <div className="text-xs sm:text-sm text-gray-800 dark:text-slate-200 whitespace-pre-line leading-relaxed max-h-[500px] overflow-y-auto p-3 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
                {copywritingResult}
              </div>
            ) : (
              <div className="py-16 text-center text-gray-400 text-xs space-y-2">
                <span className="text-3xl block">✍️</span>
                <p>Masukkan topik di sebelah kiri dan klik tombol untuk membuat copywriting.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

