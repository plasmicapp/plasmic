import { FrameLocator, Locator, Page } from "playwright/test";
import { BaseModel } from "../BaseModel";

export class ConditionalActionsArena extends BaseModel {
  constructor(
    page: Page,
    readonly contentFrame: FrameLocator,
    readonly runInteractionButton: Locator
  ) {
    super(page);
  }

  static async init(page: Page): Promise<ConditionalActionsArena> {
    const contentFrame = page
      .locator("iframe")
      .first()
      .contentFrame()
      .locator("iframe")
      .contentFrame()
      .locator("iframe")
      .first()
      .contentFrame();
    const runInteractionButton = contentFrame.getByText("Run interaction");
    const instance = new ConditionalActionsArena(
      page,
      contentFrame,
      runInteractionButton
    );
    return instance;
  }
}
