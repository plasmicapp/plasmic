import { expect } from "playwright/test";
import { test } from "../fixtures/test";

test.describe("Authentication", () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
  });

  test("login and logout", async ({ page, models }) => {
    await page.goto("/");

    await models.auth.login("user2@example.com", "!53kr3tz!");

    await expect(
      page.locator('a[href="/projects"]', {
        hasText: "All projects",
      })
    ).toBeVisible();

    await models.auth.logout();

    const signInWithGoogleText = page.locator("text=Sign in with Google");
    await signInWithGoogleText.waitFor({ state: "visible" });
    await expect(signInWithGoogleText).toBeVisible();
  });
});
