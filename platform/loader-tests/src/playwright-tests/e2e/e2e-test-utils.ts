import { Page } from "@playwright/test";
import { getEnvVar } from "../../env";
import { test } from "../../fixtures";
import { setupCms, teardownCms } from "../../utils";
import {
  CodegenPlatform,
  Scheme,
  setupCodegenTest,
  teardownCodegenTest,
} from "./e2e-setup";

export interface E2eTestCase {
  scheme: Scheme;
  typescript: boolean;
  appDir?: boolean;
}

/**
 * Generates test cases for a given platform and runs them.
 *
 * On the CI, all changed packages are published to verdaccio and contribute to these tests.
 * To run this test locally, build/publish all changed packages to verdaccio and then run the test.
 *
 * 1. yarn local-publish
 * 3. yarn run local:playwright-ui
 */
export function defineE2eTests(
  platform: CodegenPlatform,
  cases: E2eTestCase[],
  assertions: (page: Page, host: string) => Promise<void>
) {
  test.describe(`${platform} e2e`, () => {
    let cmsDatabase: { id: string; publicToken: string };

    test.beforeAll(async () => {
      cmsDatabase = await setupCms("cms-database-data.json");
    });

    test.afterAll(async () => {
      await teardownCms(cmsDatabase.id);
    });

    for (const { scheme, typescript, appDir } of cases) {
      const lang = typescript ? "TS" : "JS";
      const router = appDir === undefined ? "" : appDir ? "App" : "Pages";

      test(`${scheme} / ${router ? `${router} / ` : ""}${lang}`, async ({
        page,
      }) => {
        const host = getEnvVar("WAB_HOST");

        const ctx = await setupCodegenTest({
          bundleFile: "cms.json",
          projectName: `test-${platform}-${scheme}-${
            router ? `${router.toLowerCase()}-` : ""
          }${lang.toLowerCase()}`,
          platform,
          scheme,
          appDir,
          typescript,
          bundleTransformation: (bundle) =>
            bundle
              .replaceAll(`<REPLACE_WITH_STUDIO_URL>`, host)
              .replaceAll(`<REPLACE_WITH_CMS_ID>`, cmsDatabase.id)
              .replaceAll(
                `<REPLACE_WITH_PUBLIC_TOKEN>`,
                cmsDatabase.publicToken
              ),
        });

        try {
          await assertions(page, ctx.host);
        } finally {
          await teardownCodegenTest(ctx);
        }
      });
    }
  });
}
