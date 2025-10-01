import { expect } from "@playwright/test";
import { test } from "../fixtures/test";

const TEST_DATA = {
  oldPage: {
    name: "OldPage",
    path: "/old-page",
  },
  oldDynamicPage: {
    name: "Old dynamic page",
    path: "/old-dynamic-page/[id]",
    dynamicPageParam: "4",
  },
  newPage: {
    name: "NewPage",
    path: "/new-page",
  },
};

type Page = {
  name: string;
  path: string;
  dynamicPageParam?: string;
};

test.describe("Page Links", () => {
  let projectId: string;

  test.beforeEach(async ({ apiClient, page }) => {
    projectId = await apiClient.setupProjectFromTemplate("page-replacement");
    await page.goto(`/projects/${projectId}`);
  });

  test.afterEach(async ({ apiClient }) => {
    await apiClient.removeProjectAfterTest(
      projectId,
      "user2@example.com",
      "!53kr3tz!"
    );
  });

  test("should replace page links from old page -> new page", async ({
    models,
  }) => {
    await models.studio.switchArena("Simple Links Test");

    async function assertHref(
      pageData: Page,
      isFallback: boolean,
      extras?: {
        queryString?: string;
        fragment?: string;
        pageParam?: string;
      },
      dataPlasmicProp = "href"
    ) {
      const placeholder = `${pageData.name} - ${pageData.path}`;
      const href = `${
        extras?.pageParam
          ? pageData.path.replace("[id]", extras?.pageParam)
          : pageData.path
      }${extras?.queryString ? `?${extras?.queryString}` : ""}${
        extras?.fragment ? `#${extras?.fragment}` : ""
      }`;

      const propElement = models.studio.frame
        .locator(`[data-plasmic-prop="${dataPlasmicProp}"]`)
        .first();
      await expect(propElement).toHaveAttribute("placeholder", placeholder);

      // previews are only available for Plasmic Link
      if (!isFallback && dataPlasmicProp === "href") {
        const previewElement = (
          await models.studio.getPropEditorRow("Preview")
        ).getByText(href);
        await expect(previewElement).toBeVisible();
      }
    }

    async function assertHrefs(simplePage: Page, dynamicPage: Page) {
      await models.studio.leftPanel.switchToTreeTab();
      await models.studio.leftPanel.selectTreeNode(["vertical stack", "link"]);
      await models.studio.rightPanel.switchToSettingsTab();
      await assertHref(simplePage, false, {
        queryString: "a=1",
        fragment: "123",
      });

      await models.studio.leftPanel.switchToTreeTab();
      await models.studio.leftPanel.selectTreeNode([
        "vertical stack",
        "link-with-fallback",
      ]);
      await assertHref(simplePage, true);

      await models.studio.leftPanel.switchToTreeTab();
      await models.studio.leftPanel.selectTreeNode([
        "vertical stack",
        "dynamic-link",
      ]);
      await assertHref(
        dynamicPage,
        false,
        dynamicPage.dynamicPageParam
          ? { pageParam: dynamicPage.dynamicPageParam }
          : undefined
      );

      // assert hrefs in interaction
      await models.studio.leftPanel.switchToTreeTab();
      await models.studio.leftPanel.selectTreeNode([
        "vertical stack",
        "text-with-interaction",
      ]);
      const onClickElement = await models.studio.getPropEditorRow("On click");
      await expect(onClickElement).toBeVisible();
      await expect(onClickElement).toContainText(`Go to ${simplePage.name}`);
      await onClickElement.click();
      await assertHref(simplePage, false, {}, "destination");
      await models.studio.rightPanel.closeSidebarModal();
      const onAbortElement = await models.studio.getPropEditorRow("On abort");
      await expect(onAbortElement).toBeVisible();
      await expect(onAbortElement).toContainText("Go to page");
      await onAbortElement.click();
      await assertHref(simplePage, false, {}, "destination");

      // assert hrefs in prop default/preview values
      await models.studio.rightPanel.switchToComponentDataTab();
      const propsSection = models.studio.frame.locator(
        `[data-test-id="props-section"]`
      );
      const labeledItem = propsSection
        .locator(`[data-plasmic-role="labeled-item"]`)
        .nth(1);
      await labeledItem.click();
      await assertHref(simplePage, false, {}, "default-value");
      await assertHref(simplePage, false, {}, "preview-value");
    }

    async function replaceAllLinks(oldPage: Page, newPage: Page) {
      const oldPageElement = (await models.studio.projectPanel()).getByText(
        oldPage.name
      );
      await oldPageElement.first().click({ button: "right" });

      const replaceMenuTrigger = models.studio.frame.getByText(
        "Replace all links to this page with"
      );
      await replaceMenuTrigger.waitFor({ state: "visible" });
      await replaceMenuTrigger.hover();

      const replaceMenu = models.studio.frame.locator(
        `#proj-item-menu-replaceAllLinks-popup`
      );
      const newPageOption = replaceMenu.getByText(newPage.name);
      await newPageOption.click();
    }

    await assertHrefs(TEST_DATA.oldPage, TEST_DATA.oldDynamicPage);

    // assert (dynamic page -> simple page) links replacement
    await replaceAllLinks(TEST_DATA.oldDynamicPage, TEST_DATA.newPage);
    await assertHrefs(TEST_DATA.oldPage, TEST_DATA.newPage);

    // assert (simple page -> dynamic page) links replacement
    await replaceAllLinks(TEST_DATA.newPage, TEST_DATA.oldDynamicPage);
    await assertHrefs(TEST_DATA.oldPage, TEST_DATA.oldDynamicPage);

    // assert (simple page -> simple page) links replacement
    await replaceAllLinks(TEST_DATA.oldPage, TEST_DATA.newPage);
    await assertHrefs(TEST_DATA.newPage, TEST_DATA.oldDynamicPage);
  });
});
