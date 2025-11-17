import { expect } from "@playwright/test";
import { test } from "../fixtures/test";
import { goToProject, waitForFrameToLoad } from "../utils/studio-utils";

test.describe("host-app", () => {
  let projectId: string;

  test.beforeEach(async ({ apiClient, page }) => {
    projectId = await apiClient.setupNewProject({ name: "host-app" });
    await goToProject(page, `/projects/${projectId}`);
  });

  test.afterEach(async ({ apiClient }) => {
    await apiClient.removeProjectAfterTest(
      projectId,
      "user2@example.com",
      "!53kr3tz!"
    );
  });

  test("Should work", async ({ page, models }) => {
    await models.studio.rightPanel.configureProjectAppHost("plasmic-host");
    await waitForFrameToLoad(page);

    await models.studio.leftPanel.addNewFrame();
    const artboardFrame = page
      .locator("iframe")
      .first()
      .contentFrame()
      .locator("iframe")
      .contentFrame()
      .locator("iframe")
      .first()
      .contentFrame();
    const artboardBody = artboardFrame.locator("body");

    await models.studio.leftPanel.insertNode("Badge");
    await models.studio.renameSelectionTag("badge");

    await expect(artboardBody.getByText("Happy 2022!")).toBeVisible();
    await expect(artboardBody.getByText("Hello Plasmic!")).toBeVisible();
    await expect(artboardBody.getByText("Click here")).toBeVisible();
    await expect(artboardBody.getByText("You haven't clicked")).toBeVisible();
    await expect(artboardBody.getByText("State value: 0")).toBeVisible();

    const badgeComponent = artboardBody.locator(
      '[data-test-id="badge-component"]'
    );
    await expect(badgeComponent).toHaveCSS(
      "background-color",
      "rgb(200, 200, 255)"
    );
    await expect(badgeComponent).toHaveCSS("height", "200px");
    await expect(badgeComponent).toHaveCSS("width", "150px");

    await models.studio.rightPanel.setWidth("160px");
    await expect(badgeComponent).toHaveCSS("width", "160px");

    await models.studio.withinLiveMode(async (liveFrame) => {
      await expect(liveFrame.getByText("Hello Plasmic!")).toBeVisible();
      await expect(liveFrame.getByText("Happy 2022!")).toBeVisible();

      const liveBadgeComponent = liveFrame.locator(
        '[data-test-id="badge-component"]'
      );
      await expect(liveBadgeComponent).toHaveCSS(
        "background-color",
        "rgb(200, 200, 255)"
      );
      await expect(liveBadgeComponent).toHaveCSS("height", "200px");
      await expect(liveBadgeComponent).toHaveCSS("width", "160px");

      await expect(liveFrame.getByText("You haven't clicked")).toBeVisible();
      await liveFrame.getByText("Click here").click();
      await expect(liveFrame.getByText("You clicked 1 times")).toBeVisible();
      await liveFrame.getByText("Click here").click();
      await expect(liveFrame.getByText("You clicked 2 times")).toBeVisible();
    });

    await models.studio.rightPanel.switchToSettingsTab();
    await models.studio.rightPanel.setYear("2023");
    await expect(artboardBody.getByText("Happy 2023!")).toBeVisible();

    await models.studio.withinLiveMode(async (liveFrame) => {
      await expect(liveFrame.getByText("Happy 2023!")).toBeVisible();
    });

    await models.studio.rightPanel.checkNoErrors();

    await models.studio.rightPanel.configureProjectAppHost(
      "plasmic-host-updated"
    );

    await models.studio.rightPanel.confirmButton.click();
    await models.studio.waitStudioLoaded();

    await models.studio.leftPanel.switchToTreeTab();
    // TODO - Cypress uses ["root", "badge"], figure out discrepancy (another below)
    await models.studio.leftPanel.selectTreeNode(["free box", "badge"]);

    await expect(models.studio.frame.getByText("Plasmician")).toBeVisible();

    await models.studio.rightPanel.clickYearButton();
    await models.studio.rightPanel.selectYear2020();

    await models.studio.insertTextWithDynamic(
      "`Clicks: ${$state.badge.clicks}`"
    );

    // TODO - implement a working version of getFramedByName
    // const artboardFrameByName = await models.studio.getFramedByName("artboard");
    const artboardFrameByName = models.studio.getComponentFrameByIndex(0);
    await expect(
      artboardFrameByName.locator("body").getByText("State value: 0")
    ).toBeVisible();
    await expect(
      artboardFrameByName.locator("body").getByText("Clicks: 0")
    ).toBeVisible();

    await models.studio.withinLiveMode(async (liveFrame) => {
      await expect(liveFrame.getByText("Hello Plasmician!")).toBeVisible();
      await expect(liveFrame.getByText("Happy 2020!")).toBeVisible();

      await liveFrame.getByText("Click here").click();
      await expect(liveFrame.getByText("You clicked 1 times")).toBeVisible();
      await expect(liveFrame.getByText("State value: 1")).toBeVisible();
      await expect(liveFrame.getByText("Clicks: 1")).toBeVisible();

      await liveFrame.getByText("Click here").click();
      await expect(liveFrame.getByText("You clicked 2 times")).toBeVisible();
      await expect(liveFrame.getByText("State value: 2")).toBeVisible();
      await expect(liveFrame.getByText("Clicks: 2")).toBeVisible();
    });

    await models.studio.rightPanel.checkNoErrors();

    await goToProject(page, `/projects/${projectId}`);

    await models.studio.rightPanel.checkNoErrors();
    await models.studio.waitForSave();

    await models.studio.rightPanel.configureProjectAppHost(
      "plasmic-host-updated-old-host"
    );
    await waitForFrameToLoad(page);

    await models.studio.leftPanel.selectTreeNode(["free box", "badge"]);

    const artboardFrameByName2 = models.studio.getComponentFrameByIndex(0);
    await expect(
      artboardFrameByName2.locator("body").getByText("State value: 0")
    ).toBeVisible();

    await models.studio.rightPanel.closeNotificationWarning();
    await models.studio.rightPanel.checkNoErrors();
  });

  test("Should accept host URLs with query params", async ({
    page,
    models,
  }) => {
    await models.studio.rightPanel.configureProjectAppHost("plasmic-host?");
    await waitForFrameToLoad(page);

    await models.studio.rightPanel.configureProjectAppHost(
      "plasmic-host?foo=bar"
    );
    await waitForFrameToLoad(page);

    await models.studio.rightPanel.configureProjectAppHost(
      "plasmic-host?foo=bar&baz="
    );
    await waitForFrameToLoad(page);
  });
});
