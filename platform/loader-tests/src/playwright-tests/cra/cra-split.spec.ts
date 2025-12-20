import { expect } from "@playwright/test";
import { CraContext, setupCra, teardownCra } from "../../cra/cra-setup";

import { test } from "../../fixtures";

const SPLIT_ID = "j7cCxfS-Vu";
const SLICE_0_ID = "I4hoVVeME_";
const SLICE_1_ID = "6z5_V8jUij";

test.describe(`Plasmic CRA`, async () => {
  let ctx: CraContext;
  const mainHeaderText = "Split testing page";

  test.beforeEach(async () => {
    ctx = await setupCra({
      bundleFile: "plasmic-split-components.json",
      projectName: "Split",
      template: "split",
    });
  });

  test.afterEach(async () => {
    await teardownCra(ctx);
  });

  test(`should render root page from plasmic`, async ({ page, context }) => {
    await context.addCookies([
      {
        name: `plasmic:exp.${SPLIT_ID}`,
        value: SLICE_1_ID,
        url: ctx.host || "",
      },
    ]);

    await page.goto(ctx.host);
    await expect(page.getByText(mainHeaderText)).toBeVisible({
      timeout: 10000,
    });

    await expect(page.getByText("active experiment")).toBeVisible();
    await expect(page.getByText("inactive segment")).toBeVisible();
    await expect(page.getByText("active schedule")).toBeVisible();
  });

  test(`should render segment page`, async ({ page, context }) => {
    await context.addCookies([
      {
        name: `plasmic:exp.${SPLIT_ID}`,
        value: SLICE_1_ID,
        url: ctx.host || "",
      },
    ]);

    await page.goto(`${ctx.host}/segment`);
    await expect(page.getByText(mainHeaderText)).toBeVisible({
      timeout: 10000,
    });

    await expect(page.getByText("active experiment")).toBeVisible();
    await expect(page.getByText("active segment")).toBeVisible();
    await expect(page.getByText("active schedule")).toBeVisible();
  });

  test(`should render schedule page`, async ({ page, context }) => {
    await context.addCookies([
      {
        name: `plasmic:exp.${SPLIT_ID}`,
        value: SLICE_1_ID,
        url: ctx.host || "",
      },
    ]);

    await page.goto(`${ctx.host}/schedule`);
    await expect(page.getByText(mainHeaderText)).toBeVisible({
      timeout: 10000,
    });

    await expect(page.getByText("active experiment")).toBeVisible();
    await expect(page.getByText("inactive schedule")).toBeVisible();
  });

  test(`should render experiment based on cookie`, async ({
    page,
    context,
  }) => {
    await context.addCookies([
      {
        name: `plasmic:exp.${SPLIT_ID}`,
        value: SLICE_0_ID,
        url: ctx.host || "",
      },
    ]);

    await page.goto(ctx.host);
    await expect(page.getByText(mainHeaderText)).toBeVisible({
      timeout: 10000,
    });

    await expect(page.getByText("inactive experiment")).toBeVisible();
    await expect(page.getByText("inactive segment")).toBeVisible();
    await expect(page.getByText("active schedule")).toBeVisible();
  });
});
