import { getEnvVar } from "../../env";
import { test } from "../../fixtures";
import {
  NextJsContext,
  setupNextJs,
  teardownNextJs,
} from "../../nextjs/nextjs-setup";
import { setupCms } from "../../utils";
import { testCms } from "./shared/cms-test";

test.describe(`NextJS Plasmic CMS`, () => {
  let ctx: NextJsContext;

  test.beforeAll(async () => {
    const cmsDatabase = await setupCms("cms-database-data.json");
    const host = getEnvVar("WAB_HOST");
    ctx = await setupNextJs({
      bundleFile: "plasmic-cms.json",
      projectName: "CMS Project",
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
    await testCms(page, ctx.host, {
      // There is no way to use the CMS Data Fetcher's context (which contains the query result) in the title, so we don't check it
      checkTitle: false,
      checkSSR: true,
    });
  });
});
