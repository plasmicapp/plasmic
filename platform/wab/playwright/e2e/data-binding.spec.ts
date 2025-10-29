import { expect } from "@playwright/test";
import { VERT_CONTAINER_CAP } from "../../src/wab/shared/Labels";
import { test } from "../fixtures/test";
import { setSelection } from "../utils/set-selection";

test.describe("data-binding", () => {
  let projectId: string;

  test.beforeEach(async ({ apiClient, page }) => {
    projectId = await apiClient.setupNewProject({ name: "data-binding" });
    await page.goto(`/projects/${projectId}`);
  });

  test.afterEach(async ({ apiClient }) => {
    await apiClient.removeProjectAfterTest(
      projectId,
      "user2@example.com",
      "!53kr3tz!"
    );
  });

  test("can access $props in data picker, bind text content to them, evaluate given value, rename prop", async ({
    page,
    models,
  }) => {
    await models.studio.leftPanel.addNewFrame();
    const framed = models.studio.getComponentFrameByIndex(0);

    await models.studio.focusFrameRoot(framed);
    await models.studio.leftPanel.insertNode(VERT_CONTAINER_CAP);
    await page.keyboard.press("Enter");

    await models.studio.extractComponentNamed("Comp");

    await models.studio.frame
      .getByText("[Edit component in new artboard]")
      .click();
    await page.waitForTimeout(1000);

    await models.studio.leftPanel.insertNode("Link");

    await models.studio.rightPanel.frame
      .locator('[data-test-id="prop-editor-row-href"] label')
      .click({ button: "right" });
    await models.studio.allowExternalAccessButton.hover();
    await models.studio.createNewPropButton.click();
    await models.studio.linkNewProp("linkProp");

    await models.studio.rightPanel.frame
      .locator('[data-test-id="text-content"] label')
      .click({ button: "right" });
    await models.studio.useDynamicValueButton.click();
    await models.studio.rightPanel.frame
      .locator('[data-test-id="data-picker"]')
      .getByText("linkProp")
      .click();
    await models.studio.rightPanel.frame
      .locator('[data-test-id="data-picker"]')
      .getByRole("button", { name: "Save" })
      .click();

    await models.studio.focusFrameRoot(framed);
    await models.studio.leftPanel.switchToTreeTab();
    await models.studio.leftPanel.frame
      .locator(".tpltree__label", { hasText: "Comp" })
      .click({ button: "right" });
    await models.studio.leftPanel.frame
      .getByText("Edit component Comp in place")
      .click();

    const checkValue = async (expected: string) => {
      await page.waitForTimeout(1000);
      await expect(framed.getByText(expected)).toBeVisible();
      await models.studio.withinLiveMode(async (liveFrame) => {
        await expect(liveFrame.locator("#plasmic-app a")).toHaveAttribute(
          "href",
          expected
        );
        await expect(liveFrame.locator("#plasmic-app a")).toContainText(
          expected
        );
      });
    };

    await checkValue("https://www.plasmic.app/");

    await models.studio.leftPanel.selectTreeNode(["Comp"]);

    const instancePropValue = "https://instance.prop.value";
    await models.studio.rightPanel.frame
      .locator('[data-test-id="prop-editor-row-linkProp"]')
      .getByRole("combobox")
      .click();

    const isMac = process.platform === "darwin";
    const cmdKey = isMac ? "Meta" : "Control";

    await page.waitForTimeout(100);
    await page.keyboard.press(`${cmdKey}+a`);
    await page.waitForTimeout(100);
    await page.keyboard.press("Delete");
    await page.waitForTimeout(100);
    await page.keyboard.type(instancePropValue);
    await page.waitForTimeout(100);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(100);

    await checkValue(instancePropValue);

    const rootElt2 = await models.studio.getSelectedElt();
    await rootElt2.dblclick({ force: true });
    await models.studio.rightPanel.switchToComponentDataTab();
    const linkPropLabel = models.studio.frame
      .locator('[data-test-id="props-section"]')
      .getByText("linkProp");
    await linkPropLabel.dblclick();
    await page.keyboard.type("newPropName");
    await page.keyboard.press("Enter");
    await models.studio.focusFrameRoot(framed);
    await checkValue(instancePropValue);
  });

  test("can bind tag attribute to data, component prop to data, visibility to data", async ({
    page,
    models,
  }) => {
    await models.studio.leftPanel.addNewFrame();
    const framed = models.studio.getComponentFrameByIndex(0);

    await models.studio.focusFrameRoot(framed);
    await models.studio.leftPanel.insertNode(VERT_CONTAINER_CAP);
    await page.keyboard.press("Enter");
    await models.studio.leftPanel.insertNode(VERT_CONTAINER_CAP);
    await page.keyboard.press("Enter");

    await models.studio.extractComponentNamed("Comp");

    await models.studio.frame
      .getByText("[Edit component in new artboard]")
      .click();
    await page.waitForTimeout(1000);

    await models.studio.leftPanel.insertNode("Link");

    await models.studio.rightPanel.frame
      .locator('[data-test-id="prop-editor-row-href"] label')
      .click({ button: "right" });
    await models.studio.allowExternalAccessButton.hover();
    await models.studio.createNewPropButton.click();
    await models.studio.linkNewProp("linkProp");

    const htmlAttributesSection = models.studio.frame.locator(
      '[data-test-id="html-attributes-section"] [data-test-id="collapse"]'
    );
    await htmlAttributesSection.click({ force: true });

    await models.studio.rightPanel.frame
      .locator('[data-plasmic-prop="title"]')
      .click({ button: "right" });
    await models.studio.useDynamicValueButton.click();
    await models.studio.rightPanel.frame
      .locator('[data-test-id="data-picker"]')
      .getByText("linkProp")
      .click();
    await models.studio.rightPanel.frame
      .locator('[data-test-id="data-picker"]')
      .getByRole("button", { name: "Save" })
      .click();

    await models.studio.leftPanel.switchToTreeTab();
    await models.studio.leftPanel.frame
      .locator(".tpltree__label", { hasText: "Link" })
      .click({ button: "right" });
    await models.studio.leftPanel.frame.getByText("Create component").click();
    await models.studio.extractComponentNameInput.fill("Link");
    await models.studio.extractSubmitButton.click();
    await page.waitForTimeout(500);

    await (
      await models.studio.rightPanel.getPropEditorRow("linkProp")
    ).click({ button: "right" });
    await models.studio.frame.getByText("Unlink from component prop").click();
    await (
      await models.studio.rightPanel.getPropEditorRow("linkProp")
    ).click({ button: "right" });
    await models.studio.useDynamicValueButton.click();
    const pathElement = models.studio.rightPanel.frame.locator(
      `[data-test-id="data-picker"] [data-test-id="0-linkProp"]`
    );
    await pathElement.click();

    const switchToCodeButton = models.studio.frame.getByText("Switch to Code");
    await switchToCodeButton.click();
    const monacoContainer = models.studio.rightPanel.frame.locator(
      '[data-test-id="data-picker"] .react-monaco-editor-container'
    );
    await monacoContainer.waitFor({ state: "visible", timeout: 5000 });
    await monacoContainer.click();
    await page.waitForTimeout(100);
    await page.keyboard.press("Control+a");
    await page.waitForTimeout(100);
    await page.keyboard.press("Backspace");
    await page.waitForTimeout(100);
    await page.keyboard.type(
      '"https://google.com/search?q=" + $props.linkProp'
    );
    await page.waitForTimeout(100);

    await models.studio.rightPanel.frame
      .getByRole("button", { name: "Save" })
      .click();

    const visibilityChoices = models.studio.frame.locator(
      '[data-test-id="visibility-choices"]'
    );
    await visibilityChoices.click({ button: "right" });
    await models.studio.useDynamicValueButton.click();
    const switchToCodeButton2 = models.studio.frame.getByText("Switch to Code");
    await switchToCodeButton2.click();
    const monacoContainer2 = models.studio.rightPanel.frame.locator(
      '[data-test-id="data-picker"] .react-monaco-editor-container'
    );
    await monacoContainer2.waitFor({ state: "visible", timeout: 5000 });
    await monacoContainer2.click();
    await page.keyboard.press("Control+a");
    await page.keyboard.press("Backspace");
    await page.keyboard.type('!$props.linkProp.includes("invisible")');
    const saveButton = models.studio.rightPanel.frame
      .locator('[data-test-id="data-picker"]')
      .locator('button:has-text("Save")');
    await saveButton.click();

    await models.studio.focusFrameRoot(framed);
    await models.studio.leftPanel.frame
      .locator(".tpltree__label", { hasText: "Comp" })
      .click({ button: "right" });
    await models.studio.leftPanel.frame
      .getByText("Edit component Comp in place")
      .click();

    await page.keyboard.press("Enter");
    await page.keyboard.press("Enter");
    await page.keyboard.press("Meta+d");
    await models.studio.rightPanel.frame
      .locator('[data-test-id="prop-editor-row-linkProp"] .code-editor-input')
      .click();
    await page.keyboard.press("Meta+a");
    await page.keyboard.press("Delete");
    await page.keyboard.type("invisible");
    await page.keyboard.press("Escape");

    await models.studio.withinLiveMode(async (liveFrame) => {
      const link = liveFrame.locator("#plasmic-app a");
      await expect(link).toHaveAttribute(
        "href",
        "https://google.com/search?q=https://www.plasmic.app/"
      );
      await expect(link).toHaveAttribute(
        "title",
        "https://google.com/search?q=https://www.plasmic.app/"
      );
    });
  });

  test("can bind rich text children to data", async ({ page, models }) => {
    await models.studio.leftPanel.addNewFrame();
    const framed = models.studio.getComponentFrameByIndex(0);

    await models.studio.focusFrameRoot(framed);
    await models.studio.leftPanel.insertNode(VERT_CONTAINER_CAP);
    await page.keyboard.press("Enter");

    await models.studio.extractComponentNamed("Comp");

    await models.studio.frame
      .getByText("[Edit component in new artboard]")
      .click();
    await page.waitForTimeout(1000);

    const compFrame = models.studio.getComponentFrameByIndex(1);

    const isMac = process.platform === "darwin";
    const cmdKey = isMac ? "Meta" : "Control";

    await models.studio.leftPanel.insertNode("Text");
    await compFrame.locator(".__wab_editor").waitFor({ state: "visible" });
    await compFrame.locator(".__wab_editor").dblclick({ force: true });
    const contentEditable = compFrame.locator('[contenteditable="true"]');
    await contentEditable.waitFor({ state: "visible" });
    await page.waitForTimeout(500);
    await contentEditable.fill("");
    await page.waitForTimeout(500);
    await contentEditable.type("Hello World!", { delay: 100 });
    await page.waitForTimeout(500);
    await setSelection(compFrame.getByText("Hello World!"), "World");
    await page.waitForTimeout(300);
    await page.keyboard.press(`${cmdKey}+k`);
    await page.waitForTimeout(300);
    await page.keyboard.type("/");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(300);
    await page.keyboard.press("Escape");

    await models.studio.leftPanel.switchToTreeTab();
    await models.studio.leftPanel.selectTreeNode([
      "vertical stack",
      '"Hello [child]!"',
      '"World"',
    ]);
    await models.studio.rightPanel.frame
      .locator('[data-test-id="prop-editor-row-href"] label')
      .click({ button: "right" });
    await models.studio.allowExternalAccessButton.hover();
    await models.studio.createNewPropButton.click();
    await models.studio.linkNewProp("linkProp");

    await models.studio.textContent.click({ button: "right" });
    await models.studio.useDynamicValueButton.click();
    await models.studio.rightPanel.frame
      .locator('[data-test-id="data-picker"]')
      .getByText("linkProp")
      .click();
    await models.studio.rightPanel.frame
      .locator('[data-test-id="data-picker"]')
      .getByRole("button", { name: "Save" })
      .click();

    await models.studio.focusFrameRoot(framed);
    await models.studio.leftPanel.frame
      .locator(".tpltree__label", { hasText: "Comp" })
      .click({ button: "right" });
    await models.studio.leftPanel.frame
      .getByText("Edit component Comp in place")
      .click();

    await page.waitForTimeout(1000);
    await expect(framed.getByText("Hello /!")).toBeVisible();
    await models.studio.withinLiveMode(async (liveFrame) => {
      await expect(liveFrame.locator("#plasmic-app a")).toHaveAttribute(
        "href",
        "/"
      );
      await expect(liveFrame.locator("#plasmic-app a")).toContainText("/");
    });
  });
});
