import { expect } from "@playwright/test";
import { getEnvVar } from "../../env";
import { test } from "../../fixtures";
import {
  GatsbyContext,
  setupGatsby,
  teardownGatsby,
} from "../../gatsby/gatsby-setup";
import { waitForPlasmicDynamic } from "../playwright-utils";

const SPLIT_ID = "j7cCxfS-Vu";
const SLICE_0_ID = "I4hoVVeME_";
const SLICE_1_ID = "6z5_V8jUij";

test.describe(`Gatsby Split`, () => {
  let ctx: GatsbyContext;

  test.beforeAll(async () => {
    ctx = await setupGatsby({
      bundleFile: "plasmic-split-components.json",
      projectName: "Split",
      npmRegistry: getEnvVar("NPM_CONFIG_REGISTRY"),
      codegenHost: getEnvVar("WAB_HOST"),
      template: "split",
    });
  });

  test.afterAll(async () => {
    await teardownGatsby(ctx);
  });

  test(`should render root page from plasmic`, async ({ page }) => {
    await page.context().addCookies([
      {
        name: `plasmic:exp.${SPLIT_ID}`,
        value: SLICE_1_ID,
        domain: new URL(ctx.host).hostname,
        path: "/",
      },
    ]);

    await page.goto(ctx.host);
    await waitForPlasmicDynamic(page);

    await expect(page.getByText("Split testing page")).toBeVisible();
    await expect(page.getByText("active experiment")).toBeVisible();
    await expect(page.getByText("inactive segment")).toBeVisible();
    await expect(page.getByText("active schedule")).toBeVisible();
  });

  test(`should render segment page`, async ({ page }) => {
    await page.context().addCookies([
      {
        name: `plasmic:exp.${SPLIT_ID}`,
        value: SLICE_1_ID,
        domain: new URL(ctx.host).hostname,
        path: "/",
      },
    ]);

    await page.goto(`${ctx.host}/segment`);
    await waitForPlasmicDynamic(page);

    await expect(page.getByText("Split testing page")).toBeVisible();
    await expect(page.getByText("active experiment")).toBeVisible();
    await expect(page.getByText("active segment")).toBeVisible();
    await expect(page.getByText("active schedule")).toBeVisible();
  });

  test(`should render schedule page`, async ({ page }) => {
    await page.context().addCookies([
      {
        name: `plasmic:exp.${SPLIT_ID}`,
        value: SLICE_1_ID,
        domain: new URL(ctx.host).hostname,
        path: "/",
      },
    ]);

    await page.goto(`${ctx.host}/schedule`);
    await waitForPlasmicDynamic(page);

    await expect(page.getByText("Split testing page")).toBeVisible();
    await expect(page.getByText("active experiment")).toBeVisible();
    await expect(page.getByText("inactive schedule")).toBeVisible();
  });

  test(`should render experiment based on cookie`, async ({ page }) => {
    await page.context().addCookies([
      {
        name: `plasmic:exp.${SPLIT_ID}`,
        value: SLICE_0_ID,
        domain: new URL(ctx.host).hostname,
        path: "/",
      },
    ]);

    await page.goto(ctx.host);
    await waitForPlasmicDynamic(page);

    await expect(page.getByText("Split testing page")).toBeVisible();
    await expect(page.getByText("inactive experiment")).toBeVisible();
    await expect(page.getByText("inactive segment")).toBeVisible();
    await expect(page.getByText("active schedule")).toBeVisible();
  });
});
