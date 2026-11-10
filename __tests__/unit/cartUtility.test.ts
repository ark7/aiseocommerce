/**
 * @jest-environment jsdom
 */

import {
  getCartStorageKey,
  getCart,
  getCartCount,
  addToCart,
  updateCartQuantity,
  removeFromCart,
  clearCart,
  CART_UPDATED_EVENT,
} from '@/lib/cart';

describe('Cart Utility (lib/cart.ts)', () => {
  const storeDomain = 'demo-store.local';

  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  describe('getCartStorageKey', () => {
    it('returns domain-prefixed key when storeDomain is provided', () => {
      expect(getCartStorageKey('tokoku.com')).toBe('cart_tokoku.com');
    });

    it('falls back to "cart" when storeDomain is null or empty', () => {
      expect(getCartStorageKey(null)).toBe('cart');
      expect(getCartStorageKey('')).toBe('cart');
      expect(getCartStorageKey(undefined)).toBe('cart');
    });
  });

  describe('addToCart and getCart', () => {
    it('adds new items to the cart and calculates count properly', () => {
      const dispatchSpy = jest.spyOn(window, 'dispatchEvent');

      const result = addToCart(storeDomain, {
        productId: 'prod-1',
        name: 'Sepatu Running',
        price: 250000,
        quantity: 2,
      });

      expect(result.totalCount).toBe(2);
      expect(result.cart).toHaveLength(1);
      expect(result.cart[0].productId).toBe('prod-1');
      expect(result.cart[0].quantity).toBe(2);

      const itemsInStorage = getCart(storeDomain);
      expect(itemsInStorage).toHaveLength(1);
      expect(getCartCount(storeDomain)).toBe(2);

      // Verify custom event dispatch
      expect(dispatchSpy).toHaveBeenCalled();
      const dispatchedEvent = dispatchSpy.mock.calls.find(
        (call) => (call[0] as CustomEvent).type === CART_UPDATED_EVENT
      );
      expect(dispatchedEvent).toBeDefined();
    });

    it('increments quantity when adding the same product again', () => {
      addToCart(storeDomain, {
        productId: 'prod-1',
        name: 'Sepatu Running',
        price: 250000,
        quantity: 1,
      });

      const second = addToCart(storeDomain, {
        productId: 'prod-1',
        name: 'Sepatu Running',
        price: 250000,
        quantity: 3,
      });

      expect(second.totalCount).toBe(4);
      expect(second.cart).toHaveLength(1);
      expect(second.cart[0].quantity).toBe(4);
      expect(getCartCount(storeDomain)).toBe(4);
    });

    it('accumulates multiple distinct products', () => {
      addToCart(storeDomain, {
        productId: 'prod-1',
        name: 'Sepatu Running',
        price: 250000,
        quantity: 2,
      });

      addToCart(storeDomain, {
        productId: 'prod-2',
        name: 'Tas Ransel',
        price: 150000,
        quantity: 1,
      });

      expect(getCartCount(storeDomain)).toBe(3);
      expect(getCart(storeDomain)).toHaveLength(2);
    });
  });

  describe('updateCartQuantity and removeFromCart', () => {
    it('updates quantity of existing item', () => {
      addToCart(storeDomain, {
        productId: 'prod-1',
        name: 'Sepatu',
        price: 100000,
        quantity: 2,
      });

      const updated = updateCartQuantity(storeDomain, 'prod-1', 5);
      expect(updated.totalCount).toBe(5);
      expect(getCartCount(storeDomain)).toBe(5);
    });

    it('removes item when quantity is reduced to 0', () => {
      addToCart(storeDomain, {
        productId: 'prod-1',
        name: 'Sepatu',
        price: 100000,
        quantity: 2,
      });

      const updated = updateCartQuantity(storeDomain, 'prod-1', 0);
      expect(updated.totalCount).toBe(0);
      expect(updated.cart).toHaveLength(0);
      expect(getCart(storeDomain)).toHaveLength(0);
    });

    it('removes specific item using removeFromCart', () => {
      addToCart(storeDomain, { productId: 'p1', name: 'Item 1', price: 10000, quantity: 1 });
      addToCart(storeDomain, { productId: 'p2', name: 'Item 2', price: 20000, quantity: 2 });

      const res = removeFromCart(storeDomain, 'p1');
      expect(res.totalCount).toBe(2);
      expect(res.cart).toHaveLength(1);
      expect(res.cart[0].productId).toBe('p2');
    });
  });

  describe('clearCart', () => {
    it('clears all items and sets count to 0', () => {
      addToCart(storeDomain, { productId: 'p1', name: 'Item 1', price: 10000, quantity: 2 });
      expect(getCartCount(storeDomain)).toBe(2);

      clearCart(storeDomain);
      expect(getCartCount(storeDomain)).toBe(0);
      expect(getCart(storeDomain)).toHaveLength(0);
    });
  });
});
