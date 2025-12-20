import { LOADER_NEXTJS_VERSIONS_EXHAUSTIVE } from "../../env";
import { test } from "../../fixtures";
import {
  NextJsContext,
  setupNextJs,
  teardownNextJs,
} from "../../nextjs/nextjs-setup";
import {
  testWebsiteComponents,
  testWebsiteDesktop,
  testWebsiteMobile,
} from "../helpers/website";

for (const {
  loaderVersion,
  nextVersion,
} of LOADER_NEXTJS_VERSIONS_EXHAUSTIVE) {
  test.describe(`NextJS Website loader-nextjs@${loaderVersion}, next@${nextVersion}`, () => {
    let ctx: NextJsContext;

    test.beforeAll(async () => {
      ctx = await setupNextJs({
        bundleFile: "plasmic-kit-website-components_16033.json",
        projectName: "PlasmicWebsite",
        loaderVersion,
        nextVersion,
      });
    });

    test.afterAll(async () => {
      await teardownNextJs(ctx);
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
}
