import { expect } from "@playwright/test";
import { getEnvVar } from "../../env";
import { test } from "../../fixtures";
import {
  NextJsContext,
  setupNextJs,
  teardownNextJs,
} from "../../nextjs/nextjs-setup";
import { setupCms } from "../../utils";
import { waitForPlasmicDynamic } from "../playwright-utils";

test.describe(`NextJS CMS`, () => {
  let ctx: NextJsContext;

  test.beforeAll(async () => {
    const cmsDatabase = await setupCms("cms-database-data.json");
    const host = getEnvVar("WAB_HOST");
    ctx = await setupNextJs({
      bundleFile: "plasmic-cms.json",
      projectName: "CMS Project",
      npmRegistry: getEnvVar("NPM_CONFIG_REGISTRY"),
      codegenHost: getEnvVar("WAB_HOST"),
      removeComponentsPage: true,
      bundleTransformation: (bundle) =>
        bundle
          .replace(`<REPLACE_WITH_STUDIO_URL>`, host)
          .replace(`<REPLACE_WITH_CMS_ID>`, cmsDatabase.id)
          .replace(`<REPLACE_WITH_PUBLIC_TOKEN>`, cmsDatabase.publicToken),
    });
  });

  test.afterAll(async () => {
    await teardownNextJs(ctx);
  });

  test(`should work`, async ({ page }) => {
    await page.goto(ctx.host);

    await waitForPlasmicDynamic(page);

    await expect(page.getByText("First blog post").first()).toBeVisible({
      timeout: 30000,
    });
  });
});
