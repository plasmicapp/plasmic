import { FrameLocator, Page, expect } from "@playwright/test";

export interface ExpectedFormItem {
  label: string;
  name: string;
  type: string;
  value?: any;
}

export function getStudioFrame(page: Page): FrameLocator {
  return page
    .frameLocator("iframe.studio-frame")
    .frameLocator("iframe.__wab_studio-frame");
}

export async function waitForFrameToLoad(page: Page) {
  await page.waitForSelector("iframe.studio-frame", { timeout: 40000 });
  await page.waitForTimeout(1000);

  try {
    const overlay = page.locator(".rsbuild-error-overlay").first();
    if (await overlay.isVisible({ timeout: 500 })) {
      await page.keyboard.press("Escape");
      await page.waitForTimeout(500);
    }
  } catch (e) {}

  await getStudioFrame(page)
    .locator(".canvas-editor__canvas-container")
    .waitFor({ timeout: 60000, state: "attached" });
}

/**
 * Go to a project page and wait for the studio to load
 */
export async function goToProject(
  page: Page,
  url: string,
  options?: {
    timeout?: number;
    waitUntil?: "load" | "domcontentloaded" | "networkidle" | "commit";
  }
) {
  await page.goto(url, options);
  await waitForFrameToLoad(page);
}

export async function getComponentUuid(
  page: Page,
  componentName: string
): Promise<string | null> {
  for (const frame of page.frames()) {
    const uuid = await frame
      .evaluate((name: string) => {
        const win = window as any;
        if (win.dbg && win.dbg.studioCtx) {
          const component = win.dbg.studioCtx.site.components.find(
            (c: any) => c.name === name
          );
          return component?.uuid ?? null;
        }
        return null;
      }, componentName)
      .catch(() => null);
    if (uuid) {
      return uuid;
    }
  }
  return null;
}

export async function checkFormValues(
  expectedFormItems: ExpectedFormItem[],
  root: FrameLocator
) {
  for (const item of expectedFormItems) {
    if (item.type !== "Checkbox") {
      await expect(
        root
          .locator(".ant-form-item-label label")
          .filter({ hasText: item.label })
      ).toBeVisible({ timeout: 15000 });
    }
    if (item.value == null) {
      continue;
    }
    const valueStr = String(item.value);

    switch (item.type) {
      case "Text Area":
        await expect(root.locator(`textarea[name="${item.name}"]`)).toHaveValue(
          valueStr
        );
        break;
      case "Checkbox":
        await expect(
          root.locator(`input[type="checkbox"][name="${item.name}"]`)
        ).toBeChecked();
        break;
      case "Radio Group":
        await expect(
          root.locator(`input[type="radio"][value="${item.value}"]`)
        ).toBeChecked();
        break;
      case "Select": {
        // Scope by the form-item label so the right Select is picked
        // when multiple are on the page.
        const formItem = root
          .locator(".ant-form-item")
          .filter({
            has: root
              .locator(".ant-form-item-label label")
              .filter({ hasText: item.label }),
          })
          .first();
        await expect(formItem.locator(".ant-select-selection-item")).toHaveText(
          valueStr
        );
        break;
      }
      case "DatePicker":
        // Not currently asserted; left as a no-op for parity.
        break;
      default:
        await expect(root.locator(`input[name="${item.name}"]`)).toHaveValue(
          valueStr
        );
    }
  }
}

export async function updateFormValuesInLiveMode(
  newValues: {
    inputs?: Record<string, any>;
    selects?: Record<string, any>;
    radios?: Record<string, any>;
  },
  root: FrameLocator
) {
  const { inputs = {}, selects: _selects = {}, radios = {} } = newValues;

  for (const key in inputs) {
    let input = root.locator(`input[name="${key}"]`);
    const inputCount = await input.count();

    if (inputCount === 0) {
      input = root.locator(`textarea[name="${key}"]`);
    }

    await input.waitFor({ timeout: 1000 });

    let valueToType = inputs[key];
    if (
      typeof valueToType === "string" &&
      valueToType.startsWith("{selectall}{del}")
    ) {
      valueToType = valueToType.replace("{selectall}{del}", "");
      await input.click();
      await input.press("ControlOrMeta+a");
      await input.press("Delete");
    } else {
      await input.clear();
    }

    await input.fill(valueToType);
  }

  for (const key in radios) {
    await root.locator(`input[type="radio"][value="${radios[key]}"]`).click();
  }
}

export function getFormValue(expectedFormItems: ExpectedFormItem[]): string {
  const values = Object.fromEntries(
    expectedFormItems
      .filter((formItem) => formItem.value != null)
      .map((formItem) => [formItem.name, formItem.value])
  );
  return JSON.stringify(values, Object.keys(values).sort());
}
