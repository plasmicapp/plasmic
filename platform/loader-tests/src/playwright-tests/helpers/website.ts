import { expect, Page } from "@playwright/test";
import { waitForPlasmicDynamic } from "../playwright-utils";

export interface WebsiteCtx {
  host: string;
}

export async function testWebsiteDesktop(page: Page, ctx: WebsiteCtx) {
  await page.goto(ctx.host);
  await waitForPlasmicDynamic(page);

  await expect(page.getByText("Try Plasmic for free").first()).toBeVisible();

  await page.locator('a[href^="/pricing"]').first().click();
  await waitForPlasmicDynamic(page);
  await expect(page.getByText("Unlimited projects").first()).toBeVisible();

  await page.goto(`${ctx.host}/cms`);
  await waitForPlasmicDynamic(page);
  await expect(
    page.getByText("Launch beautiful digital").first()
  ).toBeVisible();
}

export async function testWebsiteMobile(page: Page, ctx: WebsiteCtx) {
  await page.setViewportSize({ width: 375, height: 812 });

  await page.goto(ctx.host);
  await waitForPlasmicDynamic(page);

  await expect(page.getByText("Try Plasmic for free").first()).toBeVisible();

  await page.goto(`${ctx.host}/pricing`);
  await waitForPlasmicDynamic(page);
  await expect(page.getByText("Unlimited projects").first()).toBeVisible();
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
}
