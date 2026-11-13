'use client';

import { useId, useMemo, useState } from 'react';
import Link from 'next/link';
import TurnstileStorefrontShield from '@/components/security/TurnstileStorefrontShield';
import { buildAddToCartCalls, getTrackingConfig, sendTrackingCalls } from '@/lib/tracking';
import { trackFunnelEvent } from '@/lib/funnelEvents';
import { addToCart } from '@/lib/cart';
import {
  formatTierRangeLabel,
  getBatchPriceRange,
  resolveBatchUnitPrice,
  type PriceTierInput,
} from '@/lib/pricing';

interface AddToCartButtonProps {
  productId: string;
  storeDomain: string;
  price: number;
  name: string;
  stock: number;
  imageUrl?: string;
  isPreOrder?: boolean;
  preOrderDays?: number | null;
  productType?: 'PHYSICAL' | 'DIGITAL' | 'EVENT';
  hasBatchPricing?: boolean;
  minOrderQty?: number;
  priceTiers?: PriceTierInput[];
  variants?: ProductVariantItem[];
  turnstileSiteKey?: string | null;
  turnstileVerified?: boolean;
}

export interface ProductVariantItem {
  id: string;
  name: string;
  optionType: string;
  optionValue: string;
  sku?: string | null;
  price?: number | null;
  stock: number;
  minOrderQty?: number;
  priceTiers?: PriceTierInput[];
}

interface MatrixBandColumnRow {
  key: string;
  minQty: number;
  maxQty: number | null;
}

function getEffectiveVariantMinOrderQty(
  hasBatchPricing: boolean,
  productMinOrderQty: number,
  variant: ProductVariantItem | null,
  productTiers: PriceTierInput[]
): number {
  const explicitMin = Math.max(1, productMinOrderQty || 1, variant?.minOrderQty ?? 1);
  if (!hasBatchPricing) return explicitMin;
  const activeTiers =
    variant && variant.priceTiers && variant.priceTiers.length > 0
      ? variant.priceTiers
      : productTiers;
  return resolveBatchUnitPrice(0, activeTiers, 1, explicitMin).effectiveMinOrderQty;
}

export default function AddToCartButton({
  productId,
  storeDomain,
  price,
  name,
  stock,
  imageUrl,
  isPreOrder = false,
  preOrderDays,
  productType = 'PHYSICAL',
  hasBatchPricing = false,
  minOrderQty = 1,
  priceTiers = [],
  variants = [],
  turnstileSiteKey = null,
  turnstileVerified = false,
}: AddToCartButtonProps) {
  const matrixCaptionId = useId();
  const qtyErrorId = useId();
  const hasVariants = Boolean(variants && variants.length > 0);
  const initialVariant: ProductVariantItem | null = hasVariants
    ? variants.find((v) => v.stock > 0) || variants[0]
    : null;
  const initialMinQty = getEffectiveVariantMinOrderQty(
    hasBatchPricing,
    minOrderQty,
    initialVariant,
    priceTiers
  );

  const [isLoading, setIsLoading] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariantItem | null>(initialVariant);
  const [quantity, setQuantity] = useState(initialMinQty);
  const [qtyInput, setQtyInput] = useState(String(initialMinQty));
  const [hasInteractedQty, setHasInteractedQty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isBotVerified, setIsBotVerified] = useState<boolean>(
    () => !turnstileSiteKey || Boolean(turnstileVerified)
  );

  const fallbackPrice =
    selectedVariant?.price != null && selectedVariant.price > 0 ? selectedVariant.price : price;

  const activeTiers: PriceTierInput[] = useMemo(() => {
    if (!hasBatchPricing) return [];
    if (selectedVariant && selectedVariant.priceTiers && selectedVariant.priceTiers.length > 0) {
      return selectedVariant.priceTiers;
    }
    return priceTiers;
  }, [hasBatchPricing, selectedVariant, priceTiers]);

  const explicitMinOrderQty = selectedVariant
    ? Math.max(1, minOrderQty || 1, selectedVariant.minOrderQty ?? 1)
    : Math.max(1, minOrderQty || 1);

  const batchResolution = useMemo(() => {
    if (!hasBatchPricing) return null;
    return resolveBatchUnitPrice(fallbackPrice, activeTiers, quantity, explicitMinOrderQty);
  }, [hasBatchPricing, fallbackPrice, activeTiers, quantity, explicitMinOrderQty]);

  const effectiveMinOrderQty = batchResolution
    ? batchResolution.effectiveMinOrderQty
    : explicitMinOrderQty;
  const effectivePrice = batchResolution ? batchResolution.unitPrice : fallbackPrice;

  const effectiveStock = hasVariants
    ? selectedVariant
      ? selectedVariant.stock
      : 0
    : stock;

  const isBelowMinimum = quantity < effectiveMinOrderQty;
  const isOverStock = !isPreOrder && effectiveStock > 0 && quantity > effectiveStock;
  const isOutOfStock = !isPreOrder && (effectiveStock < 1 || effectiveStock < effectiveMinOrderQty);

  const matrixBands: MatrixBandColumnRow[] = useMemo(() => {
    if (!hasBatchPricing) return [];
    const bandMap = new Map<string, MatrixBandColumnRow>();
    const collect = (tiers?: PriceTierInput[]) => {
      for (const tier of tiers || []) {
        const key = `${tier.minQty}:${tier.maxQty ?? 'plus'}`;
        if (!bandMap.has(key)) {
          bandMap.set(key, {
            key,
            minQty: tier.minQty,
            maxQty: tier.maxQty ?? null,
          });
        }
      }
    };
    collect(priceTiers);
    variants.forEach((v) => collect(v.priceTiers));
    return Array.from(bandMap.values()).sort((a, b) => a.minQty - b.minQty);
  }, [hasBatchPricing, priceTiers, variants]);

  const setSyncedQuantity = (nextQty: number) => {
    setQuantity(nextQty);
    setQtyInput(String(nextQty));
    setJustAdded(false);
  };

  const handleAddToCart = async () => {
    if (hasVariants && !selectedVariant) {
      setError('Harap pilih varian terlebih dahulu');
      return;
    }

    if (isBelowMinimum) {
      setHasInteractedQty(true);
      setError(`Minimal pemesanan untuk pilihan ini adalah ${effectiveMinOrderQty} pcs`);
      return;
    }

    if (!isPreOrder && effectiveStock < quantity) {
      setHasInteractedQty(true);
      setError('Maaf, stok yang tersedia tidak mencukupi');
      return;
    }

    if (turnstileSiteKey && !isBotVerified) {
      setError('Mohon selesaikan verifikasi keamanan Cloudflare Turnstile terlebih dahulu.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const variationLabel = selectedVariant
        ? selectedVariant.name || `${selectedVariant.optionType}: ${selectedVariant.optionValue}`
        : undefined;

      // 1. Centralized storage update and real-time event dispatch
      addToCart(storeDomain, {
        productId,
        name,
        price: effectivePrice,
        quantity,
        imageUrl,
        isPreOrder,
        productType,
        storeDomain,
        variantId: selectedVariant?.id,
        variation: variationLabel,
        hasBatchPricing,
        minOrderQty: effectiveMinOrderQty,
        baseUnitPrice: fallbackPrice,
        priceTiers: hasBatchPricing ? activeTiers : undefined,
      });

      // 2. Conversion and funnel tracking
      sendTrackingCalls(
        buildAddToCartCalls(getTrackingConfig(), {
          item: { id: productId, name, price: effectivePrice, quantity },
        })
      );

      trackFunnelEvent('ADD_TO_CART', { productId, storeDomain });

      // 3. Visual feedback: Keep user on page so they can continue browsing
      setJustAdded(true);
      setShowToast(true);

      setTimeout(() => {
        setJustAdded(false);
      }, 2500);

      setTimeout(() => {
        setShowToast(false);
      }, 5000);
    } catch {
      setError('Gagal menambahkan ke keranjang');
    } finally {
      setIsLoading(false);
    }
  };

  const incrementQuantity = () => {
    setHasInteractedQty(true);
    setError(null);
    if (isPreOrder || quantity < effectiveStock) {
      const next = Math.max(effectiveMinOrderQty, quantity + 1);
      const bounded = !isPreOrder && effectiveStock > 0 ? Math.min(next, effectiveStock) : next;
      setSyncedQuantity(bounded);
    }
  };
  const decrementQuantity = () => {
    setHasInteractedQty(true);
    setError(null);
    if (quantity > effectiveMinOrderQty) {
      setSyncedQuantity(quantity - 1);
    }
  };

  const handleQuantityInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setQtyInput(raw);
    setError(null);
    const parsed = parseInt(raw, 10);
    if (!Number.isNaN(parsed) && parsed >= 1) {
      if (!isPreOrder && effectiveStock > 0 && parsed > effectiveStock) {
        setQuantity(effectiveStock);
      } else {
        setQuantity(parsed);
      }
    }
  };

  const handleQuantityBlur = () => {
    setHasInteractedQty(true);
    const parsed = parseInt(qtyInput, 10);
    if (Number.isNaN(parsed) || parsed < 1) {
      setSyncedQuantity(effectiveMinOrderQty);
      return;
    }
    if (!isPreOrder && effectiveStock > 0 && parsed > effectiveStock) {
      setSyncedQuantity(effectiveStock);
      return;
    }
    setSyncedQuantity(parsed);
  };

  const hasVariantSpecificTiers =
    hasBatchPricing &&
    hasVariants &&
    variants.some((v) => Array.isArray(v.priceTiers) && v.priceTiers.length > 0);

  return (
    <div className="w-full relative">
      {/* Batch Pricing Matrix Table (Responsive & Keyboard Accessible) */}
      {hasBatchPricing && matrixBands.length > 0 && (
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <h3
              id={matrixCaptionId}
              className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200"
            >
              Daftar Harga Grosir (Klik baris untuk pilih qty)
            </h3>
            <span className="text-[11px] font-medium text-indigo-700 dark:text-indigo-300">
              Harga per pcs
            </span>
          </div>
          <div
            tabIndex={0}
            role="region"
            aria-labelledby={matrixCaptionId}
            className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <table className="min-w-full border-separate border-spacing-0 text-xs">
              <caption className="sr-only">Daftar harga grosir bertingkat untuk {name}</caption>
              <thead className="bg-slate-900 text-white sticky top-0 z-10">
                <tr>
                  <th scope="col" className="px-3 py-2.5 text-left font-bold whitespace-nowrap">
                    JUMLAH
                  </th>
                  {hasVariantSpecificTiers ? (
                    variants.map((v) => {
                      const isColSelected = selectedVariant?.id === v.id;
                      const vMinQty = getEffectiveVariantMinOrderQty(
                        true,
                        minOrderQty,
                        v,
                        priceTiers
                      );
                      return (
                        <th
                          key={v.id}
                          scope="col"
                          className={`px-3 py-2 text-center font-bold whitespace-nowrap ${
                            isColSelected ? 'bg-indigo-700 text-white' : ''
                          }`}
                        >
                          <div>{v.optionValue || v.name}</div>
                          {vMinQty > 1 && (
                            <div className="text-[10px] font-normal text-indigo-200">
                              Min. {vMinQty} pcs
                            </div>
                          )}
                        </th>
                      );
                    })
                  ) : (
                    <th scope="col" className="px-3 py-2.5 text-right font-bold whitespace-nowrap">
                      HARGA SATUAN
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {matrixBands.map((band) => {
                  const rowMatchesQty =
                    quantity >= band.minQty && (band.maxQty === null || quantity <= band.maxQty);
                  return (
                    <tr
                      key={band.key}
                      className={
                        rowMatchesQty
                          ? 'bg-indigo-50/80 dark:bg-indigo-950/40'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }
                    >
                      <th
                        scope="row"
                        className="px-3 py-2 text-left font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap bg-slate-50 dark:bg-slate-800/70 sticky left-0"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            const targetQty = Math.max(effectiveMinOrderQty, band.minQty);
                            const bounded =
                              !isPreOrder && effectiveStock > 0
                                ? Math.min(targetQty, effectiveStock)
                                : targetQty;
                            setSyncedQuantity(bounded);
                            setHasInteractedQty(true);
                            setError(null);
                          }}
                          className="text-left hover:text-indigo-700 dark:hover:text-indigo-300 underline-offset-2 hover:underline"
                        >
                          {formatTierRangeLabel(band.minQty, band.maxQty)}
                        </button>
                      </th>
                      {hasVariantSpecificTiers ? (
                        variants.map((v) => {
                          const vTiers =
                            v.priceTiers && v.priceTiers.length > 0 ? v.priceTiers : priceTiers;
                          const matchedCell = vTiers.find(
                            (t) => t.minQty === band.minQty && (t.maxQty ?? null) === band.maxQty
                          );
                          const isColSelected = selectedVariant?.id === v.id;
                          const isActiveCell = isColSelected && rowMatchesQty && matchedCell;
                          const variantOutOfStock = !isPreOrder && v.stock <= 0;
                          return (
                            <td
                              key={`${band.key}-${v.id}`}
                              className={`px-3 py-2 text-center whitespace-nowrap transition-colors ${
                                isActiveCell
                                  ? 'bg-indigo-600 text-white font-bold'
                                  : isColSelected
                                  ? 'bg-indigo-50/50 dark:bg-indigo-950/20 text-slate-900 dark:text-slate-100 font-semibold'
                                  : 'text-slate-700 dark:text-slate-300 font-medium'
                              }`}
                            >
                              {matchedCell ? (
                                <button
                                  type="button"
                                  disabled={variantOutOfStock}
                                  onClick={() => {
                                    setSelectedVariant(v);
                                    const bounded =
                                      !isPreOrder && v.stock > 0
                                        ? Math.min(band.minQty, v.stock)
                                        : band.minQty;
                                    setSyncedQuantity(bounded);
                                    setHasInteractedQty(true);
                                    setError(null);
                                  }}
                                  className="w-full py-0.5 disabled:opacity-50"
                                >
                                  Rp {matchedCell.unitPrice.toLocaleString('id-ID')}
                                </button>
                              ) : (
                                <span
                                  aria-label="Tidak tersedia untuk rentang ini"
                                  className="text-slate-400 dark:text-slate-500 font-normal"
                                >
                                  —
                                </span>
                              )}
                            </td>
                          );
                        })
                      ) : (
                        (() => {
                          const matchedSingle = activeTiers.find(
                            (t) => t.minQty === band.minQty && (t.maxQty ?? null) === band.maxQty
                          );
                          return (
                            <td
                              className={`px-3 py-2 text-right whitespace-nowrap ${
                                rowMatchesQty && matchedSingle
                                  ? 'bg-indigo-600 text-white font-bold'
                                  : 'text-slate-800 dark:text-slate-200 font-semibold'
                              }`}
                            >
                              {matchedSingle ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const bounded =
                                      !isPreOrder && effectiveStock > 0
                                        ? Math.min(band.minQty, effectiveStock)
                                        : band.minQty;
                                    setSyncedQuantity(bounded);
                                    setHasInteractedQty(true);
                                    setError(null);
                                  }}
                                  className="w-full text-right py-0.5"
                                >
                                  Rp {matchedSingle.unitPrice.toLocaleString('id-ID')}
                                </button>
                              ) : (
                                '—'
                              )}
                            </td>
                          );
                        })()
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Varian Selector Section */}
      {hasVariants && (
        <div className="mb-5 space-y-3 p-4 rounded-xl bg-gray-50/80 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300">
              Pilihan Varian:
            </span>
            {selectedVariant && (
              <span
                className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                  isPreOrder
                    ? 'bg-amber-100 text-amber-800'
                    : selectedVariant.stock > 0
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
                }`}
              >
                {isPreOrder
                  ? 'PO Varian'
                  : selectedVariant.stock > 0
                  ? `Sisa ${selectedVariant.stock} stok`
                  : 'Stok Varian Habis'}
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {variants.map((v) => {
              const isSelected = selectedVariant?.id === v.id;
              const variantMinOrder = getEffectiveVariantMinOrderQty(
                hasBatchPricing,
                minOrderQty,
                v,
                priceTiers
              );
              const variantOutOfStock =
                !isPreOrder && (v.stock <= 0 || v.stock < variantMinOrder);
              const variantTierRange =
                hasBatchPricing && v.priceTiers && v.priceTiers.length > 0
                  ? getBatchPriceRange(v.priceTiers)
                  : null;

              return (
                <button
                  type="button"
                  key={v.id}
                  onClick={() => {
                    setSelectedVariant(v);
                    setError(null);
                    setHasInteractedQty(false);
                    setSyncedQuantity(variantMinOrder);
                  }}
                  disabled={variantOutOfStock}
                  className={`px-3.5 py-2 rounded-lg text-xs font-medium border transition-all flex items-center space-x-1.5 ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm ring-2 ring-indigo-300 dark:ring-indigo-900'
                      : variantOutOfStock
                      ? 'bg-gray-100 dark:bg-slate-800 text-gray-400 border-gray-200 dark:border-slate-700 cursor-not-allowed line-through opacity-60'
                      : 'bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-200 border-gray-300 dark:border-slate-600 hover:border-indigo-400'
                  }`}
                >
                  <span>{v.name || v.optionValue}</span>
                  {hasBatchPricing && variantTierRange ? (
                    <span className="text-[10px] opacity-85 font-normal">
                      (Mulai Rp {variantTierRange.minPrice.toLocaleString('id-ID')})
                    </span>
                  ) : !hasBatchPricing && v.price && v.price !== price ? (
                    <span className="text-[10px] opacity-80 font-normal">
                      (Rp {v.price.toLocaleString('id-ID')})
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          {selectedVariant && (
            <div className="text-xs text-gray-500 dark:text-slate-400 pt-1 flex items-center justify-between border-t border-gray-200 dark:border-slate-700">
              <span>
                Varian terpilih:{' '}
                <strong>
                  {selectedVariant.name ||
                    `${selectedVariant.optionType}: ${selectedVariant.optionValue}`}
                </strong>
                {effectiveMinOrderQty > 1 && (
                  <span className="ml-1.5 text-amber-700 dark:text-amber-300 font-semibold">
                    (Min. order {effectiveMinOrderQty} pcs)
                  </span>
                )}
              </span>
              <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                Rp {effectivePrice.toLocaleString('id-ID')}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Live Batch Tier Price & Subtotal Summary */}
      {hasBatchPricing && batchResolution && (
        <div className="mb-4 rounded-xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50/70 dark:bg-indigo-950/30 p-3.5 text-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-indigo-950 dark:text-indigo-200">
              {batchResolution.isBelowMinimum ? (
                <span className="text-rose-700 dark:text-rose-300">
                  Minimal pemesanan: {effectiveMinOrderQty} pcs
                </span>
              ) : batchResolution.matchedTier ? (
                <>
                  Tier aktif:{' '}
                  <strong>
                    {formatTierRangeLabel(
                      batchResolution.matchedTier.minQty,
                      batchResolution.matchedTier.maxQty
                    )}
                  </strong>
                </>
              ) : (
                'Harga Satuan Aktif'
              )}
            </span>
            <span className="font-bold text-indigo-700 dark:text-indigo-300 text-sm">
              Rp {effectivePrice.toLocaleString('id-ID')} / pcs
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
            <span>Estimasi Subtotal ({quantity} pcs):</span>
            <strong className="text-sm text-slate-900 dark:text-white">
              Rp {(effectivePrice * quantity).toLocaleString('id-ID')}
            </strong>
          </div>
          {batchResolution.nextTier && (
            <p className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium pt-0.5">
              💡 Tambah {batchResolution.nextTier.neededQty} pcs lagi (min.{' '}
              {batchResolution.nextTier.minQty} pcs) untuk harga lebih hemat{' '}
              <strong>Rp {batchResolution.nextTier.unitPrice.toLocaleString('id-ID')}/pcs</strong>
            </p>
          )}
        </div>
      )}

      <div 
        data-quantity-stepper
        className="flex items-center border border-gray-300 dark:border-slate-700 rounded-lg overflow-hidden mb-4 bg-white dark:bg-slate-800 transition-colors"
      >
        <button
          type="button"
          onClick={decrementQuantity}
          aria-label="Kurangi jumlah"
          className="px-3.5 py-2 text-gray-700 dark:text-slate-200 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700 transition disabled:opacity-40"
          disabled={quantity <= Math.max(1, effectiveMinOrderQty)}
        >
          -
        </button>
        <input
          type="number"
          inputMode="numeric"
          data-quantity-counter
          aria-label="Jumlah pesanan"
          min={effectiveMinOrderQty}
          max={!isPreOrder && effectiveStock > 0 ? effectiveStock : undefined}
          value={qtyInput}
          onChange={handleQuantityInputChange}
          onBlur={handleQuantityBlur}
          aria-invalid={hasInteractedQty && (isBelowMinimum || isOverStock) ? 'true' : 'false'}
          aria-describedby={error ? qtyErrorId : undefined}
          className="w-full min-w-[4.5rem] px-3 py-2 border-l border-r border-gray-300 dark:border-slate-700 font-semibold text-sm text-center text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
        />
        <button
          type="button"
          onClick={incrementQuantity}
          aria-label="Tambah jumlah"
          className="px-3.5 py-2 text-gray-700 dark:text-slate-200 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700 transition disabled:opacity-40"
          disabled={!isPreOrder && quantity >= effectiveStock}
        >
          +
        </button>
      </div>

      {turnstileSiteKey && (
        <div className="mb-3">
          <TurnstileStorefrontShield
            siteKey={turnstileSiteKey}
            initiallyVerified={isBotVerified}
            storeDomain={storeDomain}
            context="product-detail"
            onVerifiedChange={setIsBotVerified}
          />
        </div>
      )}

      <button
        type="button"
        onClick={handleAddToCart}
        disabled={isLoading || isOutOfStock}
        className={`w-full border border-transparent rounded-xl py-3 px-6 flex items-center justify-center text-sm sm:text-base font-semibold text-white shadow-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
          justAdded
            ? 'bg-emerald-600 hover:bg-emerald-700'
            : isOutOfStock
            ? 'bg-gray-400'
            : isPreOrder
            ? 'bg-amber-600 hover:bg-amber-700'
            : 'bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99]'
        }`}
      >
        {isLoading ? (
          <div className="flex items-center gap-2">
            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>Memasukkan...</span>
          </div>
        ) : justAdded ? (
          <div className="flex items-center gap-2 animate-pulse">
            <span className="text-lg">✓</span>
            <span>Berhasil Ditambahkan!</span>
          </div>
        ) : isOutOfStock ? (
          <span>Stok Habis</span>
        ) : isPreOrder ? (
          `⏳ Pre-Order Sekarang${preOrderDays ? ` (${preOrderDays} hari)` : ''}`
        ) : (
          <div className="flex items-center gap-2">
            <span>🛒</span>
            <span>Tambah ke Keranjang</span>
          </div>
        )}
      </button>

      {error && (
        <p id={qtyErrorId} role="status" className="mt-2 text-sm text-red-600 dark:text-rose-400">
          {error}
        </p>
      )}

      {/* Floating Notification Toast */}
      {showToast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm w-[calc(100vw-3rem)] bg-white border border-emerald-200 shadow-xl rounded-2xl p-4 transition-all animate-bounce-subtle">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-sm shrink-0">
              ✓
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
                Produk Masuk Keranjang
              </p>
              <p className="text-sm font-medium text-gray-900 truncate mt-0.5">
                {quantity}x {name}
              </p>
              <div className="flex items-center gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => setShowToast(false)}
                  className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                >
                  Lanjut Belanja
                </button>
                <Link
                  href="/cart"
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition shadow-xs flex items-center gap-1"
                >
                  <span>Buka Keranjang</span>
                  <span>&rarr;</span>
                </Link>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowToast(false)}
              className="text-gray-400 hover:text-gray-600 text-xs p-1"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
