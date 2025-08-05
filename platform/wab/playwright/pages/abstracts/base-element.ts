import { Page } from "playwright/test";

export abstract class BaseElement {
  constructor(protected readonly page: Page) {}
}
