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

/**
 * Tracks client-side fetch/XHR requests on a page.
 * Set up before navigating, then call assertNone() after the page has loaded
 * to verify no unexpected client-side data fetching occurred (e.g. for SSR/SSG pages).
 */
export function trackClientFetches(page: Page) {
  const fetches: { url: string; resourceType: string }[] = [];

  page.on("request", (request) => {
    const type = request.resourceType();
    if (type === "fetch" || type === "xhr") {
      fetches.push({ url: request.url(), resourceType: type });
    }
  });

  return {
    get urls() {
      return fetches.map((f) => f.url);
    },

    /**
     * Asserts no client-side fetch/XHR requests were made.
     * @param opts.matching - Only consider requests whose URL matches this pattern
     * @param opts.exclude - Ignore requests whose URL matches this pattern
     */
    assertNone(opts?: { matching?: RegExp; exclude?: RegExp }) {
      let filtered = fetches;
      if (opts?.matching) {
        filtered = filtered.filter((f) => opts.matching!.test(f.url));
      }
      const exclude = opts?.exclude ?? /\/_next\/|[?&]_rsc=/;
      filtered = filtered.filter((f) => !exclude.test(f.url));
      expect(
        filtered,
        `Expected no client fetches, but found:\n${filtered
          .map((f) => `  ${f.resourceType}: ${f.url}`)
          .join("\n")}`
      ).toHaveLength(0);
    },
  };
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
    undefined,
    { timeout: 60000, polling: 1000 }
  );
}
