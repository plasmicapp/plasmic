import { expect, Locator, Page } from "playwright/test";
import { BaseModel } from "./BaseModel";

export class AuthPage extends BaseModel {
  readonly emailInput: Locator = this.page.locator('input[name="email"]');
  readonly passwordInput: Locator = this.page.locator('input[name="password"]');
  readonly submitButton: Locator = this.page.locator('button[type="submit"]');
  readonly allProjectsLink: Locator = this.page.locator('a[href="/projects"]', {
    hasText: "All projects",
  });
  readonly dashboardUserButton: Locator = this.page.locator(
    '[data-test-id="btn-dashboard-user"]'
  );
  readonly signOutDropdownItem: Locator = this.page.locator(".ant-dropdown", {
    hasText: "Sign Out",
  });
  readonly signInWithGoogleText: Locator = this.page.locator(
    "text=Sign in with Google"
  );

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
    await this.dashboardUserButton.click();
    await this.signOutDropdownItem.waitFor({ state: "visible" });
    await this.signOutDropdownItem.click();
  }

  async expectLoggedIn() {
    await expect(this.allProjectsLink).toBeVisible();
  }

  async expectLoggedOut() {
    await this.signInWithGoogleText.waitFor({ state: "visible" });
    await expect(this.signInWithGoogleText).toBeVisible();
  }
}
