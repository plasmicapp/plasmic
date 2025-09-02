import { expect, FrameLocator, Locator, Page } from "playwright/test";
import { BaseModel } from "./BaseModel";
import { RightPanel } from "./components/right-panel";

export class StudioModel extends BaseModel {
  readonly frame: FrameLocator = this.studioFrame;
  readonly projectNavButton: Locator = this.frame.locator(
    '[id="proj-nav-button"]'
  );
  readonly projectNavClearSearchButton: Locator = this.frame.locator(
    '[data-test-id="nav-dropdown-clear-search"]'
  );
  readonly projectNavSearchInput: Locator = this.frame.locator(
    '[data-test-id="nav-dropdown-search-input"]'
  );
  readonly enterLiveModeButton: Locator = this.frame.locator(
    '[data-test-id="enter-live-mode-btn"]'
  );
  readonly liveFrame: FrameLocator = this.page
    .locator("iframe")
    .first()
    .contentFrame()
    .locator("iframe")
    .contentFrame()
    .locator('[data-test-id="live-frame"]')
    .contentFrame();
  readonly exitLiveModeButton: Locator = this.frame.locator(
    '[data-test-id="exit-live-mode-btn"]'
  );
  readonly rightPanel: RightPanel = new RightPanel(this.page);

  constructor(page: Page) {
    super(page);
  }

  async switchArena(name: string) {
    await this.projectNavButton.click();
    if (await this.projectNavClearSearchButton.isVisible()) {
      await this.projectNavClearSearchButton.click();
    }
    await this.projectNavSearchInput.fill(name);
    await this.frame.locator(`text=${name}`).click();
    await expect(this.projectNavButton).toBeVisible();
  }

  async withinLiveMode(fn: (liveFrame: FrameLocator) => Promise<void>) {
    await this.enterLiveModeButton.click();
    await fn(this.liveFrame);
    await this.exitLiveModeButton.click();
  }
}
