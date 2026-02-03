import { Locator, Page } from "playwright/test";
import { BaseModel } from "./BaseModel";

export class AuthPage extends BaseModel {
  readonly emailInput: Locator = this.page.locator('input[name="email"]');
  readonly passwordInput: Locator = this.page.locator('input[name="password"]');
  readonly submitButton: Locator = this.page.locator('button[type="submit"]');
  readonly signOutDropdownItem: Locator = this.page.locator(".ant-dropdown", {
    hasText: "Sign Out",
  });

  constructor(page: Page) {
    super(page);
  }

  async login(email: string, password: string) {
    await this.emailInput.waitFor({ timeout: 120000 });
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async logout() {
    await this.page.locator('[data-test-id="btn-dashboard-user"]').click();
    await this.signOutDropdownItem.waitFor({ state: "visible" });
    await this.signOutDropdownItem.click();
  }
}
