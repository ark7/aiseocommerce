import { Page, Locator, expect } from '@playwright/test';

export class AdminStaffPage {
  readonly page: Page;
  readonly pageTitle: Locator;
  readonly addStaffButton: Locator;
  readonly modal: Locator;
  readonly firstNameInput: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly titleInput: Locator;
  readonly saveStaffButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageTitle = page.getByRole('heading', { name: /Manajemen Staf & Akses Menu/i });
    this.addStaffButton = page.getByRole('button', { name: /Tambah Staf Baru/i });
    this.modal = page.locator('form');
    this.firstNameInput = page.getByPlaceholder('Contoh: Budi');
    this.emailInput = page.getByPlaceholder('staf@tokosaya.com');
    this.passwordInput = page.locator('input[type="password"]');
    this.titleInput = page.getByPlaceholder('Contoh: Customer Support / Admin Gudang');
    this.saveStaffButton = page.getByRole('button', { name: /Buat Akun Staf/i });
  }

  async goto() {
    await this.page.goto('/admin/staff');
    await this.page.waitForLoadState('domcontentloaded');
  }

  async expectLoaded() {
    await expect(this.pageTitle).toBeVisible();
    await expect(this.addStaffButton).toBeVisible();
  }

  async openCreateModal() {
    await this.addStaffButton.click();
    await expect(this.firstNameInput).toBeVisible();
  }

  async applyRolePreset(presetName: string) {
    const presetBtn = this.page.getByRole('button', { name: new RegExp(presetName, 'i') });
    await presetBtn.click();
  }

  async togglePermission(menuLabel: string) {
    const checkbox = this.page.getByLabel(new RegExp(menuLabel, 'i'));
    await checkbox.click();
  }
}
