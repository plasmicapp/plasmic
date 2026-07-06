import { expect, Locator, Page } from "@playwright/test";

import { test } from "../../fixtures";
import {
  NextJsContext,
  setupNextJs,
  teardownNextJs,
} from "../../nextjs/nextjs-setup";

/**
 * Verifies that executeServerQueries (the server-side prefetch) skips a code component's
 * subtree when the component sets `subtreePrefetchingConfig: false`, even while that subtree
 * is rendered (expanded).
 *
 * The assertion is made against the prefetched query cache that the page exposes as JSON, not
 * the rendered DOM. Queries are run during SSR, so its result exists in the DOM even if not
 * prefetched. Only the prefetch cache shows what the server prefetch actually fetched.
 *
 * As a secondary check (independent of prefetch config), the test also expands a card that is
 * collapsed by default, to confirm a query behind a false visibility condition is not executed
 * until the subtree actually renders.
 */

const PAGE_QUERY_TEXT = "page query data loaded";

// Card text (the cardQuery result) for each section's Item.
const PREFETCH_CARD_TEXT = "Red fish blue fish"; // ServerSection (prefetch enabled)
const NO_PREFETCH_CARD_TEXT = "All covered with cheese."; // NoPrefetchSection (prefetch off)

// Expanded NoPrefetchSection toggle button.
const NO_PREFETCH_OPEN_BTN = "On top of spaghetti (non-prefetch)";

// Button that causes a hidden component with query to show.
const PREFETCH_COLLAPSED_BTN = "One fish two fish (prefetch)";

/** The Item component, toggle button and card are siblings within. */
function itemFor(page: Page, buttonLabel: string): Locator {
  return page
    .getByRole("button", { name: buttonLabel, exact: true })
    .locator("..");
}

/** JSON of the executeServerQueries cache the page exposes. */
function prefetchedQueries(html: string): string {
  const match = html.match(
    /<script[^>]*id="plasmic-prefetched-server-queries"[^>]*>([\s\S]*?)<\/script>/
  );
  return match?.[1] ?? "";
}

test.describe(`NextJS Subtree Prefetching Config`, () => {
  let ctx: NextJsContext;

  test.beforeAll(async () => {
    ctx = await setupNextJs({
      bundleFile: "subtree-prefetching-config.json",
      projectName: "Subtree Prefetching Config",
      template: "template-app",
      loaderVersion: "latest",
      nextVersion: "16",
      reactVersion: "latest",
    });
  });

  test.afterAll(async () => {
    await teardownNextJs(ctx);
  });

  test(`subtreePrefetchingConfig gates server-side query prefetch`, async ({
    page,
  }) => {
    const response = await page.goto(`${ctx.host}/subtree-prefetching-config`);
    const prefetched = prefetchedQueries(await response!.text());
    expect(prefetched, "page did not expose prefetched query data").not.toBe(
      ""
    );

    // Page query and visible card query are prefetched, non-prefetched card query is not.
    expect(prefetched).toContain(PAGE_QUERY_TEXT);
    expect(prefetched).toContain(PREFETCH_CARD_TEXT);
    expect(prefetched).not.toContain(NO_PREFETCH_CARD_TEXT);

    // The skipped query still runs during React SSR, so the expanded card is visible. This
    // proves the query is wired up and only the explicit prefetch phase skipped it.
    await expect(
      itemFor(page, NO_PREFETCH_OPEN_BTN).getByText(NO_PREFETCH_CARD_TEXT)
    ).toBeVisible();

    const collapsedItem = itemFor(page, PREFETCH_COLLAPSED_BTN);
    await expect(collapsedItem.getByText(PREFETCH_CARD_TEXT)).toHaveCount(0);

    // Flip visibility condition and verify the query runs
    await page
      .getByRole("button", { name: PREFETCH_COLLAPSED_BTN, exact: true })
      .click();
    await expect(collapsedItem.getByText(PREFETCH_CARD_TEXT)).toBeVisible();
  });
});
