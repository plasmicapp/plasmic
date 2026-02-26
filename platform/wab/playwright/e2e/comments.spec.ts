import { expect, Page } from "@playwright/test";
import { PageModels, test } from "../fixtures/test";
import {
  getComponentUuid,
  goToProject,
  waitForFrameToLoad,
} from "../utils/studio-utils";

async function createComponentWithComment(props: {
  componentName: string;
  commentText: string;
  page: Page;
  models: PageModels;
}): Promise<string> {
  const { componentName, commentText, page, models } = props;
  const threadIdValue =
    await test.step("Create component with a comment on a Text node", async () => {
      await models.studio.leftPanel.addComponent(componentName);
      await waitForFrameToLoad(page);
      await models.studio.leftPanel.insertNode("Text");
      await models.studio.addCommentToSelection(commentText);

      const commentMarkers = models.studio.frame.locator(
        '[data-test-id^="comment-marker-"]'
      );

      const firstMarker = commentMarkers.first();
      const threadId = await firstMarker.getAttribute("data-test-id");
      expect(threadId).toBeDefined();

      return threadId!.replace("comment-marker-", "");
    });
  return threadIdValue!;
}

function assertCommentInUrl(page: Page, threadId: string) {
  return page.waitForURL((url) => url.searchParams.get("comment") === threadId);
}

function assertCommentNotInUrl(page: Page, threadId: string) {
  return page.waitForURL((url) => url.searchParams.get("comment") !== threadId);
}

test.describe("comments", () => {
  let projectId: string;
  test.beforeEach(async ({ apiClient, page }) => {
    projectId = await apiClient.setupNewProject({
      name: "comment-navigation",
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

  test("should open, close thread dialog, update url and arenas for comment", async ({
    page,
    models,
  }) => {
    const componentName = "MyComponent";
    const pageName = "Page";
    const commentText = "Test Comment";

    const threadIdValue = await createComponentWithComment({
      componentName,
      commentText,
      page,
      models,
    });

    await test.step("Opening a comment thread adds comment param to URL", async () => {
      await assertCommentNotInUrl(page, threadIdValue);
      await models.studio.openCommentThread(threadIdValue);
      await assertCommentInUrl(page, threadIdValue);
    });

    await test.step("Closing comment thread removes param from URL", async () => {
      await models.studio.closeCommentThread();
      await page.waitForURL((url) => !url.searchParams.has("comment"));
    });

    await test.step("Navigating with comment param opens comment and switches to its component arena", async () => {
      await goToProject(page, `projects/${projectId}?comment=${threadIdValue}`);

      await assertCommentInUrl(page, threadIdValue);

      const componentUuid = await getComponentUuid(page, componentName);

      expect(page.url()).toContain(
        `/-/${componentName}?arena_type=component&arena=${componentUuid}&comment=${threadIdValue}`
      );
    });

    await test.step("Clicking a comment from a different arena navigates back to the comment's component", async () => {
      await models.studio.createNewPageInOwnArena(pageName);
      await models.studio.openCommentTab();

      const firstPost = models.studio.commentPosts.first();
      const postId = await firstPost.getAttribute("data-test-id");
      expect(postId).toBeDefined();

      const postIdValue = postId!.replace("comment-post-", "");

      const componentUuid = await getComponentUuid(page, componentName);

      await models.studio.clickCommentPost(postIdValue);
      await assertCommentInUrl(page, postIdValue);

      expect(page.url()).toContain(
        `/-/${componentName}?arena_type=component&arena=${componentUuid}&comment=${postIdValue}`
      );
    });
  });

  test("should open, close thread dialog, but not update url for deleted subject comment", async ({
    page,
    models,
  }) => {
    const componentName = "MyComponent";
    const pageName = "Page";
    const commentText: string = "Test Comment";

    const threadIdValue = await createComponentWithComment({
      componentName,
      commentText,
      page,
      models,
    });

    // Delete text node with comment, then wait for auto-save to persist
    // the deletion to the server (needed for the fresh-load step below).
    const savePromise = page.waitForResponse(
      (resp) =>
        resp.url().includes("/revisions/") &&
        resp.request().method() === "POST" &&
        resp.status() === 200,
      { timeout: 10000 }
    );
    await models.studio.deleteSelectionWithComments();
    await savePromise;

    await test.step("URL has no comment param and marker is not visible", async () => {
      await assertCommentNotInUrl(page, threadIdValue);

      const commentMarker = await models.studio.getCommentMarketById(
        threadIdValue
      );
      await expect(commentMarker).not.toBeVisible();
    });

    await test.step("Can still select comment from Comments tab", async () => {
      await models.studio.openCommentTab();
      await models.studio.clickCommentPost(threadIdValue);
      await assertCommentInUrl(page, threadIdValue);
    });

    await test.step("Closing comment removes comment param from URL", async () => {
      await models.studio.closeCommentThread();
      await assertCommentNotInUrl(page, threadIdValue);
    });

    await test.step("Loading project no longer navigates to component", async () => {
      await goToProject(page, `projects/${projectId}?comment=${threadIdValue}`);

      // Wait for route handling to complete (comment dialog opens for
      // deleted-subject threads without navigating to a component arena)
      await assertCommentInUrl(page, threadIdValue);
      const decodedUrl = decodeURIComponent(page.url());
      expect(decodedUrl.includes(`arena_type=component`)).toBe(false);
    });

    await test.step("Clicking comment from different arena navigates to that arena (not deleted component)", async () => {
      await models.studio.createNewPageInOwnArena(pageName);
      await models.studio.openCommentTab();

      const firstPost = models.studio.commentPosts.first();
      const postId = await firstPost.getAttribute("data-test-id");
      expect(postId).toBeDefined();

      const postIdValue = postId!.replace("comment-post-", "");

      await models.studio.clickCommentPost(postIdValue);
      await assertCommentInUrl(page, postIdValue);

      const pageUuid = await getComponentUuid(page, pageName);

      expect(page.url()).toContain(
        `/-/${pageName}?arena_type=page&arena=${pageUuid}&comment=${postIdValue}`
      );
    });
  });
});
