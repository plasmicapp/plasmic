import { expect } from "@playwright/test";
import { LOADER_NEXTJS_VERSIONS } from "../../env";
import { test } from "../../fixtures";
import {
  NextJsContext,
  setupNextJs,
  teardownNextJs,
} from "../../nextjs/nextjs-setup";

test.describe(`Plasmic Code Libraries`, async () => {
  for (const versions of LOADER_NEXTJS_VERSIONS) {
    const { loaderVersion, nextVersion } = versions;

    test.describe(`loader-nextjs@${loaderVersion}, next@${nextVersion}`, async () => {
      let ctx: NextJsContext;
      test.beforeEach(async ({ context }) => {
        ctx = await setupNextJs({
          bundleFile: "code-libs.json",
          projectName: "Code Libraries",
          removeComponentsPage: true,
          loaderVersion,
          nextVersion,
        });

        await context.route(
          "https://api.publicapis.org/entries?title=cats",
          (route) =>
            route.fulfill({
              status: 200,
              json: {
                count: 1,
                entries: [
                  {
                    API: "Cats",
                    Description: "Pictures of cats from Tumblr",
                    Auth: "apiKey",
                    HTTPS: true,
                    Cors: "no",
                    Link: "https://docs.thecatapi.com/",
                    Category: "Animals",
                  },
                ],
              },
            })
        );
      });

      test.afterEach(async () => {
        await teardownNextJs(ctx);
      });
      test(`Code Libraries`, async ({ page }) => {
        await page.goto(ctx.host);

        await expect(page.getByText(`Axios response: "Animals"`)).toBeVisible();
        await expect(
          page.getByText(`Copy to clipboard type: "function"`)
        ).toBeVisible();
        await expect(page.getByText(`date-fns result: 48 hours`)).toBeVisible();
        await expect(
          page.getByText(`day.js number of days in August: 31`)
        ).toBeVisible();
        await expect(
          page.getByText(`Faker name: "Maddison", PT-BR name: "Maria Eduarda"`)
        ).toBeVisible();
        await expect(
          page.getByText(
            `fast-stringify: {"foo":"[ref=.]","bar":{"bar":"[ref=.bar]","foo":"[ref=.]"}}`
          )
        ).toBeVisible();
        await expect(
          page.getByText(
            `Immer - state before: "done === false"; state after: "done === true"`
          )
        ).toBeVisible();
        /*
        TODO: isomorphic-fetch
        await expect(
          page.getByText(`Isomorphic-fetch response: "Animals"`)
        ).toBeVisible();
        */
        await expect(page.getByText(`jquery: red box width: 50`)).toBeVisible();
        await expect(
          page.getByText(`lodash partition: [[1,3],[2,4]]`)
        ).toBeVisible();
        await expect(
          page.getByText(
            `marked: <p>This text is <em><strong>really important</strong></em></p>`
          )
        ).toBeVisible();
        await expect(
          page.getByText(`MD5 hash: cd946e1909bfe736ec8921983eb9115f`)
        ).toBeVisible();
        await expect(
          page.getByText(
            `nanoid with single-character alphabet for stable results: 000000`
          )
        ).toBeVisible();
        await expect(page.getByText(`papaparse: 5 rows, 4 cols`)).toBeVisible();
        await expect(
          page.getByText(`pluralize "house": "houses"`)
        ).toBeVisible();
        await expect(page.getByText(`random: 65`)).toBeVisible();
        await expect(page.getByText(`semver: 3.3.0`)).toBeVisible();
        await expect(
          page.getByText(`tinycolor2: rgb(255, 0, 0)`)
        ).toBeVisible();
        await expect(
          page.getByText(
            `uuid NIL: 00000000-0000-0000-0000-000000000000, validate: true`
          )
        ).toBeVisible();
        await expect(
          page.getByText(
            `zod parse valid: {"username":"Test"}, safeParse with invalid data success: false`
          )
        ).toBeVisible();
      });
    });
  }
});
