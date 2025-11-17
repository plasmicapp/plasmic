import { expect } from "@playwright/test";
import { test } from "../fixtures/test";
import { goToProject } from "../utils/studio-utils";

test.describe("hostless-antd5", () => {
  let projectId: string;

  test.beforeEach(async ({ apiClient, page }) => {
    projectId = await apiClient.setupProjectWithHostlessPackages({
      hostLessPackagesInfo: {
        name: "antd5",
        npmPkg: ["@plasmicpkgs/antd5"],
      },
    });
    await goToProject(page, `/projects/${projectId}`);
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
      const disablePane1 = models.studio.frame.locator(
        ".canvas-editor__disable-right-pane"
      );
      const count1 = await disablePane1.count();
      if (count1 > 0) {
        await disablePane1
          .waitFor({ state: "hidden", timeout: 5000 })
          .catch(() => {});
      }
      await models.studio.rightPanel.textContentButton.click({
        button: "right",
        force: true,
      });
      await models.studio.useDynamicValueButton.click();
      await models.studio.rightPanel.selectDataPickerItem("input");

      await models.studio.leftPanel.insertNode("plasmic-antd5-checkbox");
      await models.studio.leftPanel.insertNode("Text");
      const disablePane2 = models.studio.frame.locator(
        ".canvas-editor__disable-right-pane"
      );
      const count2 = await disablePane2.count();
      if (count2 > 0) {
        await disablePane2
          .waitFor({ state: "hidden", timeout: 5000 })
          .catch(() => {});
      }
      await models.studio.rightPanel.textContentButton.click({
        button: "right",
        force: true,
      });
      await models.studio.useDynamicValueButton.click();
      await models.studio.rightPanel.insertMonacoCode(
        '$state.checkbox.checked ? "Checkbox checked!" : "Checkbox not checked"'
      );

      await models.studio.withinLiveMode(async (liveFrame) => {
        await liveFrame
          .locator(".ant-input")
          .waitFor({ state: "visible", timeout: 10000 });
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
