import { Page } from "playwright/test";

class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }
}

export { BasePage };
