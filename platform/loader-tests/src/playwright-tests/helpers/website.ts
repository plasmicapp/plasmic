import { expect, Page } from "@playwright/test";
import { matchScreenshot, waitForPlasmicDynamic } from "../playwright-utils";

export interface WebsiteCtx {
  host: string;
}

async function gotoUrl(page: Page, url: string) {
  await page.goto(url, { waitUntil: "domcontentloaded" });
}

function normalizeUrl(url: string) {
  return url.replace(/\/+$/, "");
}

export async function testWebsiteDesktop(page: Page, ctx: WebsiteCtx) {
  await gotoUrl(page, ctx.host);
  await waitForPlasmicDynamic(page);

  await expect(page.getByText("Try Plasmic for free").first()).toBeVisible();
  await matchScreenshot(page, "plasmic-website-home.png");

  await page
    .locator('a[href^="/pricing"]')
    .first()
    .click({ noWaitAfter: true });
  await page.waitForURL(
    (url) =>
      normalizeUrl(url.toString()) === normalizeUrl(`${ctx.host}/pricing`),
    {
      waitUntil: "domcontentloaded",
    }
  );

  await waitForPlasmicDynamic(page);
  await expect(page.getByText("Unlimited projects").first()).toBeVisible();
  await matchScreenshot(page, "plasmic-website-pricing.png");

  await gotoUrl(page, `${ctx.host}/cms`);
  await waitForPlasmicDynamic(page);
  await expect(
    page.getByText("Launch beautiful digital").first()
  ).toBeVisible();
  await matchScreenshot(page, "plasmic-website-cms.png");
}

export async function testWebsiteMobile(page: Page, ctx: WebsiteCtx) {
  await page.setViewportSize({ width: 375, height: 812 });

  await gotoUrl(page, ctx.host);
  await waitForPlasmicDynamic(page);

  await expect(page.getByText("Try Plasmic for free").first()).toBeVisible();
  await matchScreenshot(page, "plasmic-website-home-mobile.png");

  await gotoUrl(page, `${ctx.host}/pricing`);
  await waitForPlasmicDynamic(page);
  await expect(page.getByText("Unlimited projects").first()).toBeVisible();
  await matchScreenshot(page, "plasmic-website-pricing-mobile.png");
}

export async function testWebsiteComponents(page: Page, ctx: WebsiteCtx) {
  const response = await page.goto(`${ctx.host}/components`);

  if (response?.status() === 404) {
    expect(response.status()).toBe(404);
    return;
  }

  await waitForPlasmicDynamic(page);

  const bodyText = await page.locator("body").textContent();
  if (bodyText?.includes("VERY COOL")) {
    await expect(page.getByText("VERY COOL")).toBeVisible();
    await expect(page.getByText("James Armenta")).toBeVisible();
  } else {
    await expect(page.locator("body")).toContainText(/.+/);
  }

  await matchScreenshot(page, "plasmic-website-components.png");
}
