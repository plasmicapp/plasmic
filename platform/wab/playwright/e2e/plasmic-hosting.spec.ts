import { expect } from "@playwright/test";
import { test } from "../fixtures/test";
import { goToProject } from "../utils/studio-utils";

test.describe("plasmic-hosting-domains", () => {
  let projectId: string;
  test.beforeEach(async ({ apiClient, page }) => {
    projectId = await apiClient.setupNewProject({ name: "left-panel" });
    await goToProject(page, `/projects/${projectId}`);
  });

  test.afterEach(async ({ apiClient }) => {
    await apiClient.removeProjectAfterTest(
      projectId,
      "user2@example.com",
      "!53kr3tz!"
    );
  });

  test("lets domain management work", async ({ page, models }) => {
    await models.studio.leftPanel.switchToTreeTab();
    await models.studio.createNewFrame();
    await models.studio.focusCreatedFrameRoot();
    await models.studio.leftPanel.insertNode("Text");
    await models.studio.pressPublishButton();

    await models.studio.addPlasmicHosting();
    await models.studio.configureHosting();

    const randomDomain = `www.x${Math.round(Math.random() * 1e9)}.co.uk`;
    await models.studio.inputCustomDomain(randomDomain);

    await expect(page.getByText("76.76.21.21")).toBeAttached();
    await expect(page.getByText("cname.plasmicdev.com")).toBeAttached();

    await models.studio.removeDomainCard();
    const randomDomain2 = `hostingtest${Math.round(
      Math.random() * 99
    )}.plasmiq.app`;
    await models.studio.inputCustomDomain(randomDomain2);

    await expect(models.studio.correctlyConfiguredText).toBeAttached();
  });
});
