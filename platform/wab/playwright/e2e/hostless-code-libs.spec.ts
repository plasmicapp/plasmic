import { expect, FrameLocator } from "@playwright/test";
import { test } from "../fixtures/test";
import { goToProject, waitForFrameToLoad } from "../utils/studio-utils";

test.describe("hostless-code-libs", () => {
  let projectId: string;

  test.beforeEach(async ({ page }) => {
    await page.route(
      "https://api.publicapis.org/entries?title=cats",
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            count: 1,
            entries: [
              {
                API: "Cats",
                Description: "Pictures of cats from Tumblr",
                Auth: "apiKey",
                HTTPS: true,
                Cors: "no",
                Link: "https://docs.thecatapi.com/",
                Category: "Animals",
              },
            ],
          }),
        });
      }
    );
  });

  test.afterEach(async ({ apiClient }) => {
    if (projectId) {
      await apiClient.removeProjectAfterTest(
        projectId,
        "user2@example.com",
        "!53kr3tz!"
      );
    }
  });

  test("Make sure code libs work on canvas", async ({
    apiClient,
    page,
    models,
  }) => {
    projectId = await apiClient.setupProjectFromTemplate("code-libs");
    await goToProject(page, `/projects/${projectId}`);

    await models.studio.turnOffDesignMode();
    await waitForFrameToLoad(page);

    const interactiveSwitch = models.studio.frame.locator(
      '[data-test-id="interactive-switch"]'
    );
    await interactiveSwitch.click({ force: true });

    const refreshButton = models.studio.frame.locator("#refresh-canvas-btn");
    await refreshButton.click();

    await waitForFrameToLoad(page);

    const viewport = models.studio.frames.first();
    await viewport.waitFor({ state: "visible" });

    const canvasIframe = models.studio.frame
      .locator("iframe.canvas-editor__viewport")
      .first();
    await canvasIframe.waitFor({ state: "visible" });
    const frameContent = canvasIframe.contentFrame();

    await frameContent
      .locator("body")
      .waitFor({ state: "visible", timeout: 10000 });

    const checkContents = async (content: FrameLocator) => {
      await expect(content.locator("body")).toContainText(
        'Axios response: "Animals"',
        { timeout: 20000 }
      );
      await expect(content.locator("body")).toContainText(
        'Copy to clipboard type: "function"'
      );
      await expect(content.locator("body")).toContainText(
        "date-fns result: 48 hours"
      );
      await expect(content.locator("body")).toContainText(
        "day.js number of days in August: 31"
      );
      await expect(content.locator("body")).toContainText(
        'Faker name: "Maddison", PT-BR name: "Maria Eduarda"'
      );
      await expect(content.locator("body")).toContainText(
        'fast-stringify: {"foo":"[ref=.]","bar":{"bar":"[ref=.bar]","foo":"[ref=.]"}}'
      );
      await expect(content.locator("body")).toContainText(
        'Immer - state before: "done === false"; state after: "done === true"'
      );
      await expect(content.locator("body")).toContainText(
        "jquery: red box width: 50"
      );
      await expect(content.locator("body")).toContainText(
        "lodash partition: [[1,3],[2,4]]"
      );
      await expect(content.locator("body")).toContainText(
        "marked: <p>This text is <em><strong>really important</strong></em></p>"
      );
      await expect(content.locator("body")).toContainText(
        "MD5 hash: cd946e1909bfe736ec8921983eb9115f"
      );
      await expect(content.locator("body")).toContainText(
        "nanoid with single-character alphabet for stable results: 000000"
      );
      await expect(content.locator("body")).toContainText(
        "papaparse: 5 rows, 4 cols"
      );
      await expect(content.locator("body")).toContainText(
        'pluralize "house": "houses"'
      );
      await expect(content.locator("body")).toContainText("random: 65");
      await expect(content.locator("body")).toContainText("semver: 3.3.0");
      await expect(content.locator("body")).toContainText(
        "tinycolor2: rgb(255, 0, 0)"
      );
      await expect(content.locator("body")).toContainText(
        "uuid NIL: 00000000-0000-0000-0000-000000000000, validate: true"
      );
      await expect(content.locator("body")).toContainText(
        'zod parse valid: {"username":"Test"}, safeParse with invalid data success: false'
      );
    };

    await checkContents(frameContent);

    await models.studio.withinLiveMode(async (liveFrame) => {
      await checkContents(liveFrame);
    });

    await models.studio.rightPanel.checkNoErrors();
  });
});
