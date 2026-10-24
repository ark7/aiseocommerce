'use client';

import { useState } from 'react';
import Link from 'next/link';
import { buildAddToCartCalls, getTrackingConfig, sendTrackingCalls } from '@/lib/tracking';
import { trackFunnelEvent } from '@/lib/funnelEvents';
import { addToCart } from '@/lib/cart';

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
}: AddToCartButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const handleAddToCart = async () => {
    if (!isPreOrder && stock < quantity) {
      setError('Maaf, stok yang tersedia tidak mencukupi');
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      // 1. Centralized storage update and real-time event dispatch
      addToCart(storeDomain, {
        productId,
        name,
        price,
        quantity,
        imageUrl,
        isPreOrder,
        productType,
        storeDomain,
      });

      // 2. Conversion and funnel tracking
      sendTrackingCalls(
        buildAddToCartCalls(getTrackingConfig(), {
          item: { id: productId, name, price, quantity },
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
    if (isPreOrder || quantity < stock) setQuantity(quantity + 1);
  };
  const decrementQuantity = () => {
    if (quantity > 1) setQuantity(quantity - 1);
  };

  return (
    <div className="w-full relative">
      <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden mb-4 bg-white">
        <button
          type="button"
          onClick={decrementQuantity}
          className="px-3.5 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition disabled:opacity-40"
          disabled={quantity <= 1}
        >
          -
        </button>
        <span className="px-4 py-2 border-l border-r border-gray-300 font-semibold text-sm flex-1 text-center">
          {quantity}
        </span>
        <button
          type="button"
          onClick={incrementQuantity}
          className="px-3.5 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition disabled:opacity-40"
          disabled={!isPreOrder && quantity >= stock}
        >
          +
        </button>
      </div>

      <button
        type="button"
        onClick={handleAddToCart}
        disabled={isLoading || (!isPreOrder && stock < 1)}
        className={`w-full border border-transparent rounded-xl py-3 px-6 flex items-center justify-center text-sm sm:text-base font-semibold text-white shadow-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
          justAdded
            ? 'bg-emerald-600 hover:bg-emerald-700'
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
        ) : isPreOrder ? (
          `⏳ Pre-Order Sekarang${preOrderDays ? ` (${preOrderDays} hari)` : ''}`
        ) : (
          <div className="flex items-center gap-2">
            <span>🛒</span>
            <span>Tambah ke Keranjang</span>
          </div>
        )}
      </button>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

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
