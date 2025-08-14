import { expect } from "@playwright/test";
import { test } from "../fixtures/test";

test.describe("hostless-antd5", () => {
  let projectId: string;

  test.beforeEach(async ({ apiClient, page }) => {
    projectId = await apiClient.setupProjectWithHostlessPackages({
      hostLessPackagesInfo: {
        name: "antd5",
        npmPkg: ["@plasmicpkgs/antd5"],
      },
    });
    await page.goto(`/projects/${projectId}`);
  });

  test.afterEach(async ({ apiClient }) => {
    await apiClient.removeProjectAfterTest(
      projectId,
      "user2@example.com",
      "!53kr3tz!"
    );
  });

  test("works", async ({ models }) => {
    await models.studio.createNewFrame().then(async (framed) => {
      await models.studio.focusFrameRoot(framed);

      await models.studio.leftPanel.insertNode("Vertical stack");
      await models.studio.leftPanel.insertNode("plasmic-antd5-input");
      await models.studio.leftPanel.insertNode("Text");
      await models.studio.rightPanel.textContentButton.click({
        button: "right",
      });
      await models.studio.useDynamicValueButton.click();
      await models.studio.rightPanel.selectDataPickerItem("input");

      await models.studio.leftPanel.insertNode("plasmic-antd5-checkbox");
      await models.studio.leftPanel.insertNode("Text");
      await models.studio.rightPanel.textContentButton.click({
        button: "right",
      });
      await models.studio.useDynamicValueButton.click();
      await models.studio.rightPanel.insertMonacoCode(
        '$state.checkbox.checked ? "Checkbox checked!" : "Checkbox not checked"'
      );

      await models.studio.withinLiveMode(async (liveFrame) => {
        await liveFrame.locator(".ant-input").fill("hello input!");
        await expect(liveFrame.locator(".ant-input")).toHaveAttribute(
          "value",
          "hello input!"
        );
        await expect(liveFrame.getByText("hello input!")).toBeVisible();

        await expect(liveFrame.getByText("Checkbox not checked")).toBeVisible();
        await liveFrame.locator(".ant-checkbox-wrapper").click();
        await expect(liveFrame.getByText("Checkbox checked!")).toBeVisible();
      });
    });
  });
});
