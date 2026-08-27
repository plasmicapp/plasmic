import { expect } from "@playwright/test";
import { test } from "../fixtures/test";
import { modifierKey } from "../utils/key-utils";
import { setSelection } from "../utils/set-selection";
import { goToProject } from "../utils/studio-utils";

test.describe("dynamic-pages", () => {
  let projectId: string;
  test.beforeEach(async ({ apiClient, page }) => {
    projectId = await apiClient.setupNewProject({ name: "dynamic-pages" });
    await goToProject(page, `/projects/${projectId}`);
  });

  test.afterEach(async ({ apiClient }) => {
    await apiClient.removeProjectAfterTest(
      projectId,
      "user2@example.com",
      "!53kr3tz!"
    );
  });

  test("works", async ({ page, models }) => {
    const indexFrame = models.studio.frame
      .locator("iframe")
      .first()
      .contentFrame();
    const greeterFrame = models.studio.frame
      .locator("iframe")
      .nth(1)
      .contentFrame();

    await test.step("set up Index and Greeter pages", async () => {
      await models.studio.leftPanel.createNewPage("Index");
      await page.waitForTimeout(500);
      await models.studio.rightPanel.switchToComponentDataTab();
      await models.studio.rightPanel.setPagePath("/");

      await models.studio.leftPanel.createNewPage("Greeter");
      await page.waitForTimeout(1500);
      await models.studio.rightPanel.switchToComponentDataTab();
      await models.studio.rightPanel.setPagePath("/hello/[name]/[...more]");
      await models.studio.leftPanel.switchToTreeTab();
      await models.studio.rightPanel.setPageParamPreviewValue("name", "World");
      await models.studio.rightPanel.setPageParamPreviewValue("...more", "a/b");

      await models.studio.leftPanel.insertText();
      await greeterFrame.locator(".__wab_editor").dblclick({ force: true });
      const contentEditable = greeterFrame.locator('[contenteditable="true"]');
      await contentEditable.fill("");
      await contentEditable.fill("Hello XXX!");
      await setSelection(greeterFrame.getByText("Hello XXX!"), "XXX");
      await page.waitForTimeout(1_000);
      await page.keyboard.press(`${modifierKey}+Shift+S`);
      await page.keyboard.press("Escape");

      await models.studio.leftPanel.selectTreeNode(["XXX"]);
      await models.studio.bindRichTextToDynamicValue([
        "Page URL path params",
        "name",
      ]);

      // Bind the Greeter page's <head> title to the `name` path param too
      await models.studio.leftPanel.selectTreeNode(["vertical stack"]);
      await models.studio.leftPanel.insertNode("hostless-plasmic-head");
      await models.studio.bindPropToDynamicValue(
        '[data-test-id="prop-editor-row-title"] label',
        ["Page URL path params", "name"]
      );

      await models.studio.withinLiveMode(async (liveFrame) => {
        // Dynamic value on a sub-node appends a dynamic pill to existing static text
        await expect(
          liveFrame.locator("#plasmic-app .__wab_text").first()
        ).toContainText("Hello XXXWorld!");
      });
    });

    await test.step("repeated links with a dynamic path param", async () => {
      await models.studio.focusFrameRoot(indexFrame);
      await models.studio.leftPanel.insertText();
      await indexFrame.locator(".__wab_editor").dblclick({ force: true });
      const indexContentEditable = indexFrame.locator(
        '[contenteditable="true"]'
      );
      await indexContentEditable.fill("");
      await indexContentEditable.fill("Say hello to NAME");
      await setSelection(indexFrame.getByText("Say hello to NAME"), "NAME");
      await page.waitForTimeout(1_000);
      await page.keyboard.press(`${modifierKey}+Shift+S`);
      await page.keyboard.press("Escape");

      await models.studio.focusFrameRoot(indexFrame);
      await models.studio.leftPanel.selectTreeNode(['"Say hello to [child]"']);
      await models.studio.rightPanel.repeatOnCustomCode(
        '["foo", "bar", "baz"]'
      );

      await models.studio.leftPanel.selectTreeNode([
        '"Say hello to [child]"',
        '"NAME"',
      ]);
      await models.studio.bindRichTextToDynamicValue(["currentItem"]);

      await models.studio.leftPanel.selectTreeNode(['"Say hello to [child]"']);
      await page.keyboard.press("ControlOrMeta+Alt+L");
      await models.studio.waitForSave();

      await models.studio.frame.locator('[data-plasmic-prop="href"]').click();
      await models.studio.frame
        .getByRole("option", {
          name: "Greeter /hello/[name]/[...more]",
          exact: true,
        })
        .click();
      await models.studio.waitForSave();
      await models.studio.bindPropToDynamicValue(
        '[data-test-id="prop-editor-row-name"] label',
        ["currentItem"]
      );
      await models.studio.waitForSave();

      // Preserves the existing text, so the link text becomes "NAME" + item, and
      // the `name` param (defaulted to the preview value) becomes "World" + item
      const expected = [
        { text: "Say hello to NAMEfoo", href: "/hello/Worldfoo/a/b" },
        { text: "Say hello to NAMEbar", href: "/hello/Worldbar/a/b" },
        { text: "Say hello to NAMEbaz", href: "/hello/Worldbaz/a/b" },
      ];

      await models.studio.withinLiveMode(async (liveFrame) => {
        const links = liveFrame.locator("#plasmic-app a.__wab_text");
        await expect(links).toHaveCount(expected.length);

        for (let i = 0; i < expected.length; i++) {
          await expect(links.nth(i)).toContainText(expected[i].text);
          await expect(links.nth(i)).toHaveAttribute("href", expected[i].href);
        }

        await links.first().click();
        await page.waitForTimeout(1000);
        await expect(
          liveFrame.locator("#plasmic-app .__wab_text").first()
        ).toContainText("Hello XXXWorldfoo!");
        await expect(page).toHaveURL(/\/preview\/hello\/Worldfoo\/a\/b/);
      });
    });

    await test.step("special characters in path params are encoded", async () => {
      const name = "a b&c?d";
      const more = "e f/g+h";
      const expectedEncodedPath = "/hello/a%20b%26c%3Fd/e%20f/g%2Bh";
      const excepetdRawPath = `/hello/${name}/${more}`;

      // Change the Greeter page's preview values so that the page picker
      // copies the special characters into the new link's path params. The
      // repeated links above already hold their own literal copies of the old
      // preview values, so they are unaffected.
      await models.studio.focusFrameRoot(greeterFrame);
      await models.studio.rightPanel.switchToComponentDataTab();
      await models.studio.leftPanel.switchToTreeTab();
      await models.studio.rightPanel.setPageParamPreviewValue("name", name);
      await models.studio.rightPanel.setPageParamPreviewValue("...more", more);
      await models.studio.waitForSave();

      await models.studio.withinLiveMode(async (liveFrame) => {
        await expect(
          liveFrame.locator("#plasmic-app .__wab_text").first()
        ).toContainText(`Hello XXX${name}!`);
      });

      // Add a plain text link on Index (alongside the repeated links)
      await models.studio.focusFrameRoot(indexFrame);
      await models.studio.leftPanel.insertText();
      await models.studio.focusFrameRoot(indexFrame);
      await models.studio.leftPanel.selectTreeNode(['"Enter some text"']);
      await page.keyboard.press("ControlOrMeta+Alt+L");
      await models.studio.waitForSave();

      await models.studio.frame.locator('[data-plasmic-prop="href"]').click();
      await models.studio.frame
        .getByRole("option", {
          name: "Greeter /hello/[name]/[...more]",
          exact: true,
        })
        .click();
      await models.studio.waitForSave();

      const hrefPreview = models.studio.frame.locator(
        '[data-test-id="prop-editor-row-href-preview"]'
      );
      await expect(hrefPreview).toContainText(expectedEncodedPath);

      // Toggle "Encode?" off, then back on
      const encodeToggle = models.studio.frame.locator(
        '[data-test-id="page-href-encode"] [data-plasmic-prop="encode"]'
      );
      await encodeToggle.click();
      await expect(hrefPreview).toContainText(excepetdRawPath);
      await encodeToggle.click();
      await expect(hrefPreview).toContainText(expectedEncodedPath);
      await models.studio.waitForSave();

      await models.studio.withinLiveMode(async (liveFrame) => {
        const link = liveFrame
          .locator("#plasmic-app a")
          .filter({ hasText: "Enter some text" });
        await expect(link).toHaveAttribute("href", expectedEncodedPath);

        await link.click();
        await page.waitForTimeout(1000);
        await expect(
          liveFrame.locator("#plasmic-app .__wab_text").first()
        ).toContainText(`Hello XXX${name}!`);
        await expect(page).toHaveURL(
          new RegExp(`/preview${expectedEncodedPath}`)
        );
      });
    });
  });
});
