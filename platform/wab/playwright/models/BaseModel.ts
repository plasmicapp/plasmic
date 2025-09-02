import { FrameLocator, Page } from "playwright/test";

export abstract class BaseModel {
  constructor(protected readonly page: Page) {}

  protected get studioFrame(): FrameLocator {
    return this.page
      .frameLocator("iframe.studio-frame")
      .frameLocator("iframe.__wab_studio-frame");
  }
}
