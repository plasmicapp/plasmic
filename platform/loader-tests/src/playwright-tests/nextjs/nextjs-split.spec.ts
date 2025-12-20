import { expect } from "@playwright/test";

import { test } from "../../fixtures";
import {
  NextJsContext,
  setupNextJs,
  teardownNextJs,
} from "../../nextjs/nextjs-setup";

const SPLIT_ID = "j7cCxfS-Vu";
const SLICE_0_ID = "I4hoVVeME_";
const SLICE_1_ID = "6z5_V8jUij";

test.describe(`NextJS Split`, () => {
  let ctx: NextJsContext;

  test.beforeAll(async () => {
    ctx = await setupNextJs({
      bundleFile: "plasmic-split-components.json",
      projectName: "Split Components",
      template: "split",
    });
  });

  test.afterAll(async () => {
    await teardownNextJs(ctx);
  });

  test(`should render root page from plasmic with active experiment`, async ({
    page,
    browserName,
  }) => {
    test.skip(
      browserName === "firefox",
      "Run only on Chromium for performance"
    );
    // plasmic_seed=1 -> 0.8782152701169252, should active experiment
    await page
      .context()
      .addCookies([{ name: "plasmic_seed", value: "1", url: ctx.host }]);

    await page.goto(ctx.host);

    await expect(page.locator("body")).toContainText("Split testing page", {
      timeout: 30000,
    });
    await expect(page.locator("body")).toContainText("active experiment");
    await expect(page.locator("body")).toContainText("inactive segment");
    await expect(page.locator("body")).toContainText("active schedule");
  });

  test(`should render root page from plasmic with inactive experiment`, async ({
    page,
    browserName,
  }) => {
    test.skip(
      browserName === "firefox",
      "Run only on Chromium for performance"
    );
    // plasmic_seed=0 -> 0.11585319298319519, should not active experiment
    await page
      .context()
      .addCookies([{ name: "plasmic_seed", value: "0", url: ctx.host }]);

    await page.goto(ctx.host);

    await expect(page.locator("body")).toContainText("Split testing page", {
      timeout: 30000,
    });
    await expect(page.locator("body")).toContainText("inactive experiment");
    await expect(page.locator("body")).toContainText("inactive segment");
    await expect(page.locator("body")).toContainText("active schedule");
  });

  test(`should render segment page`, async ({ page, browserName }) => {
    test.skip(
      browserName === "firefox",
      "Run only on Chromium for performance"
    );
    // segment page should be rendered using nextjs SSR getActiveVariation which uses the ${type}.${id} cookie
    await page
      .context()
      .addCookies([
        { name: `plasmic:exp.${SPLIT_ID}`, value: SLICE_1_ID, url: ctx.host },
      ]);

    await page.goto(`${ctx.host}/segment`);

    await expect(page.locator("body")).toContainText("Split testing page", {
      timeout: 30000,
    });
    await expect(page.locator("body")).toContainText("active experiment");
    await expect(page.locator("body")).toContainText("active segment");
    await expect(page.locator("body")).toContainText("active schedule");
  });

  test(`should render schedule page`, async ({ page, browserName }) => {
    test.skip(
      browserName === "firefox",
      "Run only on Chromium for performance"
    );
    // schedule page should be rendered using nextjs SSR getActiveVariation which uses the ${type}.${id} cookie
    await page
      .context()
      .addCookies([
        { name: `plasmic:exp.${SPLIT_ID}`, value: SLICE_1_ID, url: ctx.host },
      ]);

    await page.goto(`${ctx.host}/schedule`);

    await expect(page.locator("body")).toContainText("Split testing page", {
      timeout: 30000,
    });
    await expect(page.locator("body")).toContainText("active experiment");
    await expect(page.locator("body")).toContainText("inactive schedule");
  });

  test(`should render custom page with custom trait`, async ({
    page,
    browserName,
  }) => {
    test.skip(
      browserName === "firefox",
      "Run only on Chromium for performance"
    );
    await page.goto(`${ctx.host}/custom?utm_campaign=myfirstcampaign`);

    await expect(page.locator("body")).toContainText(
      "This is my campaign page",
      {
        timeout: 30000,
      }
    );
    await expect(page.locator("body")).toContainText(
      "You are seeing a campaign segment"
    );
  });

  test(`should render custom page with custom trait (inactive)`, async ({
    page,
    browserName,
  }) => {
    test.skip(
      browserName === "firefox",
      "Run only on Chromium for performance"
    );
    await page.goto(`${ctx.host}/custom?utm_campaign=nocampaign`);

    await expect(page.locator("body")).toContainText(
      "This is my campaign page",
      {
        timeout: 30000,
      }
    );
    await expect(page.locator("body")).toContainText("NO CAMPAIGN HERE");
  });

  test(`should get external ids and render it`, async ({
    page,
    browserName,
  }) => {
    test.skip(
      browserName === "firefox",
      "Run only on Chromium for performance"
    );
    await page
      .context()
      .addCookies([
        { name: `plasmic:exp.${SPLIT_ID}`, value: SLICE_0_ID, url: ctx.host },
      ]);

    await page.goto(`${ctx.host}/external?utm_campaign=nocampaign`);

    await expect(page.locator("body")).toContainText("External ids", {
      timeout: 30000,
    });
    await expect(page.locator("body")).toContainText(
      "ext-experiment: ext-experiment-a"
    );
    await expect(page.locator("body")).toContainText(
      "ext-utm-campaign: ext-utm-campaign-a"
    );
  });

  test(`should get external ids and render it (campaign)`, async ({
    page,
    browserName,
  }) => {
    test.skip(
      browserName === "firefox",
      "Run only on Chromium for performance"
    );
    await page
      .context()
      .addCookies([
        { name: `plasmic:exp.${SPLIT_ID}`, value: SLICE_1_ID, url: ctx.host },
      ]);

    await page.goto(`${ctx.host}/external?utm_campaign=myfirstcampaign`);

    await expect(page.locator("body")).toContainText("External ids", {
      timeout: 30000,
    });
    await expect(page.locator("body")).toContainText(
      "ext-experiment: ext-experiment-b"
    );
    await expect(page.locator("body")).toContainText(
      "ext-utm-campaign: ext-utm-campaign-b"
    );
  });
});
