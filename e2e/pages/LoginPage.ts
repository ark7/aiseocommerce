import { Page, Locator, expect } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly demoCard: Locator;
  readonly demoAdminBtn: Locator;
  readonly demoStaffBtn: Locator;
  readonly demoCustomerBtn: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator('input[name="email"]');
    this.passwordInput = page.locator('input[name="password"]');
    this.submitButton = page.locator('button[type="submit"]');
    this.demoCard = page.locator('[data-testid="demo-credentials-card"]');
    this.demoAdminBtn = page.locator('[data-testid="demo-admin-btn"]');
    this.demoStaffBtn = page.locator('[data-testid="demo-staff-btn"]');
    this.demoCustomerBtn = page.locator('[data-testid="demo-customer-btn"]');
  }

  async goto(storeDomain?: string) {
    const url = storeDomain ? `/login?store=${storeDomain}` : '/login';
    await this.page.goto(url);
    await this.page.waitForLoadState('domcontentloaded');
  }

  async expectDemoCardVisible() {
    await expect(this.demoCard).toBeVisible();
    await expect(this.demoAdminBtn).toBeVisible();
    await expect(this.demoStaffBtn).toBeVisible();
    await expect(this.demoCustomerBtn).toBeVisible();
  }

  async expectDemoCardHidden() {
    await expect(this.demoCard).toHaveCount(0);
    await expect(this.demoAdminBtn).toHaveCount(0);
    await expect(this.demoStaffBtn).toHaveCount(0);
    await expect(this.demoCustomerBtn).toHaveCount(0);
  }

  async quickFillAdmin() {
    await this.demoAdminBtn.click();
    await expect(this.emailInput).toHaveValue('admin@demo-store.local');
    await expect(this.passwordInput).toHaveValue('password');
  }

  async quickFillStaff() {
    await this.demoStaffBtn.click();
    await expect(this.emailInput).toHaveValue('staff@demo-store.local');
    await expect(this.passwordInput).toHaveValue('password');
  }

  async quickFillCustomer() {
    await this.demoCustomerBtn.click();
    await expect(this.emailInput).toHaveValue('customer1@demo-store.local');
    await expect(this.passwordInput).toHaveValue('password');
  }

  async submit() {
    await this.submitButton.click();
  }
}
