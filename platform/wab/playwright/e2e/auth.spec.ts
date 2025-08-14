import { test } from "../fixtures/test";

test.describe("Authentication", () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
  });

  test("login and logout", async ({ page, models }) => {
    await page.goto("/");

    await models.auth.login("user2@example.com", "!53kr3tz!");

    await models.auth.expectLoggedIn();

    await models.auth.logout();

    await models.auth.expectLoggedOut();
  });
});
