/**
 * Centralized cart utility and real-time event dispatcher.
 * Ensures consistent storage keys, cart calculations, and cross-component
 * synchronization across AddToCartButton, StoreHeader, and CartPage.
 */
import { resolveBatchUnitPrice, type PriceTierInput } from '@/lib/pricing';

export type CartItemPriceTier = PriceTierInput;

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  isPreOrder?: boolean;
  productType?: 'PHYSICAL' | 'DIGITAL' | 'EVENT';
  storeDomain?: string;
  variantId?: string;
  variation?: string;
  hasBatchPricing?: boolean;
  minOrderQty?: number;
  baseUnitPrice?: number;
  priceTiers?: CartItemPriceTier[];
}

function recalculateBatchItemPrice(item: CartItem): CartItem {
  if (!item.hasBatchPricing) return item;
  const fallbackPrice = item.baseUnitPrice && item.baseUnitPrice > 0 ? item.baseUnitPrice : item.price;
  const resolution = resolveBatchUnitPrice(
    fallbackPrice,
    item.priceTiers,
    item.quantity,
    item.minOrderQty
  );
  return {
    ...item,
    price: resolution.unitPrice,
  };
}

export const CART_UPDATED_EVENT = 'cart-updated';

/**
 * Resolves the localStorage key for a store's cart.
 */
export function getCartStorageKey(storeDomain?: string | null): string {
  if (storeDomain && storeDomain.trim().length > 0) {
    return `cart_${storeDomain.trim()}`;
  }
  return 'cart';
}

/**
 * Dispatches synchronization events so all listeners in the current tab and
 * other tabs update instantly without needing a full page reload.
 */
export function dispatchCartUpdated(storeDomain?: string | null, count?: number): void {
  if (typeof window === 'undefined') return;

  const currentCount = count !== undefined ? count : getCartCount(storeDomain);
  const detail = { count: currentCount, storeDomain };

  // Dispatch custom event for the current window/tab
  try {
    window.dispatchEvent(new CustomEvent(CART_UPDATED_EVENT, { detail }));
  } catch {
    // ignore
  }

  // Also dispatch synthetic storage event for standard cross-tab / storage listeners
  try {
    window.dispatchEvent(new Event('storage'));
  } catch {
    // ignore
  }
}

/**
 * Retrieves the list of cart items for the given store domain.
 */
export function getCart(storeDomain?: string | null): CartItem[] {
  if (typeof window === 'undefined') return [];

  const key = getCartStorageKey(storeDomain);
  const raw = localStorage.getItem(key);

  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    // Filter items to ensure strict tenant isolation
    if (storeDomain && storeDomain.trim().length > 0) {
      const cleanDomain = storeDomain.trim().toLowerCase();
      return parsed.filter(
        (item: any) => !item.storeDomain || item.storeDomain.trim().toLowerCase() === cleanDomain
      );
    }
    return parsed;
  } catch {
    return [];
  }
}

/**
 * Computes the total quantity of items currently in the cart.
 */
export function getCartCount(storeDomain?: string | null): number {
  const items = getCart(storeDomain);
  return items.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);
}

/**
 * Adds an item to the cart or increments its quantity if already present.
 */
export function addToCart(storeDomain: string, item: CartItem): { cart: CartItem[]; totalCount: number } {
  if (typeof window === 'undefined') {
    return { cart: [], totalCount: 0 };
  }

  const key = getCartStorageKey(storeDomain);
  const cart = getCart(storeDomain);
  const existingIndex = cart.findIndex(
    (i) => i.productId === item.productId && (i.variantId || '') === (item.variantId || '')
  );

  if (existingIndex >= 0) {
    cart[existingIndex].quantity = (cart[existingIndex].quantity || 1) + (item.quantity || 1);
    // Update price or details if newer
    if (item.price) cart[existingIndex].price = item.price;
    if (item.name) cart[existingIndex].name = item.name;
    if (item.imageUrl) cart[existingIndex].imageUrl = item.imageUrl;
    if (item.variation) cart[existingIndex].variation = item.variation;
    if (item.hasBatchPricing !== undefined) cart[existingIndex].hasBatchPricing = item.hasBatchPricing;
    if (item.minOrderQty !== undefined) cart[existingIndex].minOrderQty = item.minOrderQty;
    if (item.baseUnitPrice !== undefined) cart[existingIndex].baseUnitPrice = item.baseUnitPrice;
    if (item.priceTiers !== undefined) cart[existingIndex].priceTiers = item.priceTiers;
    cart[existingIndex] = recalculateBatchItemPrice(cart[existingIndex]);
  } else {
    cart.push(recalculateBatchItemPrice({ ...item, storeDomain }));
  }

  localStorage.setItem(key, JSON.stringify(cart));
  const totalCount = cart.reduce((sum, i) => sum + (Number(i.quantity) || 1), 0);

  dispatchCartUpdated(storeDomain, totalCount);

  return { cart, totalCount };
}

/**
 * Updates the quantity of a specific item in the cart.
 */
export function updateCartQuantity(
  storeDomain: string,
  productId: string,
  quantity: number,
  variantId?: string
): { cart: CartItem[]; totalCount: number } {
  if (typeof window === 'undefined') {
    return { cart: [], totalCount: 0 };
  }

  const key = getCartStorageKey(storeDomain);
  let cart = getCart(storeDomain);

  const matches = (item: CartItem) =>
    item.productId === productId && (variantId === undefined || (item.variantId || '') === (variantId || ''));

  if (quantity <= 0) {
    cart = cart.filter((item) => !matches(item));
  } else {
    cart = cart.map((item) =>
      matches(item) ? recalculateBatchItemPrice({ ...item, quantity }) : item
    );
  }

  localStorage.setItem(key, JSON.stringify(cart));
  const totalCount = cart.reduce((sum, i) => sum + (Number(i.quantity) || 1), 0);

  dispatchCartUpdated(storeDomain, totalCount);

  return { cart, totalCount };
}

/**
 * Removes an item from the cart.
 */
export function removeFromCart(
  storeDomain: string,
  productId: string,
  variantId?: string
): { cart: CartItem[]; totalCount: number } {
  return updateCartQuantity(storeDomain, productId, 0, variantId);
}

/**
 * Clears the cart for a given store domain.
 */
export function clearCart(storeDomain: string): void {
  if (typeof window === 'undefined') return;

  const key = getCartStorageKey(storeDomain);
  localStorage.removeItem(key);
  dispatchCartUpdated(storeDomain, 0);
}

