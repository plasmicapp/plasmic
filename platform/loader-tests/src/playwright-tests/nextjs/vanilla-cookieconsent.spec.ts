import { expect } from "@playwright/test";
import { getEnvVar, LOADER_NEXTJS_VERSIONS } from "../../env";
import { test } from "../../fixtures";
import {
  NextJsContext,
  setupNextJs,
  teardownNextJs,
} from "../../nextjs/nextjs-setup";

test.describe(`@plasmicpkgs/vanilla-cookieconsent code components`, async () => {
  for (const versions of LOADER_NEXTJS_VERSIONS) {
    const { loaderVersion, nextVersion } = versions;

    test.describe(`loader-nextjs@${loaderVersion}, next@${nextVersion}`, async () => {
      let ctx: NextJsContext;

      test.beforeAll(async () => {
        ctx = await setupNextJs({
          // To create the bundle file:
          // 1. Create a Plasmic Studio project with the Cookie Consent component from @plasmicpkgs/vanilla-cookieconsent
          // 2. Create test pages with different configurations:
          //    - basic-consent: Default cookie consent with autoShow=true
          //    - no-auto-show: Page with autoShow=false
          //    - event-handlers-test: Page that captures and displays event handler calls
          // 3. Download the bundle as vanilla-cookieconsent.json and place it in platform/loader-tests/data/
          bundleFile: "vanilla-cookieconsent.json",
          projectName: "Vanilla Cookieconsent Test",
          npmRegistry: getEnvVar("NPM_CONFIG_REGISTRY"),
          codegenHost: getEnvVar("WAB_HOST"),
          removeComponentsPage: true,
          loaderVersion,
          nextVersion,
        });
      });

      test.afterAll(async () => {
        await teardownNextJs(ctx);
      });

      test(`Cookie consent modal appears on page load with autoShow enabled`, async ({
        page,
      }) => {
        await page.goto(`${ctx.host}/basic-consent`);

        const consentModal = page.locator(".cm-wrapper .cm");
        await expect(consentModal).toBeVisible({ timeout: 10000 });

        // Check for the default title
        await expect(page.getByText("We use cookies")).toBeVisible();
      });

      test(`Accept all cookies`, async ({ page }) => {
        await page.goto(`${ctx.host}/basic-consent`);

        const consentModal = page.locator(".cm-wrapper .cm");
        await expect(consentModal).toBeVisible({ timeout: 10000 });

        // Check that consent cookie is not defined before clicking
        const initialCookies = await page.context().cookies();
        const initialConsentCookie = initialCookies.find(
          (c) => c.name === "cc_cookie"
        );
        expect(initialConsentCookie).toBeUndefined();

        // Click accept all button
        await page.getByRole("button", { name: /accept all/i }).click();

        // Modal should disappear (wrapper also disappears)
        await expect(consentModal).not.toBeVisible();

        // Check that cookie was set (consent cookie)
        const cookies = await page.context().cookies();
        const consentCookie = cookies.find((c) => c.name === "cc_cookie");
        expect(consentCookie).toBeDefined();
      });

      test(`Reject all cookies`, async ({ page }) => {
        await page.goto(`${ctx.host}/basic-consent`);

        const consentModal = page.locator(".cm-wrapper .cm");
        await expect(consentModal).toBeVisible({ timeout: 10000 });

        // Click reject all button (acceptNecessaryBtn)
        await page.getByRole("button", { name: /reject all/i }).click();

        // Modal should disappear
        await expect(consentModal).not.toBeVisible();

        // Check that consent cookie was set
        const cookies = await page.context().cookies();
        const consentCookie = cookies.find((c) => c.name === "cc_cookie");
        expect(consentCookie).toBeDefined();
      });

      test(`Open preferences modal and view categories`, async ({ page }) => {
        await page.goto(`${ctx.host}/basic-consent`);

        const consentModal = page.locator(".cm-wrapper .cm");
        await expect(consentModal).toBeVisible({ timeout: 10000 });

        // Click preferences button
        await page
          .getByRole("button", { name: /manage.*preferences/i })
          .click();

        // Preferences modal should be visible
        await expect(page.getByText("Manage cookie preferences")).toBeVisible();

        // Should see different cookie categories (in toggle labels)
        await expect(
          page.locator('.toggle__label:has-text("Strictly Necessary")')
        ).toBeVisible();
        await expect(
          page.locator('.toggle__label:has-text("Performance and Analytics")')
        ).toBeVisible();
        await expect(
          page.locator('.toggle__label:has-text("Targeting and Advertising")')
        ).toBeVisible();
      });

      test(`Necessary cookies toggle is readonly`, async ({ page }) => {
        await page.goto(`${ctx.host}/basic-consent`);

        await expect(page.locator(".cm-wrapper .cm")).toBeVisible({
          timeout: 10000,
        });

        // Open preferences
        await page
          .getByRole("button", { name: /manage.*preferences/i })
          .click();

        // Click on Strictly Necessary section to expand (if not already expanded)
        // Target the expandable section container, then the clickable title within it
        await page
          .locator(".pm__section--expandable")
          .filter({ hasText: "Strictly Necessary" })
          .locator(".pm__section-title")
          .click();

        // The necessary toggle should be checked and disabled (readonly)
        const necessaryToggle = page.locator(
          'input.section__toggle[value="necessary"]'
        );

        await expect(necessaryToggle).toBeChecked();
        await expect(necessaryToggle).toBeDisabled();
      });

      test(`Cookie table is displayed in analytics section`, async ({
        page,
      }) => {
        await page.goto(`${ctx.host}/basic-consent`);

        await expect(page.locator(".cm-wrapper .cm")).toBeVisible({
          timeout: 10000,
        });

        // Open preferences
        await page
          .getByRole("button", { name: /manage.*preferences/i })
          .click();

        // Click on analytics section to expand
        // Target the expandable section container, then the clickable title within it
        await page
          .locator(".pm__section--expandable")
          .filter({ hasText: "Performance and Analytics" })
          .locator(".pm__section-title")
          .click();

        // Check for cookie table headers (they're in th elements)
        await expect(
          page.locator('.pm__table-th:has-text("Cookie")')
        ).toBeVisible();
        await expect(
          page.locator('.pm__table-th:has-text("Domain")')
        ).toBeVisible();
        await expect(
          page.locator('.pm__table-th:has-text("Description")')
        ).toBeVisible();

        // Check for example cookies defined in the component metadata
        await expect(page.getByText("_ga")).toBeVisible();
        await expect(page.getByText("_gid")).toBeVisible();
      });

      test(`No modal appears when autoShow is false`, async ({ page }) => {
        await page.goto(`${ctx.host}/no-auto-show`);

        expect(page.locator("#plasmic-cookie-consent")).toBeDefined();

        // Give it time to potentially show (but it shouldn't)
        await page.waitForTimeout(2000);

        // Cookie consent modal should not be visible
        const consentModal = page.locator(".cm-wrapper .cm");
        await expect(consentModal).not.toBeVisible();
      });

      test(`Footer links are displayed`, async ({ page }) => {
        await page.goto(`${ctx.host}/basic-consent`);

        // Wait for modal to appear (client-side initialization)
        await expect(page.locator(".cm-wrapper .cm")).toBeVisible({
          timeout: 10000,
        });

        // Check for footer links (as defined in the component metadata)
        const footerLinks = page.locator(".cm-wrapper .cm a");
        await expect(footerLinks).toHaveCount(2); // Impressum and Privacy Policy

        // Links should be visible
        await expect(
          page.getByRole("link", { name: /privacy policy/i })
        ).toBeVisible();
        await expect(
          page.getByRole("link", { name: /impressum/i })
        ).toBeVisible();
      });

      test(`Event handlers are called`, async ({ page }) => {
        await page.goto(`${ctx.host}/event-handlers-test`);

        // The test page should have elements that display when events fire
        // These would be set up in the Plasmic project to update text when events occur
        const modalReadyIndicator = page.locator("#on-modal-ready");
        const modalShowIndicator = page.locator("#on-modal-show");
        const consentIndicator = page.locator("#on-consent");
        const modalHideIndicator = page.locator("#on-modal-hide");

        await page.waitForSelector(".cm-wrapper .cm", {
          timeout: 10000,
        });

        // Initially indicators should exist
        await expect(modalReadyIndicator).toHaveText("true");
        await expect(modalShowIndicator).toHaveText("true");

        // Wait for modal to appear and events to fire
        await page.waitForTimeout(1000);

        // Accept cookies
        await page.getByRole("button", { name: /accept all/i }).click();

        await expect(consentIndicator).toHaveText("true");
        await expect(modalHideIndicator).toHaveText("true");
      });

      test(`Services are displayed in analytics category`, async ({ page }) => {
        await page.goto(`${ctx.host}/basic-consent`);

        // Wait for consent modal to appear first (client-side initialization)
        await expect(page.locator(".cm-wrapper .cm")).toBeVisible({
          timeout: 10000,
        });

        // Open preferences
        await page
          .getByRole("button", { name: /manage.*preferences/i })
          .click();

        // Expand analytics section
        await page
          .locator(
            '.pm__section--expandable:has-text("Performance and Analytics")'
          )
          .locator(".pm__section-title")
          .first()
          .click();

        // Should see service counter (e.g., "2 Services")
        // vanilla-cookieconsent displays this when there are multiple services
        await expect(page.locator(".pm__service-counter")).toBeVisible();

        // Should see individual services as defined in the metadata
        // Use .pm__service-title to target the service items specifically
        await expect(
          page.locator('.pm__service-title:has-text("Google Analytics")')
        ).toBeVisible();
        await expect(
          page.locator('.pm__service-title:has-text("Youtube Embed")')
        ).toBeVisible();
      });
    });
  }
});
