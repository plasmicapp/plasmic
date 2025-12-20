import { expect } from "@playwright/test";
import { LOADER_NEXTJS_VERSIONS } from "../../env";
import { test } from "../../fixtures";
import {
  NextJsContext,
  setupNextJs,
  teardownNextJs,
} from "../../nextjs/nextjs-setup";

test.describe(`Plasmic Quill (Rich Text Editor)`, async () => {
  for (const versions of LOADER_NEXTJS_VERSIONS) {
    const { loaderVersion, nextVersion } = versions;
    test.describe(`loader-nextjs@${loaderVersion}, next@${nextVersion}`, async () => {
      let ctx: NextJsContext;
      test.beforeEach(async () => {
        ctx = await setupNextJs({
          bundleFile: "react-quill.json",
          projectName: "React Quill",
          removeComponentsPage: true,
          loaderVersion,
          nextVersion,
        });
      });

      test.afterEach(async () => {
        await teardownNextJs(ctx);
      });

      test(`Rich Text Editor state`, async ({ page }) => {
        async function selectText() {
          await page.locator(`.ql-editor`).focus();
          await page.locator(`.ql-editor`).selectText();
        }

        async function positionCursor() {
          await selectText();
          await page.keyboard.press("ArrowRight");
        }

        await page.goto(`${ctx.host}/quill-test`);
        await expect(page.locator(`#quill-state`)).toHaveText(
          "<p>Hello World</p>"
        );

        await positionCursor();

        await page.locator(`.ql-bold`).click();
        await expect(page.locator(`.ql-bold.ql-active`)).toBeVisible();

        await page.keyboard.type(" Sarah");

        await expect(page.locator(`#quill-state`)).toHaveText(
          "<p>Hello World<strong> Sarah</strong></p>"
        );

        await page.locator(`.ql-underline`).click();
        await expect(page.locator(`.ql-underline.ql-active`)).toBeVisible();
        await page.keyboard.type("Ahmed");

        await expect(page.locator(`#quill-state`)).toHaveText(
          "<p>Hello World<strong> Sarah<u>Ahmed</u></strong></p>"
        );

        await page.locator(`.ql-underline`).click();
        await page.locator(`.ql-bold`).click();
        await expect(page.locator(`.ql-underline.ql-active`)).not.toBeVisible();
        await expect(page.locator(`.ql-bold.ql-active`)).not.toBeVisible();
        await page.keyboard.type(".");

        await expect(page.locator(`#quill-state`)).toHaveText(
          "<p>Hello World<strong> Sarah<u>Ahmed</u></strong>.</p>"
        );

        await selectText();
        await page.locator(`.ql-blockquote`).click();
        await expect(page.locator(`#quill-state`)).toHaveText(
          "<blockquote>Hello World<strong> Sarah<u>Ahmed</u></strong>.</blockquote>"
        );
      });
    });
  }
});
