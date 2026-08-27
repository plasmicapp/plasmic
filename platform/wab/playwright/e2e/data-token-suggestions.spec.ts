import { expect, Locator } from "@playwright/test";
import { test } from "../fixtures/test";
import { StudioModel } from "../models/studio-model";
import { goToProject } from "../utils/studio-utils";

test.describe("data token suggestions popover", () => {
  let projectId: string;

  test.afterEach(async ({ apiClient }) => {
    await apiClient.removeProjectAfterTest(
      projectId,
      "user2@example.com",
      "!53kr3tz!"
    );
  });

  test.beforeEach(async ({ apiClient, page }) => {
    projectId = await apiClient.setupProjectWithHostlessPackages({
      name: "data-token-suggestions",
      hostLessPackagesInfo: {
        name: "strapi",
        npmPkg: ["@plasmicpkgs/strapi"],
      },
    });
    await goToProject(
      page,
      `/projects/${projectId}?dataTokens=true&plexus=true&serverQueries=true`
    );
  });

  /** A suggestion row in the popover, matched by its token name. */
  function suggestion(studio: StudioModel, tokenName: string): Locator {
    return studio.frame.locator(
      `[data-test-id="data-token-suggestions"] [role="option"][aria-label="${tokenName}"]`
    );
  }

  function editableOf(input: Locator): Locator {
    return input.locator('[contenteditable="true"]');
  }

  test("suggests tokens for string component props", async ({ models }) => {
    const studio = models.studio;

    await studio.leftPanel.createNewDataToken({
      name: "Aria Label",
      type: "string",
      value: "my aria label",
    });

    await studio.leftPanel.createNewPage("TestPage");
    await studio.leftPanel.insertNode("Slider");
    await studio.rightPanel.expandComponentPropsSection();

    const row = studio.rightPanel.frame.locator(
      `[data-test-id="prop-editor-row-ARIA label"]`
    );
    await row.scrollIntoViewIfNeeded();
    const input = row.locator(`[data-plasmic-prop="ARIA label"]`);
    const editable = editableOf(input);

    await editable.focus();
    await expect(suggestion(studio, "Aria Label")).toBeVisible();

    // Escape dismisses without binding anything
    await studio.page.keyboard.press("Escape");
    await expect(suggestion(studio, "Aria Label")).toBeHidden();

    // Typing reopens it.
    await studio.page.keyboard.type("aria");
    await expect(suggestion(studio, "Aria Label")).toBeVisible();

    // Nothing is highlighted until you arrow onto it
    await studio.page.keyboard.press("ArrowDown");
    await expect(suggestion(studio, "Aria Label")).toHaveAttribute(
      "aria-selected",
      "true"
    );

    // Tab binds the highlighted suggestion;
    await studio.page.keyboard.press("Tab");
    await expect(input).toHaveText("$dataTokens.ariaLabel");
  });

  test("suggests tokens for number component props", async ({ models }) => {
    const studio = models.studio;

    for (const [name, value] of [
      ["Initial Value", "42"],
      ["Initial Value Alt", "7"],
      ["Step", "5"],
    ]) {
      await studio.leftPanel.createNewDataToken({
        name,
        type: "number",
        value,
      });
    }

    await studio.leftPanel.createNewPage("TestPage");
    await studio.leftPanel.insertNode("Slider");
    await studio.rightPanel.expandComponentPropsSection();

    const rowFor = (prop: string) =>
      studio.rightPanel.frame.locator(
        `[data-test-id="prop-editor-row-${prop}"]`
      );
    const emptyTheInput = async (input: Locator) => {
      await input.click();
      await studio.page.keyboard.press("ControlOrMeta+A");
      await studio.page.keyboard.type("1");
      await studio.page.keyboard.press("Backspace");
    };

    await test.step("Escape dismisses, arrows navigate, Enter binds", async () => {
      const row = rowFor("Initial value");
      await row.scrollIntoViewIfNeeded();
      // `data-plasmic-prop` lands on the <input> itself.
      const input = row.locator(`[data-plasmic-prop="Initial value"]`);

      await emptyTheInput(input);
      await expect(suggestion(studio, "Initial Value")).toBeVisible();

      await studio.page.keyboard.press("Escape");
      await expect(suggestion(studio, "Initial Value")).toBeHidden();
      await expect(row).not.toContainText("$dataTokens");

      await emptyTheInput(input);
      await studio.page.keyboard.press("ArrowDown");
      // antd would otherwise step the number on Arrow↓.
      await expect(input).toHaveValue("");
      // Nothing starts highlighted, so the first Arrow↓ lands on the top row.
      await expect(suggestion(studio, "Initial Value")).toHaveAttribute(
        "aria-selected",
        "true"
      );
      await expect(suggestion(studio, "Initial Value Alt")).toHaveAttribute(
        "aria-selected",
        "false"
      );

      await studio.page.keyboard.press("Enter");
      await expect(row).toContainText("$dataTokens.initialValue");
    });

    await test.step("clicking a suggestion binds it", async () => {
      const row = rowFor("Step");
      await row.scrollIntoViewIfNeeded();
      const input = row.locator(`[data-plasmic-prop="Step"]`);
      await input.click();
      await studio.page.keyboard.press("ControlOrMeta+A");
      await studio.page.keyboard.type("5");

      await suggestion(studio, "Step").click();
      await expect(row).toContainText("$dataTokens.step");
    });
  });

  test("searches text props by typed query even when the name doesn't match", async ({
    models,
  }) => {
    const studio = models.studio;
    await studio.leftPanel.createNewDataToken({
      name: "Brand Color",
      type: "string",
      value: "#ff0000",
    });

    await studio.leftPanel.createNewPage("TestPage");
    await studio.leftPanel.insertNode("Slider");
    await studio.rightPanel.expandComponentPropsSection();

    const row = studio.rightPanel.frame.locator(
      `[data-test-id="prop-editor-row-ARIA label"]`
    );
    await row.scrollIntoViewIfNeeded();
    const input = row.locator(`[data-plasmic-prop="ARIA label"]`);
    const editable = editableOf(input);

    // Empty focus: heuristic finds nothing (name mismatch).
    await editable.focus();
    await expect(suggestion(studio, "Brand Color")).toBeHidden();

    await studio.page.keyboard.type("brand");
    await expect(suggestion(studio, "Brand Color")).toBeVisible();

    await suggestion(studio, "Brand Color").click();
    await expect(input).toHaveText("$dataTokens.brandColor");
  });

  test("suggests tokens for custom-function (server query) params", async ({
    models,
  }) => {
    const studio = models.studio;
    for (const name of ["Host", "Strapi Host"]) {
      await studio.leftPanel.createNewDataToken({
        name,
        type: "string",
        value: "https://example.com",
      });
    }

    await studio.leftPanel.createNewPage("TestPage");
    await studio.rightPanel.clickPageData();
    await studio.rightPanel.addServerQueryButton.click();
    await studio.rightPanel.serverQueriesSection
      .locator(`[data-plasmic-role="labeled-item"]`)
      .last()
      .click();

    const modal = studio.serverQueryBottomModal;
    await modal.waitFor();

    const hostRow = modal.locator(`[data-test-id="prop-editor-row-host"]`);
    const hostInput = hostRow.locator(`[data-plasmic-prop="host"]`);

    await editableOf(hostInput).focus();
    await expect(suggestion(studio, "Host")).toBeVisible();

    // Ranked by the enclosing function's name, not just the param's.
    await expect(
      studio.frame
        .locator(`[data-test-id="data-token-suggestions"] [role="option"]`)
        .first()
    ).toHaveAttribute("aria-label", "Strapi Host");

    await suggestion(studio, "Host").click();
    await expect(hostInput).toHaveText("$dataTokens.host");
  });

  test("href editor: picking a token isn't clobbered by the typed draft", async ({
    models,
  }) => {
    const studio = models.studio;
    await studio.leftPanel.createNewDataToken({
      name: "My Link",
      type: "string",
      value: "products/123",
    });

    await studio.leftPanel.createNewPage("TestPage");
    await studio.leftPanel.insertNode("Link");
    await studio.rightPanel.switchToSettingsTab();

    const hrefInput = studio.rightPanel.frame
      .locator(`[data-plasmic-prop="href"]`)
      .first();
    await hrefInput.click();
    // The href is prefilled with a default url, so clear it first.
    await studio.page.keyboard.press("ControlOrMeta+A");
    await studio.page.keyboard.press("Delete");
    await studio.page.keyboard.type("produc");

    const tokenItem = studio.frame
      .locator(".ant-dropdown-menu-item")
      .filter({ hasText: "My Link" });
    await expect(tokenItem).toBeVisible();
    await tokenItem.click();

    await expect(
      studio.rightPanel.frame.getByText("$dataTokens.myLink")
    ).toBeVisible();
  });
});
