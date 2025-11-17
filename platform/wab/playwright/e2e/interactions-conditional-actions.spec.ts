import { expect } from "@playwright/test";
import { test } from "../fixtures/test";

import bundles from "../../cypress/bundles";
import { ConditionalActionsArena } from "../models/arenas/conditional-actions";
import { goToProject } from "../utils/studio-utils";

const BUNDLE_NAME = "state-management";

test.describe("state-management-conditional-actions", () => {
  let projectId: string;
  test.beforeEach(async ({ apiClient, page }) => {
    projectId = await apiClient.importProjectFromTemplate(bundles[BUNDLE_NAME]);

    await goToProject(page, `/projects/${projectId}`);
  });

  test.afterEach(async ({ apiClient }) => {
    await apiClient.removeProjectAfterTest(
      projectId,
      "user2@example.com",
      "!53kr3tz!"
    );
  });

  test("can create conditional actions", async ({ models, page }) => {
    await models.studio.switchArena("conditional actions");
    const arena = await ConditionalActionsArena.init(page);

    await models.studio.focusFrameRoot(arena.contentFrame);

    await arena.runInteractionButton.click({ force: true });

    await models.studio.rightPanel.addComplexInteraction("onClick", [
      {
        actionName: "updateVariable",
        args: {
          variable: ["action1"],
          operation: "increment",
        },
      },
      {
        actionName: "updateVariable",
        args: {
          variable: ["action2"],
          operation: "increment",
        },
        mode: "when",
        conditionalExpr: "$state.action1 % 2",
      },
      {
        actionName: "updateVariable",
        args: {
          variable: ["action3"],
          operation: "increment",
        },
        mode: "never",
      },
    ]);

    const expected = [0, 0, 0];

    await models.studio.withinLiveMode(async (liveFrame) => {
      const checkIfCountersAreEqual = async () => {
        for (let i = 0; i < expected.length; i++) {
          await expect(
            liveFrame
              .locator("#plasmic-app div")
              .getByText(`action${i + 1}: ${expected[i]}`)
          ).toBeVisible();
        }
      };

      const updateExpectedCounters = () => {
        expected[0]++;
        if (expected[0] % 2) {
          expected[1]++;
        }
      };

      for (let i = 0; i < 10; i++) {
        await liveFrame.getByText("Run interaction").click();
        updateExpectedCounters();
        await checkIfCountersAreEqual();
      }
    });

    await models.studio.rightPanel.checkNoErrors();
  });
});
