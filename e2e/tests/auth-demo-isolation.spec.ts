import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';

test.describe('E2E: Auth Demo Credentials Display & Client Isolation', () => {
  test('Demo Store: displays 3-role Quick-Fill buttons and fills credentials', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto('demo-store.local');

    // 1. Verify demo card and all 3 role buttons are visible
    await loginPage.expectDemoCardVisible();

    // 2. Test Admin Quick-Fill
    await loginPage.quickFillAdmin();

    // 3. Test Staff Quick-Fill
    await loginPage.quickFillStaff();

    // 4. Test Customer Quick-Fill
    await loginPage.quickFillCustomer();
  });

  test('Client / Duplicate Store: strictly hides all demo credentials cards', async ({ page }) => {
    const loginPage = new LoginPage(page);
    // Non-demo client domain
    await loginPage.goto('tokoberkahklien.com');

    // 1. Verify demo card is completely absent
    await loginPage.expectDemoCardHidden();

    // 2. Normal login inputs are visible and functional
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.submitButton).toBeVisible();
  });
});
