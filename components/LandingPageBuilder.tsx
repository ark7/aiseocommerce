'use client';

import { useState, useEffect } from 'react';
import {
  LandingPageData,
  LandingPageSection,
  SectionType,
  createDefaultSection,
  TestimonialItem,
  TrustBadgeItem,
  FeatureItem,
  FaqItem,
} from '@/lib/landingPageTypes';

interface ProductOption {
  id: string;
  name: string;
  sellingPrice: number;
  discountPrice?: number | null;
}

interface LandingPageBuilderProps {
  initialData?: LandingPageData | null;
  onSave: (data: LandingPageData) => Promise<void>;
  onCancel: () => void;
  saving?: boolean;
}

export default function LandingPageBuilder({
  initialData,
  onSave,
  onCancel,
  saving = false,
}: LandingPageBuilderProps) {
  const [activeTab, setActiveTab] = useState<'sections' | 'seo' | 'preview'>('sections');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [expandedSectionId, setExpandedSectionId] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState(initialData?.title || 'Promo Spesial Produk Terlaris');
  const [slug, setSlug] = useState(initialData?.slug || 'promo-spesial');
  const [isPublished, setIsPublished] = useState(initialData?.isPublished ?? true);
  const [productId, setProductId] = useState<string | null>(initialData?.productId || null);
  const [seoTitle, setSeoTitle] = useState(initialData?.seoTitle || '');
  const [seoDescription, setSeoDescription] = useState(initialData?.seoDescription || '');
  const [seoKeywords, setSeoKeywords] = useState(initialData?.seoKeywords || '');
  const [ogImage, setOgImage] = useState(initialData?.ogImage || '');
  const [sections, setSections] = useState<LandingPageSection[]>(
    initialData?.sections && initialData.sections.length > 0
      ? initialData.sections
      : [
          createDefaultSection('hero'),
          createDefaultSection('proof_trust'),
          createDefaultSection('features'),
          createDefaultSection('offer'),
          createDefaultSection('testimonials'),
          createDefaultSection('faq'),
          createDefaultSection('sticky_cta'),
        ]
  );

  // Load available products for linking
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/products', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          setProducts(data.products || []);
        }
      } catch (e) {
        console.error('Failed to load products for landing page', e);
      }
    };
    fetchProducts();
  }, []);

  // Set default expanded section
  useEffect(() => {
    if (sections.length > 0 && !expandedSectionId) {
      setExpandedSectionId(sections[0].id);
    }
  }, [sections, expandedSectionId]);

  // Section manipulation functions
  const addSection = (type: SectionType) => {
    const newSec = createDefaultSection(type);
    setSections([...sections, newSec]);
    setExpandedSectionId(newSec.id);
  };

  const moveSection = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === sections.length - 1)
    ) {
      return;
    }
    const newSections = [...sections];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const [moved] = newSections.splice(index, 1);
    newSections.splice(targetIndex, 0, moved);
    setSections(newSections);
  };

  const deleteSection = (id: string) => {
    if (confirm('Hapus section ini dari landing page?')) {
      setSections(sections.filter((s) => s.id !== id));
      if (expandedSectionId === id) {
        setExpandedSectionId(null);
      }
    }
  };

  const updateSection = (id: string, updatedFields: Partial<LandingPageSection>) => {
    setSections(
      sections.map((sec) => {
        if (sec.id === id) {
          return { ...sec, ...updatedFields } as LandingPageSection;
        }
        return sec;
      })
    );
  };

  const handleSlugChange = (raw: string) => {
    const cleaned = raw
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    setSlug(cleaned);
  };

  const handleSave = () => {
    if (!title.trim()) {
      alert('Judul landing page tidak boleh kosong.');
      return;
    }
    if (!slug.trim()) {
      alert('Custom slug tidak boleh kosong.');
      return;
    }

    const payload: LandingPageData = {
      ...(initialData?.id ? { id: initialData.id } : {}),
      title: title.trim(),
      slug: slug.trim(),
      isPublished,
      productId: productId || null,
      seoTitle: seoTitle.trim() || title.trim(),
      seoDescription:
        seoDescription.trim() ||
        'Dapatkan penawaran eksklusif dan promo terbaik dengan jaminan original dan ulasan bintang 5.',
      seoKeywords: seoKeywords.trim() || null,
      ogImage: ogImage.trim() || null,
      sections,
    };

    onSave(payload);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Top Header Bar */}
      <div className="border-b border-slate-200 bg-slate-50 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition"
          >
            ← Kembali
          </button>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {initialData ? 'Edit Landing Page' : 'Buat Landing Page Baru'}
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              URL: <span className="text-indigo-600">/lp/{slug || '[slug]'}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Tabs */}
          <div className="flex bg-slate-200/80 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('sections')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                activeTab === 'sections'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🧩 Sections ({sections.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('seo')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                activeTab === 'seo'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🔍 SEO & URL
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                activeTab === 'preview'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              👁️ Live Preview
            </button>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs md:text-sm font-bold rounded-xl shadow-sm transition disabled:opacity-50 flex items-center gap-1.5"
          >
            {saving ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
                Menyimpan...
              </>
            ) : (
              '💾 Simpan & Revalidate'
            )}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-6">
        {/* TAB 1: MODULAR SECTIONS */}
        {activeTab === 'sections' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  Susunan Section Landing Page
                </h3>
                <p className="text-xs text-slate-500">
                  Tambahkan, urutkan, atau sesuaikan konten tiap blok untuk memaksimalkan konversi penjualan.
                </p>
              </div>

              {/* Add Section Dropdown */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-500">Tambah Section:</span>
                <select
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value) {
                      addSection(e.target.value as SectionType);
                      e.target.value = '';
                    }
                  }}
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-300 rounded-lg hover:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="" disabled>+ Pilih Jenis Section</option>
                  <option value="hero">⚡ Hero Banner & CTA</option>
                  <option value="proof_trust">🛡️ Bukti Sosial, Resi & Trust Badges</option>
                  <option value="features">✨ Fitur & Keunggulan Produk</option>
                  <option value="offer">🏷️ Penawaran Flash Sale & Scarcity</option>
                  <option value="testimonials">⭐ Ulasan & Testimoni Pelanggan</option>
                  <option value="faq">❓ FAQ (Tanya Jawab)</option>
                  <option value="sticky_cta">📱 Sticky CTA Mobile Bar</option>
                </select>
              </div>
            </div>

            {/* List of Sections */}
            <div className="space-y-4">
              {sections.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
                  <p className="text-sm text-slate-500 font-medium">Belum ada section di landing page ini.</p>
                  <p className="text-xs text-slate-400 mt-1">Gunakan tombol dropdown di atas untuk menambahkan section pertama.</p>
                </div>
              ) : (
                sections.map((section, idx) => {
                  const isExpanded = expandedSectionId === section.id;
                  const getSectionLabel = (type: SectionType) => {
                    switch (type) {
                      case 'hero': return '⚡ Hero Banner & CTA';
                      case 'proof_trust': return '🛡️ Bukti Sosial & Trust Badges';
                      case 'features': return '✨ Fitur & Keunggulan';
                      case 'offer': return '🏷️ Penawaran Flash Sale & Scarcity';
                      case 'testimonials': return '⭐ Testimoni & Rating Bintang';
                      case 'faq': return '❓ FAQ Tanya Jawab';
                      case 'sticky_cta': return '📱 Sticky CTA Mobile Bar';
                    }
                  };

                  return (
                    <div
                      key={section.id}
                      className={`border rounded-xl transition overflow-hidden ${
                        isExpanded ? 'border-indigo-400 bg-white shadow-sm ring-1 ring-indigo-200' : 'border-slate-200 bg-slate-50/50'
                      }`}
                    >
                      {/* Section Card Header */}
                      <div className="px-4 py-3 bg-white flex items-center justify-between border-b border-slate-100">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setExpandedSectionId(isExpanded ? null : section.id)}
                            className="text-left flex items-center gap-2 group"
                          >
                            <span className="text-xs font-bold text-slate-400 w-5">#{idx + 1}</span>
                            <span className="text-sm font-bold text-slate-800 group-hover:text-indigo-600 transition">
                              {getSectionLabel(section.type)}
                            </span>
                            <span className="text-xs text-slate-400">
                              {isExpanded ? '▲' : '▼'}
                            </span>
                          </button>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => moveSection(idx, 'up')}
                            className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded hover:bg-slate-100"
                            title="Geser ke atas"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            disabled={idx === sections.length - 1}
                            onClick={() => moveSection(idx, 'down')}
                            className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded hover:bg-slate-100"
                            title="Geser ke bawah"
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteSection(section.id)}
                            className="p-1 text-red-400 hover:text-red-600 rounded hover:bg-red-50 ml-2"
                            title="Hapus section"
                          >
                            ✕
                          </button>
                        </div>
                      </div>

                      {/* Section Card Body (When Expanded) */}
                      {isExpanded && (
                        <div className="p-4 bg-white space-y-4">
                          {/* 1. HERO SECTION FORM */}
                          {section.type === 'hero' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-3">
                                <div>
                                  <label className="block text-xs font-semibold text-slate-700 mb-1">Promo Badge</label>
                                  <input
                                    type="text"
                                    value={section.badge}
                                    onChange={(e) => updateSection(section.id, { badge: e.target.value })}
                                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500"
                                    placeholder="Contoh: FLASH SALE 50%"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-slate-700 mb-1">Headline Utama</label>
                                  <textarea
                                    rows={2}
                                    value={section.title}
                                    onChange={(e) => updateSection(section.id, { title: e.target.value })}
                                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 font-semibold"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-slate-700 mb-1">Subheadline Persuasif</label>
                                  <textarea
                                    rows={2}
                                    value={section.subtitle}
                                    onChange={(e) => updateSection(section.id, { subtitle: e.target.value })}
                                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500"
                                  />
                                </div>
                              </div>
                              <div className="space-y-3">
                                <div>
                                  <label className="block text-xs font-semibold text-slate-700 mb-1">URL Gambar Banner / Produk Hero</label>
                                  <input
                                    type="text"
                                    value={section.imageUrl || ''}
                                    onChange={(e) => updateSection(section.id, { imageUrl: e.target.value })}
                                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500"
                                    placeholder="https://images.unsplash.com/..."
                                  />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Teks Tombol CTA</label>
                                    <input
                                      type="text"
                                      value={section.ctaText}
                                      onChange={(e) => updateSection(section.id, { ctaText: e.target.value })}
                                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Link Target CTA</label>
                                    <input
                                      type="text"
                                      value={section.ctaLink}
                                      onChange={(e) => updateSection(section.id, { ctaLink: e.target.value })}
                                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500"
                                      placeholder="#offer atau /cart"
                                    />
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">CTA Sekunder</label>
                                    <input
                                      type="text"
                                      value={section.secondaryCtaText || ''}
                                      onChange={(e) => updateSection(section.id, { secondaryCtaText: e.target.value })}
                                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500"
                                      placeholder="Lihat Ulasan"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Link CTA Sekunder</label>
                                    <input
                                      type="text"
                                      value={section.secondaryCtaLink || ''}
                                      onChange={(e) => updateSection(section.id, { secondaryCtaLink: e.target.value })}
                                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500"
                                      placeholder="#testimonials"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* 2. TESTIMONIALS SECTION FORM */}
                          {section.type === 'testimonials' && (
                            <div className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-xs font-semibold text-slate-700 mb-1">Judul Section Testimoni</label>
                                  <input
                                    type="text"
                                    value={section.title}
                                    onChange={(e) => updateSection(section.id, { title: e.target.value })}
                                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-slate-700 mb-1">Deskripsi / Subtitle</label>
                                  <input
                                    type="text"
                                    value={section.subtitle}
                                    onChange={(e) => updateSection(section.id, { subtitle: e.target.value })}
                                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500"
                                  />
                                </div>
                              </div>

                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <label className="text-xs font-bold text-slate-700">Daftar Review Pelanggan ({section.items.length})</label>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newItem: TestimonialItem = {
                                        id: 'testi_' + Math.random().toString(36).substring(2, 7),
                                        name: 'Pelanggan Puas',
                                        location: 'Indonesia',
                                        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
                                        rating: 5,
                                        isVerified: true,
                                        comment: 'Pelayanan cepat dan kualitas produk sangat memuaskan!',
                                        date: 'Baru saja',
                                      };
                                      updateSection(section.id, { items: [...section.items, newItem] });
                                    }}
                                    className="px-2.5 py-1 text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-semibold rounded-lg"
                                  >
                                    + Tambah Review
                                  </button>
                                </div>

                                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                                  {section.items.map((item, itemIdx) => (
                                    <div key={item.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs font-bold text-slate-500">#{itemIdx + 1}</span>
                                          <input
                                            type="text"
                                            value={item.name}
                                            onChange={(e) => {
                                              const updated = [...section.items];
                                              updated[itemIdx].name = e.target.value;
                                              updateSection(section.id, { items: updated });
                                            }}
                                            placeholder="Nama Pelanggan"
                                            className="px-2 py-1 text-xs font-semibold border border-slate-300 rounded"
                                          />
                                          <input
                                            type="text"
                                            value={item.location || ''}
                                            onChange={(e) => {
                                              const updated = [...section.items];
                                              updated[itemIdx].location = e.target.value;
                                              updateSection(section.id, { items: updated });
                                            }}
                                            placeholder="Kota (cth: Jakarta)"
                                            className="px-2 py-1 text-xs border border-slate-300 rounded w-28"
                                          />
                                          <select
                                            value={item.rating}
                                            onChange={(e) => {
                                              const updated = [...section.items];
                                              updated[itemIdx].rating = Number(e.target.value);
                                              updateSection(section.id, { items: updated });
                                            }}
                                            className="px-2 py-1 text-xs border border-slate-300 rounded bg-white font-bold text-amber-500"
                                          >
                                            <option value={5}>⭐⭐⭐⭐⭐ (5)</option>
                                            <option value={4}>⭐⭐⭐⭐ (4)</option>
                                            <option value={3}>⭐⭐⭐ (3)</option>
                                          </select>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const updated = section.items.filter((_, i) => i !== itemIdx);
                                            updateSection(section.id, { items: updated });
                                          }}
                                          className="text-xs text-red-500 hover:text-red-700"
                                        >
                                          Hapus
                                        </button>
                                      </div>
                                      <textarea
                                        rows={2}
                                        value={item.comment}
                                        onChange={(e) => {
                                          const updated = [...section.items];
                                          updated[itemIdx].comment = e.target.value;
                                          updateSection(section.id, { items: updated });
                                        }}
                                        placeholder="Isi ulasan pelanggan..."
                                        className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded"
                                      />
                                      <div className="grid grid-cols-2 gap-2">
                                        <input
                                          type="text"
                                          value={item.avatar || ''}
                                          onChange={(e) => {
                                            const updated = [...section.items];
                                            updated[itemIdx].avatar = e.target.value;
                                            updateSection(section.id, { items: updated });
                                          }}
                                          placeholder="URL Foto Avatar (opsional)"
                                          className="px-2 py-1 text-xs border border-slate-300 rounded"
                                        />
                                        <input
                                          type="text"
                                          value={item.reviewImage || ''}
                                          onChange={(e) => {
                                            const updated = [...section.items];
                                            updated[itemIdx].reviewImage = e.target.value;
                                            updateSection(section.id, { items: updated });
                                          }}
                                          placeholder="URL Foto Produk dari Pembeli (opsional)"
                                          className="px-2 py-1 text-xs border border-slate-300 rounded"
                                        />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* 3. PROOF & TRUST SECTION FORM */}
                          {section.type === 'proof_trust' && (
                            <div className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div>
                                  <label className="block text-xs font-semibold text-slate-700 mb-1">Skor Rating Agregat</label>
                                  <input
                                    type="number"
                                    step="0.1"
                                    min="1"
                                    max="5"
                                    value={section.aggregateRating}
                                    onChange={(e) => updateSection(section.id, { aggregateRating: Number(e.target.value) })}
                                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                                    placeholder="4.9"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-slate-700 mb-1">Total Pembeli / Ulasan</label>
                                  <input
                                    type="text"
                                    value={section.totalReviews}
                                    onChange={(e) => updateSection(section.id, { totalReviews: e.target.value })}
                                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                                    placeholder="1.450+ Pembeli"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-slate-700 mb-1">Judul Section Kepercayaan</label>
                                  <input
                                    type="text"
                                    value={section.title}
                                    onChange={(e) => updateSection(section.id, { title: e.target.value })}
                                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="block text-xs font-bold text-slate-700 mb-2">
                                  Trust Badges & Jaminan ({section.trustBadges.length})
                                </label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {section.trustBadges.map((badge, bIdx) => (
                                    <div key={bIdx} className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                                      <input
                                        type="text"
                                        value={badge.title}
                                        onChange={(e) => {
                                          const updated = [...section.trustBadges];
                                          updated[bIdx].title = e.target.value;
                                          updateSection(section.id, { trustBadges: updated });
                                        }}
                                        className="w-full px-2 py-1 text-xs font-bold border border-slate-300 rounded"
                                        placeholder="Judul Badge (cth: Garansi Uang Kembali)"
                                      />
                                      <textarea
                                        rows={2}
                                        value={badge.desc}
                                        onChange={(e) => {
                                          const updated = [...section.trustBadges];
                                          updated[bIdx].desc = e.target.value;
                                          updateSection(section.id, { trustBadges: updated });
                                        }}
                                        className="w-full px-2 py-1 text-xs border border-slate-300 rounded"
                                        placeholder="Keterangan jaminan..."
                                      />
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <label className="text-xs font-bold text-slate-700">Galeri Bukti Pengiriman / Resi / Chat ({section.proofImages.length})</label>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      updateSection(section.id, {
                                        proofImages: [
                                          ...section.proofImages,
                                          { url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600', caption: 'Bukti resi paket terkirim' },
                                        ],
                                      });
                                    }}
                                    className="px-2 py-1 text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-semibold rounded"
                                  >
                                    + Tambah Foto Bukti
                                  </button>
                                </div>
                                <div className="space-y-2">
                                  {section.proofImages.map((img, iIdx) => (
                                    <div key={iIdx} className="flex items-center gap-2">
                                      <input
                                        type="text"
                                        value={img.url}
                                        onChange={(e) => {
                                          const updated = [...section.proofImages];
                                          updated[iIdx].url = e.target.value;
                                          updateSection(section.id, { proofImages: updated });
                                        }}
                                        placeholder="URL Foto Bukti / Screenshot"
                                        className="flex-1 px-2 py-1 text-xs border border-slate-300 rounded"
                                      />
                                      <input
                                        type="text"
                                        value={img.caption || ''}
                                        onChange={(e) => {
                                          const updated = [...section.proofImages];
                                          updated[iIdx].caption = e.target.value;
                                          updateSection(section.id, { proofImages: updated });
                                        }}
                                        placeholder="Keterangan foto"
                                        className="w-48 px-2 py-1 text-xs border border-slate-300 rounded"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const updated = section.proofImages.filter((_, i) => i !== iIdx);
                                          updateSection(section.id, { proofImages: updated });
                                        }}
                                        className="text-xs text-red-500 hover:text-red-700 px-2"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* 4. FEATURES SECTION FORM */}
                          {section.type === 'features' && (
                            <div className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-xs font-semibold text-slate-700 mb-1">Judul Section Keunggulan</label>
                                  <input
                                    type="text"
                                    value={section.title}
                                    onChange={(e) => updateSection(section.id, { title: e.target.value })}
                                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-slate-700 mb-1">Subtitle</label>
                                  <input
                                    type="text"
                                    value={section.subtitle}
                                    onChange={(e) => updateSection(section.id, { subtitle: e.target.value })}
                                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                                  />
                                </div>
                              </div>

                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <label className="text-xs font-bold text-slate-700">Daftar Poin Keunggulan ({section.items.length})</label>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newItem: FeatureItem = {
                                        id: 'feat_' + Math.random().toString(36).substring(2, 7),
                                        title: 'Fitur Baru',
                                        description: 'Penjelasan manfaat fitur ini untuk pembeli...',
                                        icon: '⭐',
                                      };
                                      updateSection(section.id, { items: [...section.items, newItem] });
                                    }}
                                    className="px-2 py-1 text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-semibold rounded"
                                  >
                                    + Tambah Poin
                                  </button>
                                </div>
                                {section.items.map((feat, fIdx) => (
                                  <div key={feat.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-start gap-2">
                                    <input
                                      type="text"
                                      value={feat.icon || ''}
                                      onChange={(e) => {
                                        const updated = [...section.items];
                                        updated[fIdx].icon = e.target.value;
                                        updateSection(section.id, { items: updated });
                                      }}
                                      className="w-12 px-2 py-1 text-xs border border-slate-300 rounded text-center"
                                      placeholder="Icon"
                                    />
                                    <div className="flex-1 space-y-1">
                                      <input
                                        type="text"
                                        value={feat.title}
                                        onChange={(e) => {
                                          const updated = [...section.items];
                                          updated[fIdx].title = e.target.value;
                                          updateSection(section.id, { items: updated });
                                        }}
                                        className="w-full px-2 py-1 text-xs font-bold border border-slate-300 rounded"
                                        placeholder="Judul Keunggulan"
                                      />
                                      <textarea
                                        rows={2}
                                        value={feat.description}
                                        onChange={(e) => {
                                          const updated = [...section.items];
                                          updated[fIdx].description = e.target.value;
                                          updateSection(section.id, { items: updated });
                                        }}
                                        className="w-full px-2 py-1 text-xs border border-slate-300 rounded"
                                        placeholder="Deskripsi keunggulan..."
                                      />
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const updated = section.items.filter((_, i) => i !== fIdx);
                                        updateSection(section.id, { items: updated });
                                      }}
                                      className="text-xs text-red-500 hover:text-red-700 px-2 mt-1"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* 5. OFFER & SCARCITY SECTION FORM */}
                          {section.type === 'offer' && (
                            <div className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-xs font-semibold text-slate-700 mb-1">Badge Penawaran</label>
                                  <input
                                    type="text"
                                    value={section.badge}
                                    onChange={(e) => updateSection(section.id, { badge: e.target.value })}
                                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                                    placeholder="Contoh: FLASH SALE SPESIAL"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-slate-700 mb-1">Judul Penawaran</label>
                                  <input
                                    type="text"
                                    value={section.title}
                                    onChange={(e) => updateSection(section.id, { title: e.target.value })}
                                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-bold"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div>
                                  <label className="block text-xs font-semibold text-slate-700 mb-1">Harga Normal (Coret)</label>
                                  <input
                                    type="number"
                                    value={section.originalPrice}
                                    onChange={(e) => updateSection(section.id, { originalPrice: Number(e.target.value) })}
                                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg line-through text-slate-500 font-bold"
                                    placeholder="299000"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-slate-700 mb-1">Harga Diskon (Promo)</label>
                                  <input
                                    type="number"
                                    value={section.discountPrice}
                                    onChange={(e) => updateSection(section.id, { discountPrice: Number(e.target.value) })}
                                    className="w-full px-3 py-2 text-xs border border-emerald-300 rounded-lg text-emerald-600 font-extrabold text-sm"
                                    placeholder="149000"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-slate-700 mb-1">Teks Kelangkaan (Scarcity)</label>
                                  <input
                                    type="text"
                                    value={section.scarcityText || ''}
                                    onChange={(e) => updateSection(section.id, { scarcityText: e.target.value })}
                                    className="w-full px-3 py-2 text-xs border border-rose-300 rounded-lg text-rose-600 font-semibold"
                                    placeholder="⚡ Tersisa tinggal 12 paket lagi!"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-xs font-semibold text-slate-700 mb-1">Teks Tombol Beli</label>
                                  <input
                                    type="text"
                                    value={section.buttonText}
                                    onChange={(e) => updateSection(section.id, { buttonText: e.target.value })}
                                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-bold"
                                    placeholder="Pesan Sekarang (Bisa COD)"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-slate-700 mb-1">Link Target Beli</label>
                                  <input
                                    type="text"
                                    value={section.buttonLink}
                                    onChange={(e) => updateSection(section.id, { buttonLink: e.target.value })}
                                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                                    placeholder="/cart atau https://wa.me/..."
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Catatan Jaminan Garansi</label>
                                <input
                                  type="text"
                                  value={section.guaranteeNote || ''}
                                  onChange={(e) => updateSection(section.id, { guaranteeNote: e.target.value })}
                                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg text-slate-600"
                                  placeholder="🛡️ Garansi 100% uang kembali jika Anda tidak puas."
                                />
                              </div>
                            </div>
                          )}

                          {/* 6. FAQ SECTION FORM */}
                          {section.type === 'faq' && (
                            <div className="space-y-4">
                              <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Judul FAQ</label>
                                <input
                                  type="text"
                                  value={section.title}
                                  onChange={(e) => updateSection(section.id, { title: e.target.value })}
                                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-bold"
                                />
                              </div>

                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <label className="text-xs font-bold text-slate-700">Daftar Tanya Jawab ({section.items.length})</label>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newItem: FaqItem = {
                                        id: 'faq_' + Math.random().toString(36).substring(2, 7),
                                        question: 'Pertanyaan baru?',
                                        answer: 'Jawaban detail pertanyaan di sini...',
                                      };
                                      updateSection(section.id, { items: [...section.items, newItem] });
                                    }}
                                    className="px-2 py-1 text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-semibold rounded"
                                  >
                                    + Tambah Tanya Jawab
                                  </button>
                                </div>

                                {section.items.map((faq, qIdx) => (
                                  <div key={faq.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                                    <div className="flex items-center justify-between">
                                      <input
                                        type="text"
                                        value={faq.question}
                                        onChange={(e) => {
                                          const updated = [...section.items];
                                          updated[qIdx].question = e.target.value;
                                          updateSection(section.id, { items: updated });
                                        }}
                                        placeholder="Pertanyaan (cth: Apakah bisa COD?)"
                                        className="w-full px-2 py-1 text-xs font-bold border border-slate-300 rounded"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const updated = section.items.filter((_, i) => i !== qIdx);
                                          updateSection(section.id, { items: updated });
                                        }}
                                        className="text-xs text-red-500 hover:text-red-700 px-2"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                    <textarea
                                      rows={2}
                                      value={faq.answer}
                                      onChange={(e) => {
                                        const updated = [...section.items];
                                        updated[qIdx].answer = e.target.value;
                                        updateSection(section.id, { items: updated });
                                      }}
                                      placeholder="Jawaban lengkap..."
                                      className="w-full px-2 py-1 text-xs border border-slate-300 rounded"
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* 7. STICKY CTA SECTION FORM */}
                          {section.type === 'sticky_cta' && (
                            <div className="space-y-3">
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  id="sticky_toggle"
                                  checked={section.enabled}
                                  onChange={(e) => updateSection(section.id, { enabled: e.target.checked })}
                                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <label htmlFor="sticky_toggle" className="text-xs font-bold text-slate-800">
                                  Aktifkan Sticky CTA Mengambang di Bawah Layar Mobile
                                </label>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div>
                                  <label className="block text-xs font-semibold text-slate-700 mb-1">Teks Singkat Promosi</label>
                                  <input
                                    type="text"
                                    value={section.text}
                                    onChange={(e) => updateSection(section.id, { text: e.target.value })}
                                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-slate-700 mb-1">Label Tombol</label>
                                  <input
                                    type="text"
                                    value={section.buttonText}
                                    onChange={(e) => updateSection(section.id, { buttonText: e.target.value })}
                                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-bold"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-slate-700 mb-1">Link Target</label>
                                  <input
                                    type="text"
                                    value={section.buttonLink}
                                    onChange={(e) => updateSection(section.id, { buttonLink: e.target.value })}
                                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 2: SEO & URL SETTINGS */}
        {activeTab === 'seo' && (
          <div className="max-w-3xl space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Pengaturan URL Custom & SEO Mesin Pencari
              </h3>
              <p className="text-xs text-slate-500">
                Optimasi slug, meta tags, dan OpenGraph agar halaman landing page berperingkat tinggi di Google.
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Judul Halaman (Internal Admin) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-medium"
                  placeholder="Contoh: Promo Ramadhan Serum Glowing 50%"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Custom Slug / Path URL <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center">
                  <span className="px-3 py-2 bg-slate-200 text-slate-600 text-xs font-mono rounded-l-lg border border-r-0 border-slate-300">
                    /lp/
                  </span>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs font-mono border border-slate-300 rounded-r-lg font-bold text-indigo-700 focus:ring-1 focus:ring-indigo-500"
                    placeholder="promo-ramadhan-glowing"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Hanya huruf kecil, angka, dan tanda hubung (-). URL publik: <code>https://toko.anda/lp/{slug}</code>
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Hubungkan ke Produk Katalog (Opsional)</label>
                  <select
                    value={productId || ''}
                    onChange={(e) => setProductId(e.target.value || null)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="">-- Tidak Terhubung ke Produk Tertentu --</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (Rp {p.sellingPrice.toLocaleString('id-ID')})
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Memudahkan integrasi tombol Beli Langsung dan auto-sync inventaris.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Status Publikasi</label>
                  <div className="flex items-center gap-4 mt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="isPublished"
                        checked={isPublished}
                        onChange={() => setIsPublished(true)}
                        className="text-indigo-600"
                      />
                      <span className="text-xs font-semibold text-emerald-700">🟢 Terbit (Live di Sitemap)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="isPublished"
                        checked={!isPublished}
                        onChange={() => setIsPublished(false)}
                        className="text-indigo-600"
                      />
                      <span className="text-xs font-semibold text-slate-600">Draft (Sembunyikan)</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-4 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Meta Title SEO</label>
                  <input
                    type="text"
                    value={seoTitle}
                    onChange={(e) => setSeoTitle(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                    placeholder="Judul yang muncul di tab browser dan hasil pencarian Google"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Meta Description SEO</label>
                  <textarea
                    rows={2}
                    value={seoDescription}
                    onChange={(e) => setSeoDescription(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                    placeholder="Deskripsi ringkas yang memikat calon pembeli di hasil pencarian Google..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Kata Kunci SEO (Keywords)</label>
                    <input
                      type="text"
                      value={seoKeywords}
                      onChange={(e) => setSeoKeywords(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                      placeholder="promo diskon, serum glowing, cod"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">OpenGraph Banner Image URL</label>
                    <input
                      type="text"
                      value={ogImage}
                      onChange={(e) => setOgImage(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                      placeholder="https://..."
                    />
                  </div>
                </div>
              </div>

              {/* SERP Google Rich Snippet Preview */}
              <div className="border-t border-slate-200 pt-4">
                <p className="text-xs font-bold text-slate-600 mb-2">
                  Preview Hasil Pencarian Google (Dengan Rich Snippet Rating):
                </p>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm max-w-xl">
                  <div className="text-[11px] text-slate-500 truncate">
                    https://tokosaya.com › lp › {slug || 'promo-spesial'}
                  </div>
                  <div className="text-sm font-semibold text-blue-700 hover:underline cursor-pointer truncate mt-0.5">
                    {seoTitle || title || 'Promo Spesial Produk Terlaris'}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-600 my-1">
                    <span className="text-amber-500 font-bold">★★★★★</span>
                    <span className="font-semibold text-slate-700">4.9</span>
                    <span className="text-slate-400">· 1.450+ ulasan</span>
                    <span className="text-emerald-600 font-semibold">· Tersedia / In stock</span>
                  </div>
                  <div className="text-xs text-slate-600 line-clamp-2">
                    {seoDescription || 'Dapatkan penawaran eksklusif dan promo terbaik dengan jaminan original dan garansi kepuasan.'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: LIVE PREVIEW */}
        {activeTab === 'preview' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Live Preview Real-time</h3>
                <p className="text-xs text-slate-500">
                  Pratinjau visual landing page sebelum diterbitkan ke publik.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewDevice('desktop')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition ${
                    previewDevice === 'desktop'
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-slate-700 border-slate-200'
                  }`}
                >
                  🖥️ Desktop
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice('mobile')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition ${
                    previewDevice === 'mobile'
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-slate-700 border-slate-200'
                  }`}
                >
                  📱 Mobile (375px)
                </button>
              </div>
            </div>

            {/* Container */}
            <div className="bg-slate-100 p-4 rounded-2xl flex justify-center overflow-x-auto min-h-[600px]">
              <div
                className={`bg-white shadow-xl transition-all duration-300 rounded-xl overflow-hidden ${
                  previewDevice === 'mobile' ? 'w-[375px] border-4 border-slate-800' : 'w-full max-w-5xl'
                }`}
              >
                {/* Render Each Section in Preview */}
                <div className="divide-y divide-slate-100 pb-16 relative">
                  {sections.map((section) => {
                    if (section.type === 'hero') {
                      return (
                        <div key={section.id} className="py-12 px-6 bg-gradient-to-b from-indigo-50/60 to-white text-center">
                          {section.badge && (
                            <span className="inline-block px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider bg-indigo-100 text-indigo-700 rounded-full mb-3">
                              {section.badge}
                            </span>
                          )}
                          <h1 className="text-2xl md:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight max-w-2xl mx-auto">
                            {section.title}
                          </h1>
                          <p className="mt-3 text-xs md:text-sm text-slate-600 max-w-xl mx-auto leading-relaxed">
                            {section.subtitle}
                          </p>
                          {section.imageUrl && (
                            <div className="mt-6 max-w-md mx-auto rounded-xl overflow-hidden shadow-md">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={section.imageUrl} alt="Hero" className="w-full h-auto object-cover" />
                            </div>
                          )}
                          <div className="mt-6 flex flex-wrap justify-center gap-3">
                            <a
                              href={section.ctaLink || '#'}
                              className="px-6 py-2.5 bg-indigo-600 text-white font-bold text-xs md:text-sm rounded-xl shadow-lg hover:bg-indigo-700 transition"
                            >
                              {section.ctaText}
                            </a>
                            {section.secondaryCtaText && (
                              <a
                                href={section.secondaryCtaLink || '#'}
                                className="px-6 py-2.5 bg-slate-100 text-slate-800 font-bold text-xs md:text-sm rounded-xl hover:bg-slate-200 transition"
                              >
                                {section.secondaryCtaText}
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    }

                    if (section.type === 'proof_trust') {
                      return (
                        <div key={section.id} className="py-10 px-6 bg-slate-50">
                          <div className="text-center max-w-xl mx-auto mb-6">
                            <div className="flex items-center justify-center gap-2 mb-1">
                              <span className="text-amber-400 text-lg">⭐⭐⭐⭐⭐</span>
                              <span className="text-base font-extrabold text-slate-900">{section.aggregateRating} / 5.0</span>
                            </div>
                            <p className="text-xs text-slate-500 font-semibold">{section.totalReviews}</p>
                            <h2 className="text-lg md:text-xl font-bold text-slate-900 mt-2">{section.title}</h2>
                          </div>

                          {/* Stats */}
                          <div className="grid grid-cols-3 gap-2 max-w-md mx-auto mb-6 text-center">
                            {section.statHighlights?.map((stat, i) => (
                              <div key={i} className="p-2 bg-white rounded-lg border border-slate-200">
                                <div className="text-sm font-extrabold text-indigo-600">{stat.value}</div>
                                <div className="text-[10px] text-slate-500 font-medium">{stat.label}</div>
                              </div>
                            ))}
                          </div>

                          {/* Trust Badges */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto">
                            {section.trustBadges?.map((b, i) => (
                              <div key={i} className="p-3 bg-white rounded-xl border border-slate-200 flex items-start gap-3">
                                <span className="text-xl">🛡️</span>
                                <div>
                                  <h4 className="text-xs font-bold text-slate-900">{b.title}</h4>
                                  <p className="text-[11px] text-slate-500 mt-0.5">{b.desc}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }

                    if (section.type === 'features') {
                      return (
                        <div key={section.id} className="py-10 px-6">
                          <div className="text-center max-w-xl mx-auto mb-6">
                            <h2 className="text-lg md:text-2xl font-bold text-slate-900">{section.title}</h2>
                            <p className="text-xs text-slate-500 mt-1">{section.subtitle}</p>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
                            {section.items?.map((item) => (
                              <div key={item.id} className="p-4 bg-slate-50 rounded-xl text-center border border-slate-100">
                                <div className="text-2xl mb-2">{item.icon || '✨'}</div>
                                <h3 className="text-xs font-bold text-slate-900">{item.title}</h3>
                                <p className="text-[11px] text-slate-600 mt-1">{item.description}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }

                    if (section.type === 'offer') {
                      return (
                        <div key={section.id} className="py-10 px-6 bg-indigo-900 text-white text-center">
                          {section.badge && (
                            <span className="inline-block px-3 py-1 text-[10px] font-extrabold uppercase bg-amber-400 text-indigo-950 rounded-full mb-3">
                              {section.badge}
                            </span>
                          )}
                          <h2 className="text-xl md:text-3xl font-extrabold">{section.title}</h2>
                          <div className="my-4 flex items-center justify-center gap-3">
                            <span className="text-slate-400 line-through text-sm">
                              Rp {section.originalPrice?.toLocaleString('id-ID')}
                            </span>
                            <span className="text-2xl md:text-3xl font-black text-amber-300">
                              Rp {section.discountPrice?.toLocaleString('id-ID')}
                            </span>
                          </div>
                          {section.scarcityText && (
                            <div className="inline-block px-3 py-1 bg-rose-600/30 border border-rose-500/50 rounded-lg text-rose-200 text-xs font-semibold mb-4">
                              {section.scarcityText}
                            </div>
                          )}
                          <div className="max-w-xs mx-auto">
                            <a
                              href={section.buttonLink}
                              className="block w-full py-3 bg-amber-400 hover:bg-amber-300 text-indigo-950 font-black text-sm rounded-xl shadow-lg transition"
                            >
                              {section.buttonText}
                            </a>
                            {section.guaranteeNote && (
                              <p className="text-[11px] text-indigo-200 mt-2">{section.guaranteeNote}</p>
                            )}
                          </div>
                        </div>
                      );
                    }

                    if (section.type === 'testimonials') {
                      return (
                        <div key={section.id} className="py-10 px-6 bg-slate-50">
                          <div className="text-center max-w-xl mx-auto mb-6">
                            <h2 className="text-lg md:text-2xl font-bold text-slate-900">{section.title}</h2>
                            <p className="text-xs text-slate-500 mt-1">{section.subtitle}</p>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-w-4xl mx-auto">
                            {section.items?.map((item) => (
                              <div key={item.id} className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                                <div>
                                  <div className="text-amber-400 text-xs mb-1">
                                    {'★'.repeat(item.rating)}{'☆'.repeat(5 - item.rating)}
                                  </div>
                                  <p className="text-xs text-slate-700 italic leading-relaxed">
                                    &ldquo;{item.comment}&rdquo;
                                  </p>
                                </div>
                                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={item.avatar} alt={item.name} className="w-7 h-7 rounded-full object-cover" />
                                  <div className="text-left">
                                    <div className="text-[11px] font-bold text-slate-900 flex items-center gap-1">
                                      {item.name}
                                      {item.isVerified && <span className="text-emerald-500 text-[10px]">✓</span>}
                                    </div>
                                    <div className="text-[10px] text-slate-400">{item.location}</div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }

                    if (section.type === 'faq') {
                      return (
                        <div key={section.id} className="py-10 px-6 max-w-2xl mx-auto">
                          <h2 className="text-lg md:text-xl font-bold text-slate-900 text-center mb-6">{section.title}</h2>
                          <div className="space-y-3">
                            {section.items?.map((faq) => (
                              <div key={faq.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                                <h4 className="text-xs font-bold text-slate-900">❓ {faq.question}</h4>
                                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{faq.answer}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }

                    if (section.type === 'sticky_cta' && section.enabled) {
                      return (
                        <div key={section.id} className="p-3 bg-white border-t border-slate-200 shadow-lg flex items-center justify-between gap-3 sticky bottom-0 z-10">
                          <div className="text-xs font-bold text-slate-800 truncate">
                            {section.text}
                          </div>
                          <a
                            href={section.buttonLink}
                            className="px-4 py-2 bg-indigo-600 text-white font-bold text-xs rounded-lg hover:bg-indigo-700 whitespace-nowrap shadow"
                          >
                            {section.buttonText}
                          </a>
                        </div>
                      );
                    }

                    return null;
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

