import { expect, Locator, Page } from "@playwright/test";
import { kebabCase, startCase } from "lodash";
import { testIds } from "../../src/wab/client/test-helpers/test-ids";
import { PageModels, test } from "../fixtures/test";
import { goToProject, waitForFrameToLoad } from "../utils/studio-utils";

export const PLEXUS_INSERTABLES = [
  { name: "button", dependencies: [] },
  { name: "checkbox", dependencies: [] },
  {
    name: "checkboxGroup",
    dependencies: ["Label", "Checkbox", "Description"],
  },
  {
    name: "combobox",
    dependencies: [
      "Label",
      "Description",
      "Menu Popover",
      "Menu Item",
      "Menu Section",
    ],
  },
  { name: "drawer", dependencies: ["Button"] },
  { name: "modal", dependencies: ["Button"] },
  { name: "popover", dependencies: ["Button", "Overlay Arrow"] },
  {
    name: "rangeSlider",
    dependencies: ["Label", "Description", "Slider Thumb"],
  },
  { name: "radio", dependencies: [] },
  {
    name: "radioGroup",
    dependencies: ["Label", "Description", "Radio"],
  },
  {
    name: "select",
    dependencies: [
      "Label",
      "Description",
      "Menu Popover",
      "Menu Item",
      "Menu Section",
    ],
  },
  { name: "slider", dependencies: ["Label", "Slider Thumb"] },
  { name: "switch", dependencies: ["Description"] },
  {
    name: "textInput",
    dependencies: [],
  },
  {
    name: "textField",
    dependencies: ["Label", "Description", "Text Input", "TextArea Input"],
  },
  { name: "tooltip", dependencies: ["Overlay Arrow"] },
];

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

test.describe("Plexus Installation", () => {
  let projectId: string;

  test.beforeEach(async ({ apiClient, page }) => {
    projectId = await apiClient.setupNewProject({
      name: "Plexus Installation Test",
      devFlags: { plexus: true },
    });
    await goToProject(page, `/projects/${projectId}?plexus=true`);
  });

  test.afterEach(async ({ apiClient }) => {
    await apiClient.removeProjectAfterTest(
      projectId,
      "user2@example.com",
      "!53kr3tz!"
    );
  });

  async function getFilteredComponentsInProjectPanel(
    models: PageModels,
    page: Page,
    filterQuery: string
  ) {
    const projectPanel = await ensureProjectPanelOpen(models, page);
    const input = projectPanel.locator("input");
    await input.clear();
    await input.fill(filterQuery);
    await page.waitForTimeout(500);
    const rowLocator = projectPanel.locator("div.flex-col").filter({
      hasText: new RegExp(`^\\s*${escapeRegExp(filterQuery)}\\s*$`, "i"),
    });
    return rowLocator;
  }

  async function ensureProjectPanelOpen(models: PageModels, page: Page) {
    const projectPanel = models.studio.frame.locator(
      testIds.projectPanel.selector
    );
    if (!(await projectPanel.isVisible())) {
      await models.studio.projectNavButton.click({ timeout: 10000 });
      await expect(projectPanel).toBeVisible({ timeout: 15000 });
    }

    const expandAllButton = models.studio.frame.locator(
      '[data-test-id="nav-dropdown-expand-all"]'
    );
    await expandAllButton.hover({ trial: true });
    await expandAllButton.click();

    const searchInput = projectPanel.locator("input");
    const currentQuery = await searchInput.inputValue();
    if (currentQuery) {
      await searchInput.fill("");
      await page.waitForTimeout(200);
    }

    return projectPanel;
  }

  async function dragInsertableToCanvas(
    models: PageModels,
    page: Page,
    insertableName: string,
    targetOffset: { x: number; y: number } = { x: 120, y: 120 }
  ) {
    await models.studio.leftPanel.addButton.click();
    await page.waitForTimeout(500);

    const leftPanelFrame = models.studio.leftPanel.frame;
    const searchInput = models.studio.leftPanel.addSearchInput;
    await searchInput.waitFor({ state: "visible", timeout: 5000 });
    await searchInput.fill(insertableName);
    await page.waitForTimeout(500);

    const insertable = leftPanelFrame
      .locator(`li[data-plasmic-add-item-name="${insertableName}"]`)
      .first();
    await insertable.waitFor({ state: "visible", timeout: 10000 });
    await insertable.scrollIntoViewIfNeeded();

    const insertableBox = await insertable.boundingBox();
    if (!insertableBox) {
      throw new Error(`Unable to determine bounding box for ${insertableName}`);
    }

    const dropFrame = models.studio.frames.first();
    await dropFrame.waitFor({ state: "visible", timeout: 10000 });
    const dropBox = await dropFrame.boundingBox();
    if (!dropBox) {
      throw new Error("Unable to determine drop target bounding box");
    }

    const sourceX = insertableBox.x + insertableBox.width / 2;
    const sourceY = insertableBox.y + insertableBox.height / 2;
    const targetX = dropBox.x + targetOffset.x;
    const targetY = dropBox.y + targetOffset.y;

    await page.mouse.move(sourceX, sourceY);
    await page.mouse.down();
    await page.mouse.move(targetX, targetY, { steps: 20 });
    await page.mouse.up();

    await waitForStudioEval(models, page);
    await page.keyboard.press("Escape");
  }

  async function getProjectPanelCounts(
    projectPanel: Locator
  ): Promise<Record<string, number>> {
    return projectPanel.evaluate((panel) => {
      const counts: Record<string, number> = {};
      panel.querySelectorAll("li").forEach((row) => {
        const labelEl = row.querySelector<HTMLElement>(
          '[class*="labelContainer"]'
        );
        const labelText = labelEl?.textContent?.trim();
        if (!labelText) {
          return;
        }
        const countEl = row.querySelector<HTMLElement>(
          '[class*="sizeContainer"] span'
        );
        const countText = countEl?.textContent?.trim();
        if (!countText) {
          return;
        }
        const value = Number(countText);
        if (!Number.isNaN(value)) {
          if (labelText.includes("Arenas")) {
            counts.Arenas = value;
          } else if (labelText.includes("Components")) {
            counts.Components = value;
          }
        }
      });
      return counts;
    });
  }

  async function waitForStudioEval(models: PageModels, page: Page) {
    for (let attempt = 0; attempt < 40; attempt++) {
      try {
        const ready = await models.studio.frame
          .locator("body")
          .evaluate(async () => {
            const win = window as any;
            if (typeof win?.dbg?.studioCtx?.awaitEval !== "function") {
              return false;
            }
            await win.dbg.studioCtx.awaitEval();
            return true;
          });
        if (ready) {
          return;
        }
      } catch (error) {
        //
      }
      await page.waitForTimeout(250);
    }
    throw new Error("Timed out waiting for studio eval");
  }

  async function getStudioSiteState(
    models: PageModels,
    page: Page
  ): Promise<{
    defaultComponentNames: Record<string, string>;
    projectDependencyIds: string[];
  }> {
    await waitForStudioEval(models, page);
    return models.studio.frame.locator("body").evaluate(() => {
      const win = window as any;
      const site = win?.dbg?.studioCtx?.site;
      const defaultComponentEntries = Object.entries(
        site?.defaultComponents ?? {}
      ).map(([key, component]) => [key, (component as any)?.name as string]);
      const projectDependencyIds = (site?.projectDependencies ?? []).map(
        (dep: any) => dep?.projectId as string
      );

      return {
        defaultComponentNames: Object.fromEntries(
          defaultComponentEntries
        ) as Record<string, string>,
        projectDependencyIds,
      };
    });
  }

  async function verifyInitialState(models: PageModels, page: Page) {
    await verifyProjectPanelState(models, page, {
      arenaCount: 1,
      componentCount: 0,
    });
  }

  async function verifyProjectPanelState(
    models: PageModels,
    page: Page,
    { arenaCount = 2, componentCount = 24 }
  ) {
    const projectPanel = await ensureProjectPanelOpen(models, page);
    await page.waitForTimeout(500);

    const counts = await getProjectPanelCounts(projectPanel);
    expect(counts.Components ?? 0).toBe(componentCount);
    expect(counts.Arenas ?? 0).toBe(arenaCount);
  }

  test.describe("Standalone installations", () => {
    test("can install standalone Plexus components", async ({
      page,
      models,
    }) => {
      await models.studio.createNewPage("New page");
      await waitForFrameToLoad(page);

      await verifyInitialState(models, page);
      const initialState = await getStudioSiteState(models, page);
      expect(initialState.defaultComponentNames).toEqual({});
      expect(initialState.projectDependencyIds).toHaveLength(0);

      for (const item of PLEXUS_INSERTABLES) {
        const componentBefore = await getFilteredComponentsInProjectPanel(
          models,
          page,
          startCase(item.name)
        );
        await expect(componentBefore).toHaveCount(0);

        await models.studio.leftPanel.insertNode(startCase(item.name));
        await page.waitForTimeout(1000);
        await waitForStudioEval(models, page);

        const componentAfter = await getFilteredComponentsInProjectPanel(
          models,
          page,
          startCase(item.name)
        );
        await expect(componentAfter).toHaveCount(1);

        for (const constituent of item.dependencies) {
          const dependency = await getFilteredComponentsInProjectPanel(
            models,
            page,
            constituent
          );
          await expect(dependency).toHaveCount(1);
        }
      }

      await ensureProjectPanelOpen(models, page);
      const expectedCount = new Set(
        PLEXUS_INSERTABLES.flatMap((item) => [
          startCase(item.name),
          ...item.dependencies,
        ])
      ).size;

      const projectPanel = await ensureProjectPanelOpen(models, page);
      const componentsCountText = await projectPanel
        .locator('[class*="sizeContainer"]')
        .last()
        .textContent();
      expect(Number(componentsCountText)).toBe(expectedCount);

      const { defaultComponentNames, projectDependencyIds } =
        await getStudioSiteState(models, page);
      const expectedDefaultComponentNames = PLEXUS_INSERTABLES.reduce<
        Record<string, string>
      >((acc, item) => {
        acc[kebabCase(item.name)] = startCase(item.name);
        return acc;
      }, {});
      expect(defaultComponentNames).toEqual(expectedDefaultComponentNames);
      expect(projectDependencyIds).toEqual(["gmeH6XgPaBtkt51HunAo4g"]);
    });

    test("can install standalone Plexus component via drag and drop", async ({
      page,
      models,
    }) => {
      await models.studio.createNewPage("New page");
      await waitForFrameToLoad(page);

      await verifyInitialState(models, page);

      const comboboxItem = PLEXUS_INSERTABLES.find(
        (item) => item.name === "combobox"
      )!;

      await dragInsertableToCanvas(models, page, startCase(comboboxItem.name), {
        x: 120,
        y: 120,
      });
      await page.waitForTimeout(1000);

      const expectedCount = 1 + comboboxItem.dependencies.length;
      const countsAfterInsert = await getProjectPanelCounts(
        await ensureProjectPanelOpen(models, page)
      );
      await page.keyboard.press("Escape");
      expect(countsAfterInsert.Components ?? 0).toBe(expectedCount);

      const component = await getFilteredComponentsInProjectPanel(
        models,
        page,
        startCase(comboboxItem.name)
      );
      await expect(component).toHaveCount(1);

      for (const constituent of comboboxItem.dependencies) {
        const dependency = await getFilteredComponentsInProjectPanel(
          models,
          page,
          constituent
        );
        await expect(dependency).toHaveCount(1);
      }

      const panelForClear = await ensureProjectPanelOpen(models, page);
      const input = panelForClear.locator("input");
      await input.clear();
      await page.keyboard.press("Escape");
    });

    test('"Create a new copy of this component" option works', async ({
      page,
      models,
    }) => {
      await models.studio.createNewPage("New Page");
      await waitForFrameToLoad(page);

      await verifyInitialState(models, page);
      const baselineCounts = await getProjectPanelCounts(
        await ensureProjectPanelOpen(models, page)
      );
      await page.keyboard.press("Escape");
      const baselineComponentCount = baselineCounts.Components ?? 0;

      const testItem = PLEXUS_INSERTABLES.find(
        (item) => item.name === "combobox"
      )!;
      const newComponentsLength = testItem.dependencies.length + 1;

      async function addNewCopy() {
        await models.studio.leftPanel.addButton.click();
        await page.waitForTimeout(500);
        const addItem = models.studio.leftPanel.frame
          .locator(
            `li[data-plasmic-add-item-name="${startCase(testItem.name)}"]`
          )
          .first();
        await addItem.waitFor({ state: "visible" });
        await addItem.click({ button: "right" });
        await models.studio.frame
          .getByText("Create a new copy of this component")
          .click();
        await page.waitForTimeout(1000);
      }

      await addNewCopy();

      const component = await getFilteredComponentsInProjectPanel(
        models,
        page,
        startCase(testItem.name)
      );
      await expect(component).toHaveCount(1);

      for (const constituent of testItem.dependencies) {
        const dependency = await getFilteredComponentsInProjectPanel(
          models,
          page,
          constituent
        );
        await expect(dependency).toHaveCount(1);
      }

      const countsAfterFirst = await getProjectPanelCounts(
        await ensureProjectPanelOpen(models, page)
      );
      await page.keyboard.press("Escape");
      expect(countsAfterFirst.Components ?? 0).toBe(
        baselineComponentCount + newComponentsLength
      );

      const component2Before = await getFilteredComponentsInProjectPanel(
        models,
        page,
        `${startCase(testItem.name)}2`
      );
      await expect(component2Before).toHaveCount(0);

      await addNewCopy();

      const component2After = await getFilteredComponentsInProjectPanel(
        models,
        page,
        `${startCase(testItem.name)}2`
      );
      await expect(component2After).toHaveCount(1);

      const countsAfterSecond = await getProjectPanelCounts(
        await ensureProjectPanelOpen(models, page)
      );
      await page.keyboard.press("Escape");
      expect(countsAfterSecond.Components ?? 0).toBe(
        baselineComponentCount + newComponentsLength * 2
      );
    });
  });

  test.describe("Installable installations", () => {
    async function verifyInstallationDialog(models: PageModels) {
      const dialog = models.studio.frame.locator('[role="dialog"] form');
      const checkboxes = dialog.locator('input[type="checkbox"]');
      await expect(checkboxes).toHaveCount(4);

      const labels = dialog.locator("label");
      await expect(labels.nth(0)).toContainText("react-aria");

      const disabledCheckbox = labels
        .nth(0)
        .locator('input[type="checkbox"][disabled]');
      await expect(disabledCheckbox).toBeVisible();

      const enabledCheckboxes = dialog.locator(
        'input[type="checkbox"]:not([disabled])'
      );
      await expect(enabledCheckboxes).toHaveCount(3);
    }

    async function unflattenInstallation(models: PageModels) {
      const dialog = models.studio.frame.locator('[role="dialog"] form');
      const checkLabel = dialog.locator("label").nth(2);
      await checkLabel.click();
      await checkLabel.locator(".ant-checkbox-checked").waitFor();
    }

    async function beginInstallation(models: PageModels, page: Page) {
      const dialog = models.studio.frame.locator('[role="dialog"] form');
      await dialog.locator('button[type="submit"]').click();
      // This assumes the previous frame had a different name
      await models.studio.frame
        .locator(".CanvasFrame__Label--focused")
        .getByText("Unnamed Component")
        .waitFor({ state: "visible" });
      await page.waitForTimeout(1000);
    }

    test("can install installable components (flattened)", async ({
      page,
      models,
    }) => {
      const baselineCounts = await getProjectPanelCounts(
        await ensureProjectPanelOpen(models, page)
      );
      await page.keyboard.press("Escape");

      await models.studio.leftPanel.insertNode("Plasmic Design System");
      await page.waitForTimeout(1000);

      await verifyInstallationDialog(models);
      await beginInstallation(models, page);

      const countsAfterInstall = await getProjectPanelCounts(
        await ensureProjectPanelOpen(models, page)
      );
      await page.keyboard.press("Escape");
      expect(countsAfterInstall.Components ?? 0).toBe(
        (baselineCounts.Components ?? 0) + 24
      );
      expect(countsAfterInstall.Arenas ?? 0).toBe(
        (baselineCounts.Arenas ?? 0) + 1
      );
    });

    test("can install installable (un-flattened)", async ({ page, models }) => {
      const baselineCounts = await getProjectPanelCounts(
        await ensureProjectPanelOpen(models, page)
      );
      await page.keyboard.press("Escape");

      await models.studio.leftPanel.insertNode("Plasmic Design System");
      await page.waitForTimeout(1000);

      await unflattenInstallation(models);
      await beginInstallation(models, page);

      const countsAfterInstall = await getProjectPanelCounts(
        await ensureProjectPanelOpen(models, page)
      );
      await page.keyboard.press("Escape");
      expect(countsAfterInstall.Components ?? 0).toBe(
        (baselineCounts.Components ?? 0) + 24
      );
      expect(countsAfterInstall.Arenas ?? 0).toBe(
        (baselineCounts.Arenas ?? 0) + 1
      );
    });

    test("can install installable (un-flattened) after standalone installation", async ({
      page,
      models,
    }) => {
      await models.studio.createNewPage("New Page");
      await waitForFrameToLoad(page);

      await verifyInitialState(models, page);

      const testItem = PLEXUS_INSERTABLES[0];
      await models.studio.leftPanel.insertNode(startCase(testItem.name));
      await page.waitForTimeout(1000);

      await verifyProjectPanelState(models, page, {
        arenaCount: 1,
        componentCount: 1,
      });

      const baselineCounts = await getProjectPanelCounts(
        await ensureProjectPanelOpen(models, page)
      );
      await page.keyboard.press("Escape");

      await models.studio.leftPanel.insertNode("Plasmic Design System");
      await page.waitForTimeout(1000);

      await unflattenInstallation(models);
      await beginInstallation(models, page);

      const countsAfterInstall = await getProjectPanelCounts(
        await ensureProjectPanelOpen(models, page)
      );
      await page.keyboard.press("Escape");
      expect(countsAfterInstall.Components ?? 0).toBe(24);
      expect(countsAfterInstall.Arenas ?? 0).toBe(
        (baselineCounts.Arenas ?? 0) + 1
      );

      const component = await getFilteredComponentsInProjectPanel(
        models,
        page,
        startCase(testItem.name)
      );
      await expect(component).toHaveCount(1);
    });

    test("can install installable via the Install All button", async ({
      page,
      models,
    }) => {
      const baselineCounts = await getProjectPanelCounts(
        await ensureProjectPanelOpen(models, page)
      );
      await page.keyboard.press("Escape");

      await models.studio.leftPanel.addButton.click();
      await page.waitForTimeout(500);

      const installAllButton = models.studio.leftPanel.frame
        .locator('[data-test-id="add-drawer"]')
        .getByText("Install all");
      await installAllButton.click();
      await page.waitForTimeout(1000);

      await verifyInstallationDialog(models);
      await beginInstallation(models, page);

      const countsAfterInstall = await getProjectPanelCounts(
        await ensureProjectPanelOpen(models, page)
      );
      await page.keyboard.press("Escape");
      expect(countsAfterInstall.Components ?? 0).toBe(
        (baselineCounts.Components ?? 0) + 24
      );
      expect(countsAfterInstall.Arenas ?? 0).toBe(
        (baselineCounts.Arenas ?? 0) + 1
      );
    });
  });
});
