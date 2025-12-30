import { getEnvVar } from "../../env";
import { test } from "../../fixtures";
import {
  NextJsContext,
  setupNextJs,
  teardownNextJs,
} from "../../nextjs/nextjs-setup";
import { setupCms } from "../../utils";
import { testCmsLoader } from "./shared/test-cms";

test.describe(`NextJS CMS`, () => {
  let ctx: NextJsContext;

  test.beforeAll(async () => {
    const cmsDatabase = await setupCms("cms-database-data.json");
    const host = getEnvVar("WAB_HOST");
    ctx = await setupNextJs({
      bundleFile: "cms.json",
      projectName: "CMS Project",
      removeComponentsPage: true,
      bundleTransformation: (bundle) =>
        bundle
          .replaceAll(`<REPLACE_WITH_STUDIO_URL>`, host)
          .replaceAll(`<REPLACE_WITH_CMS_ID>`, cmsDatabase.id)
          .replaceAll(`<REPLACE_WITH_PUBLIC_TOKEN>`, cmsDatabase.publicToken),
    });
  });

  test.afterAll(async () => {
    await teardownNextJs(ctx);
  });

  test.skip(`should work`, async ({ page }) => {
    await testCmsLoader(page, ctx.host);
  });
});
