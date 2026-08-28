'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface AddToCartButtonProps {
  productId: string;
  storeId: string;
  price: number;
  name: string;
  stock: number;
}

export default function AddToCartButton({ productId, storeId, price, name, stock }: AddToCartButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const handleAddToCart = async () => {
    if (stock < quantity) {
      setError('Sorry, not enough stock available');
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      const cartItem = { productId, name, price, quantity, storeId };
      const existingCart = localStorage.getItem(`cart_${storeId}`);
      const cart = existingCart ? JSON.parse(existingCart) : [];
      const existingItemIndex = cart.findIndex((item: any) => item.productId === productId);
      
      if (existingItemIndex >= 0) {
        cart[existingItemIndex].quantity += quantity;
      } else {
        cart.push(cartItem);
      }
      localStorage.setItem(`cart_${storeId}`, JSON.stringify(cart));
      router.push('/cart');
    } catch {
      setError('Failed to add to cart');
    } finally {
      setIsLoading(false);
    }
  };

  const incrementQuantity = () => {
    if (quantity < stock) setQuantity(quantity + 1);
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
        <span className="px-4 py-2 border-l border-r border-gray-300">{quantity}</span>
        <button
          type="button"
          onClick={incrementQuantity}
          className="px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          disabled={quantity >= stock}
        >+</button>
      </div>
      <button
        type="button"
        onClick={handleAddToCart}
        disabled={isLoading || stock < 1}
        className={`w-full bg-indigo-600 border border-transparent rounded-md py-3 px-8 flex items-center justify-center text-base font-medium text-white hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {isLoading ? (
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        ) : 'Add to Cart'}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
