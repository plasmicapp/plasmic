import { expect, Locator, Page, Response } from "@playwright/test";

export async function responseText(resp: Response | null) {
  if (!resp) {
    return null;
  }
  return await resp.text();
}

type PageAssertions = ReturnType<typeof expect<Page>>;
export async function matchScreenshot(
  page: Page,
  name: string | string[],
  opts?: Parameters<PageAssertions["toHaveScreenshot"]>[0]
) {
  await page.locator("body").click();
  await page.evaluate(() =>
    (document.activeElement as HTMLElement | null)?.blur()
  );
  // Scroll to bottom and back up to trigger image load
  await page.evaluate(scrollToBottom);
  await page.evaluate(scrollToTop);
  await page.waitForTimeout(3000);
  await expect(page).toHaveScreenshot(name, {
    fullPage: true,
    maxDiffPixelRatio: 0.02,
    ...opts,
  });
}

const VIEWPORT_SIZES = {
  "iphone-x": { width: 375, height: 812 },
} as const;

export function setViewportSize(
  page: Page,
  viewport: keyof typeof VIEWPORT_SIZES
) {
  page.setViewportSize(VIEWPORT_SIZES[viewport]);
}

//
// Functions to be passed into evaluate(); executes in page context
//
export async function scrollToBottom() {
  const delay = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));
  for (let i = 0; i < document.body.scrollHeight; i += 100) {
    window.scrollTo(0, i);
    await delay(300);
  }
}
export async function scrollToTop() {
  window.scrollTo(0, 0);
}

export async function waitUntilNoChanges(page: Page, loc: Locator) {
  let prev = await loc.screenshot();
  while (true) {
    await page.waitForTimeout(500);
    const curr = await loc.screenshot();
    if (prev.equals(curr)) {
      break;
    }
    prev = curr;
  }
}

export async function waitForPlasmicDynamic(page: Page) {
  await page.waitForSelector(".ρd__all", { timeout: 30000 });

  await page.waitForFunction(
    () => {
      const elements = document.querySelectorAll(".ρd__all");
      if (elements.length === 0) {
        return false;
      }

      return Array.from(elements).some((el) => {
        const text = el.textContent || "";
        return !text.includes("Loading...") && text.trim().length > 0;
      });
    },
    { timeout: 60000 }
  );
}
