import { Frame, Locator, Page } from "playwright/test";
import { findFrameByText } from "../../utils/frame";
import { BasePage } from "../base-page";

export class TextInteractionsArena extends BasePage {
  constructor(
    page: Page,
    readonly contentFrame: Frame,
    readonly setToButton: Locator,
    readonly clearButton: Locator
  ) {
    super(page);
  }

  static async init(page: Page): Promise<TextInteractionsArena> {
    const contentFrame = await findFrameByText(page, "Set to");
    const setToButton = contentFrame
      .locator("span", { hasText: "Set to" })
      .first();
    const clearButton = contentFrame.locator(`text=Clear variable`);
    const instance = new TextInteractionsArena(
      page,
      contentFrame,
      setToButton,
      clearButton
    );
    return instance;
  }
}
