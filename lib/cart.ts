/**
 * Centralized cart utility and real-time event dispatcher.
 * Ensures consistent storage keys, cart calculations, and cross-component
 * synchronization across AddToCartButton, StoreHeader, and CartPage.
 */

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  isPreOrder?: boolean;
  productType?: 'PHYSICAL' | 'DIGITAL' | 'EVENT';
  storeDomain?: string;
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
  let raw = localStorage.getItem(key);

  // If storeDomain was specified but no cart was found, also check fallback 'cart'
  if (!raw && storeDomain) {
    raw = localStorage.getItem('cart');
  }

  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
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
  const existingIndex = cart.findIndex((i) => i.productId === item.productId);

  if (existingIndex >= 0) {
    cart[existingIndex].quantity = (cart[existingIndex].quantity || 1) + (item.quantity || 1);
    // Update price or details if newer
    if (item.price) cart[existingIndex].price = item.price;
    if (item.name) cart[existingIndex].name = item.name;
    if (item.imageUrl) cart[existingIndex].imageUrl = item.imageUrl;
  } else {
    cart.push({ ...item, storeDomain });
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
  quantity: number
): { cart: CartItem[]; totalCount: number } {
  if (typeof window === 'undefined') {
    return { cart: [], totalCount: 0 };
  }

  const key = getCartStorageKey(storeDomain);
  let cart = getCart(storeDomain);

  if (quantity <= 0) {
    cart = cart.filter((item) => item.productId !== productId);
  } else {
    cart = cart.map((item) => (item.productId === productId ? { ...item, quantity } : item));
  }

  localStorage.setItem(key, JSON.stringify(cart));
  const totalCount = cart.reduce((sum, i) => sum + (Number(i.quantity) || 1), 0);

  dispatchCartUpdated(storeDomain, totalCount);

  return { cart, totalCount };
}

/**
 * Removes an item from the cart.
 */
export function removeFromCart(storeDomain: string, productId: string): { cart: CartItem[]; totalCount: number } {
  return updateCartQuantity(storeDomain, productId, 0);
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

