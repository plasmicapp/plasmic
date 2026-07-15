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
    await models.studio.createComponentProp({
      propName: "choiceProp",
      propType: "choice",
    });
    await models.studio.createComponentProp({
      propName: "multiChoiceProp",
      propType: "multiChoice",
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

    await test.step("prop link creation", async () => {
      await studio.leftPanel.addComponent("Inner");
      await studio.createComponentProp({
        propName: "someProp",
        propType: "text",
      });
      await studio.insertTextWithDynamic("`${$props.someProp}`");

      await studio.leftPanel.addComponent("Parent");
      await studio.leftPanel.insertNode("Inner");
      await studio.rightPanel.renameTreeNode("myCard", {
        fromRightPanel: true,
      });

      // Right-click Inner's `someProp` on the instance → Allow external access → Create new prop.
      await studio.rightPanel.switchToSettingsTab();
      const someProp = studio.frame
        .locator('[data-plasmic-prop="someProp"]')
        .first();
      await someProp.click({ button: "right" });
      await studio.allowExternalAccess();
      await studio.createNewProp();

      const propName = "myCard / someProp";

      // The new-prop modal should be prefilled with `<tplName> / <propName>`,
      await expect(studio.rightPanel.propNameInput.first()).toHaveValue(
        propName
      );
      await studio.rightPanel.propSubmitButton.click();

      await studio.rightPanel.switchToComponentDataTab();
      await expect(
        rightPanel.getByText("myCard", { exact: true })
      ).toBeVisible();
      // Groups are collapsed by default. Click to expand
      rightPanel.getByText("myCard", { exact: true }).click();
      await expect(
        rightPanel.getByText("someProp", { exact: true })
      ).toBeVisible();
    });

    await test.step("test prop linking works in canvas and live preview", async () => {
      await studio.leftPanel.createNewPage("Preview");
      await studio.leftPanel.insertNode("Parent");
      // 2 components (Inner, Parent) + the Preview page → page is iframe #2.
      const pageFrame = studio.frame.locator("iframe").nth(2).contentFrame();

      const propName = "myCard / someProp";

      await studio.rightPanel.setDataPlasmicProp(propName, "hello canvas");
      await expect(pageFrame.getByText("hello canvas")).toBeVisible();

      await studio.rightPanel.setDataPlasmicProp(propName, "hello live", {
        reset: true,
      });
      await expect(pageFrame.getByText("hello live")).toBeVisible();

      await studio.withinLiveMode(async (liveFrame) => {
        await expect(liveFrame.getByText("hello live")).toBeVisible();
      });
    });
  });

  test("allow external access on a variant auto-groups the linked prop under the tpl name", async ({
    models,
  }) => {
    const { studio } = models;
    const rightPanel = studio.rightPanel.frame;

    await test.step("create variants", async () => {
      await studio.leftPanel.addComponent("Inner");
      await studio.rightPanel.switchToComponentDataTab();
      await studio.rightPanel.addVariantToGroup("Theme", "Primary");
      await studio.rightPanel.addVariantToGroup("Theme", "Secondary");
      await studio.rightPanel.resetVariants();
      await studio.insertTextNodeWithContent("base-theme");

      // Edit the text within each variant so the rendered output differs
      await studio.rightPanel.switchToComponentDataTab();
      await studio.rightPanel.selectVariant("Primary");
      await studio.editText("primary-theme");
      await studio.rightPanel.deselectVariant("Theme", "Primary");
      await studio.rightPanel.selectVariant("Secondary");
      await studio.editText("secondary-theme");
      await studio.rightPanel.deselectVariant("Theme", "Secondary");

      // Also add a standalone *toggle* variant, on its own node so its output
      // is independently observable when later forwarded as a bool.
      await studio.rightPanel.addToggleVariant("Locked");
      await studio.rightPanel.resetVariants();
      await studio.insertTextNodeWithContent("unlocked-text");
      await studio.rightPanel.switchToComponentDataTab();
      await studio.rightPanel.selectVariant("Locked");
      await studio.editText("locked-text");
      await studio.rightPanel.deselectVariant("Locked", "Locked");
    });

    await test.step("link variants to props", async () => {
      await studio.leftPanel.addComponent("Parent");
      await studio.leftPanel.insertNode("Inner");
      await studio.rightPanel.renameTreeNode("myCard", {
        fromRightPanel: true,
      });

      // Right-click the "Theme" variant row → Allow external access → Create new prop.
      const variantRow = rightPanel
        .locator('[data-test-id="variants-picker-section"]')
        .getByText("Theme", { exact: true });
      await variantRow.click({ button: "right" });
      await studio.allowExternalAccess();
      await studio.createNewProp();

      const propName = "myCard / Theme";

      // The new-prop modal is prefilled with `<tplName> / <groupName>`.
      await expect(studio.rightPanel.propNameInput.first()).toHaveValue(
        propName
      );
      await studio.rightPanel.propSubmitButton.click();

      // After save, the variant row shows the linked-state UI.
      await expect(
        rightPanel
          .locator('[data-test-id="variants-picker-section"]')
          .getByText(/Linked to/)
      ).toBeVisible();

      const lockedRow = rightPanel
        .locator('[data-test-id="variants-picker-section"]')
        .getByText("Locked", { exact: true });
      await lockedRow.click({ button: "right" });
      await studio.allowExternalAccess();
      await studio.createNewProp();
      await expect(studio.rightPanel.propNameInput.first()).toHaveValue(
        "myCard / Locked"
      );
      await studio.rightPanel.propSubmitButton.click();

      // Parent now has both new owner props, grouped under "myCard".
      await studio.rightPanel.switchToComponentDataTab();
      const propsSection = rightPanel.locator('[data-test-id="props-section"]');
      await expect(
        propsSection.getByText("myCard", { exact: true })
      ).toBeVisible();
      // Groups are collapsed by default. Click to expand
      propsSection.getByText("myCard", { exact: true }).click();
      await expect(
        propsSection.getByText("Theme", { exact: true })
      ).toBeVisible();
      await expect(
        propsSection.getByText("Locked", { exact: true })
      ).toBeVisible();
    });

    await test.step("test variant linking works in canvas and live preview", async () => {
      await studio.leftPanel.createNewPage("Preview");
      await studio.leftPanel.insertNode("Parent");
      // 2 components (Inner, Parent) + the Preview page → page is iframe #2.
      const pageFrame = studio.frame.locator("iframe").nth(2).contentFrame();

      const propName = "myCard / Theme";

      await studio.rightPanel.setDataPlasmicProp(propName, "primary");
      await expect(pageFrame.getByText("primary-theme")).toBeVisible();

      await studio.rightPanel.setDataPlasmicProp(propName, "secondary", {
        reset: true,
      });
      await expect(pageFrame.getByText("secondary-theme")).toBeVisible();

      await expect(pageFrame.getByText("unlocked-text")).toBeVisible();
      await rightPanel
        .locator('[data-plasmic-prop="myCard / Locked"]')
        .last()
        .click();
      await expect(pageFrame.getByText("locked-text")).toBeVisible();

      await studio.withinLiveMode(async (liveFrame) => {
        await expect(liveFrame.getByText("secondary-theme")).toBeVisible();
        await expect(liveFrame.getByText("locked-text")).toBeVisible();
      });
    });
  });

  test("can create, edit, and use a single-choice prop", async ({ models }) => {
    const studio = models.studio;
    await studio.leftPanel.addComponent("SingleChoiceComp");

    await studio.rightPanel.addChoiceComponentProp({
      propName: "size",
      propType: "choice",
      options: ["small", "medium", "large"],
      defaultValue: "small",
      previewValue: "large",
    });

    // Render the prop value so we can assert on it.
    await studio.insertTextWithDynamic("`size = ${$props.size}`");
    const componentBody = studio.frame
      .locator("iframe")
      .first()
      .contentFrame()
      .locator("body");
    // The artboard shows the preview value.
    await expect(componentBody.getByText("size = large")).toBeVisible();

    await studio.rightPanel.openComponentPropModal("size");

    // Editing the allowed values migrates the default/preview.
    // Rename "large" -> "huge": the preview follows the rename.
    await studio.rightPanel.renameChoiceComponentPropOption(2, "huge");
    await studio.rightPanel.submitPropModal();
    await expect(componentBody.getByText("size = huge")).toBeVisible();

    // Remove "huge": the preview is unset, so the artboard falls back to the
    // default ("small").
    await studio.rightPanel.openComponentPropModal("size");
    await studio.rightPanel.removeChoiceComponentPropOption(2);
    await studio.rightPanel.submitPropModal();
    await expect(componentBody.getByText("size = small")).toBeVisible();

    // Instance on a page: defaults to "small", and the value can be set.
    await studio.leftPanel.createNewPage("SingleChoicePage");
    await studio.leftPanel.insertNode("SingleChoiceComp");
    const pageBody = studio.frame
      .locator("iframe")
      .nth(1)
      .contentFrame()
      .locator("body");
    await expect(pageBody.getByText("size = small")).toBeVisible();

    await studio.rightPanel.setInstanceChoiceValue("size", "medium");
    await expect(pageBody.getByText("size = medium")).toBeVisible();
  });

  test("can create, edit, and use a multi-choice prop", async ({ models }) => {
    const studio = models.studio;
    await studio.leftPanel.addComponent("MultiChoiceComp");

    await studio.rightPanel.addChoiceComponentProp({
      propName: "tags",
      propType: "multiChoice",
      options: ["a", "b", "c"],
      defaultValue: ["a"],
      previewValue: ["a", "b"],
    });

    await studio.insertTextWithDynamic("`tags = ${$props.tags}`");
    const componentBody = studio.frame
      .locator("iframe")
      .first()
      .contentFrame()
      .locator("body");
    // A multi value renders as a comma-joined array.
    await expect(componentBody.getByText("tags = a,b")).toBeVisible();

    // Editing the allowed values keeps the multi default/preview shape.
    // Rename "a" -> "x": the preview remaps element-wise (["a","b"] -> ["x","b"])
    await studio.rightPanel.openComponentPropModal("tags");
    await studio.rightPanel.renameChoiceComponentPropOption(0, "x");
    await studio.rightPanel.submitPropModal();
    await expect(componentBody.getByText("tags = x,b")).toBeVisible();

    // Remove "b": it's dropped from the preview array (["x","b"] -> ["x"]).
    await studio.rightPanel.openComponentPropModal("tags");
    await studio.rightPanel.removeChoiceComponentPropOption(1);
    await studio.rightPanel.submitPropModal();
    await expect(
      componentBody.getByText("tags = x", { exact: true })
    ).toBeVisible();

    await studio.leftPanel.createNewPage("MultiChoicePage");
    await studio.leftPanel.insertNode("MultiChoiceComp");
    const pageBody = studio.frame
      .locator("iframe")
      .nth(1)
      .contentFrame()
      .locator("body");
    await expect(pageBody.getByText("tags = x", { exact: true })).toBeVisible();

    await studio.rightPanel.setInstanceChoiceValue("tags", ["x", "c"]);
    await expect(pageBody.getByText("tags = x,c")).toBeVisible();
  });

  test("warns and reconciles a linked choice prop when its options drift", async ({
    models,
  }) => {
    const { studio } = models;

    await studio.leftPanel.addComponent("Inner");
    await studio.rightPanel.addChoiceComponentProp({
      propName: "size",
      propType: "choice",
      options: ["small", "medium", "large"],
      defaultValue: "small",
    });

    await studio.leftPanel.addComponent("Parent");
    await studio.leftPanel.insertNode("Inner");
    await studio.rightPanel.renameTreeNode("myCard", { fromRightPanel: true });
    await studio.rightPanel.switchToSettingsTab();
    await studio.frame
      .locator('[data-plasmic-prop="size"]')
      .first()
      .click({ button: "right" });
    await studio.allowExternalAccess();
    await studio.createNewProp();
    await studio.rightPanel.propSubmitButton.click();

    // Drift the source: drop "large" from Inner's `size`, so the linked Parent
    // prop's options no longer match.
    await studio.leftPanel.editComponentWithName("Inner");
    await studio.rightPanel.openComponentPropModal("size");
    await studio.rightPanel.removeChoiceComponentPropOption(2);
    await studio.rightPanel.submitPropModal();

    await expect(
      studio.frame.getByText("Linked props out of sync")
    ).toBeVisible();
    await studio.frame.getByText("Review in Issues tab").click();

    await expect(
      studio.frame.getByText("no longer matches the linked component prop")
    ).toBeVisible();
    await studio.frame.getByText("Element myCard").click();

    await studio.rightPanel.switchToSettingsTab();
    const warning = studio.frame.locator(
      '[data-test-id="linked-prop-warning"]'
    );
    await expect(warning).toBeVisible();

    await warning.click();
    await studio.confirmButton.click();
    await expect(warning).not.toBeVisible();
  });

  test("variant link warns and auto-syncs the linked prop options when variants drift", async ({
    models,
  }) => {
    const { studio } = models;
    const rightPanel = studio.rightPanel.frame;
    const variantsSection = rightPanel.locator(
      '[data-test-id="variants-picker-section"]'
    );
    const warningButton = rightPanel.locator(
      '[data-test-id="linked-prop-warning"]'
    );

    await test.step("set up Inner with two variants", async () => {
      await studio.leftPanel.addComponent("Inner");
      await studio.rightPanel.switchToComponentDataTab();
      await studio.rightPanel.addVariantToGroup("Theme", "Primary");
      await studio.rightPanel.addVariantToGroup("Theme", "Secondary");
      await studio.rightPanel.resetVariants();
      await studio.insertTextNodeWithContent("base-theme");
    });

    await test.step("link Theme variant group to a new owner prop on Parent", async () => {
      await studio.leftPanel.addComponent("Parent");
      await studio.leftPanel.insertNode("Inner");
      await studio.rightPanel.renameTreeNode("myCard", {
        fromRightPanel: true,
      });

      const variantRow = variantsSection.getByText("Theme", { exact: true });
      await variantRow.click({ button: "right" });
      await studio.allowExternalAccess();
      await studio.createNewProp();
      await studio.rightPanel.propSubmitButton.click();

      await expect(variantsSection.getByText(/Linked to/)).toBeVisible();
      // No drift yet — warning should not be shown.
      await expect(warningButton).not.toBeVisible();
    });

    await test.step("add a third variant on Inner to drift the link", async () => {
      await studio.openComponentInNewFrame("Inner", {
        editInNewArtboard: true,
      });
      await studio.rightPanel.switchToComponentDataTab();
      await studio.rightPanel.addVariantToGroup("Theme", "Tertiary");
    });

    await test.step("drift surfaces in the Issues tab, which links to the tpl", async () => {
      // Adding the variant fired the drift toast; follow it into the Issues
      // panel and jump to the affected instance from there.
      await expect(
        studio.frame.getByText("Linked props out of sync")
      ).toBeVisible();
      await studio.frame.getByText("Review in Issues tab").click();
      await expect(
        studio.frame.getByText("no longer matches the linked component prop")
      ).toBeVisible();
      await studio.frame.getByText("Element myCard").click();

      await expect(variantsSection.getByText(/Linked to/)).toBeVisible();
      await expect(warningButton).toBeVisible();
    });

    await test.step("clicking the warning opens the confirm modal with the diff", async () => {
      await warningButton.click();

      await expect(studio.frame.getByText("Update linked prop")).toBeVisible();
      await expect(studio.frame.getByText(/Adding:.*Tertiary/)).toBeVisible();
    });

    await test.step("confirming the modal syncs the options and clears the warning", async () => {
      await studio.frame.locator('[data-test-id="confirm"]').click();
      await expect(warningButton).not.toBeVisible();
    });
  });

  test("flipping a linked variant group between single- and multi-select converts the owner prop and migrates instance values", async ({
    models,
  }) => {
    const { studio } = models;
    const rightPanel = studio.rightPanel.frame;
    const variantsSection = rightPanel.locator(
      '[data-test-id="variants-picker-section"]'
    );
    const warningButton = rightPanel.locator(
      '[data-test-id="linked-prop-warning"]'
    );

    await test.step("set up Inner with a single-select Theme group", async () => {
      await studio.leftPanel.addComponent("Inner");
      await studio.rightPanel.switchToComponentDataTab();
      await studio.rightPanel.addVariantToGroup("Theme", "Primary");
      await studio.rightPanel.addVariantToGroup("Theme", "Secondary");
      await studio.rightPanel.resetVariants();
      await studio.insertTextNodeWithContent("base-theme");

      // Give Primary distinct rendered text so an instance's forwarded value is
      // observable — that's what lets us prove the value survives the type
      // conversion (not just that the drift warning clears).
      await studio.rightPanel.switchToComponentDataTab();
      await studio.rightPanel.selectVariant("Primary");
      await studio.editText("primary-theme");
      await studio.rightPanel.deselectVariant("Theme", "Primary");

      // Give Secondary its own distinct text on a *separate* node, so that when
      // multiple values are set the two variants are independently observable
      // (and so we can prove the extra value is dropped on collapse to single).
      await studio.insertTextNodeWithContent("secondary-base");
      await studio.rightPanel.switchToComponentDataTab();
      await studio.rightPanel.selectVariant("Secondary");
      await studio.editText("secondary-theme");
      await studio.rightPanel.deselectVariant("Theme", "Secondary");
    });

    await test.step("link Theme (single-select) to a new owner prop on Parent", async () => {
      await studio.leftPanel.addComponent("Parent");
      await studio.leftPanel.insertNode("Inner");
      await studio.rightPanel.renameTreeNode("myCard", {
        fromRightPanel: true,
      });

      const variantRow = variantsSection.getByText("Theme", { exact: true });
      await variantRow.click({ button: "right" });
      await studio.allowExternalAccess();
      await studio.createNewProp();
      await studio.rightPanel.propSubmitButton.click();

      await expect(variantsSection.getByText(/Linked to/)).toBeVisible();
      // In sync (single-select group ↔ single choice prop) — no warning yet.
      await expect(warningButton).not.toBeVisible();
    });

    await test.step("place a Parent instance and set the linked prop (single-select)", async () => {
      await studio.leftPanel.createNewPage("Preview");
      await studio.leftPanel.insertNode("Parent");

      // Set the linked single-choice prop to "Primary" (a scalar value) and
      // confirm it drives the Inner Primary variant on the instance.
      const linkedProp = rightPanel
        .locator('[data-plasmic-prop="myCard / Theme"]')
        .last();
      await studio.rightPanel.selectChoiceValue(linkedProp, ["Primary"]);
      await studio.switchArena("Preview");
      await studio.withinLiveMode(async (liveFrame) => {
        await expect(liveFrame.getByText("primary-theme")).toBeVisible();
      });
    });

    await test.step("flip Inner's Theme group to multi-select", async () => {
      // "Edit in new artboard" is only offered from a mixed arena; we're on the
      // Preview page arena here, so open the component's own arena instead.
      await studio.openComponentInNewFrame("Inner", {
        editInNewArtboard: false,
      });
      await studio.rightPanel.toggleVariantGroupMultiSelect("Theme");
    });

    await test.step("warning appears on the now-out-of-sync link in Parent", async () => {
      await studio.openComponentInNewFrame("Parent", {
        editInNewArtboard: false,
      });
      await studio.leftPanel.switchToTreeTab();
      await studio.leftPanel.selectTreeNode(["myCard"]);

      await expect(variantsSection.getByText(/Linked to/)).toBeVisible();
      await expect(warningButton).toBeVisible();
    });

    await test.step("confirm dialog announces the single→multi switch", async () => {
      await warningButton.click();

      await expect(studio.frame.getByText("Update linked prop")).toBeVisible();
      await expect(studio.frame.getByText(/Switching to/)).toBeVisible();
      await expect(studio.frame.getByText(/multi-select/)).toBeVisible();
    });

    await test.step("confirming converts the prop to multiChoice and clears the warning", async () => {
      await studio.frame.locator('[data-test-id="confirm"]').click();
      await expect(warningButton).not.toBeVisible();
    });

    await test.step("the instance value survives the single→multi conversion", async () => {
      // The scalar "Primary" should have been coerced to ["Primary"], so the
      // instance still activates the Primary variant.
      await studio.switchArena("Preview");
      await studio.withinLiveMode(async (liveFrame) => {
        await expect(liveFrame.getByText("primary-theme")).toBeVisible();
      });
    });

    await test.step("add a second value on the instance now that the prop is multi-select", async () => {
      // With the prop now multiChoice the instance can hold multiple values;
      // add "Secondary" so the stored value becomes ["Primary", "Secondary"].
      await studio.switchArena("Preview");
      await studio.leftPanel.switchToTreeTab();
      await studio.leftPanel.selectTreeNode(["Parent"]);

      // Open the multi-select dropdown via its input rather than clicking the
      // editor body — the body overlaps the existing "Primary" pill's remove
      // button, and hitting it would drop Primary and leave only Secondary.
      const linkedProp = rightPanel
        .locator('[data-plasmic-prop="myCard / Theme"]')
        .last();
      await linkedProp.locator("input").first().click();
      await rightPanel
        .getByRole("option", { name: "Secondary", exact: true })
        .first()
        .click();
      await studio.page.keyboard.press("Tab");

      // Both variants are now active → both nodes render their variant text.
      await studio.withinLiveMode(async (liveFrame) => {
        await expect(liveFrame.getByText("primary-theme")).toBeVisible();
        await expect(liveFrame.getByText("secondary-theme")).toBeVisible();
      });
    });

    await test.step("flip Inner's Theme group back to single-select", async () => {
      await studio.openComponentInNewFrame("Inner", {
        editInNewArtboard: false,
      });
      await studio.rightPanel.toggleVariantGroupMultiSelect("Theme");
    });

    await test.step("warning reappears and the dialog announces the multi→single switch", async () => {
      await studio.openComponentInNewFrame("Parent", {
        editInNewArtboard: false,
      });
      await studio.leftPanel.switchToTreeTab();
      await studio.leftPanel.selectTreeNode(["myCard"]);

      await expect(warningButton).toBeVisible();
      await warningButton.click();

      await expect(studio.frame.getByText("Update linked prop")).toBeVisible();
      await expect(studio.frame.getByText(/Switching to/)).toBeVisible();
      await expect(studio.frame.getByText(/single-select/)).toBeVisible();
    });

    await test.step("confirming converts the prop back to single choice and clears the warning", async () => {
      await studio.frame.locator('[data-test-id="confirm"]').click();
      await expect(warningButton).not.toBeVisible();
    });

    await test.step("the multi value gracefully collapses to a single string on multi→single", async () => {
      // ["Primary", "Secondary"] must collapse to the scalar "Primary" (the
      // first still-valid value). Primary stays active; the now-invalid extra
      // Secondary value is dropped, so its variant is no longer rendered.
      await studio.switchArena("Preview");
      await studio.withinLiveMode(async (liveFrame) => {
        await expect(liveFrame.getByText("primary-theme")).toBeVisible();
        await expect(liveFrame.getByText("secondary-theme")).not.toBeVisible();
      });
    });
  });
});
