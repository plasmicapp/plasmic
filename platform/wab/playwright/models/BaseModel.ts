import { FrameLocator, Page } from "playwright/test";
import { getStudioFrame } from "../utils/studio-utils";

export abstract class BaseModel {
  constructor(readonly page: Page) {}

  protected get studioFrame(): FrameLocator {
    return getStudioFrame(this.page);
  }

  get componentFrame(): FrameLocator {
    return this.studioFrame.frameLocator("iframe").first();
  }

  getComponentFrameByIndex(index: number): FrameLocator {
    return this.studioFrame.frameLocator("iframe").nth(index);
  }
}
