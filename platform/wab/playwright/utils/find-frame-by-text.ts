import { Page } from "playwright/test";

export async function findFrameByText(page: Page, text: string) {
  for (const frame of page.frames()) {
    if ((await frame.locator(`:has-text("${text}")`).count()) > 0) {
      return frame;
    }
  }
  throw new Error(`No frame contains text: ${text}`);
}
