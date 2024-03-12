import { expect } from "@playwright/test";
import { getEnvVar } from "../env";
import { test } from "../fixtures";

const host = getEnvVar("WAB_HOST");

// TODO: unskip when Studio runs in Playwright
// https://linear.app/plasmic/issue/PLA-10580
test.describe.skip(`auth`, async () => {
  test("sign up, logout, login", async ({ page }) => {
    const email = `${Date.now()}@example.com`;
    await test.step("sign up", async () => {
      await page.goto(host);
      await page.waitForURL(`${host}/login?continueTo=%2F`);
      await page.getByText("Create account").click();

      await page.waitForURL(`${host}/signup?continueTo=%2F`);
      await page.getByPlaceholder("Work email address").fill(email);
      await page.getByPlaceholder("Password").fill("SuperSecretPassword!!");
      await page.getByPlaceholder("First name").fill("GivenName");
      await page.getByPlaceholder("Last name").fill("FamilyName");
      await page.getByText("Sign up", { exact: true }).click();

      await page.waitForURL(`${host}/survey?continueTo=%2F`);
      await page.getByText("Continue").click();

      await page.waitForURL(`${host}/email-verification?continueTo=%2F`);
      await expect(
        page.getByText(
          `To use Plasmic, click the verification link in the email we sent to ${email}.`
        )
      ).toBeVisible();

      await page.goto(`${host}/dashboard`);
      await page.waitForURL(
        `${host}/email-verification?continueTo=%2Fdashboard`
      );

      // TODO: test email verification

      const self = await page.request
        .get(`${host}/api/v1/auth/self`)
        .then((res) => res.json());
      expect(self).toMatchObject({
        user: {
          email,
          firstName: "GivenName",
          lastName: "FamilyName",
        },
      });
    });
    await test.step("logout", async () => {
      await page.goto(`${host}/logout`);
      await page.waitForURL(`${host}/login`);
      const selfError = await page.request
        .get(`${host}/api/v1/auth/self`)
        .then((res) => res.json());
      expect(selfError).toMatchObject({
        error: {
          statusCode: 401,
        },
      });
    });
    await test.step("login", async () => {
      await page.getByPlaceholder("Work email address").fill(email);
      await page.getByPlaceholder("Password").fill("SuperSecretPassword!!");
      await page.getByText("Sign in", { exact: true }).click();

      await page.waitForURL(`${host}/email-verification?continueTo=%2F`);
      const self = await page.request
        .get(`${host}/api/v1/auth/self`)
        .then((res) => res.json());
      expect(self).toMatchObject({
        user: {
          email,
          firstName: "GivenName",
          lastName: "FamilyName",
        },
      });
    });
  });

  test("sign up rejects weak passwords", async ({ page }) => {
    const email = `${Date.now()}@example.com`;
    await page.goto(`${host}/signup`);
    await page.getByPlaceholder("Work email address").fill(email);
    await page.getByPlaceholder("Password").fill("password1234");
    await page.getByPlaceholder("First name").fill("GivenName");
    await page.getByPlaceholder("Last name").fill("FamilyName");
    await page.getByText("Sign up", { exact: true }).click();
    await expect(
      page.getByText("Please try a stronger password.")
    ).toBeVisible();
  });

  test("sign up with promo code", async ({ page }) => {
    const email = `${Date.now()}@example.com`;
    await test.step("set promo code cookie", async () => {
      const promoCode = await page.request
        .get(`${host}/api/v1/promo-code/FREETESTING`)
        .then((res) => res.json());
      await page.context().addCookies([
        {
          url: host,
          name: "promo_code",
          value: encodeURIComponent(JSON.stringify(promoCode)),
        },
      ]);
    });
    await test.step("sign up", async () => {
      await page.goto(`${host}/signup`);
      await expect(
        page.getByText("FREETESTING - Free trial for testing")
      ).toBeVisible();
      await page.getByPlaceholder("Work email address").fill(email);
      await page.getByPlaceholder("Password").fill("SuperSecretPassword!!");
      await page.getByPlaceholder("First name").fill("GivenName");
      await page.getByPlaceholder("Last name").fill("FamilyName");
      await page.getByText("Sign up", { exact: true }).click();

      await page.waitForURL(`${host}/survey?continueTo=%2F`);
      const self = await page.request
        .get(`${host}/api/v1/auth/self`)
        .then((res) => res.json());
      expect(self).toMatchObject({
        user: {
          email,
          firstName: "GivenName",
          lastName: "FamilyName",
        },
      });

      // TODO: verify promo code in DB
    });
  });
});
