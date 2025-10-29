import { expect } from "@playwright/test";
import { DevFlagsType } from "../../src/wab/shared/devflags";
import { test } from "../fixtures/test";

test.describe("routing", () => {
  let projectId: string;
  let origDevFlags: DevFlagsType;

  test.beforeEach(async ({ apiClient, page }) => {
    origDevFlags = await apiClient.getDevFlags();
    projectId = await apiClient.setupNewProject({
      name: "routing-branch-versions",
      devFlags: { branching: true },
    });
    await page.goto(`/projects/${projectId}?branching=true`);
  });

  test.afterEach(async ({ apiClient }) => {
    if (origDevFlags) {
      await apiClient.upsertDevFlags(origDevFlags);
    }
    await apiClient.removeProjectAfterTest(
      projectId,
      "user2@example.com",
      "!53kr3tz!"
    );
  });

  test("should switch branch versions", async ({ page, models }) => {
    await models.studio.waitForFrameToLoad();

    await expect(page).not.toHaveURL(/branch=/);
    await expect(page).not.toHaveURL(/version=/);

    await models.studio.leftPanel.addComponent("DisplayBranchVersion");
    const framed = models.studio.getComponentFrameByIndex(0);
    await models.studio.focusFrameRoot(framed);

    await models.studio.leftPanel.insertNode("Text");
    await models.studio.renameTreeNode("text");
    await models.studio.rightPanel.chooseFontSize("60px");
    await framed.getByText("Enter some text").dblclick({ force: true });
    await page.waitForTimeout(100);
    await page.keyboard.type("Main v1");
    await page.waitForTimeout(100);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(100);

    await models.studio.leftPanel.moreTabButton.hover();
    await models.studio.leftPanel.frame
      .getByRole("button", { name: "Published versions" })
      .click();
    await models.studio.leftPanel.frame
      .getByRole("button", { name: "Publish project" })
      .click();
    await models.studio.frame
      .locator('input[placeholder="Description (optional)..."]')
      .fill("Main v1");
    await models.studio.frame.getByRole("button", { name: "Confirm" }).click();
    await page.waitForTimeout(2000);

    await models.studio.leftPanel.frame
      .getByRole("button")
      .filter({ hasText: "Outline" })
      .click();
    await models.studio.leftPanel.frame
      .locator(".tpltree__label", { hasText: "text" })
      .click();
    await expect(framed.getByText("Main v1")).toBeVisible();

    await framed.getByText("Main v1").dblclick({ force: true });

    const isMac = process.platform === "darwin";
    const cmdKey = isMac ? "Meta" : "Control";

    await page.waitForTimeout(100);
    await page.keyboard.press(`${cmdKey}+a`);
    await page.waitForTimeout(100);
    await page.keyboard.press("Delete");
    await page.waitForTimeout(100);
    await page.keyboard.type("Main v2");
    await page.waitForTimeout(100);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(100);

    await models.studio.leftPanel.moreTabButton.hover();
    await models.studio.leftPanel.frame
      .getByRole("button", { name: "Published versions" })
      .click();
    await expect(
      models.studio.leftPanel.frame.getByText(
        "Newest changes haven't been published."
      )
    ).toBeVisible();

    await models.studio.leftPanel.frame
      .getByRole("button", { name: "Publish project" })
      .click();
    await models.studio.frame
      .locator('input[placeholder="Description (optional)..."]')
      .fill("Main v2");
    await models.studio.frame.getByRole("button", { name: "Confirm" }).click();
    await page.waitForTimeout(2000);

    await framed.getByText("Main v2").dblclick({ force: true });

    await page.waitForTimeout(100);
    await page.keyboard.press(`${cmdKey}+a`);
    await page.waitForTimeout(100);
    await page.keyboard.press("Delete");
    await page.waitForTimeout(100);
    await page.keyboard.type("Main latest");
    await page.waitForTimeout(100);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(100);

    await expect(
      models.studio.leftPanel.frame.getByText(
        "Newest changes haven't been published."
      )
    ).toBeVisible();

    async function switchBranchVersion(branchVersion: string) {
      await page.waitForTimeout(1000);

      await models.studio.leftPanel.frame.getByText(branchVersion).click();

      await models.studio.waitForFrameToLoad();
      await models.studio.focusFrameRoot(framed);

      await expect(page).not.toHaveURL(/branch=/);
      await expect(page).toHaveURL(new RegExp(`version=${branchVersion}`));

      return framed;
    }

    await switchBranchVersion("0.0.1");
    await expect(
      models.studio.frame.getByText("Back to current version")
    ).toBeVisible();
    await models.studio.leftPanel.frame
      .getByRole("button")
      .filter({ hasText: "Outline" })
      .click();
    await models.studio.leftPanel.frame
      .locator(".tpltree__label", { hasText: "text" })
      .click();
    await expect(framed.getByText("Main v1")).toBeVisible();

    await models.studio.leftPanel.moreTabButton.hover();
    await models.studio.leftPanel.frame
      .getByRole("button", { name: "Published versions" })
      .click();
    await switchBranchVersion("0.0.2");
    await expect(
      models.studio.frame.getByText("Back to current version")
    ).toBeVisible();
    await models.studio.leftPanel.frame
      .getByRole("button")
      .filter({ hasText: "Outline" })
      .click();
    await models.studio.leftPanel.frame
      .locator(".tpltree__label", { hasText: "text" })
      .click();
    await expect(framed.getByText("Main v2")).toBeVisible();

    await models.studio.frame.getByText("Back to current version").click();
    await models.studio.waitForFrameToLoad();

    await expect(page).not.toHaveURL(/branch=/);
    await expect(page).not.toHaveURL(/version=/);
    await expect(
      models.studio.frame.getByText("Back to current version")
    ).not.toBeVisible();
    await models.studio.leftPanel.frame
      .locator(".tpltree__label", { hasText: "text" })
      .click();
    await expect(framed.getByText("Main latest")).toBeVisible();

    await page.goto(`/projects/${projectId}?branching=true&version=0.0.1`);
    await models.studio.waitForFrameToLoad();
    await expect(
      models.studio.frame.getByText("Back to current version")
    ).toBeVisible({ timeout: 30_000 });
    await models.studio.leftPanel.frame
      .locator(".tpltree__label", { hasText: "text" })
      .click();
    await expect(framed.getByText("Main v1")).toBeVisible();

    await page.goto(
      `/projects/${projectId}?branching=true&branch=main&version=0.0.2`
    );
    await models.studio.waitForFrameToLoad();
    await expect(
      models.studio.frame.getByText("Back to current version")
    ).toBeVisible({ timeout: 30_000 });
    await models.studio.leftPanel.frame
      .locator(".tpltree__label", { hasText: "text" })
      .click();
    await expect(framed.getByText("Main v2")).toBeVisible();

    await page.goto(
      `/projects/${projectId}?branching=true&branch=main&version=0.0.3`
    );
    await models.studio.waitForFrameToLoad();
    await expect(page).not.toHaveURL(/branch=/);
    await expect(page).not.toHaveURL(/version=/);
    await expect(
      models.studio.frame.getByText("Back to current version")
    ).not.toBeVisible();

    await models.studio.leftPanel.frame
      .locator(".tpltree__label", { hasText: "text" })
      .click();
    await expect(framed.getByText("Main latest")).toBeVisible();
  });
});
