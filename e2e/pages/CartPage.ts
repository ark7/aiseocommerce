import { Page, Locator, expect } from '@playwright/test';

export class CartPage {
  readonly page: Page;
  readonly pageHeading: Locator;
  readonly emptyCartMessage: Locator;
  readonly startShoppingButton: Locator;
  readonly checkoutButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageHeading = page.getByRole('heading', { name: /Keranjang/i });
    this.emptyCartMessage = page.getByText(/Keranjang Anda masih kosong/i);
    this.startShoppingButton = page.getByRole('link', { name: /Mulai Belanja/i });
    this.checkoutButton = page.getByRole('button', { name: /Lanjut ke Pembayaran/i });
  }

  async goto() {
    await this.page.goto('/cart');
    await this.page.waitForLoadState('domcontentloaded');
  }

  async expectEmpty() {
    await expect(this.emptyCartMessage).toBeVisible();
    await expect(this.startShoppingButton).toBeVisible();
  }

  async seedCartItem(item: {
    productId: string;
    name: string;
    price: number;
    quantity: number;
    storeDomain?: string;
  }) {
    const domain = item.storeDomain || 'demo-store.local';
    await this.page.evaluate(
      ({ domain, item }) => {
        const cartKey = `cart_${domain}`;
        localStorage.setItem(cartKey, JSON.stringify([item]));
      },
      { domain, item }
    );
    await this.page.reload();
  }
}
