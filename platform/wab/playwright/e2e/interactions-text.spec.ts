import { test, expect } from "@playwright/test";
import {
  login,
  importProjectFromTemplate,
  removeProject,
  getStudioFrame,
  switchArena,
  addInteraction,
  withinLiveMode,
  findFrameByText,
} from "./utils";

import bundles from "../../cypress/bundles";

const BUNDLE_NAME = "state-management";

test.describe("state-management-text-interactions", () => {
  let projectId: string;
  test.beforeEach(async ({ request: apiRequest, page, context }) => {
    await login(apiRequest);
    projectId = await importProjectFromTemplate(
      apiRequest,
      bundles[BUNDLE_NAME]
    );

    const cookies = await apiRequest.storageState();

    await context.addCookies(cookies.cookies);
    await page.goto(`/projects/${projectId}`);
  });

  test.afterEach(async ({ request: apiRequest }) => {
    if (projectId) {
      await removeProject(apiRequest, projectId);
    }
  });

  test("can create all types of text interactions", async ({ page }) => {
    const studioFrame = await getStudioFrame(page);
    await switchArena(studioFrame, "text interactions");

    const contentFrame = await findFrameByText(page, "Set to");
    await contentFrame
      .locator("span", { hasText: "Set to" })
      .first()
      .click({ force: true });
    await addInteraction(studioFrame, "onClick", {
      actionName: "updateVariable",
      args: {
        variable: ["textVar"],
        operation: "newValue",
        value: '"goodbye"',
      },
    });

    await contentFrame.locator("text=Clear variable").click({ force: true });
    await addInteraction(studioFrame, "onClick", {
      actionName: "updateVariable",
      args: {
        variable: ["textVar"],
        operation: "clearValue",
      },
    });

    await withinLiveMode(page, studioFrame, async (liveFrame) => {
      await expect(liveFrame.locator("body")).toBeVisible();
      await expect(liveFrame.getByText("hello")).toBeVisible();
      await liveFrame.getByRole("button", { name: 'Set to "goodbye"' }).click();
      await expect(
        liveFrame.getByText("goodbye", { exact: true })
      ).toBeVisible();
      await liveFrame.getByRole("button", { name: "Clear" }).click();
      await expect(liveFrame.getByText("undefined")).toBeVisible();
    });
  });
});
