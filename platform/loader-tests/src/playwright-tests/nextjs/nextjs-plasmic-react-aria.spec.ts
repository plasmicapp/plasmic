import { expect, Locator, Page } from "@playwright/test";
import { getEnvVar, LOADER_NEXTJS_VERSIONS } from "../../env";
import { test } from "../../fixtures";
import {
  NextJsContext,
  setupNextJs,
  teardownNextJs,
} from "../../nextjs/nextjs-setup";

test.describe(`@plasmicpkgs/react-aria code components`, async () => {
  for (const versions of LOADER_NEXTJS_VERSIONS) {
    const { loaderVersion, nextVersion } = versions;

    test.describe(`loader-nextjs@${loaderVersion}, next@${nextVersion}`, async () => {
      let ctx: NextJsContext;

      test.beforeAll(async () => {
        ctx = await setupNextJs({
          // To make changes to react-aria.json, upload it to Studio, make the necessary changes, then download the bundle again.
          // Caution: This may also lead to changes in some ids in the bundle (because project ids change when uploading the project to Studio), and its ok for now.
          // The bundle is also uploaded to prod Studio here: https://studio.plasmic.app/projects/9zkDzeeVx9yuu2MYdRNK5C/-/Button-Test?arena_type=page&arena=vK-15KIgmOKG
          bundleFile: "react-aria.json",
          projectName: "Plexus Loader Test",
          npmRegistry: getEnvVar("NPM_REGISTRY"),
          codegenHost: getEnvVar("WAB_HOST"),
          removeComponentsPage: true,
          loaderVersion,
          nextVersion,
        });
      });

      test.afterAll(async () => {
        await teardownNextJs(ctx);
      });

      // `setupNextJs` often takes very long time to complete, because it has to upload the bundle to local/dev Studio, generate a loader nextjs project for it, build it, and run it on the browser
      // `beforeAll` and `beforeEach` are equivalent due to parallel test execution, so we can't avoid `setupNextJs` running before each test.
      // For better DX,
      // 1. Comment out the `teardownNextJs` above and run the playwright test. This ensures that the loader project created by it is not deleted after the test suite completes.
      // 2. Open the generated loader project in the terminal, and run it on browser (e.g. at port 3200).
      // 3. Comment out the `setupNextJs` and `teardownNextJs` above, uncomment the code below, and edit the port number to match the port of the started loader project. Now, you can run the test suite without having to re-do `setupNextJs` before each test.
      // 4. Don't forget to undo these changes before committing the code.
      // const ctx = { host: "http://localhost:3001" };

      test(`Button`, async ({ page }) => {
        const buttonStateChecker = new StateChecker(page, [
          "focused",
          "hovered",
          "focusVisible",
          "disabled",
          "pressed",
        ]);
        await page.goto(`${ctx.host}/button-test`);
        const button = page.locator("button[type=button]");
        const outside = page.locator("body");
        const counterValueEl = page.locator("#counter");
        const disableToggleEl = page.getByText("Set disabled");

        await buttonStateChecker.checkState({});

        await expect(counterValueEl).toHaveText("0");
        await button.click();
        await expect(counterValueEl).toHaveText("1");
        await button.click();
        await expect(counterValueEl).toHaveText("2");
        await button.click();
        await expect(counterValueEl).toHaveText("3");
        await button.click();
        await expect(counterValueEl).toHaveText("4");

        // CLick is simulated by moving the pointer on the button and clicking, so hover is true
        await buttonStateChecker.checkState({ focused: true, hovered: true });

        await outside.click();
        await buttonStateChecker.checkState({});

        await page.keyboard.press("Tab"); // This should focus the button with keyboard navigation
        await buttonStateChecker.checkState({
          focused: true,
          focusVisible: true,
        });
        // Test pressed state
        await page.keyboard.down("Space");
        await buttonStateChecker.checkState({
          focused: true,
          focusVisible: true,
          pressed: true,
        });

        await page.keyboard.up("Space");
        await buttonStateChecker.checkState({
          focused: true,
          focusVisible: true,
        });

        await disableToggleEl.click();
        await buttonStateChecker.checkState({ disabled: true });
      });

      // TODO: This is currently not testing indeterminate state because of PLA-11922
      // Make checkbox2 indeterminate in the loader project and incorporate it here in the test, in the PR that fixes PLA-11922
      test(`Checkbox Group`, async ({ page }) => {
        const cbVariants = [
          "hovered",
          "pressed",
          "focused",
          "focusVisible",
          "indeterminate",
          "disabled",
          "selected",
          "readonly",
        ];
        const checkbox1StateChecker = new StateChecker(page, cbVariants, "cb1");
        const checkbox2StateChecker = new StateChecker(page, cbVariants, "cb2");
        const checkbox3StateChecker = new StateChecker(page, cbVariants, "cb3");
        const checkboxGroupStateChecker = new StateChecker(
          page,
          ["disabled", "readonly"],
          "group"
        );

        const valueEl = page.locator("#value");
        const checkbox1 = page.locator("label").first();
        const checkbox2 = page.locator("label").nth(1);

        const disableToggleEl = page.getByText("Set disabled");
        const readonlyToggleEl = page.getByText("Set read-only");

        await page.goto(`${ctx.host}/checkbox-group-test`);

        await checkbox1StateChecker.checkState({});
        await checkbox2StateChecker.checkState({});
        await checkbox3StateChecker.checkState({});
        await checkboxGroupStateChecker.checkState({});

        await page.keyboard.press("Tab");
        await expect(valueEl).toHaveText("Nothing selected");
        await checkbox1StateChecker.checkState({
          focused: true,
          focusVisible: true,
        });
        await checkbox2StateChecker.checkState({});
        await checkbox3StateChecker.checkState({});
        await checkboxGroupStateChecker.checkState({});

        await page.keyboard.down("Space");
        await expect(valueEl).toHaveText("Nothing selected");
        await checkbox1StateChecker.checkState({
          focused: true,
          focusVisible: true,
          pressed: true,
        });
        await checkbox2StateChecker.checkState({});
        await checkbox3StateChecker.checkState({});
        await checkboxGroupStateChecker.checkState({});

        await page.keyboard.up("Space");
        await expect(valueEl).toHaveText("option1");
        await checkbox1StateChecker.checkState({
          selected: true,
          focused: true,
          focusVisible: true,
        });
        await checkbox2StateChecker.checkState({});
        await checkbox3StateChecker.checkState({});
        await checkboxGroupStateChecker.checkState({});

        // ensure that keyboard navigation between options works
        await page.keyboard.press("Tab");
        await page.keyboard.press("Tab");
        await page.keyboard.press("Space");
        await expect(valueEl).toHaveText("option1, option3");
        await checkbox1StateChecker.checkState({ selected: true });
        await checkbox2StateChecker.checkState({});
        await checkbox3StateChecker.checkState({
          selected: true,
          focused: true,
          focusVisible: true,
        });
        await checkboxGroupStateChecker.checkState({});

        await checkbox1.click();
        await expect(valueEl).toHaveText("option3");
        await checkbox1StateChecker.checkState({
          focused: true,
          hovered: true,
        });
        await checkbox2StateChecker.checkState({});
        await checkbox3StateChecker.checkState({ selected: true });
        await checkboxGroupStateChecker.checkState({});

        await checkbox2.click();
        await expect(valueEl).toHaveText("option3, option2");
        await checkbox1StateChecker.checkState({});
        await checkbox2StateChecker.checkState({
          selected: true,
          focused: true,
          hovered: true,
        });
        await checkbox3StateChecker.checkState({ selected: true });
        await checkboxGroupStateChecker.checkState({});

        await readonlyToggleEl.click();
        await checkbox1StateChecker.checkState({ readonly: true });
        await checkbox2StateChecker.checkState({
          readonly: true,
          selected: true,
        });
        await checkbox3StateChecker.checkState({
          readonly: true,
          selected: true,
        });
        await checkboxGroupStateChecker.checkState({ readonly: true });

        await readonlyToggleEl.click();
        await checkbox1StateChecker.checkState({});
        await checkbox2StateChecker.checkState({ selected: true });
        await checkbox3StateChecker.checkState({ selected: true });
        await checkboxGroupStateChecker.checkState({});

        await disableToggleEl.click();
        await checkbox1StateChecker.checkState({ disabled: true });
        await checkbox2StateChecker.checkState({
          disabled: true,
          selected: true,
        });
        await checkbox3StateChecker.checkState({
          disabled: true,
          selected: true,
        });
        await checkboxGroupStateChecker.checkState({ disabled: true });

        await disableToggleEl.click();
        await checkbox1StateChecker.checkState({});
        await checkbox2StateChecker.checkState({ selected: true });
        await checkbox3StateChecker.checkState({ selected: true });
        await checkboxGroupStateChecker.checkState({});
      });

      test(`Radio Group`, async ({ page }) => {
        const variants = [
          "hovered",
          "pressed",
          "focused",
          "focusVisible",
          "indeterminate",
          "disabled",
          "selected",
          "readonly",
        ];
        const radio1StateChecker = new StateChecker(page, variants, "r1");
        const radio2StateChecker = new StateChecker(page, variants, "r2");
        const radio3StateChecker = new StateChecker(page, variants, "r3");
        const radioGroupStateChecker = new StateChecker(
          page,
          ["disabled", "readonly"],
          "group"
        );

        const valueEl = page.locator("#value");
        const radio3 = page.locator("label").nth(2);

        const disableToggleEl = page.getByText("Set disabled");
        const readonlyToggleEl = page.getByText("Set read-only");

        await page.goto(`${ctx.host}/radio-group-test`);
        await expect(valueEl).toHaveText("Nothing selected");
        await radio1StateChecker.checkState({});
        await radio2StateChecker.checkState({});
        await radio3StateChecker.checkState({});
        await radioGroupStateChecker.checkState({});

        await page.keyboard.press("Tab"); // focus the radio group
        await radio1StateChecker.checkState({
          focused: true,
          focusVisible: true,
        });
        await radio2StateChecker.checkState({});
        await radio3StateChecker.checkState({});
        await radioGroupStateChecker.checkState({});

        await page.keyboard.down("Space");
        await expect(valueEl).toHaveText("Nothing selected");
        await radio1StateChecker.checkState({
          focused: true,
          focusVisible: true,
          pressed: true,
        });
        await radio2StateChecker.checkState({});
        await radio3StateChecker.checkState({});
        await radioGroupStateChecker.checkState({});

        await page.keyboard.up("Space");
        await expect(valueEl).toHaveText("option1");
        await radio1StateChecker.checkState({
          focused: true,
          focusVisible: true,
          selected: true,
        });
        await radio2StateChecker.checkState({});
        await radio3StateChecker.checkState({});
        await radioGroupStateChecker.checkState({});

        // Radio group in HTML requires use of Arrow up/down keys to navigate between options
        await page.keyboard.press("ArrowDown");
        // When you navigate to a radio button using arrow keys, it automatically gets selected (checked) at the same time.
        await expect(valueEl).toHaveText("option2");
        await radio1StateChecker.checkState({});
        await radio2StateChecker.checkState({
          focused: true,
          selected: true,
          focusVisible: true,
        });
        await radio3StateChecker.checkState({});
        await radioGroupStateChecker.checkState({});

        await radio3.click();
        await expect(valueEl).toHaveText("option3");
        await radio1StateChecker.checkState({});
        await radio2StateChecker.checkState({});
        await radio3StateChecker.checkState({
          focused: true,
          hovered: true,
          selected: true,
        });
        await radioGroupStateChecker.checkState({});

        await readonlyToggleEl.click();
        await radioGroupStateChecker.checkState({ readonly: true });
        // NOTE: Readonly variant is missing on Radio group (because its not part of the state accessible via render props in react-aria), so we don't assert readonly state on the radio buttons

        await readonlyToggleEl.click();
        await radioGroupStateChecker.checkState({});

        await disableToggleEl.click();
        await radio1StateChecker.checkState({ disabled: true });
        await radio2StateChecker.checkState({ disabled: true });
        await radio3StateChecker.checkState({ disabled: true, selected: true });
        await radioGroupStateChecker.checkState({ disabled: true });

        await disableToggleEl.click();
        await radio1StateChecker.checkState({});
        await radio2StateChecker.checkState({});
        await radio3StateChecker.checkState({ selected: true });
        await radioGroupStateChecker.checkState({});
      });

      test(`Switch`, async ({ page }) => {
        const variants = [
          "hovered",
          "pressed",
          "focused",
          "focusVisible",
          "disabled",
          "selected",
          "readonly",
        ];
        const valueEl = page.locator("#value");
        const labelEl = page.locator("label");
        const switchStateChecker = new StateChecker(page, variants);
        const readonlyToggleEl = page.getByText("Set read-only");
        const disableToggleEl = page.getByText("Set disabled");

        await page.goto(`${ctx.host}/switch-test`);

        await expect(valueEl).toHaveText("Off");
        await switchStateChecker.checkState({});

        await page.keyboard.press("Tab");
        await expect(valueEl).toHaveText("Off");
        await switchStateChecker.checkState({
          focused: true,
          focusVisible: true,
        });

        await page.keyboard.down("Space");
        await expect(valueEl).toHaveText("Off");
        await switchStateChecker.checkState({
          focused: true,
          focusVisible: true,
          pressed: true,
        });

        await page.keyboard.up("Space");
        await expect(valueEl).toHaveText("On");
        await switchStateChecker.checkState({
          selected: true,
          focused: true,
          focusVisible: true,
        });

        await page.keyboard.press("Space");
        await expect(valueEl).toHaveText("Off");
        await switchStateChecker.checkState({
          focused: true,
          focusVisible: true,
        });

        await labelEl.click();
        await expect(valueEl).toHaveText("On");
        await switchStateChecker.checkState({
          selected: true,
          focused: true,
          hovered: true,
        });

        await readonlyToggleEl.click();
        await switchStateChecker.checkState({ selected: true, readonly: true });

        await disableToggleEl.click();
        await switchStateChecker.checkState({
          selected: true,
          readonly: true,
          disabled: true,
        });

        await readonlyToggleEl.click();
        await switchStateChecker.checkState({ selected: true, disabled: true });

        await disableToggleEl.click();
        await switchStateChecker.checkState({ selected: true });

        await readonlyToggleEl.click();
        await switchStateChecker.checkState({ selected: true, readonly: true });

        await disableToggleEl.click();
        await switchStateChecker.checkState({
          selected: true,
          readonly: true,
          disabled: true,
        });
      });

      test(`Text Field`, async ({ page }) => {
        const inputVariants = [
          "focused",
          "focusVisible",
          "hovered",
          "disabled",
        ];
        const inputStateChecker = new LeafElementStateChecker(
          page,
          inputVariants,
          "input"
        );

        const textFieldVariants = ["disabled", "readonly"];
        const textFieldStateChecker = new StateChecker(page, textFieldVariants);

        const valueEl = page.locator("#value");
        const inputEl = page.locator("input");
        const disabledToggleEl = page.getByText("Set disabled");
        const readonlyToggleEl = page.getByText("Set read-only");

        await page.goto(`${ctx.host}/text-field-test`);
        await expect(valueEl).toHaveText("");
        await inputStateChecker.checkState({});
        await textFieldStateChecker.checkState({});
        await page.keyboard.press("Tab");
        await inputStateChecker.checkState({
          focused: true,
          focusVisible: true,
        });
        await textFieldStateChecker.checkState({});
        await inputEl.fill("Hello World");
        await expect(valueEl).toHaveText("Hello World");
        await inputStateChecker.checkState({
          focused: true,
          focusVisible: true,
        });
        await textFieldStateChecker.checkState({});
        await inputEl.blur();
        await inputStateChecker.checkState({});
        await textFieldStateChecker.checkState({});
        await inputEl.click();
        await inputStateChecker.checkState({
          focused: true,
          hovered: true,
        });
        await textFieldStateChecker.checkState({});

        await disabledToggleEl.click();
        await inputStateChecker.checkState({
          disabled: true,
        });
        await textFieldStateChecker.checkState({ disabled: true });

        await disabledToggleEl.click();
        await inputStateChecker.checkState({});
        await textFieldStateChecker.checkState({});

        await readonlyToggleEl.click();
        // NOTE: react-aria does not support readonly state for input/textarea (https://react-spectrum.adobe.com/react-aria/TextField.html#input-1), so we don't assert readonly state on the input
        await textFieldStateChecker.checkState({ readonly: true });

        await readonlyToggleEl.click();
        await textFieldStateChecker.checkState({});

        await readonlyToggleEl.click();
        await disabledToggleEl.click();

        await inputStateChecker.checkState({
          disabled: true,
        });
        await textFieldStateChecker.checkState({
          readonly: true,
          disabled: true,
        });
      });

      test(`Text Field (multiline)`, async ({ page }) => {
        const textAreaVariants = [
          "focused",
          "focusVisible",
          "hovered",
          "disabled",
        ];
        const textAreaStateChecker = new LeafElementStateChecker(
          page,
          textAreaVariants,
          "textarea"
        );

        const textFieldVariants = ["disabled", "readonly"];
        const textFieldStateChecker = new StateChecker(page, textFieldVariants);

        const valueEl = page.locator("#value");
        const textAreaEl = page.locator("textArea");
        const disabledToggleEl = page.getByText("Set disabled");
        const readonlyToggleEl = page.getByText("Set read-only");

        await page.goto(`${ctx.host}/text-field-multiline-test`);
        await expect(valueEl).toHaveText("");
        await textAreaStateChecker.checkState({});
        await textFieldStateChecker.checkState({});
        await page.keyboard.press("Tab");
        await textAreaStateChecker.checkState({
          focused: true,
          focusVisible: true,
        });
        await textFieldStateChecker.checkState({});
        await textAreaEl.fill("Hello World");
        await expect(valueEl).toHaveText("Hello World");
        await textAreaStateChecker.checkState({
          focused: true,
          focusVisible: true,
        });
        await textFieldStateChecker.checkState({});
        await textAreaEl.blur();
        await textAreaStateChecker.checkState({});
        await textFieldStateChecker.checkState({});
        await textAreaEl.click();
        await textAreaStateChecker.checkState({
          focused: true,
          hovered: true,
        });
        await textFieldStateChecker.checkState({});

        await disabledToggleEl.click();
        await textAreaStateChecker.checkState({
          disabled: true,
        });
        await textFieldStateChecker.checkState({ disabled: true });

        await disabledToggleEl.click();
        await textAreaStateChecker.checkState({});
        await textFieldStateChecker.checkState({});

        await readonlyToggleEl.click();
        // NOTE: react-aria does not support readonly state for input/textarea (https://react-spectrum.adobe.com/react-aria/TextField.html#input-1), so we don't assert readonly state on the textarea
        await textFieldStateChecker.checkState({ readonly: true });

        await readonlyToggleEl.click();
        await textFieldStateChecker.checkState({});

        await readonlyToggleEl.click();
        await disabledToggleEl.click();
        await textAreaStateChecker.checkState({
          disabled: true,
        });
        await textFieldStateChecker.checkState({
          readonly: true,
          disabled: true,
        });
      });

      // TODO: Enhance tests to verify that the registered variants on nested button are triggered.
      test(`Select`, async ({ page }) => {
        const valueEl = page.locator("#value");
        const popoverEl = page.locator(`[data-trigger="Select"]`);
        const triggerEl = page.locator(`button span`);
        const disabledToggleEl = page.getByText("Set disabled");
        const bodyEl = page.locator("body");

        const variants = ["disabled", "focused", "focusVisible"];

        const selectStateChecker = new StateChecker(page, variants);

        await page.goto(`${ctx.host}/select-test`);
        await expect(valueEl).toHaveText("");
        await selectStateChecker.checkState({});

        await selectStateChecker.checkState({});
        await triggerEl.click();
        await selectStateChecker.checkState({ focused: true });
        await popoverEl.getByText(`Item 2`).first().click();
        await expect(valueEl).toHaveText("item2");
        await page.locator("button").click();
        await popoverEl.getByText(`Section Item 3`).click();
        await expect(valueEl).toHaveText("section-item-3");
        await bodyEl.click();

        await page.keyboard.press("Tab");
        await selectStateChecker.checkState({
          focused: true,
          focusVisible: true,
        });
        await page.keyboard.press("Space");
        await selectStateChecker.checkState({
          focused: true,
          focusVisible: true,
        });
        await page.keyboard.press("ArrowUp");
        await page.keyboard.press("Space");
        await expect(valueEl).toHaveText("section-item-2");
        await selectStateChecker.checkState({
          focused: true,
          focusVisible: true,
        });

        await disabledToggleEl.click();
        await selectStateChecker.checkState({ disabled: true });

        await disabledToggleEl.click();
        await selectStateChecker.checkState({});
      });

      test(`Combobox`, async ({ page }) => {
        const dropdownButtonEl = page.locator("button");
        const disabledToggleEl = page.getByText("Set disabled");

        const variants = ["disabled"];
        const inputVariants = [
          "focused",
          "focusVisible",
          "hovered",
          "disabled",
        ];
        const inputStateChecker = new LeafElementStateChecker(
          page,
          inputVariants,
          "input"
        );

        const comboboxStateChecker = new StateChecker(page, variants);

        const valueEl = page.locator("#value");
        const popoverEl = page.locator(`[data-trigger="ComboBox"]`);
        await page.goto(`${ctx.host}/combobox-test`);
        await expect(valueEl).toHaveText("");
        await comboboxStateChecker.checkState({});
        await inputStateChecker.checkState({});
        await expect(popoverEl.getByText(`Item 2`)).not.toBeVisible();

        await dropdownButtonEl.click();
        await inputStateChecker.checkState({
          focused: true, // dropdown button is styled such that it appears over the input
        });
        await popoverEl.getByText(`Item 2`).first().click();
        await expect(valueEl).toHaveText("item2");
        await page.locator("input").fill("sect");
        await popoverEl.getByText(`Section Item 2`).click();
        await expect(valueEl).toHaveText("section-item-2");

        await disabledToggleEl.click();
        await comboboxStateChecker.checkState({ disabled: true });
        await inputStateChecker.checkState({ disabled: true });

        await disabledToggleEl.click();
        await comboboxStateChecker.checkState({});
      });

      test(`Drawer Dialog`, async ({ page }) => {
        const insideDialogEl = page.getByText("This is a Modal");
        await page.goto(`${ctx.host}/drawer-dialog-test`);
        await expect(insideDialogEl).not.toBeVisible();
        await page.locator("button").click();
        await expect(insideDialogEl).toBeVisible();
        await page.getByText("Heading").click();
        await expect(insideDialogEl).toBeVisible();
        await page.getByText("Close").click();
        await expect(insideDialogEl).not.toBeVisible();
      });

      test(`Modal Dialog`, async ({ page }) => {
        const insideDialogEl = page.getByText("This is a Modal");

        await page.goto(`${ctx.host}/modal-dialog-test`);
        await expect(insideDialogEl).not.toBeVisible();
        await page.locator("button").click();
        await expect(insideDialogEl).toBeVisible();
        await page.getByText("Heading").click();
        await expect(insideDialogEl).toBeVisible();
        await page.getByText("Close").click();
        await expect(insideDialogEl).not.toBeVisible();
      });

      test(`Popover Dialog`, async ({ page }) => {
        const insideDialogEl = page.getByText("This is a Popover");
        const triggerEl = page.locator("button");
        const outsideEl = page.getByText("Outside");
        const setPlacementTopEl = page.getByText("Set placement top");
        const setPlacementBottomEl = page.getByText("Set placement bottom");
        const setPlacementLeftEl = page.getByText("Set placement left");
        const setPlacementRightEl = page.getByText("Set placement right");

        const overlayArrowVariants = ["placement"];
        const overlayArrowStateChecker = new StateChecker(
          page,
          overlayArrowVariants
        );

        await page.goto(`${ctx.host}/popover-dialog-test`);
        await expect(insideDialogEl).not.toBeVisible();
        await triggerEl.click();
        await expect(insideDialogEl).toBeVisible();
        await overlayArrowStateChecker.checkState({
          placement: "bottom",
        });
        await insideDialogEl.click();
        await expect(insideDialogEl).toBeVisible();
        // React-aria adds an invisible overlay (underlay) element that captures clicks outside the popover
        // We need force: true to bypass this overlay and directly click the element underneath
        await outsideEl.click({ force: true });
        await expect(insideDialogEl).not.toBeVisible();

        await outsideEl.click({ force: true });
        await setPlacementTopEl.click();
        await triggerEl.click();
        await overlayArrowStateChecker.checkState({
          placement: "top",
        });

        await outsideEl.click({ force: true });
        await setPlacementBottomEl.click();
        await triggerEl.click();
        await overlayArrowStateChecker.checkState({
          placement: "bottom",
        });

        await outsideEl.click({ force: true });
        await setPlacementLeftEl.click();
        await triggerEl.click();
        await overlayArrowStateChecker.checkState({
          placement: "left",
        });

        await outsideEl.click({ force: true });
        await setPlacementRightEl.click();
        await triggerEl.click();
        await overlayArrowStateChecker.checkState({
          placement: "right",
        });
      });

      test(`Tooltip`, async ({ page }) => {
        const insideTooltipEl = page.getByText("Hello from Tooltip");
        const outsideEl = page.getByText("Outside");
        const setPlacementTopEl = page.getByText("Set placement top");
        const setPlacementBottomEl = page.getByText("Set placement bottom");
        const setPlacementLeftEl = page.getByText("Set placement left");
        const setPlacementRightEl = page.getByText("Set placement right");

        const overlayArrowVariants = ["placement"];
        const overlayArrowStateChecker = new StateChecker(
          page,
          overlayArrowVariants
        );

        await page.goto(`${ctx.host}/tooltip-test`);
        await expect(insideTooltipEl).not.toBeVisible();
        await page.getByText("Hover me").hover();
        await expect(insideTooltipEl).toBeVisible();
        await overlayArrowStateChecker.checkState({
          placement: "top",
        });
        await insideTooltipEl.hover();
        await expect(insideTooltipEl).not.toBeVisible();
        await outsideEl.hover();
        await expect(insideTooltipEl).not.toBeVisible();

        await setPlacementBottomEl.click();
        await page.getByText("Hover me").hover();
        await expect(insideTooltipEl).toBeVisible();
        await overlayArrowStateChecker.checkState({
          placement: "bottom",
        });

        await setPlacementLeftEl.click();
        await page.getByText("Hover me").hover();
        await expect(insideTooltipEl).toBeVisible();
        await overlayArrowStateChecker.checkState({
          placement: "left",
        });

        await setPlacementRightEl.click();
        await page.getByText("Hover me").hover();
        await expect(insideTooltipEl).toBeVisible();
        await overlayArrowStateChecker.checkState({
          placement: "right",
        });

        await setPlacementTopEl.click();
        await page.getByText("Hover me").hover();
        await expect(insideTooltipEl).toBeVisible();
        await overlayArrowStateChecker.checkState({
          placement: "top",
        });
      });
      test(`Slider`, async ({ page }) => {
        const valueEl = page.locator("#value");
        const outputEl = page.locator("output > div:first-child");
        const thumbEl = page.locator("input");
        const disabledToggleEl = page.getByText("Set disabled");

        const sliderVariants = ["disabled"];
        const sliderStateChecker = new StateChecker(
          page,
          sliderVariants,
          "slider"
        );

        const sliderOutputVariants = ["disabled"];
        const sliderOutputStateChecker = new StateChecker(
          page,
          sliderOutputVariants,
          "slider-output"
        );

        const sliderTrackVariants = ["hovered"];
        const sliderTrackStateChecker = new StateChecker(
          page,
          sliderTrackVariants,
          "slider-track"
        );

        const sliderThumbVariants = [
          "focused",
          "focusVisible",
          "hovered",
          "disabled",
          "dragging",
        ];
        const sliderThumbStateChecker = new StateChecker(
          page,
          sliderThumbVariants,
          "thumb"
        );

        await page.goto(`${ctx.host}/slider-test`);
        await expect(outputEl).toHaveText("50");
        await expect(valueEl).toHaveText("50"); // to ensure that the state is also exposed
        await sliderStateChecker.checkState({});
        await sliderTrackStateChecker.checkState({});
        await sliderThumbStateChecker.checkState({});
        await sliderOutputStateChecker.checkState({});

        await page.keyboard.press("Tab");
        await sliderStateChecker.checkState({});
        await sliderTrackStateChecker.checkState({});
        await sliderThumbStateChecker.checkState({
          focused: true,
          focusVisible: true,
        });
        await sliderOutputStateChecker.checkState({});

        await thumbEl.press("ArrowRight");
        await expect(outputEl).toHaveText("51");
        await expect(valueEl).toHaveText("51");
        await thumbEl.press("ArrowRight");
        await thumbEl.press("ArrowRight");
        await thumbEl.press("ArrowRight");
        await thumbEl.press("ArrowRight");
        await thumbEl.press("ArrowRight");
        await thumbEl.press("ArrowRight");
        await thumbEl.press("ArrowRight");
        await thumbEl.press("ArrowRight");
        await thumbEl.press("ArrowRight");
        await expect(outputEl).toHaveText("60");
        await expect(valueEl).toHaveText("60");
        await thumbEl.press("ArrowLeft");
        await thumbEl.press("ArrowLeft");
        await thumbEl.press("ArrowLeft");
        await expect(outputEl).toHaveText("57");
        await expect(valueEl).toHaveText("57");

        thumbEl.dispatchEvent("mousedown");
        await sliderThumbStateChecker.checkState({
          dragging: true,
          focused: true,
          focusVisible: true,
        });
        await sliderTrackStateChecker.checkState({});
        thumbEl.dispatchEvent("mouseup");
        await sliderThumbStateChecker.checkState({
          focused: true,
          focusVisible: true,
        });

        await disabledToggleEl.click();
        await sliderStateChecker.checkState({ disabled: true });
        await sliderTrackStateChecker.checkState({});
        await sliderThumbStateChecker.checkState({ disabled: true });
        await sliderOutputStateChecker.checkState({ disabled: true });

        await disabledToggleEl.click();
        await sliderStateChecker.checkState({});
        await sliderTrackStateChecker.checkState({});
        await sliderThumbStateChecker.checkState({});
        await sliderOutputStateChecker.checkState({});
      });

      test(`Range Slider`, async ({ page }) => {
        const valueEl = page.locator("#value");
        const outputEl = page.locator("output > div:first-child");
        const thumb1 = page.locator("input").nth(0);
        const thumb2 = page.locator("input").nth(1);
        const disabledToggleEl = page.getByText("Set disabled");

        const sliderVariants = ["disabled"];
        const sliderStateChecker = new StateChecker(
          page,
          sliderVariants,
          "slider"
        );

        const sliderOutputVariants = ["disabled"];
        const sliderOutputStateChecker = new StateChecker(
          page,
          sliderOutputVariants,
          "slider-output"
        );

        const sliderTrackVariants = ["hovered"];
        const sliderTrackStateChecker = new StateChecker(
          page,
          sliderTrackVariants,
          "slider-track"
        );

        const sliderThumbVariants = [
          "focused",
          "focusVisible",
          "hovered",
          "disabled",
          "dragging",
        ];
        const sliderThumb1StateChecker = new StateChecker(
          page,
          sliderThumbVariants,
          "thumb1"
        );
        const sliderThumb2StateChecker = new StateChecker(
          page,
          sliderThumbVariants,
          "thumb2"
        );

        await page.goto(`${ctx.host}/range-slider-test`);
        await sliderStateChecker.checkState({});
        await sliderTrackStateChecker.checkState({});
        await sliderThumb1StateChecker.checkState({});
        await sliderThumb2StateChecker.checkState({});
        await sliderOutputStateChecker.checkState({});

        await expect(outputEl).toHaveText("25,75");
        await expect(valueEl).toHaveText("25, 75");

        await page.keyboard.press("Tab");
        await sliderStateChecker.checkState({});
        await sliderTrackStateChecker.checkState({});
        await sliderThumb1StateChecker.checkState({
          focused: true,
          focusVisible: true,
        });
        await sliderThumb2StateChecker.checkState({});
        await page.keyboard.press("Tab");
        await sliderThumb1StateChecker.checkState({});
        await sliderThumb2StateChecker.checkState({
          focused: true,
          focusVisible: true,
        });
        await sliderOutputStateChecker.checkState({});

        await thumb2.press("ArrowRight");
        await sliderThumb1StateChecker.checkState({});
        await sliderThumb2StateChecker.checkState({
          focused: true,
          focusVisible: true,
        });
        await sliderTrackStateChecker.checkState({});

        await thumb2.press("ArrowRight");
        await thumb2.press("ArrowRight");
        await thumb2.press("ArrowRight");
        await thumb2.press("ArrowRight");
        await thumb2.press("ArrowLeft");
        await expect(outputEl).toHaveText("25,79");
        await expect(valueEl).toHaveText("25, 79");
        await thumb1.press("ArrowRight");
        await thumb1.press("ArrowRight");
        await thumb1.press("ArrowRight");
        await expect(valueEl).toHaveText("28, 79");

        await disabledToggleEl.click();
        await sliderStateChecker.checkState({ disabled: true });
        await sliderTrackStateChecker.checkState({});
        await sliderThumb1StateChecker.checkState({ disabled: true });
        await sliderThumb2StateChecker.checkState({ disabled: true });
        await sliderOutputStateChecker.checkState({ disabled: true });

        await disabledToggleEl.click();
        await sliderStateChecker.checkState({});
        await sliderTrackStateChecker.checkState({});
        await sliderThumb1StateChecker.checkState({});
        await sliderThumb2StateChecker.checkState({});
        await sliderOutputStateChecker.checkState({});
      });
    });
  }
});

async function expectStyleProperty(
  locator: Locator,
  property: keyof CSSStyleDeclaration,
  expectedValue: string,
  negation?: boolean
): Promise<void> {
  const actualValue = await locator.evaluate(
    (el, prop) =>
      window.getComputedStyle(el)[prop as keyof CSSStyleDeclaration] as string,
    property
  );
  if (negation) {
    expect(actualValue).not.toBe(expectedValue);
  } else {
    expect(actualValue).toBe(expectedValue);
  }
}

async function expectStylePropertyNot(
  locator: Locator,
  property: keyof CSSStyleDeclaration,
  expectedValue: string
): Promise<void> {
  await expectStyleProperty(locator, property, expectedValue, true);
}

const GREEN = "rgb(34, 197, 94)";

/**
 * Checks component state for leaf elements that
 * don't contain additional elements for state indication.
 *
 * This class is designed to test state variants on elements by examining
 * their data attributes and CSS properties directly, rather than
 * looking for child elements that represent state information.
 */
class LeafElementStateChecker {
  private readonly variantsToCheck: Set<string>;

  constructor(
    private readonly page: Page,
    variantsToCheck: string[],
    private readonly selector: string = ""
  ) {
    this.variantsToCheck = new Set(variantsToCheck);
  }

  async checkState({
    focused = false,
    hovered = false,
    focusVisible = false,
    disabled = false,
  }: {
    focused?: boolean;
    hovered?: boolean;
    focusVisible?: boolean;
    disabled?: boolean;
    placement?: string;
  }): Promise<void> {
    const el = this.page.locator(this.selector);

    if (this.variantsToCheck.has("focused")) {
      const focusedBorderWidth = "2px";
      if (focused) {
        await expect(el).toHaveAttribute("placeholder", "focused placeholder");
        await expectStyleProperty(el, "borderWidth", focusedBorderWidth);
      } else {
        await expect(el).not.toHaveAttribute(
          "placeholder",
          "focused placeholder"
        );
        await expectStylePropertyNot(el, "borderWidth", focusedBorderWidth);
      }
    }

    if (this.variantsToCheck.has("hovered")) {
      const hoveredBgColor = "rgb(250, 255, 186)";
      if (hovered) {
        await expect(el).toHaveAttribute("aria-label", "me-hovered");
        await expectStyleProperty(el, "backgroundColor", hoveredBgColor);
      } else {
        await expect(el).not.toHaveAttribute("aria-label", "me-hovered");
        await expectStylePropertyNot(el, "backgroundColor", hoveredBgColor);
      }
    }

    if (this.variantsToCheck.has("focusVisible")) {
      const focusVisibleOutlineWidth = "2px";
      if (focusVisible) {
        await expect(el).toHaveAttribute("aria-label", "me-focus-visible");
        await expectStyleProperty(el, "outlineWidth", focusVisibleOutlineWidth);
      } else {
        await expect(el).not.toHaveAttribute("aria-label", "me-focus-visible");
        await expectStylePropertyNot(
          el,
          "outlineWidth",
          focusVisibleOutlineWidth
        );
      }
    }

    if (this.variantsToCheck.has("disabled")) {
      const disabledBgColor = "rgb(189, 189, 189)";
      if (disabled) {
        await expect(el).toHaveAttribute("placeholder", "disabled placeholder");
        await expectStyleProperty(el, "backgroundColor", disabledBgColor);
      } else {
        await expect(el).not.toHaveAttribute("aria-label", "me-disabled");
        await expectStylePropertyNot(el, "backgroundColor", disabledBgColor);
      }
    }
  }
}

/**
 * Checks state of components that accept a children slot
 */
class StateChecker {
  private readonly variantsToCheck: Set<string>;

  constructor(
    private readonly page: Page,
    variantsToCheck: string[],
    private readonly prefix: string = ""
  ) {
    this.variantsToCheck = new Set(variantsToCheck);
  }

  async checkState({
    focused = false,
    hovered = false,
    focusVisible = false,
    disabled = false,
    pressed = false,
    selected = false,
    readonly = false,
    indeterminate = false,
    dragging = false,
    placement,
  }: {
    focused?: boolean;
    hovered?: boolean;
    focusVisible?: boolean;
    disabled?: boolean;
    pressed?: boolean;
    selected?: boolean;
    readonly?: boolean;
    indeterminate?: boolean;
    dragging?: boolean;
    placement?: string;
  }): Promise<void> {
    const prefixWithHyphen = this.prefix ? `${this.prefix}-` : "";
    const hoverStateEl = this.page.locator(`#${prefixWithHyphen}hovered-state`);
    const focusStateEl = this.page.locator(`#${prefixWithHyphen}focused-state`);
    const pressedStateEl = this.page.locator(
      `#${prefixWithHyphen}pressed-state`
    );
    const disabledStateEl = this.page.locator(
      `#${prefixWithHyphen}disabled-state`
    );
    const focusVisibleStateEl = this.page.locator(
      `#${prefixWithHyphen}focus-visible-state`
    );
    const selectedStateEl = this.page.locator(
      `#${prefixWithHyphen}selected-state`
    );
    const readonlyStateEl = this.page.locator(
      `#${prefixWithHyphen}read-only-state`
    );
    const indeterminateStateEl = this.page.locator(
      `#${prefixWithHyphen}indeterminate-state`
    );
    const draggingStateEl = this.page.locator(
      `#${prefixWithHyphen}dragging-state`
    );
    const placementTopStateEl = this.page.locator(
      `#${prefixWithHyphen}placement-top-state`
    );
    const placementBottomStateEl = this.page.locator(
      `#${prefixWithHyphen}placement-bottom-state`
    );
    const placementLeftStateEl = this.page.locator(
      `#${prefixWithHyphen}placement-left-state`
    );
    const placementRightStateEl = this.page.locator(
      `#${prefixWithHyphen}placement-right-state`
    );

    if (this.variantsToCheck.has("focused")) {
      if (focused) {
        await expect(focusStateEl).toHaveText("(focused)");
        await expectStyleProperty(focusStateEl, "color", GREEN);
      } else {
        await expect(focusStateEl).toHaveText("(not focused)");
        await expectStylePropertyNot(focusStateEl, "color", GREEN);
      }
    }

    if (this.variantsToCheck.has("hovered")) {
      if (hovered) {
        await expect(hoverStateEl).toHaveText("(hovered)");
        await expectStyleProperty(hoverStateEl, "color", GREEN);
      } else {
        await expect(hoverStateEl).toHaveText("(not hovered)");
        await expectStylePropertyNot(hoverStateEl, "color", GREEN);
      }
    }

    if (this.variantsToCheck.has("pressed")) {
      if (pressed) {
        await expect(pressedStateEl).toHaveText("(pressed)");
        await expectStyleProperty(pressedStateEl, "color", GREEN);
      } else {
        await expect(pressedStateEl).toHaveText("(not pressed)");
        await expectStylePropertyNot(pressedStateEl, "color", GREEN);
      }
    }

    if (this.variantsToCheck.has("disabled")) {
      if (disabled) {
        await expect(disabledStateEl).toHaveText("(disabled)");
        await expectStyleProperty(disabledStateEl, "color", GREEN);
      } else {
        await expect(disabledStateEl).toHaveText("(not disabled)");
        await expectStylePropertyNot(disabledStateEl, "color", GREEN);
      }
    }

    if (this.variantsToCheck.has("focusVisible")) {
      if (focusVisible) {
        await expect(focusVisibleStateEl).toHaveText("(focus-vis)");
        await expectStyleProperty(focusVisibleStateEl, "color", GREEN);
      } else {
        await expect(focusVisibleStateEl).toHaveText("(not focus-vis)");
        await expectStylePropertyNot(focusVisibleStateEl, "color", GREEN);
      }
    }

    if (this.variantsToCheck.has("selected")) {
      if (selected) {
        await expect(selectedStateEl).toHaveText("(selected)");
        await expectStyleProperty(selectedStateEl, "color", GREEN);
      } else {
        await expect(selectedStateEl).toHaveText("(not selected)");
        await expectStylePropertyNot(selectedStateEl, "color", GREEN);
      }
    }

    if (this.variantsToCheck.has("readonly")) {
      if (readonly) {
        await expect(readonlyStateEl).toHaveText("(read-only)");
        await expectStyleProperty(readonlyStateEl, "color", GREEN);
      } else {
        await expect(readonlyStateEl).toHaveText("(not read-only)");
        await expectStylePropertyNot(readonlyStateEl, "color", GREEN);
      }
    }

    if (this.variantsToCheck.has("indeterminate")) {
      if (indeterminate) {
        await expect(indeterminateStateEl).toHaveText("(indeterminate)");
        await expectStyleProperty(indeterminateStateEl, "color", GREEN);
      } else {
        await expect(indeterminateStateEl).toHaveText("(not indeterminate)");
        await expectStylePropertyNot(indeterminateStateEl, "color", GREEN);
      }
    }

    if (this.variantsToCheck.has("dragging")) {
      if (dragging) {
        await expect(draggingStateEl).toHaveText("(dragging)");
        await expectStyleProperty(draggingStateEl, "color", GREEN);
      } else {
        await expect(draggingStateEl).toHaveText("(not dragging)");
        await expectStylePropertyNot(draggingStateEl, "color", GREEN);
      }
    }

    if (this.variantsToCheck.has("placement")) {
      if (placement === "top") {
        await expect(placementTopStateEl).toHaveText("p(t)");
        await expectStyleProperty(placementTopStateEl, "color", GREEN);
      } else {
        await expect(placementTopStateEl).toHaveText("np(t)");
        await expectStylePropertyNot(placementTopStateEl, "color", GREEN);
      }
      if (placement === "bottom") {
        await expect(placementBottomStateEl).toHaveText("p(b)");
        await expectStyleProperty(placementBottomStateEl, "color", GREEN);
      } else {
        await expect(placementBottomStateEl).toHaveText("np(b)");
        await expectStylePropertyNot(placementBottomStateEl, "color", GREEN);
      }
      if (placement === "left") {
        await expect(placementLeftStateEl).toHaveText("p(l)");
        await expectStyleProperty(placementLeftStateEl, "color", GREEN);
      } else {
        await expect(placementLeftStateEl).toHaveText("np(l)");
        await expectStylePropertyNot(placementLeftStateEl, "color", GREEN);
      }
      if (placement === "right") {
        await expect(placementRightStateEl).toHaveText("p(r)");
        await expectStyleProperty(placementRightStateEl, "color", GREEN);
      } else {
        await expect(placementRightStateEl).toHaveText("np(r)");
        await expectStylePropertyNot(placementRightStateEl, "color", GREEN);
      }
    }
  }
}
