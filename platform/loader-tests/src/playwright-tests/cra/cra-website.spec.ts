import { CraContext, setupCra, teardownCra } from "../../cra/cra-setup";
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
