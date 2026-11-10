'use client';

import { useState, useEffect } from 'react';
import {
  LandingPageData,
  LandingPageSection,
  SectionType,
  createDefaultSection,
  createPhysicalLandingPageTemplate,
  createEventLandingPageTemplate,
  createDigitalProductLandingPageTemplate,
  EventDetailsSectionData,
  SpeakersSectionData,
  EventScheduleSectionData,
  DigitalCurriculumSectionData,
  PricingTiersSectionData,
} from '@/lib/landingPageTypes';
import LandingPageView from './LandingPageView';

interface ProductOption {
  id: string;
  name: string;
  sellingPrice: number;
  discountPrice?: number | null;
  productType?: string;
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
      : createPhysicalLandingPageTemplate()
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
    setSections(sections.filter((s) => s.id !== id));
  };

  const updateSection = (id: string, updatedFields: Partial<LandingPageSection>) => {
    setSections(
      sections.map((s) => (s.id === id ? ({ ...s, ...updatedFields } as LandingPageSection) : s))
    );
  };

  const applyTemplate = (templateType: 'physical' | 'event' | 'digital') => {
    if (sections.length > 0) {
      const confirmChange = window.confirm(
        'Menerapkan template baru akan menggantikan susunan section saat ini. Lanjutkan?'
      );
      if (!confirmChange) return;
    }

    if (templateType === 'event') {
      setTitle('Pendaftaran Seminar & Webinar Eksklusif 2026');
      setSlug('webinar-eksklusif-2026');
      setSections(createEventLandingPageTemplate());
    } else if (templateType === 'digital') {
      setTitle('Mastering Panduan & Template Digital Siap Pakai');
      setSlug('panduan-digital-lengkap');
      setSections(createDigitalProductLandingPageTemplate());
    } else {
      setTitle('Promo Spesial Produk Terlaris');
      setSlug('promo-spesial');
      setSections(createPhysicalLandingPageTemplate());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({
      id: initialData?.id,
      title,
      slug,
      isPublished,
      productId,
      seoTitle: seoTitle || title,
      seoDescription: seoDescription || '',
      seoKeywords: seoKeywords || '',
      ogImage: ogImage || '',
      sections,
    });
  };

  const getSectionLabel = (type: SectionType) => {
    switch (type) {
      case 'hero':
        return '⚡ Hero Banner & CTA';
      case 'proof_trust':
        return '🛡️ Bukti Sosial & Trust Badges';
      case 'features':
        return '✨ Fitur & Keunggulan';
      case 'offer':
        return '🏷️ Penawaran Flash Sale & Scarcity';
      case 'testimonials':
        return '⭐ Testimoni & Rating Bintang';
      case 'faq':
        return '❓ FAQ Tanya Jawab';
      case 'sticky_cta':
        return '📱 Sticky CTA Mobile Bar';
      case 'event_details':
        return '📅 Detail Event & Seminar';
      case 'speakers':
        return '🎤 Daftar Pembicara / Speakers';
      case 'event_schedule':
        return '⏰ Agenda & Rundown Acara';
      case 'digital_curriculum':
        return '📚 Silabus Kurikulum & Modul';
      case 'pricing_tiers':
        return '🎟️ Pilihan Tiket & Paket Lisensi';
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Top Header Bar */}
      <div className="px-6 py-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/70">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-800">
              {initialData ? 'Edit Landing Page' : 'Buat Landing Page Baru'}
            </h2>
            <span className="text-xs bg-indigo-100 text-indigo-700 font-semibold px-2 py-0.5 rounded-full">
              CMS Builder
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Publikasikan halaman penawaran berkonversi tinggi untuk Produk Fisik, Produk Digital, atau Event/Seminar.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition shadow-sm disabled:opacity-50"
          >
            {saving ? 'Menyimpan...' : 'Simpan Landing Page'}
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="px-6 border-b border-slate-200 flex items-center justify-between bg-white overflow-x-auto">
        <div className="flex items-center gap-6">
          <button
            type="button"
            onClick={() => setActiveTab('sections')}
            className={`py-3 text-xs sm:text-sm font-bold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'sections'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>🧱 Modular Sections</span>
            <span className="text-xs px-1.5 py-0.2 bg-slate-100 rounded-full font-mono text-slate-600">
              {sections.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('seo')}
            className={`py-3 text-xs sm:text-sm font-bold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'seo'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>⚙️ SEO & Pengaturan Umum</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`py-3 text-xs sm:text-sm font-bold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'preview'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>👁️ Pratinjau Tampilan Live</span>
          </button>
        </div>

        {/* Quick Template Picker */}
        <div className="hidden lg:flex items-center gap-2 py-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Template Cepat:
          </span>
          <button
            type="button"
            onClick={() => applyTemplate('physical')}
            className="px-2.5 py-1 text-[11px] font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg transition"
          >
            🛍️ Produk Fisik
          </button>
          <button
            type="button"
            onClick={() => applyTemplate('event')}
            className="px-2.5 py-1 text-[11px] font-bold bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-lg transition"
          >
            🎟️ Seminar / Webinar
          </button>
          <button
            type="button"
            onClick={() => applyTemplate('digital')}
            className="px-2.5 py-1 text-[11px] font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition"
          >
            💻 E-Book & Course
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {/* TAB 1: MODULAR SECTIONS */}
        {activeTab === 'sections' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  Susunan Section Landing Page
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tambahkan, urutkan, dan atur konten tiap blok untuk memaksimalkan konversi penjualan produk fisik, digital, atau tiket seminar.
                </p>
              </div>

              {/* Add Section Dropdown */}
              <div className="flex items-center gap-2">
                <select
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value) {
                      addSection(e.target.value as SectionType);
                      e.target.value = '';
                    }
                  }}
                  className="px-3 py-1.5 text-xs font-bold text-indigo-700 bg-white border border-indigo-200 rounded-lg hover:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
                >
                  <option value="" disabled>+ Tambah Section Baru</option>
                  <optgroup label="Umum & Penjualan">
                    <option value="hero">⚡ Hero Banner & CTA</option>
                    <option value="proof_trust">🛡️ Bukti Sosial & Trust Badges</option>
                    <option value="features">✨ Fitur & Keunggulan Produk</option>
                    <option value="offer">🏷️ Penawaran Flash Sale & Scarcity</option>
                    <option value="testimonials">⭐ Ulasan & Testimoni Pelanggan</option>
                    <option value="faq">❓ FAQ Tanya Jawab</option>
                    <option value="sticky_cta">📱 Sticky CTA Mobile Bar</option>
                  </optgroup>
                  <optgroup label="Khusus Event & Seminar">
                    <option value="event_details">📅 Detail Event & Seminar (Waktu & Venue)</option>
                    <option value="speakers">🎤 Daftar Pembicara / Speakers</option>
                    <option value="event_schedule">⏰ Agenda & Rundown Acara</option>
                  </optgroup>
                  <optgroup label="Khusus Produk Digital & Course">
                    <option value="digital_curriculum">📚 Silabus Kurikulum & Modul</option>
                    <option value="pricing_tiers">🎟️ Pilihan Tiket & Paket Lisensi</option>
                  </optgroup>
                </select>
              </div>
            </div>

            {/* List of Sections */}
            <div className="space-y-4">
              {sections.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
                  <p className="text-sm text-slate-500 font-medium">Belum ada section di landing page ini.</p>
                  <p className="text-xs text-slate-400 mt-1">Gunakan tombol &quot;+ Tambah Section Baru&quot; di atas atau pilih salah satu template cepat.</p>
                </div>
              ) : (
                sections.map((section, idx) => {
                  const isExpanded = expandedSectionId === section.id;

                  return (
                    <div
                      key={section.id}
                      className={`border rounded-xl transition overflow-hidden ${
                        isExpanded
                          ? 'border-indigo-400 bg-white shadow-sm ring-1 ring-indigo-200'
                          : 'border-slate-200 bg-slate-50/50'
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

                        {/* Order & Delete actions */}
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => moveSection(idx, 'up')}
                            className="w-7 h-7 rounded border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-30 text-xs flex items-center justify-center font-bold"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            disabled={idx === sections.length - 1}
                            onClick={() => moveSection(idx, 'down')}
                            className="w-7 h-7 rounded border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-30 text-xs flex items-center justify-center font-bold"
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteSection(section.id)}
                            className="w-7 h-7 rounded border border-rose-200 text-rose-500 hover:bg-rose-50 text-xs flex items-center justify-center font-bold ml-1"
                          >
                            ✕
                          </button>
                        </div>
                      </div>

                      {/* Section Card Body (When Expanded) */}
                      {isExpanded && (
                        <div className="p-5 space-y-4 bg-white border-t border-slate-50">
                          {/* 1. HERO SECTION FORM */}
                          {section.type === 'hero' && (
                            <div className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-xs font-semibold text-slate-700 mb-1">Badge Atas</label>
                                  <input
                                    type="text"
                                    value={section.badge}
                                    onChange={(e) => updateSection(section.id, { badge: e.target.value })}
                                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-slate-700 mb-1">URL Gambar Hero</label>
                                  <input
                                    type="text"
                                    value={section.imageUrl || ''}
                                    onChange={(e) => updateSection(section.id, { imageUrl: e.target.value })}
                                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Judul Utama (Headline)</label>
                                <input
                                  type="text"
                                  value={section.title}
                                  onChange={(e) => updateSection(section.id, { title: e.target.value })}
                                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-bold"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Subjudul (Deskripsi Penjelas)</label>
                                <textarea
                                  rows={2}
                                  value={section.subtitle}
                                  onChange={(e) => updateSection(section.id, { subtitle: e.target.value })}
                                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                                />
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                                <div>
                                  <label className="block text-xs font-semibold text-slate-700 mb-1">Label Tombol Utama</label>
                                  <input
                                    type="text"
                                    value={section.ctaText}
                                    onChange={(e) => updateSection(section.id, { ctaText: e.target.value })}
                                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-bold"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tautan Tombol Utama</label>
                                  <input
                                    type="text"
                                    value={section.ctaLink}
                                    onChange={(e) => updateSection(section.id, { ctaLink: e.target.value })}
                                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          {/* 2. TESTIMONIALS SECTION FORM */}
                          {section.type === 'testimonials' && (
                            <div className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-xs font-semibold text-slate-700 mb-1">Judul Section</label>
                                  <input
                                    type="text"
                                    value={section.title}
                                    onChange={(e) => updateSection(section.id, { title: e.target.value })}
                                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-bold"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-slate-700 mb-1">Subjudul</label>
                                  <input
                                    type="text"
                                    value={section.subtitle}
                                    onChange={(e) => updateSection(section.id, { subtitle: e.target.value })}
                                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                                  />
                                </div>
                              </div>

                              {/* List of Testimonials */}
                              <div className="space-y-3 pt-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold text-slate-700">Daftar Testimoni Pembeli ({section.items.length})</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newItem = {
                                        id: 'testi_' + Date.now(),
                                        name: 'Pelanggan Baru',
                                        location: 'Jakarta',
                                        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
                                        rating: 5,
                                        isVerified: true,
                                        comment: 'Pengalaman yang sangat menyenangkan!',
                                        date: 'Baru saja',
                                      };
                                      updateSection(section.id, { items: [...section.items, newItem] });
                                    }}
                                    className="px-2 py-1 text-xs bg-indigo-50 text-indigo-700 font-semibold rounded hover:bg-indigo-100"
                                  >
                                    + Tambah Testimoni
                                  </button>
                                </div>

                                {section.items.map((item, tIdx) => (
                                  <div key={item.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                                    <div className="flex items-center justify-between">
                                      <span className="font-bold text-slate-800">Testimoni #{tIdx + 1}</span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const filtered = section.items.filter((_, i) => i !== tIdx);
                                          updateSection(section.id, { items: filtered });
                                        }}
                                        className="text-rose-500 hover:text-rose-700"
                                      >
                                        Hapus
                                      </button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                      <input
                                        type="text"
                                        value={item.name}
                                        onChange={(e) => {
                                          const updated = [...section.items];
                                          updated[tIdx].name = e.target.value;
                                          updateSection(section.id, { items: updated });
                                        }}
                                        placeholder="Nama Pelanggan"
                                        className="px-2 py-1 text-xs border border-slate-300 rounded"
                                      />
                                      <input
                                        type="text"
                                        value={item.location || ''}
                                        onChange={(e) => {
                                          const updated = [...section.items];
                                          updated[tIdx].location = e.target.value;
                                          updateSection(section.id, { items: updated });
                                        }}
                                        placeholder="Kota / Daerah"
                                        className="px-2 py-1 text-xs border border-slate-300 rounded"
                                      />
                                    </div>
                                    <textarea
                                      rows={2}
                                      value={item.comment}
                                      onChange={(e) => {
                                        const updated = [...section.items];
                                        updated[tIdx].comment = e.target.value;
                                        updateSection(section.id, { items: updated });
                                      }}
                                      placeholder="Isi ulasan pelanggan..."
                                      className="w-full px-2 py-1 text-xs border border-slate-300 rounded"
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* 3. PROOF TRUST SECTION FORM */}
                          {section.type === 'proof_trust' && (
                            <div className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-xs font-semibold text-slate-700 mb-1">Judul Section</label>
                                  <input
                                    type="text"
                                    value={section.title}
                                    onChange={(e) => updateSection(section.id, { title: e.target.value })}
                                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-bold"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-slate-700 mb-1">Rating Bintang (1 - 5.0)</label>
                                  <input
                                    type="number"
                                    step="0.1"
                                    value={section.aggregateRating}
                                    onChange={(e) => updateSection(section.id, { aggregateRating: parseFloat(e.target.value) || 5.0 })}
                                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          {/* 4. FEATURES SECTION FORM */}
                          {section.type === 'features' && (
                            <div className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-xs font-semibold text-slate-700 mb-1">Judul Section</label>
                                  <input
                                    type="text"
                                    value={section.title}
                                    onChange={(e) => updateSection(section.id, { title: e.target.value })}
                                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-bold"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-slate-700 mb-1">Subjudul</label>
                                  <input
                                    type="text"
                                    value={section.subtitle}
                                    onChange={(e) => updateSection(section.id, { subtitle: e.target.value })}
                                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                                  />
                                </div>
                              </div>

                              <div className="space-y-3 pt-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold text-slate-700">Daftar Keunggulan ({section.items.length})</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newF = {
                                        id: 'feat_' + Date.now(),
                                        title: 'Keunggulan Baru',
                                        description: 'Deskripsi keunggulan produk...',
                                        icon: '✨',
                                      };
                                      updateSection(section.id, { items: [...section.items, newF] });
                                    }}
                                    className="px-2 py-1 text-xs bg-indigo-50 text-indigo-700 font-semibold rounded hover:bg-indigo-100"
                                  >
                                    + Tambah Keunggulan
                                  </button>
                                </div>

                                {section.items.map((feat, fIdx) => (
                                  <div key={feat.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                                    <div className="flex items-center justify-between">
                                      <span className="font-bold text-slate-800">Keunggulan #{fIdx + 1}</span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const filtered = section.items.filter((_, i) => i !== fIdx);
                                          updateSection(section.id, { items: filtered });
                                        }}
                                        className="text-rose-500 hover:text-rose-700"
                                      >
                                        Hapus
                                      </button>
                                    </div>
                                    <div className="grid grid-cols-4 gap-2">
                                      <input
                                        type="text"
                                        value={feat.icon || ''}
                                        onChange={(e) => {
                                          const updated = [...section.items];
                                          updated[fIdx].icon = e.target.value;
                                          updateSection(section.id, { items: updated });
                                        }}
                                        placeholder="Icon (Emoji)"
                                        className="px-2 py-1 text-xs border border-slate-300 rounded"
                                      />
                                      <input
                                        type="text"
                                        value={feat.title}
                                        onChange={(e) => {
                                          const updated = [...section.items];
                                          updated[fIdx].title = e.target.value;
                                          updateSection(section.id, { items: updated });
                                        }}
                                        placeholder="Judul Keunggulan"
                                        className="col-span-3 px-2 py-1 text-xs border border-slate-300 rounded font-bold"
                                      />
                                    </div>
                                    <textarea
                                      rows={2}
                                      value={feat.description}
                                      onChange={(e) => {
                                        const updated = [...section.items];
                                        updated[fIdx].description = e.target.value;
                                        updateSection(section.id, { items: updated });
                                      }}
                                      placeholder="Deskripsi keunggulan..."
                                      className="w-full px-2 py-1 text-xs border border-slate-300 rounded"
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* 5. OFFER SECTION FORM */}
                          {section.type === 'offer' && (
                            <div className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-xs font-semibold text-slate-700 mb-1">Badge Promo</label>
                                  <input
                                    type="text"
                                    value={section.badge}
                                    onChange={(e) => updateSection(section.id, { badge: e.target.value })}
                                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-slate-700 mb-1">Pesan Kuota / Scarcity</label>
                                  <input
                                    type="text"
                                    value={section.scarcityText || ''}
                                    onChange={(e) => updateSection(section.id, { scarcityText: e.target.value })}
                                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-xs font-semibold text-slate-700 mb-1">Harga Asli (Coret)</label>
                                  <input
                                    type="number"
                                    value={section.originalPrice}
                                    onChange={(e) => updateSection(section.id, { originalPrice: parseFloat(e.target.value) || 0 })}
                                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-slate-700 mb-1">Harga Promo (Diskon)</label>
                                  <input
                                    type="number"
                                    value={section.discountPrice}
                                    onChange={(e) => updateSection(section.id, { discountPrice: parseFloat(e.target.value) || 0 })}
                                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-bold text-indigo-600"
                                  />
                                </div>
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
                                {section.items.map((faq, qIdx) => (
                                  <div key={faq.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                                    <input
                                      type="text"
                                      value={faq.question}
                                      onChange={(e) => {
                                        const updated = [...section.items];
                                        updated[qIdx].question = e.target.value;
                                        updateSection(section.id, { items: updated });
                                      }}
                                      placeholder="Pertanyaan..."
                                      className="w-full px-2 py-1 text-xs border border-slate-300 rounded font-bold"
                                    />
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

                          {/* 8. EVENT DETAILS SECTION FORM (NEW) */}
                          {section.type === 'event_details' && (
                            <div className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-xs font-semibold text-slate-700 mb-1">Judul Section Event</label>
                                  <input
                                    type="text"
                                    value={section.title}
                                    onChange={(e) => updateSection(section.id, { title: e.target.value })}
                                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-bold"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-slate-700 mb-1">Badge Status Event</label>
                                  <input
                                    type="text"
                                    value={section.platformBadge || ''}
                                    onChange={(e) => updateSection(section.id, { platformBadge: e.target.value })}
                                    placeholder="Contoh: 🎟️ Kuota Terbatas 100 Peserta"
                                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal Mulai Acara</label>
                                  <input
                                    type="datetime-local"
                                    value={section.eventStartDate ? section.eventStartDate.substring(0, 16) : ''}
                                    onChange={(e) => updateSection(section.id, { eventStartDate: e.target.value ? new Date(e.target.value).toISOString() : '' })}
                                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal Selesai Acara</label>
                                  <input
                                    type="datetime-local"
                                    value={section.eventEndDate ? section.eventEndDate.substring(0, 16) : ''}
                                    onChange={(e) => updateSection(section.id, { eventEndDate: e.target.value ? new Date(e.target.value).toISOString() : '' })}
                                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-slate-700 mb-1">Zona Waktu</label>
                                  <select
                                    value={section.timezone || 'WIB'}
                                    onChange={(e) => updateSection(section.id, { timezone: e.target.value })}
                                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                                  >
                                    <option value="WIB">WIB (Waktu Indonesia Barat)</option>
                                    <option value="WITA">WITA (Waktu Indonesia Tengah)</option>
                                    <option value="WIT">WIT (Waktu Indonesia Timur)</option>
                                  </select>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tipe Lokasi</label>
                                  <select
                                    value={section.locationType || 'ONLINE'}
                                    onChange={(e) => updateSection(section.id, { locationType: e.target.value as any })}
                                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                                  >
                                    <option value="ONLINE">💻 Online (Zoom / Webinar)</option>
                                    <option value="OFFLINE">📍 Offline (Tatap Muka di Venue)</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Platform / Venue</label>
                                  <input
                                    type="text"
                                    value={section.venueName}
                                    onChange={(e) => updateSection(section.id, { venueName: e.target.value })}
                                    placeholder="Misal: Zoom Cloud Meetings"
                                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-semibold"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-slate-700 mb-1">Sisa Kuota Tiket</label>
                                  <input
                                    type="number"
                                    value={section.quotaRemaining || ''}
                                    onChange={(e) => updateSection(section.id, { quotaRemaining: parseInt(e.target.value) || 0 })}
                                    placeholder="Misal: 25"
                                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-bold text-rose-600"
                                  />
                                </div>
                              </div>

                              {/* Benefits checklist */}
                              <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                  Fasilitas & Keuntungan Peserta (Satu per baris)
                                </label>
                                <textarea
                                  rows={4}
                                  value={section.benefits?.join('\n') || ''}
                                  onChange={(e) => updateSection(section.id, { benefits: e.target.value.split('\n').filter((b) => b.trim()) })}
                                  placeholder="E-Sertifikat Resmi&#10;Rekaman Video Full HD&#10;Slide Presentasi PDF&#10;Grup Diskusi WhatsApp"
                                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono"
                                />
                              </div>
                            </div>
                          )}

                          {/* 9. SPEAKERS SECTION FORM (NEW) */}
                          {section.type === 'speakers' && (
                            <div className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-xs font-semibold text-slate-700 mb-1">Judul Section Pembicara</label>
                                  <input
                                    type="text"
                                    value={section.title}
                                    onChange={(e) => updateSection(section.id, { title: e.target.value })}
                                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-bold"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-slate-700 mb-1">Subjudul</label>
                                  <input
                                    type="text"
                                    value={section.subtitle}
                                    onChange={(e) => updateSection(section.id, { subtitle: e.target.value })}
                                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                                  />
                                </div>
                              </div>

                              <div className="space-y-3 pt-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold text-slate-700">Daftar Pembicara ({section.speakers.length})</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newSpk = {
                                        id: 'spk_' + Date.now(),
                                        name: 'Nama Pembicara',
                                        role: 'Jabatan / Keahlian',
                                        company: 'Nama Perusahaan',
                                        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
                                        bio: 'Profil singkat pembicara...',
                                      };
                                      updateSection(section.id, { speakers: [...section.speakers, newSpk] });
                                    }}
                                    className="px-2.5 py-1 text-xs bg-indigo-50 text-indigo-700 font-semibold rounded hover:bg-indigo-100"
                                  >
                                    + Tambah Pembicara
                                  </button>
                                </div>

                                {section.speakers.map((spk, sIdx) => (
                                  <div key={spk.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                                    <div className="flex items-center justify-between">
                                      <span className="font-bold text-slate-800">Pembicara #{sIdx + 1}</span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const filtered = section.speakers.filter((_, i) => i !== sIdx);
                                          updateSection(section.id, { speakers: filtered });
                                        }}
                                        className="text-rose-500 hover:text-rose-700"
                                      >
                                        Hapus
                                      </button>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                      <input
                                        type="text"
                                        value={spk.name}
                                        onChange={(e) => {
                                          const updated = [...section.speakers];
                                          updated[sIdx].name = e.target.value;
                                          updateSection(section.id, { speakers: updated });
                                        }}
                                        placeholder="Nama Lengkap & Gelar"
                                        className="px-2 py-1 text-xs border border-slate-300 rounded font-bold"
                                      />
                                      <input
                                        type="text"
                                        value={spk.role}
                                        onChange={(e) => {
                                          const updated = [...section.speakers];
                                          updated[sIdx].role = e.target.value;
                                          updateSection(section.id, { speakers: updated });
                                        }}
                                        placeholder="Jabatan / Profesi"
                                        className="px-2 py-1 text-xs border border-slate-300 rounded"
                                      />
                                      <input
                                        type="text"
                                        value={spk.company || ''}
                                        onChange={(e) => {
                                          const updated = [...section.speakers];
                                          updated[sIdx].company = e.target.value;
                                          updateSection(section.id, { speakers: updated });
                                        }}
                                        placeholder="Perusahaan / Instansi"
                                        className="px-2 py-1 text-xs border border-slate-300 rounded"
                                      />
                                    </div>
                                    <input
                                      type="text"
                                      value={spk.avatar}
                                      onChange={(e) => {
                                        const updated = [...section.speakers];
                                        updated[sIdx].avatar = e.target.value;
                                        updateSection(section.id, { speakers: updated });
                                      }}
                                      placeholder="URL Foto Pembicara"
                                      className="w-full px-2 py-1 text-xs border border-slate-300 rounded"
                                    />
                                    <textarea
                                      rows={2}
                                      value={spk.bio || ''}
                                      onChange={(e) => {
                                        const updated = [...section.speakers];
                                        updated[sIdx].bio = e.target.value;
                                        updateSection(section.id, { speakers: updated });
                                      }}
                                      placeholder="Bio singkat pembicara..."
                                      className="w-full px-2 py-1 text-xs border border-slate-300 rounded"
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* 10. EVENT SCHEDULE SECTION FORM (NEW) */}
                          {section.type === 'event_schedule' && (
                            <div className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-xs font-semibold text-slate-700 mb-1">Judul Rundown Acara</label>
                                  <input
                                    type="text"
                                    value={section.title}
                                    onChange={(e) => updateSection(section.id, { title: e.target.value })}
                                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-bold"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-slate-700 mb-1">Label Waktu / Tanggal</label>
                                  <input
                                    type="text"
                                    value={section.dateLabel || ''}
                                    onChange={(e) => updateSection(section.id, { dateLabel: e.target.value })}
                                    placeholder="Contoh: Sesi Intensif (09:00 - 13:00 WIB)"
                                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                                  />
                                </div>
                              </div>

                              <div className="space-y-3 pt-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold text-slate-700">Daftar Sesi Acara ({section.sessions.length})</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newSess = {
                                        id: 'sch_' + Date.now(),
                                        time: '09:00 - 10:00',
                                        title: 'Judul Sesi Baru',
                                        speaker: 'Nama Pembicara',
                                        description: 'Deskripsi pokok bahasan materi...',
                                      };
                                      updateSection(section.id, { sessions: [...section.sessions, newSess] });
                                    }}
                                    className="px-2.5 py-1 text-xs bg-indigo-50 text-indigo-700 font-semibold rounded hover:bg-indigo-100"
                                  >
                                    + Tambah Sesi
                                  </button>
                                </div>

                                {section.sessions.map((sess, sIdx) => (
                                  <div key={sess.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                                    <div className="flex items-center justify-between">
                                      <span className="font-bold text-slate-800">Sesi #{sIdx + 1}</span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const filtered = section.sessions.filter((_, i) => i !== sIdx);
                                          updateSection(section.id, { sessions: filtered });
                                        }}
                                        className="text-rose-500 hover:text-rose-700"
                                      >
                                        Hapus
                                      </button>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                      <input
                                        type="text"
                                        value={sess.time}
                                        onChange={(e) => {
                                          const updated = [...section.sessions];
                                          updated[sIdx].time = e.target.value;
                                          updateSection(section.id, { sessions: updated });
                                        }}
                                        placeholder="Waktu (e.g. 09:00 - 10:00)"
                                        className="px-2 py-1 text-xs border border-slate-300 rounded font-mono font-bold"
                                      />
                                      <input
                                        type="text"
                                        value={sess.title}
                                        onChange={(e) => {
                                          const updated = [...section.sessions];
                                          updated[sIdx].title = e.target.value;
                                          updateSection(section.id, { sessions: updated });
                                        }}
                                        placeholder="Judul Materi Sesi"
                                        className="sm:col-span-2 px-2 py-1 text-xs border border-slate-300 rounded font-bold"
                                      />
                                    </div>
                                    <input
                                      type="text"
                                      value={sess.speaker || ''}
                                      onChange={(e) => {
                                        const updated = [...section.sessions];
                                        updated[sIdx].speaker = e.target.value;
                                        updateSection(section.id, { sessions: updated });
                                      }}
                                      placeholder="Nama Pembicara untuk Sesi Ini"
                                      className="w-full px-2 py-1 text-xs border border-slate-300 rounded text-indigo-700"
                                    />
                                    <textarea
                                      rows={2}
                                      value={sess.description || ''}
                                      onChange={(e) => {
                                        const updated = [...section.sessions];
                                        updated[sIdx].description = e.target.value;
                                        updateSection(section.id, { sessions: updated });
                                      }}
                                      placeholder="Poin-poin yang akan dibahas..."
                                      className="w-full px-2 py-1 text-xs border border-slate-300 rounded"
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* 11. DIGITAL CURRICULUM SECTION FORM (NEW) */}
                          {section.type === 'digital_curriculum' && (
                            <div className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-xs font-semibold text-slate-700 mb-1">Judul Silabus</label>
                                  <input
                                    type="text"
                                    value={section.title}
                                    onChange={(e) => updateSection(section.id, { title: e.target.value })}
                                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-bold"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-slate-700 mb-1">Badge Info Download</label>
                                  <input
                                    type="text"
                                    value={section.downloadInfoBadge || ''}
                                    onChange={(e) => updateSection(section.id, { downloadInfoBadge: e.target.value })}
                                    placeholder="Contoh: ⚡ Instant Download File & Akses Selamanya"
                                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                                  />
                                </div>
                              </div>

                              <div className="space-y-3 pt-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold text-slate-700">Daftar Modul / Bab ({section.modules.length})</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newMod = {
                                        id: 'mod_' + Date.now(),
                                        title: 'Modul Baru',
                                        durationOrPages: '45 Menit Video',
                                        isFreePreview: false,
                                        description: 'Deskripsi pokok materi...',
                                        topics: ['Poin A', 'Poin B'],
                                      };
                                      updateSection(section.id, { modules: [...section.modules, newMod] });
                                    }}
                                    className="px-2.5 py-1 text-xs bg-indigo-50 text-indigo-700 font-semibold rounded hover:bg-indigo-100"
                                  >
                                    + Tambah Modul
                                  </button>
                                </div>

                                {section.modules.map((m, mIdx) => (
                                  <div key={m.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                                    <div className="flex items-center justify-between">
                                      <span className="font-bold text-slate-800">Modul #{mIdx + 1}</span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const filtered = section.modules.filter((_, i) => i !== mIdx);
                                          updateSection(section.id, { modules: filtered });
                                        }}
                                        className="text-rose-500 hover:text-rose-700"
                                      >
                                        Hapus
                                      </button>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                      <input
                                        type="text"
                                        value={m.title}
                                        onChange={(e) => {
                                          const updated = [...section.modules];
                                          updated[mIdx].title = e.target.value;
                                          updateSection(section.id, { modules: updated });
                                        }}
                                        placeholder="Judul Modul"
                                        className="sm:col-span-2 px-2 py-1 text-xs border border-slate-300 rounded font-bold"
                                      />
                                      <input
                                        type="text"
                                        value={m.durationOrPages || ''}
                                        onChange={(e) => {
                                          const updated = [...section.modules];
                                          updated[mIdx].durationOrPages = e.target.value;
                                          updateSection(section.id, { modules: updated });
                                        }}
                                        placeholder="Durasi / Jml Halaman"
                                        className="px-2 py-1 text-xs border border-slate-300 rounded"
                                      />
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="checkbox"
                                        id={`preview_${m.id}`}
                                        checked={m.isFreePreview || false}
                                        onChange={(e) => {
                                          const updated = [...section.modules];
                                          updated[mIdx].isFreePreview = e.target.checked;
                                          updateSection(section.id, { modules: updated });
                                        }}
                                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                      />
                                      <label htmlFor={`preview_${m.id}`} className="text-xs text-slate-700">
                                        Tandai sebagai &quot;Gratis Preview&quot;
                                      </label>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* 12. PRICING TIERS SECTION FORM (NEW) */}
                          {section.type === 'pricing_tiers' && (
                            <div className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-xs font-semibold text-slate-700 mb-1">Judul Paket Harga</label>
                                  <input
                                    type="text"
                                    value={section.title}
                                    onChange={(e) => updateSection(section.id, { title: e.target.value })}
                                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-bold"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-slate-700 mb-1">Catatan Garansi</label>
                                  <input
                                    type="text"
                                    value={section.guaranteeText || ''}
                                    onChange={(e) => updateSection(section.id, { guaranteeText: e.target.value })}
                                    placeholder="Contoh: 🛡️ Garansi 100% Kepuasan Peserta"
                                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                                  />
                                </div>
                              </div>

                              <div className="space-y-3 pt-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold text-slate-700">Daftar Paket Tiket / Lisensi ({section.tiers.length})</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newTier = {
                                        id: 'tier_' + Date.now(),
                                        name: 'Nama Paket',
                                        badge: '',
                                        originalPrice: 199000,
                                        price: 99000,
                                        description: 'Deskripsi paket tiket...',
                                        features: ['Akses Live Webinar', 'E-Sertifikat'],
                                        buttonText: 'Beli Paket Ini',
                                        buttonLink: '#order',
                                        isPopular: false,
                                      };
                                      updateSection(section.id, { tiers: [...section.tiers, newTier] });
                                    }}
                                    className="px-2.5 py-1 text-xs bg-indigo-50 text-indigo-700 font-semibold rounded hover:bg-indigo-100"
                                  >
                                    + Tambah Paket
                                  </button>
                                </div>

                                {section.tiers.map((t, tIdx) => (
                                  <div key={t.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                                    <div className="flex items-center justify-between">
                                      <span className="font-bold text-slate-800">Paket #{tIdx + 1}</span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const filtered = section.tiers.filter((_, i) => i !== tIdx);
                                          updateSection(section.id, { tiers: filtered });
                                        }}
                                        className="text-rose-500 hover:text-rose-700"
                                      >
                                        Hapus
                                      </button>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                      <input
                                        type="text"
                                        value={t.name}
                                        onChange={(e) => {
                                          const updated = [...section.tiers];
                                          updated[tIdx].name = e.target.value;
                                          updateSection(section.id, { tiers: updated });
                                        }}
                                        placeholder="Nama Tiket (e.g. Tiket VIP)"
                                        className="px-2 py-1 text-xs border border-slate-300 rounded font-bold"
                                      />
                                      <input
                                        type="text"
                                        value={t.badge || ''}
                                        onChange={(e) => {
                                          const updated = [...section.tiers];
                                          updated[tIdx].badge = e.target.value;
                                          updateSection(section.id, { tiers: updated });
                                        }}
                                        placeholder="Badge (e.g. Paling Populer)"
                                        className="px-2 py-1 text-xs border border-slate-300 rounded"
                                      />
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                      <input
                                        type="number"
                                        value={t.originalPrice || ''}
                                        onChange={(e) => {
                                          const updated = [...section.tiers];
                                          updated[tIdx].originalPrice = parseFloat(e.target.value) || 0;
                                          updateSection(section.id, { tiers: updated });
                                        }}
                                        placeholder="Harga Normal (Rp)"
                                        className="px-2 py-1 text-xs border border-slate-300 rounded"
                                      />
                                      <input
                                        type="number"
                                        value={t.price}
                                        onChange={(e) => {
                                          const updated = [...section.tiers];
                                          updated[tIdx].price = parseFloat(e.target.value) || 0;
                                          updateSection(section.id, { tiers: updated });
                                        }}
                                        placeholder="Harga Diskon (Rp)"
                                        className="px-2 py-1 text-xs border border-slate-300 rounded font-bold text-indigo-600"
                                      />
                                    </div>

                                    <div>
                                      <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                                        Fitur & Keuntungan (Satu per baris)
                                      </label>
                                      <textarea
                                        rows={3}
                                        value={t.features.join('\n')}
                                        onChange={(e) => {
                                          const updated = [...section.tiers];
                                          updated[tIdx].features = e.target.value.split('\n').filter((f) => f.trim());
                                          updateSection(section.id, { tiers: updated });
                                        }}
                                        className="w-full px-2 py-1 text-xs border border-slate-300 rounded font-mono"
                                      />
                                    </div>

                                    <div className="flex items-center gap-2">
                                      <input
                                        type="checkbox"
                                        id={`pop_${t.id}`}
                                        checked={t.isPopular || false}
                                        onChange={(e) => {
                                          const updated = [...section.tiers];
                                          updated[tIdx].isPopular = e.target.checked;
                                          updateSection(section.id, { tiers: updated });
                                        }}
                                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                      />
                                      <label htmlFor={`pop_${t.id}`} className="text-xs text-slate-700 font-semibold">
                                        Sorot Paket Terpopuler (Border Ungu & Shadow Khusus)
                                      </label>
                                    </div>
                                  </div>
                                ))}
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

        {/* TAB 2: SEO & PENGATURAN UMUM */}
        {activeTab === 'seo' && (
          <div className="space-y-6 max-w-2xl">
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Pengaturan Umum & Optimasi SEO Halaman
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Konfigurasi URL publik, meta tags pencarian Google, dan kaitan produk.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Judul Halaman Landing Page <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Slug URL Publik <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center">
                  <span className="px-3 py-2 bg-slate-100 border border-r-0 border-slate-300 rounded-l-xl text-xs text-slate-500 font-mono">
                    /lp/
                  </span>
                  <input
                    type="text"
                    required
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-r-xl font-mono text-indigo-600 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kaitkan dengan Produk Katalog (Opsional)
                </label>
                <select
                  value={productId || ''}
                  onChange={(e) => setProductId(e.target.value || null)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
                >
                  <option value="">-- Tanpa Kaitan Produk Spesifik --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.productType ? `[${p.productType}]` : ''} - Rp {p.sellingPrice.toLocaleString('id-ID')}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="lp_published"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="lp_published" className="text-xs font-bold text-slate-800">
                  Terbitkan Halaman Ini ke Publik (Status: Live)
                </label>
              </div>

              <div className="pt-4 border-t border-slate-200 space-y-4">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Metadata Google & Media Sosial (OpenGraph)
                </h4>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">SEO Meta Title</label>
                  <input
                    type="text"
                    value={seoTitle}
                    onChange={(e) => setSeoTitle(e.target.value)}
                    placeholder={title}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">SEO Meta Description</label>
                  <textarea
                    rows={2}
                    value={seoDescription}
                    onChange={(e) => setSeoDescription(e.target.value)}
                    placeholder="Deskripsi ringkas yang muncul di hasil pencarian Google..."
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">URL Gambar Pratinjau Share (OG Image)</label>
                  <input
                    type="text"
                    value={ogImage}
                    onChange={(e) => setOgImage(e.target.value)}
                    placeholder="https://domain.com/banner-og.jpg"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: PRATINJAU TAMPILAN LIVE */}
        {activeTab === 'preview' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="text-xs font-bold text-slate-600">Pilih Mode Perangkat:</span>
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
                  🖥️ Layar Penuh (Desktop)
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
                  📱 Ponsel (Mobile 375px)
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
                <LandingPageView
                  landingPage={{
                    title,
                    slug,
                    isPublished,
                    productId,
                    sections,
                  }}
                  storeName="Preview Toko"
                  storeDomain="demo.tokosaya.com"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
