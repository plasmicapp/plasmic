import { Page } from "playwright/test";

export async function undoAndRedo(page: Page, { repetitions = 100 } = {}) {
  for (let i = 0; i < repetitions; i++) {
    await page.keyboard.press("Control+z");
    await page.waitForTimeout(100);
  }

  for (let i = 0; i < repetitions; i++) {
    await page.keyboard.press("Control+y");
    await page.waitForTimeout(100);
  }
}
