import { expect, Locator, Page, Response } from "@playwright/test";

export async function responseText(resp: Response | null) {
  if (!resp) {
    return null;
  }
  return await resp.text();
}

export async function matchScreenshot(page: Page, name: string | string[]) {
  await page.locator("body").click();
  await page.evaluate(() =>
    (document.activeElement as HTMLElement | null)?.blur()
  );
  await page.evaluate(preparePageForScreenshot);
  await expect(page).toHaveScreenshot(name, {
    fullPage: true,
    maxDiffPixelRatio: 0.02,
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

// Sets image loading to eager and scrolls to the bottom of the page to ensure
// all assets are loaded. Must be evaluated in page context.
async function preparePageForScreenshot() {
  const delay = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));
  const nextFrame = () =>
    new Promise((resolve) => window.requestAnimationFrame(() => resolve(null)));
  const waitForImage = (img: HTMLImageElement) => {
    if (img.complete) {
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      const done = () => resolve();
      img.addEventListener("load", done, { once: true });
      img.addEventListener("error", done, { once: true });
    });
  };

  for (const img of Array.from(document.images)) {
    img.loading = "eager";
    img.decoding = "async";
  }

  const viewportHeight = Math.max(window.innerHeight, 1);
  const maxScrollY = Math.max(
    document.body.scrollHeight,
    document.documentElement.scrollHeight
  );
  const step = Math.max(Math.floor(viewportHeight * 0.75), 400);

  for (let y = 0; y < maxScrollY; y += step) {
    window.scrollTo(0, y);
    await nextFrame();
    await delay(50);
  }

  window.scrollTo(0, 0);
  await nextFrame();

  await Promise.all([
    document.fonts?.ready ?? Promise.resolve(),
    ...Array.from(document.images, waitForImage),
  ]);
}

export async function waitUntilNoChanges(page: Page, loc: Locator) {
  let prev = await loc.screenshot();
  while (true) {
    await page.waitForTimeout(500);
    const curr = await loc.screenshot();
    if (prev.equals(new Uint8Array(curr))) {
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
