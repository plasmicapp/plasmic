import { Page } from "playwright/test";

export async function undoAndRedo(page: Page, { repetitions = 100 } = {}) {
  for (let i = 0; i < repetitions; i++) {
    await page.keyboard.press("ControlOrMeta+z");
    await page.waitForTimeout(100);
  }

  for (let i = 0; i < repetitions; i++) {
    await page.keyboard.press("ControlOrMeta+y");
    await page.waitForTimeout(100);
  }
}
