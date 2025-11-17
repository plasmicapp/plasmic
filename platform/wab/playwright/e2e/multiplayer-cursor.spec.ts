import { expect, Locator } from "@playwright/test";
import { StudioModel } from "../models/studio-model";
import {
  forEachAsync,
  setupMultiplayerProject,
  testMultiplayer,
  TestUserCredentials,
} from "../utils/multiplayer-utils";
import { goToProject, waitForFrameToLoad } from "../utils/studio-utils";

async function getCursor(
  studio: StudioModel,
  user: TestUserCredentials
): Promise<Locator> {
  const name = `${user.firstName}-${user.lastName}`;
  const cursorId = name.replace(/[^a-zA-Z0-9-]/g, "");
  const cursorSelector = `[data-test-id="${cursorId}"]`;
  return studio.frame.locator(cursorSelector);
}

async function getCursorPosition(
  studio: StudioModel,
  user: TestUserCredentials
): Promise<{ x: number; y: number } | null> {
  const cursor = await getCursor(studio, user);
  const box = await cursor.boundingBox({ timeout: 2000 });

  if (box) {
    return { x: box.x, y: box.y };
  }
  return null;
}

testMultiplayer.describe("multiplayer cursors", () => {
  let projectId: string;

  testMultiplayer.beforeEach(async ({ admin, user1, user2 }) => {
    projectId = await setupMultiplayerProject(
      admin,
      user1,
      user2,
      "multiplayer-cursor-test"
    );
  });

  testMultiplayer.afterEach(async ({ admin }) => {
    await admin.apiClient.removeProject(projectId);
  });

  testMultiplayer(
    "users can see and follow each other's cursors in real-time",
    async ({ admin, user1, user2 }) => {
      const sessions = [admin, user1, user2];
      const componentName = "CursorTestComponent";

      // Setup: Admin creates component and adds elements
      await goToProject(admin.page, `/projects/${projectId}`);
      const adminStudio = admin.models.studio;

      await adminStudio.createComponentFromNav(componentName);
      await waitForFrameToLoad(adminStudio.page);

      await adminStudio.leftPanel.insertNode("Text");

      const anchorElement = adminStudio.frame.locator(".hoverbox").first();
      await anchorElement.waitFor({ state: "visible", timeout: 5000 });

      const anchorBox = await anchorElement.boundingBox();
      expect(anchorBox).toBeTruthy();

      // Other users join the component
      await forEachAsync([user1, user2], async (session) => {
        await goToProject(session.page, `/projects/${projectId}`);
        await session.models.studio.switchArena(componentName);
      });

      // Initial cursor positioning
      await forEachAsync(sessions, async (session, index) => {
        await session.page.mouse.move(
          anchorBox!.x + 100 + index * 50,
          anchorBox!.y + 100 + index * 30
        );
      });

      // Verify all users can see each other's cursors
      await forEachAsync(sessions, async (session) => {
        const studio = session.models.studio;

        // Cursor only shows first part of user name, which is Plasmic for all test users
        const cursorSelector = `.PlayerCursor:has-text("Plasmic")`;
        await expect(studio.frame.locator(cursorSelector)).toHaveCount(2);
      });

      // Get current cursor positions before movement
      const initialPositions = {
        user1: await getCursorPosition(adminStudio, user1.user),
        user2: await getCursorPosition(adminStudio, user2.user),
      };

      expect(initialPositions.user1).toBeTruthy();
      expect(initialPositions.user2).toBeTruthy();

      // Move cursors relative to their current positions
      const moveDeltas = [
        { dx: 100, dy: 50 }, // admin movement
        { dx: 150, dy: 80 }, // user1 movement
        { dx: 120, dy: 100 }, // user2 movement
      ];

      const user1Expected = {
        x: initialPositions.user1!.x + moveDeltas[1].dx,
        y: initialPositions.user1!.y + moveDeltas[1].dy,
      };
      const user2Expected = {
        x: initialPositions.user2!.x + moveDeltas[2].dx,
        y: initialPositions.user2!.y + moveDeltas[2].dy,
      };

      // Move each cursor by the specified delta
      await user1.page.mouse.move(user1Expected.x, user1Expected.y);
      await user2.page.mouse.move(user2Expected.x, user2Expected.y);
      /*
      for (const [index, session] of sessions.entries()) {
        const currentBox = await session.models.studio.frame
          .locator(".hoverbox")
          .first()
          .boundingBox();

        await session.page.mouse.move(
          currentBox!.x + moveDeltas[index].dx,
          currentBox!.y + moveDeltas[index].dy
        );
      }
        */

      await admin.page.waitForTimeout(2000);

      const finalPositions = {
        user1: await getCursorPosition(adminStudio, user1.user),
        user2: await getCursorPosition(adminStudio, user2.user),
      };

      expect(finalPositions.user1).toBeTruthy();
      expect(finalPositions.user2).toBeTruthy();

      // Verify user1's cursor moved to expected position (within 5% tolerance)
      const tolerance = 0.05;
      const user1XDiff = Math.abs(finalPositions.user1!.x - user1Expected.x);
      const user1YDiff = Math.abs(finalPositions.user1!.y - user1Expected.y);
      const user1XTolerance = Math.abs(user1Expected.x) * tolerance;
      const user1YTolerance = Math.abs(user1Expected.y) * tolerance;

      expect(user1XDiff).toBeLessThanOrEqual(user1XTolerance);
      expect(user1YDiff).toBeLessThanOrEqual(user1YTolerance);

      // Verify user2's cursor moved to expected position (within 5% tolerance)
      const user2XDiff = Math.abs(finalPositions.user2!.x - user2Expected.x);
      const user2YDiff = Math.abs(finalPositions.user2!.y - user2Expected.y);
      const user2XTolerance = Math.abs(user2Expected.x) * tolerance;
      const user2YTolerance = Math.abs(user2Expected.y) * tolerance;

      expect(user2XDiff).toBeLessThanOrEqual(user2XTolerance);
      expect(user2YDiff).toBeLessThanOrEqual(user2YTolerance);
    }
  );
});
