import { FrameLocator, Page, expect } from "@playwright/test";
import { PageModels, test } from "../fixtures/test";
import { RightPanel } from "../models/components/right-panel";
import { goToProject } from "../utils/studio-utils";

let isWithinLiveFrame = false;
let liveFrame: FrameLocator;
let models: PageModels;
let canvasFrame: FrameLocator;

async function showMoreInSidebarModal(rightPanel: any) {
  const showMoreBtn = rightPanel.frame
    .locator('[data-test-id="show-extra-content"]')
    .last();
  await showMoreBtn.waitFor({ state: "visible", timeout: 5000 });
  await showMoreBtn.click();
}

async function chooseDataPlasmicProp(
  rightPanel: RightPanel,
  prop: string,
  value: string
) {
  await rightPanel.frame.locator(`[data-plasmic-prop="${prop}"]`).click();

  await rightPanel.frame
    .locator('[data-plasmic-role="overlay"]')
    .waitFor({ state: "visible", timeout: 5000 });
  const option = rightPanel.frame.locator(
    `[data-plasmic-role="overlay"] [data-key="'${value}'"]`
  );
  await option.click();

  await rightPanel.page.waitForTimeout(300);
}

function maybeSelectedElt(_page?: Page) {
  if (isWithinLiveFrame && liveFrame) {
    return liveFrame.locator("#plasmic-app");
  } else {
    return canvasFrame;
  }
}

async function checkLightFgColors(page?: Page) {
  const element = maybeSelectedElt(page);
  await element
    .locator(".ant-menu-item a")
    .first()
    .waitFor({ state: "visible", timeout: 5000 });
  const menuItem = element.locator(".ant-menu-item a").first();
  const color = await menuItem.evaluate(
    (el: Element) => getComputedStyle(el).color
  );

  const validColors = [
    "rgba(255, 255, 255, 0.65)",
    "rgba(255, 255, 255, 0.75)",
  ];

  expect(validColors).toContain(color);
}

async function checkDarkFgColors(page?: Page) {
  const element = maybeSelectedElt(page);
  await element
    .locator(".ant-menu-item a")
    .first()
    .waitFor({ state: "visible", timeout: 5000 });
  const menuItem = element.locator(".ant-menu-item a").first();
  const color = await menuItem.evaluate(
    (el: Element) => getComputedStyle(el).color
  );
  expect(color).toBe("rgba(83, 83, 83, 0.65)");
}

async function checkActiveNavDarkBgPrimary(page?: Page) {
  const element = maybeSelectedElt(page);
  const activeItem = element.locator(".ant-menu-item").last();
  await activeItem.waitFor({ state: "visible", timeout: 5000 });
  const bgColor = await activeItem.evaluate(
    (el: Element) => getComputedStyle(el).backgroundColor
  );
  const validBgColors = ["rgb(22, 104, 220)", "rgba(0, 0, 0, 0.15)"];
  expect(validBgColors).toContain(bgColor);
}

async function checkSubmenus(page?: Page) {
  const element = maybeSelectedElt(page);
  await expect(
    element
      .locator(".ant-menu-submenu-open")
      .filter({ hasText: "Should be expanded" })
  ).toBeVisible();
  await expect(
    element.locator(".ant-menu-submenu-open").filter({ hasText: "Nested" })
  ).toBeVisible();
}

async function checkSiderStyles(page?: Page) {
  const element = maybeSelectedElt(page);
  const sider = element.locator(".ant-layout-sider");
  await sider.waitFor({ state: "visible", timeout: 5000 });
  const bgColor = await sider.evaluate(
    (el: Element) => getComputedStyle(el).backgroundColor
  );
  expect(bgColor).toBe("rgb(22, 119, 255)");
  await checkLightFgColors(page);
  await checkActiveNavDarkBgPrimary(page);
}

test.describe("hostless-rich-components", () => {
  let projectId: string;

  test.beforeEach(async ({ apiClient, page }) => {
    projectId = await apiClient.setupProjectWithHostlessPackages({
      hostLessPackagesInfo: [
        {
          name: "antd5",
          npmPkg: ["@plasmicpkgs/antd5"],
        },
        {
          name: "plasmic-rich-components",
          npmPkg: [
            "@plasmicpkgs/plasmic-rich-components",
            "@ant-design/icons",
            "@ant-design/pro-components",
          ],
          deps: ["antd5"],
        },
      ],
    });
    await goToProject(page, `/projects/${projectId}`);
  });

  test.afterEach(async ({ apiClient }) => {
    await apiClient.removeProjectAfterTest(
      projectId,
      "user2@example.com",
      "!53kr3tz!"
    );
  });

  test("RichLayout works", async ({ page, models: testModels }) => {
    models = testModels;

    await models.studio.createNewPageInOwnArena("About");
    const framed = models.studio.frames.first();

    await models.studio.turnOffDesignMode();

    await models.studio.leftPanel.insertNode("hostless-rich-layout");

    canvasFrame = framed.contentFrame();
    await canvasFrame
      .locator(".ant-layout-header")
      .waitFor({ state: "visible", timeout: 10000 });

    await canvasFrame.locator(".ant-layout-header").count();

    const loadingMask = models.studio.frame.locator(".right-pane__mask");
    await loadingMask
      .waitFor({ state: "hidden", timeout: 5000 })
      .catch(() => {});

    const defaultElt = maybeSelectedElt(page);
    await expect(defaultElt.locator(".ant-layout-header")).toHaveCSS(
      "background-color",
      "rgb(255, 255, 255)"
    );
    await checkDarkFgColors(page);

    const addBtn = models.studio.rightPanel.frame.locator(
      '[data-test-id="navMenuItems-add-btn"]'
    );
    await addBtn.click();

    await models.studio.rightPanel.frame
      .locator('[data-plasmic-prop="path"]')
      .waitFor({ state: "visible", timeout: 5000 });

    await models.studio.rightPanel.setDataPlasmicProp("path", "/about");

    await models.studio.rightPanel.setDataPlasmicProp("name", "About");

    await page.keyboard.press("Escape");

    await models.studio.rightPanel.frame
      .locator('[data-plasmic-prop="path"]')
      .waitFor({ state: "hidden", timeout: 5000 });

    const aboutElt = maybeSelectedElt();
    const lastLink = aboutElt.locator(".ant-layout-header li a").last();
    await lastLink.evaluate((el: Element) => getComputedStyle(el).color);

    await models.studio.rightPanel.clickDataPlasmicProp("simpleNavTheme");
    await models.studio.rightPanel.frame
      .locator('[data-plasmic-prop="scheme"]')
      .waitFor({ state: "visible", timeout: 5000 });

    await chooseDataPlasmicProp(models.studio.rightPanel, "scheme", "dark");
    await page.waitForTimeout(300);
    const darkElt = maybeSelectedElt(page);
    await expect(darkElt.locator(".ant-layout-header")).toHaveCSS(
      "background-color",
      "rgb(1, 21, 40)"
    );
    await checkLightFgColors(page);

    await chooseDataPlasmicProp(models.studio.rightPanel, "scheme", "custom");
    await page.waitForTimeout(300);
    await models.studio.rightPanel.clickDataPlasmicProp("customBgColor");
    await page.keyboard.type("#E6EEF4");
    await page.keyboard.press("Enter");
    const customElt = maybeSelectedElt(page);
    await expect(customElt.locator(".ant-layout-header")).toHaveCSS(
      "background-color",
      "rgb(230, 238, 244)"
    );
    await checkDarkFgColors(page);
    await models.studio.frame
      .locator("[data-test-id='back-sidebar-modal']")
      .click();

    await chooseDataPlasmicProp(models.studio.rightPanel, "scheme", "primary");
    await page.waitForTimeout(300);
    const primaryElt = maybeSelectedElt(page);
    await expect(primaryElt.locator(".ant-layout-header")).toHaveCSS(
      "background-color",
      "rgb(22, 119, 255)"
    );
    await checkLightFgColors(page);
    await checkActiveNavDarkBgPrimary(page);

    await page.keyboard.press("Escape");

    await chooseDataPlasmicProp(models.studio.rightPanel, "layout", "side");
    const siderElt = maybeSelectedElt(page);
    await siderElt
      .locator(".ant-layout-sider")
      .waitFor({ state: "visible", timeout: 5000 });
    await checkSiderStyles(page);

    const addNavBtn1 = models.studio.rightPanel.frame.locator(
      '[data-test-id="navMenuItems-add-btn"]'
    );
    await addNavBtn1.click();
    await page.waitForTimeout(200);

    await models.studio.rightPanel.setDataPlasmicProp("path", "/");

    await models.studio.rightPanel.setDataPlasmicProp(
      "name",
      "Should be closed"
    );
    await showMoreInSidebarModal(models.studio.rightPanel);
    await page.waitForTimeout(200);

    await page.waitForTimeout(300);

    const addNestedBtn1 = models.studio.rightPanel.frame.locator(
      '[data-test-id="routes-add-btn"]'
    );
    await addNestedBtn1.click();
    await page.waitForTimeout(400);

    await models.studio.rightPanel.setDataPlasmicProp("path", "/mismatch");
    await page.waitForTimeout(300);

    await models.studio.rightPanel.setDataPlasmicProp("name", "Mismatch");
    await page.waitForTimeout(300);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);

    const addNavBtn2 = models.studio.rightPanel.frame.locator(
      '[data-test-id="navMenuItems-add-btn"]'
    );
    await addNavBtn2.click();
    await page.waitForTimeout(200);

    await models.studio.rightPanel.setDataPlasmicProp("path", "/");

    await models.studio.rightPanel.setDataPlasmicProp(
      "name",
      "Should be expanded"
    );

    await showMoreInSidebarModal(models.studio.rightPanel);
    await page.waitForTimeout(200);

    await page.waitForTimeout(300);

    const addNestedBtn2 = models.studio.rightPanel.frame.locator(
      '[data-test-id="routes-add-btn"]'
    );
    await addNestedBtn2.click();
    await page.waitForTimeout(400);

    await models.studio.rightPanel.setDataPlasmicProp("path", "/about");
    await page.waitForTimeout(300);

    await models.studio.rightPanel.setDataPlasmicProp("name", "Nested");
    await page.waitForTimeout(300);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);

    await models.studio.withinLiveMode(async (liveFr: FrameLocator) => {
      isWithinLiveFrame = true;
      liveFrame = liveFr;

      await checkSiderStyles(page);

      await checkSubmenus(page);

      const collapsedButton = liveFrame.locator(
        ".ant-pro-sider-collapsed-button"
      );
      await collapsedButton.waitFor({ state: "visible", timeout: 5000 });
      await collapsedButton.click();
      await page.waitForTimeout(300);

      const sider = liveFrame.locator(".ant-layout-sider");
      const width1 = await sider.evaluate(
        (el: Element) => el.getBoundingClientRect().width
      );
      expect(width1).toBeLessThan(100);

      await collapsedButton.click();
      await page.waitForTimeout(300);

      const width2 = await sider.evaluate(
        (el: Element) => el.getBoundingClientRect().width
      );
      expect(width2).toBeGreaterThan(100);
    });
  });
});
