'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { buildAddToCartCalls, getTrackingConfig, sendTrackingCalls } from '@/lib/tracking';
import { trackFunnelEvent } from '@/lib/funnelEvents';

interface AddToCartButtonProps {
  productId: string;
  storeDomain: string;
  price: number;
  name: string;
  stock: number;
  isPreOrder?: boolean;
  preOrderDays?: number | null;
}

export default function AddToCartButton({
  productId,
  storeDomain,
  price,
  name,
  stock,
  isPreOrder = false,
  preOrderDays,
}: AddToCartButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
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
      const cartItem = { productId, name, price, quantity, storeDomain, isPreOrder };
      const existingCart = localStorage.getItem(`cart_${storeDomain}`);
      const cart = existingCart ? JSON.parse(existingCart) : [];
      const existingItemIndex = cart.findIndex((item: any) => item.productId === productId);

      if (existingItemIndex >= 0) {
        cart[existingItemIndex].quantity += quantity;
      } else {
        cart.push(cartItem);
      }
      localStorage.setItem(`cart_${storeDomain}`, JSON.stringify(cart));

      // Report the conversion before navigating away — an add_to_cart that never
      // reaches the ad platforms starves their bidding of the signal.
      sendTrackingCalls(
        buildAddToCartCalls(getTrackingConfig(), {
          item: { id: productId, name, price, quantity },
        })
      );

      // Our own funnel, next to the ad platforms'. Quantity is deliberately not
      // sent: the funnel counts visitors who reached a step, not units.
      trackFunnelEvent('ADD_TO_CART', { productId, storeDomain });

      router.push('/cart');
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
    <div className="w-full">
      <div className="flex items-center border border-gray-300 rounded mb-4">
        <button
          type="button"
          onClick={decrementQuantity}
          className="px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          disabled={quantity <= 1}
        >-</button>
        <span className="px-4 py-2 border-l border-r border-gray-300 font-medium">{quantity}</span>
        <button
          type="button"
          onClick={incrementQuantity}
          className="px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          disabled={!isPreOrder && quantity >= stock}
        >+</button>
      </div>
      <button
        type="button"
        onClick={handleAddToCart}
        disabled={isLoading || (!isPreOrder && stock < 1)}
        className={`w-full ${
          isPreOrder
            ? 'bg-amber-600 hover:bg-amber-700'
            : 'bg-indigo-600 hover:bg-indigo-700'
        } border border-transparent rounded-lg py-3 px-8 flex items-center justify-center text-base font-semibold text-white shadow-xs transition disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {isLoading ? (
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        ) : isPreOrder ? (
          `⏳ Pre-Order Sekarang${preOrderDays ? ` (${preOrderDays} hari)` : ''}`
        ) : (
          'Tambah ke Keranjang'
        )}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
