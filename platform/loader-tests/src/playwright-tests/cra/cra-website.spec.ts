import { CraContext, setupCra, teardownCra } from "../../cra/cra-setup";
import { getEnvVar } from "../../env";
import { test } from "../../fixtures";
import {
  testWebsiteComponents,
  testWebsiteDesktop,
  testWebsiteMobile,
} from "../helpers/website";

test.describe(`CRA Website`, () => {
  let ctx: CraContext;

  test.beforeAll(async () => {
    ctx = await setupCra({
      bundleFile: "plasmic-kit-website-components_16033.json",
      projectName: "PlasmicWebsite",
      npmRegistry: getEnvVar("NPM_CONFIG_REGISTRY"),
      codegenHost: getEnvVar("WAB_HOST"),
    });
  });

  test.afterAll(async () => {
    await teardownCra(ctx);
  });

  test(`should render desktop`, async ({ page }) => {
    await testWebsiteDesktop(page, { host: ctx.host });
  });

  test(`should render mobile`, async ({ page }) => {
    await testWebsiteMobile(page, { host: ctx.host });
  });

  test(`should render components`, async ({ page }) => {
    await testWebsiteComponents(page, { host: ctx.host });
  });
});
