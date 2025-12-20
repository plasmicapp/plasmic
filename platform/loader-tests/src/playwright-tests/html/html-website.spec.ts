import { test } from "../../fixtures";
import { HtmlContext, setupHtml, teardownHtml } from "../../html/html-setup";
import { testWebsiteDesktop, testWebsiteMobile } from "../helpers/website";

test.describe(`HTML Website`, async () => {
  let ctx: HtmlContext;

  test.beforeEach(async () => {
    ctx = await setupHtml({
      bundleFile: "plasmic-kit-website-components_16033.json",
      projectName: "PlasmicWebsite",
    });
  });

  test.afterEach(async () => {
    await teardownHtml(ctx);
  });

  test(`should render desktop`, async ({ page }) => {
    await testWebsiteDesktop(page, { host: ctx.host });
  });

  test(`should render mobile`, async ({ page }) => {
    await testWebsiteMobile(page, { host: ctx.host });
  });
});
