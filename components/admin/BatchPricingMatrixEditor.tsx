'use client';

import React from 'react';
import { formatTierRangeLabel } from '@/lib/pricing';

export interface MatrixBand {
  id: string;
  minQty: string;
  maxQty: string;
}

export interface ProductTierRow {
  id: string;
  minQty: string;
  maxQty: string;
  unitPrice: string;
}

export interface BatchVariantInput {
  id: string;
  optionType: 'SIZE' | 'COLOR' | 'CUSTOM';
  optionValue: string;
  name: string;
  sku: string;
  price: string;
  stock: string;
  minOrderQty: string;
  tierPrices: Record<string, string>;
}

export const PRINTING_9_TIER_BANDS: Array<{ minQty: string; maxQty: string }> = [
  { minQty: '1', maxQty: '10' },
  { minQty: '11', maxQty: '20' },
  { minQty: '21', maxQty: '30' },
  { minQty: '31', maxQty: '40' },
  { minQty: '41', maxQty: '49' },
  { minQty: '50', maxQty: '99' },
  { minQty: '100', maxQty: '499' },
  { minQty: '500', maxQty: '999' },
  { minQty: '1000', maxQty: '' },
];

interface BatchPricingMatrixEditorProps {
  hasVariants: boolean;
  variants: BatchVariantInput[];
  matrixBands: MatrixBand[];
  setMatrixBands: React.Dispatch<React.SetStateAction<MatrixBand[]>>;
  productTiers: ProductTierRow[];
  setProductTiers: React.Dispatch<React.SetStateAction<ProductTierRow[]>>;
  minOrderQty: string;
  onMinOrderQtyChange: (value: string) => void;
  onUpdateVariant: (index: number, updater: (v: BatchVariantInput) => BatchVariantInput) => void;
  onApplyVariantPreset?: () => void;
}

export function buildMatrixFromApiProduct(product: any): {
  bands: MatrixBand[];
  singleTiers: ProductTierRow[];
  variantTierPricesByVariantId: Record<string, Record<string, string>>;
} {
  const variants: any[] = Array.isArray(product?.variants) ? product.variants : [];
  const productTiers: any[] = Array.isArray(product?.priceTiers) ? product.priceTiers : [];

  const bandMap = new Map<string, MatrixBand>();
  const ensureBand = (minQty: number, maxQty: number | null) => {
    const key = `${minQty}:${maxQty ?? ''}`;
    if (!bandMap.has(key)) {
      bandMap.set(key, {
        id: `band_${minQty}_${maxQty ?? 'plus'}`,
        minQty: String(minQty),
        maxQty: maxQty === null || maxQty === undefined ? '' : String(maxQty),
      });
    }
    return bandMap.get(key)!;
  };

  const variantTierPricesByVariantId: Record<string, Record<string, string>> = {};
  for (const v of variants) {
    const map: Record<string, string> = {};
    const vTiers: any[] = Array.isArray(v.priceTiers) ? v.priceTiers : [];
    for (const t of vTiers) {
      const band = ensureBand(Number(t.minQty), t.maxQty ?? null);
      map[band.id] = String(t.unitPrice);
    }
    variantTierPricesByVariantId[v.id] = map;
  }

  for (const t of productTiers) {
    ensureBand(Number(t.minQty), t.maxQty ?? null);
  }

  const sortedBands = Array.from(bandMap.values()).sort(
    (a, b) => (parseInt(a.minQty, 10) || 0) - (parseInt(b.minQty, 10) || 0)
  );

  const singleTiers: ProductTierRow[] = productTiers
    .slice()
    .sort((a, b) => Number(a.minQty) - Number(b.minQty))
    .map((t, idx) => ({
      id: t.id || `ptier_${idx}_${Date.now()}`,
      minQty: String(t.minQty),
      maxQty: t.maxQty === null || t.maxQty === undefined ? '' : String(t.maxQty),
      unitPrice: String(t.unitPrice),
    }));

  return { bands: sortedBands, singleTiers, variantTierPricesByVariantId };
}

export function serializeProductTiers(rows: ProductTierRow[]) {
  return rows
    .map((r) => ({
      minQty: parseInt(r.minQty, 10) || 0,
      maxQty: r.maxQty.trim() === '' ? null : parseInt(r.maxQty, 10) || 0,
      unitPrice: Number(r.unitPrice) || 0,
    }))
    .filter((t) => t.minQty >= 1 && t.unitPrice > 0 && (t.maxQty === null || t.maxQty >= t.minQty))
    .sort((a, b) => a.minQty - b.minQty);
}

export function serializeVariantTiers(variant: BatchVariantInput, bands: MatrixBand[]) {
  return bands
    .map((b) => ({
      minQty: parseInt(b.minQty, 10) || 0,
      maxQty: b.maxQty.trim() === '' ? null : parseInt(b.maxQty, 10) || 0,
      unitPrice: Number(variant.tierPrices?.[b.id] || 0),
    }))
    .filter((t) => t.minQty >= 1 && t.unitPrice > 0 && (t.maxQty === null || t.maxQty >= t.minQty))
    .sort((a, b) => a.minQty - b.minQty);
}

export default function BatchPricingMatrixEditor({
  hasVariants,
  variants,
  matrixBands,
  setMatrixBands,
  productTiers,
  setProductTiers,
  minOrderQty,
  onMinOrderQtyChange,
  onUpdateVariant,
  onApplyVariantPreset,
}: BatchPricingMatrixEditorProps) {
  const showVariantMatrix = hasVariants && variants.length > 0;

  const applyPrintingPreset = () => {
    const newBands: MatrixBand[] = PRINTING_9_TIER_BANDS.map((b, i) => ({
      id: `band_preset_${i}_${Date.now()}`,
      minQty: b.minQty,
      maxQty: b.maxQty,
    }));

    if (showVariantMatrix) {
      setMatrixBands(newBands);
    } else {
      setProductTiers(
        PRINTING_9_TIER_BANDS.map((b, i) => ({
          id: `ptier_preset_${i}_${Date.now()}`,
          minQty: b.minQty,
          maxQty: b.maxQty,
          unitPrice: productTiers[i]?.unitPrice || '',
        }))
      );
    }
  };

  const addBandRow = () => {
    const bands = showVariantMatrix ? matrixBands : productTiers;
    const last = bands[bands.length - 1];
    const lastMax = last?.maxQty ? parseInt(last.maxQty, 10) : last?.minQty ? parseInt(last.minQty, 10) : 0;
    const suggestedMin = lastMax > 0 ? String(lastMax + 1) : '1';

    if (showVariantMatrix) {
      setMatrixBands((prev) => [
        ...prev,
        { id: `band_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, minQty: suggestedMin, maxQty: '' },
      ]);
    } else {
      setProductTiers((prev) => [
        ...prev,
        {
          id: `ptier_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          minQty: suggestedMin,
          maxQty: '',
          unitPrice: '',
        },
      ]);
    }
  };

  return (
    <div className="space-y-4 rounded-xl border border-indigo-200 bg-indigo-50/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-indigo-950">
            Tabel Matrix Harga Grosir Bertingkat (Batch Pricing)
          </h3>
          <p className="text-xs text-indigo-800/80 mt-0.5">
            Harga satuan otomatis menyesuaikan jumlah pesanan. Kosongkan sel harga (tanda{' '}
            <span className="font-semibold">—</span>) bila rentang qty tersebut tidak tersedia untuk suatu varian.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={applyPrintingPreset}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-indigo-300 text-indigo-700 hover:bg-indigo-50 shadow-sm transition-colors"
          >
            + Template 9 Rentang Qty (1–10 s/d &ge; 1.000)
          </button>
          {onApplyVariantPreset && (
            <button
              type="button"
              onClick={onApplyVariantPreset}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm transition-colors"
            >
              Isi Contoh Matrix ID Card PVC
            </button>
          )}
        </div>
      </div>

      {/* Product-level Minimum Order Quantity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-3 rounded-lg border border-indigo-100">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1" htmlFor="minOrderQty">
            Minimal Order Produk / MOQ Default (pcs)
          </label>
          <input
            id="minOrderQty"
            name="minOrderQty"
            type="number"
            min="1"
            value={minOrderQty}
            onChange={(e) => onMinOrderQtyChange(e.target.value)}
            className="w-36 px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500"
            placeholder="1"
          />
          <p className="mt-1 text-[11px] text-gray-500">
            Tiap varian juga otomatis mengikuti minimal tier terendah yang diisi harga.
          </p>
        </div>
        <div className="text-xs text-gray-600 flex items-center">
          <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-lg px-3 py-2 w-full">
            <strong>Aturan Cart per Varian:</strong> Pembeli memilih satu varian lalu memasukkan jumlah order sesuai tabel grosir. Kombinasi varian berbeda akan menjadi baris pesanan terpisah di keranjang.
          </div>
        </div>
      </div>

      {/* Multi-Variant Matrix Mode vs Single Product Tiers */}
      {showVariantMatrix ? (
        <div className="overflow-x-auto bg-white rounded-lg border border-gray-200 shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 text-xs">
            <thead className="bg-slate-900 text-white">
              <tr>
                <th className="px-3 py-2.5 text-left font-bold whitespace-nowrap">Min Qty *</th>
                <th className="px-3 py-2.5 text-left font-bold whitespace-nowrap">
                  Max Qty <span className="font-normal text-slate-300">(kosong = ke atas)</span>
                </th>
                <th className="px-3 py-2.5 text-left font-bold whitespace-nowrap">Label Preview</th>
                {variants.map((v, vIdx) => (
                  <th key={v.id} className="px-3 py-2 text-left font-bold min-w-[165px]">
                    <div className="text-white">{v.optionValue || v.name || `Varian ${vIdx + 1}`}</div>
                    <div className="mt-1 flex items-center gap-1.5 text-[11px] font-normal text-slate-300">
                      <span>MOQ:</span>
                      <input
                        type="number"
                        min="1"
                        aria-label={`MOQ ${v.optionValue || vIdx + 1}`}
                        value={v.minOrderQty || '1'}
                        onChange={(e) =>
                          onUpdateVariant(vIdx, (cur) => ({ ...cur, minOrderQty: e.target.value }))
                        }
                        className="w-16 px-1.5 py-0.5 rounded bg-slate-800 border border-slate-600 text-white text-center font-semibold"
                      />
                      <span>pcs</span>
                    </div>
                  </th>
                ))}
                <th className="px-3 py-2.5 text-center font-bold">Hapus</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {matrixBands.length === 0 ? (
                <tr>
                  <td
                    colSpan={4 + variants.length}
                    className="px-4 py-6 text-center text-gray-500 text-xs"
                  >
                    Belum ada rentang kuantitas. Klik &ldquo;+ Template 9 Rentang Qty&rdquo; atau &ldquo;+ Tambah Rentang Qty&rdquo;.
                  </td>
                </tr>
              ) : (
                matrixBands.map((band, bIdx) => {
                  const minNum = parseInt(band.minQty, 10) || 1;
                  const maxNum = band.maxQty.trim() === '' ? null : parseInt(band.maxQty, 10) || null;
                  return (
                    <tr key={band.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="1"
                          value={band.minQty}
                          onChange={(e) =>
                            setMatrixBands((prev) =>
                              prev.map((row, i) => (i === bIdx ? { ...row, minQty: e.target.value } : row))
                            )
                          }
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-gray-900 bg-white font-medium"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min={minNum}
                          value={band.maxQty}
                          placeholder="∞"
                          onChange={(e) =>
                            setMatrixBands((prev) =>
                              prev.map((row, i) => (i === bIdx ? { ...row, maxQty: e.target.value } : row))
                            )
                          }
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-gray-900 bg-white"
                        />
                      </td>
                      <td className="px-3 py-2 font-semibold text-gray-700 whitespace-nowrap">
                        {formatTierRangeLabel(minNum, maxNum)}
                      </td>
                      {variants.map((v, vIdx) => (
                        <td key={v.id} className="px-3 py-2">
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[11px] text-gray-400">
                              Rp
                            </span>
                            <input
                              type="number"
                              min="0"
                              placeholder="— (Kosong)"
                              value={v.tierPrices?.[band.id] ?? ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                onUpdateVariant(vIdx, (cur) => ({
                                  ...cur,
                                  tierPrices: { ...(cur.tierPrices || {}), [band.id]: val },
                                }));
                              }}
                              className="w-full pl-7 pr-2 py-1 border border-gray-300 rounded text-gray-900 bg-white font-medium focus:ring-1 focus:ring-indigo-500"
                            />
                          </div>
                        </td>
                      ))}
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() =>
                            setMatrixBands((prev) => prev.filter((_, i) => i !== bIdx))
                          }
                          className="text-red-500 hover:text-red-700 font-semibold px-2 py-1 rounded hover:bg-red-50"
                        >
                          Hapus
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg border border-gray-200 shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 text-xs">
            <thead className="bg-slate-900 text-white">
              <tr>
                <th className="px-3 py-2.5 text-left font-bold">Min Qty *</th>
                <th className="px-3 py-2.5 text-left font-bold">
                  Max Qty <span className="font-normal text-slate-300">(kosong = ke atas)</span>
                </th>
                <th className="px-3 py-2.5 text-left font-bold">Label Preview</th>
                <th className="px-3 py-2.5 text-left font-bold">Harga Satuan (Rp) *</th>
                <th className="px-3 py-2.5 text-center font-bold">Hapus</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {productTiers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-gray-500 text-xs">
                    Belum ada rentang harga grosir. Klik &ldquo;+ Template 9 Rentang Qty&rdquo; atau &ldquo;+ Tambah Rentang Qty&rdquo;.
                    {hasVariants ? '' : ' (Atau aktifkan Varian di bagian bawah jika harga berbeda per varian.)'}
                  </td>
                </tr>
              ) : (
                productTiers.map((row, idx) => {
                  const minNum = parseInt(row.minQty, 10) || 1;
                  const maxNum = row.maxQty.trim() === '' ? null : parseInt(row.maxQty, 10) || null;
                  return (
                    <tr key={row.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="1"
                          value={row.minQty}
                          onChange={(e) =>
                            setProductTiers((prev) =>
                              prev.map((r, i) => (i === idx ? { ...r, minQty: e.target.value } : r))
                            )
                          }
                          className="w-24 px-2 py-1 border border-gray-300 rounded text-gray-900 bg-white font-medium"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min={minNum}
                          placeholder="∞"
                          value={row.maxQty}
                          onChange={(e) =>
                            setProductTiers((prev) =>
                              prev.map((r, i) => (i === idx ? { ...r, maxQty: e.target.value } : r))
                            )
                          }
                          className="w-24 px-2 py-1 border border-gray-300 rounded text-gray-900 bg-white"
                        />
                      </td>
                      <td className="px-3 py-2 font-semibold text-gray-700 whitespace-nowrap">
                        {formatTierRangeLabel(minNum, maxNum)}
                      </td>
                      <td className="px-3 py-2">
                        <div className="relative max-w-[180px]">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[11px] text-gray-400">
                            Rp
                          </span>
                          <input
                            type="number"
                            min="1"
                            placeholder="5250"
                            value={row.unitPrice}
                            onChange={(e) =>
                              setProductTiers((prev) =>
                                prev.map((r, i) => (i === idx ? { ...r, unitPrice: e.target.value } : r))
                              )
                            }
                            className="w-full pl-7 pr-2 py-1 border border-gray-300 rounded text-gray-900 bg-white font-medium"
                          />
                        </div>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() =>
                            setProductTiers((prev) => prev.filter((_, i) => i !== idx))
                          }
                          className="text-red-500 hover:text-red-700 font-semibold px-2 py-1 rounded hover:bg-red-50"
                        >
                          Hapus
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={addBandRow}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-indigo-300 text-indigo-700 hover:bg-indigo-50 transition-colors"
        >
          + Tambah Rentang Qty
        </button>
        <span className="text-[11px] text-gray-500">
          * Isi Max Qty kosong untuk rentang terbuka (contoh: &ge; 1.000 pcs)
        </span>
      </div>
    </div>
  );
}
