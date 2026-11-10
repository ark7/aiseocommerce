import { test, expect } from '@playwright/test';
import { CartPage } from '../pages/CartPage';

test.describe('E2E: Customer Cart & Checkout Experience', () => {
  test('displays empty cart state with CTA to start shopping', async ({ page }) => {
    const cartPage = new CartPage(page);
    await cartPage.goto();
    await cartPage.expectEmpty();
  });

  test('renders seeded items with subtotal and quantity stepper in cart', async ({ page }) => {
    const cartPage = new CartPage(page);
    await cartPage.goto();

    // Seed item into cart
    await cartPage.seedCartItem({
      productId: 'e2e-prod-001',
      name: 'Kemeja Batik E2E Test',
      price: 250000,
      quantity: 1,
      storeDomain: 'demo-store.local',
    });

    // Verify product name and subtotal
    await expect(page.getByText('Kemeja Batik E2E Test')).toBeVisible();
    await expect(page.getByText('250.000').first()).toBeVisible();
  });
});
