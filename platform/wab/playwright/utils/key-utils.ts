import { Page } from "playwright";

export const modifierKey = process.platform === "darwin" ? "Meta" : "Control";

export const Keys = {
  Backspace: Symbol.for("Backspace"),
  Enter: Symbol.for("Enter"),
  Escape: Symbol.for("Escape"),
  ModA: Symbol.for(`${modifierKey}+a`),
} as const;
type KeySymbol = (typeof Keys)[keyof typeof Keys];

export async function typeKeys(
  page: Page,
  entries: (string | KeySymbol)[],
  delay: number | undefined = 100
) {
  for (const entry of entries) {
    if (typeof entry === "symbol") {
      await page.keyboard.press(entry.description!);
    } else {
      await page.keyboard.type(entry);
    }
    if (delay) {
      await page.waitForTimeout(delay);
    }
  }
}
