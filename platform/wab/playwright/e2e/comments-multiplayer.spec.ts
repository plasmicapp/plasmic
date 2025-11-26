import { expect } from "@playwright/test";
import {
  forEachAsync,
  fullName,
  setupMultiplayerProject,
  testMultiplayer,
} from "../utils/multiplayer-utils";
import { goToProject, waitForFrameToLoad } from "../utils/studio-utils";

testMultiplayer.describe("multiplayer comments", () => {
  let projectId: string;

  testMultiplayer.beforeEach(async ({ admin, user1, user2 }) => {
    projectId = await setupMultiplayerProject(
      admin,
      user1,
      user2,
      "multiplayer-comments-test",
      { comments: true }
    );
  });

  testMultiplayer.afterEach(async ({ admin }) => {
    await admin.apiClient.removeProject(projectId);
  });

  testMultiplayer(
    "send and receive comments with multiple users in real-time",
    async ({ admin, user1, user2 }) => {
      const sessions = [admin, user1, user2];
      const adminStudio = admin.models.studio;
      const componentName = "CommentComponent";

      await goToProject(admin.page, `/projects/${projectId}`);

      // User 1 adds a component
      await adminStudio.createComponentFromNav(componentName);
      await waitForFrameToLoad(admin.page);
      await adminStudio.leftPanel.insertNode("Text");

      // admin adds comment and waits for marker to appear
      const commentText = `${fullName(
        admin.user
      )}: Initial comment on text element`;
      await adminStudio.addCommentToSelection(commentText);
      const adminCommentMarker = adminStudio.commentMarkers.first();
      await adminCommentMarker.waitFor({ timeout: 5000 });
      const threadId = await adminCommentMarker.getAttribute("data-test-id");
      expect(threadId).toBeDefined();
      const threadIdValue = threadId!.replace("comment-marker-", "");

      // Navigate other users to component
      await forEachAsync([user1, user2], async (session) => {
        await goToProject(session.page, `/projects/${projectId}`);
        await session.models.studio.switchArena(componentName);
      });

      // Verify other users can see the comment marker
      await forEachAsync([user1, user2], async (session) => {
        await session.models.studio.leftPanel.switchToTreeTab();
        await session.models.studio.leftPanel.selectTreeNode([
          "vertical stack",
          "Enter some text",
        ]);

        const marker = await session.models.studio.getCommentMarketById(
          threadIdValue
        );
        await expect(marker).toBeVisible({ timeout: 10000 });

        // Each user opens the comment thread
        await session.models.studio.openCommentThread(threadIdValue);

        // Verify the input is available
        await expect(session.models.studio.commentTextArea).toBeVisible({
          timeout: 5000,
        });

        // Verify the initial comment is visible
        const commentLoc = session.models.studio
          .getCommentPost(threadIdValue)
          .getByText(commentText);
        await expect(commentLoc).toBeVisible({ timeout: 5000 });
      });

      // Admin saved the comment, so they need to re-open the thread
      await admin.models.studio.openCommentThread(threadIdValue);

      // Each user adds a reply to the thread
      await forEachAsync(sessions, async (session, i) => {
        const replyText = `${fullName(session.user)} reply ${
          i + 1
        }: This is my response`;

        // Find and fill the reply input
        await session.models.studio.commentTextArea.fill(replyText);
        await session.models.studio.commentSubmitButton.click();

        // Re-open thread and view reply for all users
        await forEachAsync(sessions, async (s) => {
          const replyLoc = s.models.studio
            .getCommentPost(threadIdValue)
            .getByText(replyText);
          await expect(replyLoc).toBeVisible({ timeout: 5000 });
        });
      });

      // User 2 creates a new comment on a different element
      await user1.models.studio.leftPanel.insertNode("Link");
      await user1.models.studio.addCommentToSelection(
        `${fullName(user1.user)}: Comment on link element`
      );

      // Get the new comment id
      const marker2 = adminStudio.commentMarkers.nth(1);
      const threadId2 = await marker2.getAttribute("data-test-id");
      expect(threadId2).toBeDefined();
      const threadId2Value = threadId2!.replace("comment-marker-", "");

      // Verify all users can see the new comment marker
      await forEachAsync(sessions, async (session) => {
        const allMarkers = session.models.studio.commentMarkers;
        await expect(allMarkers).toHaveCount(2, { timeout: 5000 });
        await session.models.studio.openCommentThread(threadId2Value);
      });

      // Resolve comment
      await adminStudio.frame
        .locator('[data-test-id="thread-comment-dialog-history-btn"]')
        .click();

      // Verify all users see the resolved status
      await forEachAsync(sessions, async (session) => {
        const resolvedLoc = session.models.studio.frame
          .locator(".CommentDialogContainer")
          .getByText("Comment thread resolved.");
        await expect(resolvedLoc).toBeVisible({ timeout: 5000 });
      });

      // Test comment tab navigation
      for (const session of sessions) {
        await session.models.studio.closeCommentThread();
        await session.models.studio.openCommentTab();

        // Verify first comment visible in comments panel (without resolved)
        const commentPosts = session.models.studio.commentPosts;
        await expect(commentPosts).toHaveCount(1, { timeout: 10000 });

        // Click on first comment post to navigate
        await session.models.studio.clickCommentPost(threadIdValue);

        // Verify URL contains comment parameter
        const url = session.page.url();
        expect(url).toContain(`comment=${threadIdValue}`);
      }

      // Test real-time deletion
      await adminStudio.deleteSelectionWithComments();

      await forEachAsync(sessions, async (session) => {
        // The comment marker should not be visible anymore
        const deletedMarker = await session.models.studio.getCommentMarketById(
          threadIdValue
        );
        await expect(deletedMarker).not.toBeVisible({ timeout: 10000 });

        // But the comment should still exist in the comments tab
        const commentInTab = session.models.studio.frame.locator(
          `.comments-tab [data-test-id="comment-post-${threadIdValue}"]`
        );
        await expect(commentInTab).toBeVisible({ timeout: 5000 });
      });
    }
  );
});
