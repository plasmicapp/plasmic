import { FrameLocator, Locator, Page } from "playwright/test";
import { BaseModel } from "../BaseModel";

export class SingleVariantInteractionsArena extends BaseModel {
  constructor(
    page: Page,
    readonly contentFrame: FrameLocator,
    readonly setToRedButton: Locator,
    readonly setToGreenButton: Locator,
    readonly setToBlueButton: Locator,
    readonly clearVariantButton: Locator
  ) {
    super(page);
  }

  static async init(page: Page): Promise<SingleVariantInteractionsArena> {
    const contentFrame = page
      .locator("iframe")
      .first()
      .contentFrame()
      .locator("iframe")
      .contentFrame()
      .locator("iframe")
      .first()
      .contentFrame();
    const setToRedButton = contentFrame.getByText("Set to red");
    const setToGreenButton = contentFrame.getByText("Set to green");
    const setToBlueButton = contentFrame.getByText("Set to blue");
    const clearVariantButton = contentFrame.getByText("clear variant");
    const instance = new SingleVariantInteractionsArena(
      page,
      contentFrame,
      setToRedButton,
      setToGreenButton,
      setToBlueButton,
      clearVariantButton
    );
    return instance;
  }
}
