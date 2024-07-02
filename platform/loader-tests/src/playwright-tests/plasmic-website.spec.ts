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
  })),
  { type: "gatsby" as const },
  { type: "cra" as const },
] as const;

test.skip(`Plasmic Website`, async () => {
  let bundleCtx: ProjectContext;
  test.beforeAll(async () => {
    bundleCtx = await setupBundle("plasmic-kit-website-components_16033.json");
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

      const checkSsr = env.type !== "cra";

      test(`should render desktop`, async ({ page }) => {
        await test.step("Visit /", async () => {
          const homeResp = await page.goto(serverCtx.host);

          if (checkSsr) {
            const homeString = await responseText(homeResp);
            expect(homeString).toContain("Try Plasmic for free");
            expect(homeString).toContain("Empower the whole team");
          }

          await expect(
            page.getByText("Try Plasmic for free").first()
          ).toBeVisible();
          await matchScreenshot(page, "plasmic-website-home.png", {
            mask: [productHuntBadge(page)],
          });
        });

        await test.step("Click on /pricing link", async () => {
          await page.locator(`a[href^="/pricing"]`).click();
          await expect(
            page.getByText("Unlimited projects").first()
          ).toBeVisible();
          await matchScreenshot(page, "plasmic-website-pricing.png");
        });

        await test.step("Navigate to /cms", async () => {
          const cmsResp = await page.goto(`${serverCtx.host}/cms`);
          if (checkSsr) {
            const cmsString = await responseText(cmsResp);
            expect(cmsString).toContain("Launch beautiful digital");
          }
          await matchScreenshot(page, "plasmic-website-cms.png", {
            mask: [productHuntBadge(page)],
          });
        });
      });

      test(`should render mobile`, async ({ page }) => {
        await test.step("Set viewport size", async () => {
          setViewportSize(page, "iphone-x");
        });

        await test.step("Go to /", async () => {
          await page.goto(serverCtx.host);
          await expect(
            page.getByText("Try Plasmic for free").first()
          ).toBeVisible();
          await matchScreenshot(page, "plasmic-website-home-mobile.png", {
            mask: [productHuntBadge(page)],
          });
        });

        await test.step("Go to /pricing", async () => {
          await page.goto(`${serverCtx.host}/pricing`);
          await expect(
            page.getByText("Unlimited projects").first()
          ).toBeVisible();
          await matchScreenshot(page, "plasmic-website-pricing-mobile.png");
        });
      });

      if (env.type !== "cra") {
        test(`should render components`, async ({ page }) => {
          await test.step("Go to /components", async () => {
            const resp = await page.goto(`${serverCtx.host}/components`);

            if (checkSsr) {
              const respText = await responseText(resp);
              expect(respText).toContain("VERY COOL");
              expect(respText).toContain(
                "already been a huge increase in efficiency"
              );
            }

            await expect(page.getByText("VERY COOL").first()).toBeVisible();
            await expect(page.getByText("James Armenta").first()).toBeVisible();

            await matchScreenshot(page, "plasmic-website-components.png");
          });
        });
      }
    });
  }
});

function productHuntBadge(page: Page) {
  return page.locator(
    `img[src*="https://api.producthunt.com/widgets/embed-image/v1/"]`
  );
}
