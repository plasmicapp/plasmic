import { expect } from "@playwright/test";
import { test } from "../fixtures/test";
import { goToProject } from "../utils/studio-utils";

test.describe("component-props", () => {
  let projectId: string;

  test.beforeEach(async ({ apiClient, page }) => {
    projectId = await apiClient.setupNewProject({ name: "component-props" });
    await goToProject(page, `/projects/${projectId}`);
  });

  test.afterEach(async ({ apiClient }) => {
    await apiClient.removeProjectAfterTest(
      projectId,
      "user2@example.com",
      "!53kr3tz!"
    );
  });

  test("can create all component prop types", async ({ models }) => {
    await models.studio.leftPanel.addComponent("Component with all prop types");

    await models.studio.createComponentProp({
      propName: "textProp",
      propType: "text",
    });
    await models.studio.createComponentProp({
      propName: "numberProp",
      propType: "num",
    });
    await models.studio.createComponentProp({
      propName: "booleanProp",
      propType: "bool",
    });
    await models.studio.createComponentProp({
      propName: "objectProp",
      propType: "any",
    });
    await models.studio.createComponentProp({
      propName: "queryDataProp",
      propType: "queryData",
    });
    await models.studio.createComponentProp({
      propName: "eventHandlerProp",
      propType: "eventHandler",
    });
    await models.studio.createComponentProp({
      propName: "hrefProp",
      propType: "href",
    });
    await models.studio.createComponentProp({
      propName: "dateProp",
      propType: "dateString",
    });
    await models.studio.createComponentProp({
      propName: "dateRangeProp",
      propType: "dateRangeStrings",
    });
    await models.studio.createComponentProp({
      propName: "colorProp",
      propType: "color",
    });
    await models.studio.createComponentProp({
      propName: "imageProp",
      propType: "img",
    });
  });

  test("can show preview values, default values correctly", async ({
    models,
  }) => {
    await models.studio.leftPanel.addComponent("Component with props");
    const componentFrame = models.studio.frame
      .locator("iframe")
      .first()
      .contentFrame();
    const componentBody = componentFrame.locator("body");

    await models.studio.createComponentProp({
      propName: "textProp",
      propType: "text",
      defaultValue: "default text",
      previewValue: "preview text",
    });
    await models.studio.createComponentProp({
      propName: "numberProp",
      propType: "num",
      defaultValue: "0",
      previewValue: "42",
    });

    await models.studio.insertTextWithDynamic(
      "`textProp = ${$props.textProp}`"
    );
    await models.studio.insertTextWithDynamic(
      "`numberProp = ${$props.numberProp}`"
    );
    await models.studio.insertTextWithDynamic(
      "`numberProp * 10 = ${$props.numberProp * 10}`"
    );

    await componentBody
      .locator("text=textProp = preview text")
      .waitFor({ state: "visible", timeout: 5000 });

    await expect(
      componentBody.getByText("textProp = preview text")
    ).toBeVisible();
    await expect(componentBody.getByText("numberProp = 42")).toBeVisible();
    await expect(
      componentBody.getByText("numberProp * 10 = 420")
    ).toBeVisible();

    await models.studio.rightPanel.setComponentPropPreviewValue(
      "textProp",
      "Hello, world!"
    );
    await expect(
      componentBody.getByText("textProp = Hello, world!")
    ).toBeVisible();

    await models.studio.rightPanel.setComponentPropPreviewValue(
      "numberProp",
      undefined
    );
    await expect(componentBody.getByText("numberProp = 0")).toBeVisible();
    await expect(componentBody.getByText("numberProp * 10 = 0")).toBeVisible();

    await models.studio.rightPanel.setComponentPropDefaultValue(
      "numberProp",
      undefined
    );
    await expect(
      componentBody.getByText("numberProp = undefined")
    ).toBeVisible();
    await expect(
      componentBody.getByText("numberProp * 10 = NaN")
    ).toBeVisible();

    await models.studio.leftPanel.createNewPage("Page using component props");
    const pageFrame = models.studio.frame
      .locator("iframe")
      .nth(1)
      .contentFrame();
    const pageBody = pageFrame.locator("body");

    await models.studio.leftPanel.insertNode("Component with props");

    await expect(pageBody.getByText("textProp = default text")).toBeVisible();
    await expect(pageBody.getByText("numberProp = undefined")).toBeVisible();
    await expect(pageBody.getByText("numberProp * 10 = NaN")).toBeVisible();

    await models.studio.rightPanel.setDataPlasmicProp(
      "textProp",
      "custom text",
      {
        reset: true,
      }
    );
    await expect(pageBody.getByText("textProp = custom text")).toBeVisible();

    await models.studio.rightPanel.removePropValue("textProp");
    await expect(pageBody.getByText("textProp = default text")).toBeVisible();

    await models.studio.rightPanel.setDataPlasmicProp("numberProp", "0", {
      reset: true,
    });
    await expect(pageBody.getByText("numberProp = 0")).toBeVisible();
    await expect(pageBody.getByText("numberProp * 10 = 0")).toBeVisible();

    await models.studio.rightPanel.removePropValue("numberProp");
    await expect(pageBody.getByText("numberProp = undefined")).toBeVisible();
    await expect(pageBody.getByText("numberProp * 10 = NaN")).toBeVisible();
  });

  test("prop grouping with slash syntax", async ({ models, page }) => {
    const { studio } = models;
    const rightPanel = studio.rightPanel.frame;

    await studio.leftPanel.addComponent("Card");
    await studio.rightPanel.switchToComponentDataTab();

    await test.step("Create prop tree in definition view", async () => {
      // A slash in the name creates a group.
      await studio.createComponentProp({
        propName: "Header / title",
        propType: "text",
      });
      await expect(
        rightPanel.getByText("Header", { exact: true })
      ).toBeVisible();

      // The group is expanded on creation — its leaf must be visible.
      await expect(
        rightPanel.getByText("title", { exact: true })
      ).toBeVisible();

      await rightPanel.getByText("title", { exact: true }).dblclick();
      await page.keyboard.type("Subsection / tagline");
      await page.keyboard.press("Enter");

      // The further-nested group is expanded on creation.
      await expect(
        rightPanel.getByText("Subsection", { exact: true })
      ).toBeVisible();
      await expect(
        rightPanel.getByText("tagline", { exact: true })
      ).toBeVisible();

      // Clicking "+" on a group opens the modal with "<group> / " prefilled.
      const headerRow = rightPanel
        .locator('[data-rbd-draggable-id="folder-Header"]')
        .locator("> :first-child");
      await headerRow
        .locator('[data-test-id="add-prop-to-folder-btn"]')
        .click();
      await expect(studio.rightPanel.propNameInput.first()).toHaveValue(
        "Header / "
      );
      await studio.rightPanel.closeSidebarButton.click();
      const subRow = rightPanel
        .locator('[data-rbd-draggable-id="folder-Header/Subsection"]')
        .locator("> :first-child");
      await subRow.locator('[data-test-id="add-prop-to-folder-btn"]').click();
      await expect(studio.rightPanel.propNameInput.first()).toHaveValue(
        "Header / Subsection / "
      );
      await studio.rightPanel.closeSidebarButton.click();

      // Build out the full Card prop tree covering every shape:
      //     • root normal + advanced props
      //     • normal-only group (Header)
      //     • advanced-only group (Analytics)
      //     • mixed group
      //
      await studio.createComponentProp({ propName: "title", propType: "text" });
      await studio.createComponentProp({
        propName: "isDisabled",
        propType: "bool",
        advanced: true,
      });
      await studio.createComponentProp({
        propName: "Header / subtitle",
        propType: "text",
      });
      await studio.createComponentProp({
        propName: "Analytics / trackingId",
        propType: "text",
        advanced: true,
      });
      await studio.createComponentProp({
        propName: "Analytics / userId",
        propType: "text",
        advanced: true,
      });
      await studio.createComponentProp({
        propName: "Body / heading",
        propType: "text",
      });
      await studio.createComponentProp({
        propName: "Body / maxWidth",
        propType: "num",
        advanced: true,
      });
      await studio.createComponentProp({
        propName: "Body / Accessibility / ariaLabel",
        propType: "text",
        advanced: true,
      });
    });

    await studio.leftPanel.createNewPage("Card demo");
    await studio.leftPanel.insertNode("Card");
    const instanceSection = rightPanel.locator("#component-props-section");

    await test.step("Instance view - advanced props collapsed", async () => {
      // Normal props/leaves at root are shown
      await expect(
        instanceSection.getByText("title", { exact: true })
      ).toBeVisible();
      await expect(
        instanceSection.getByText("Header", { exact: true })
      ).toBeVisible();
      await expect(
        instanceSection.getByText("Subsection", { exact: true })
      ).toBeVisible();
      await expect(
        instanceSection.getByText("tagline", { exact: true })
      ).toBeVisible();
      await expect(
        instanceSection.getByText("subtitle", { exact: true })
      ).toBeVisible();

      await expect(
        instanceSection.getByText("Body", { exact: true })
      ).toBeVisible();
      await expect(
        instanceSection.getByText("heading", { exact: true })
      ).toBeVisible();

      // Advanced leaves and advanced-only groups are hidden.
      await expect(
        instanceSection.getByText("Analytics", { exact: true })
      ).toBeHidden();
      // advanced-only nested group hidden (even though parent Body is shown)
      await expect(
        instanceSection.getByText("Accessibility", { exact: true })
      ).toBeHidden();
      // root advanced
      await expect(
        instanceSection.getByText("isDisabled", { exact: true })
      ).toBeHidden();
      // advanced leaf inside mixed group
      await expect(
        instanceSection.getByText("maxWidth", { exact: true })
      ).toBeHidden();
    });

    await test.step("Instance view - Advanced props expanded", async () => {
      // Toggle advanced on — everything shows.
      await instanceSection
        .locator('[data-test-id="show-extra-content"]')
        .first()
        .click();
      await expect(
        instanceSection.getByText("Analytics", { exact: true })
      ).toBeVisible();
      await expect(
        instanceSection.getByText("Accessibility", { exact: true })
      ).toBeVisible();
      await expect(
        instanceSection.getByText("isDisabled", { exact: true })
      ).toBeVisible();
      await expect(
        instanceSection.getByText("maxWidth", { exact: true })
      ).toBeVisible();
    });

    // Toggle advanced back off — hidden state returns.
    await instanceSection
      .locator('[data-test-id="show-extra-content"]')
      .first()
      .click();
    await expect(
      instanceSection.getByText("Analytics", { exact: true })
    ).toBeHidden();
  });

  test("allow external access auto-groups the linked prop under the tpl name", async ({
    models,
  }) => {
    const { studio } = models;
    const rightPanel = studio.rightPanel.frame;

    await studio.leftPanel.addComponent("Inner");
    await studio.createComponentProp({
      propName: "someProp",
      propType: "text",
    });

    await studio.leftPanel.addComponent("Parent");
    await studio.leftPanel.insertNode("Inner");
    await studio.rightPanel.renameTreeNode("myCard", { fromRightPanel: true });

    // Right-click Inner's `someProp` on the instance → Allow external access → Create new prop.
    await studio.rightPanel.switchToSettingsTab();
    const someProp = studio.frame
      .locator('[data-plasmic-prop="someProp"]')
      .first();
    await someProp.click({ button: "right" });
    await studio.allowExternalAccess();
    await studio.createNewProp();

    // The new-prop modal should be prefilled with `<tplName> / <propName>`,
    await expect(studio.rightPanel.propNameInput.first()).toHaveValue(
      "myCard / someProp"
    );
    await studio.rightPanel.propSubmitButton.click();

    await studio.rightPanel.switchToComponentDataTab();
    await expect(rightPanel.getByText("myCard", { exact: true })).toBeVisible();
    // Groups are collapsed by default. Click to expand
    rightPanel.getByText("myCard", { exact: true }).click();
    await expect(
      rightPanel.getByText("someProp", { exact: true })
    ).toBeVisible();
  });
});
