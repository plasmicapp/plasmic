import { expect } from "@playwright/test";
import { LOADER_NEXTJS_VERSIONS_EXHAUSTIVE } from "../env";
import { test } from "../fixtures";
import {
  matchScreenshot,
  responseText,
  setViewportSize,
} from "./playwright-utils";
import {
  ProjectContext,
  ServerContext,
  makeEnvName,
  setupBundle,
  setupServer,
  teardownBundle,
  teardownServer,
} from "./setup-utils";

const ENVS = [
  ...LOADER_NEXTJS_VERSIONS_EXHAUSTIVE.map((x) => ({
    ...x,
    type: "nextjs" as const,
    template: "vanilla-template",
  })),
] as const;

test.skip(`Plasmic Website`, async () => {
  let bundleCtx: ProjectContext;
  test.beforeAll(async () => {
    bundleCtx = await setupBundle("plasmic-website-2023-cypress_12.json");
  });
  test.afterAll(async () => {
    await teardownBundle(bundleCtx);
  });

  for (const env of ENVS) {
    test.describe(makeEnvName(env), async () => {
      let serverCtx: ServerContext;
      test.beforeAll(async () => {
        serverCtx = await setupServer(env, bundleCtx);
      });
      test.afterAll(async () => {
        await teardownServer(serverCtx);
      });

      test(`should render desktop`, async ({ page }) => {
        await test.step("Visit /", async () => {
          const homeResp = await page.goto(serverCtx.host);

          const homeString = await responseText(homeResp);
          expect(homeString).toContain("without the limits");
          expect(homeString).toContain("Bridge the gap");

          await expect(page.getByText("Bridge the gap").first()).toBeVisible();
          await matchScreenshot(page, "plasmic-website-2023-home.png");
        });

        await test.step("Click on /pricing link", async () => {
          await page.locator(`a[href^="/pricing"]`).first().click();
          await expect(
            page.getByText("scale as you grow").first()
          ).toBeVisible();
          await matchScreenshot(page, "plasmic-website-2023-pricing.png");
        });

        await test.step("Navigate to /features", async () => {
          const featuresResp = await page.goto(`${serverCtx.host}/features`);
          const featuresString = await responseText(featuresResp);
          expect(featuresString).toContain("Mobile responsive by default");
          await matchScreenshot(page, "plasmic-website-2023-features.png");
        });
      });

      test(`should render mobile`, async ({ page }) => {
        await test.step("Set viewport size", async () => {
          setViewportSize(page, "iphone-x");
        });

        await test.step("Go to /", async () => {
          await page.goto(serverCtx.host);
          await expect(page.getByText("Bridge the gap").first()).toBeVisible();
          await matchScreenshot(page, "plasmic-website-2023-home-mobile.png");
        });

        await test.step("Go to /pricing", async () => {
          await page.goto(`${serverCtx.host}/pricing`);
          await expect(
            page.getByText("scale as you grow").first()
          ).toBeVisible();
          await matchScreenshot(
            page,
            "plasmic-website-2023-pricing-mobile.png"
          );
        });
      });
    });
  }
});
