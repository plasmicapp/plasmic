import { expect } from "@playwright/test";
import { test } from "../fixtures/test";
import {
  getComponentUuid,
  goToProject,
  waitForFrameToLoad,
} from "../utils/studio-utils";

test.describe("comments", () => {
  let projectId: string;
  test.beforeEach(async ({ apiClient, page }) => {
    projectId = await apiClient.setupNewProject({
      name: "comment-navigation",
    });
    await goToProject(page, `/projects/${projectId}?comments=true`);
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
    const commentText: string = "Test Comment";

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

    const threadIdValue = threadId!.replace("comment-marker-", "");

    const url = page.url();
    expect(url).not.toContain(`comment=${threadIdValue}`);

    await models.studio.openCommentThread(threadIdValue);
    await page.waitForURL(`**/*comment=${threadIdValue}*`);
    const urlAfterOpen = page.url();
    expect(urlAfterOpen).toContain(`comment=${threadIdValue}`);

    await models.studio.closeCommentThread();
    await page.waitForFunction(
      (id) => !window.location.href.includes(`comment=${id}`),
      threadIdValue
    );
    const urlAfterClose = page.url();
    expect(urlAfterClose).not.toContain(`comment=${threadIdValue}`);

    await goToProject(
      page,
      `projects/${projectId}?comment=${threadIdValue}&comments=true`,
      { timeout: 10000 }
    );

    const finalUrl = page.url();
    expect(finalUrl).toContain(`comment=${threadIdValue}`);

    const componentUuid = await getComponentUuid(page, componentName);

    if (componentUuid) {
      expect(finalUrl).toContain(
        `/-/${componentName}?arena_type=component&arena=${componentUuid}&comment=${threadIdValue}`
      );
    }

    await models.studio.createNewPageInOwnArena(pageName);
    await models.studio.openCommentTab();

    const firstPost = models.studio.commentPosts.first();
    const postId = await firstPost.getAttribute("data-test-id");
    expect(postId).toBeDefined();

    if (!postId) {
      return;
    }

    const postIdValue = postId.replace("comment-post-", "");

    await models.studio.clickCommentPost(postIdValue);
    await page.waitForURL(`**/*comment=${postIdValue}*`);
    const urlAfterClick = page.url();
    expect(urlAfterClick).toContain(`comment=${postIdValue}`);

    if (componentUuid) {
      expect(urlAfterClick).toContain(
        `/-/${componentName}?arena_type=component&arena=${componentUuid}&comment=${postIdValue}`
      );
    }
  });

  test("should open, close thread dialog, but not update url for deleted subject comment", async ({
    page,
    models,
  }) => {
    const componentName = "MyComponent";
    const pageName = "Page";
    const commentText: string = "Test Comment";

    await models.studio.leftPanel.addComponent(componentName);
    await waitForFrameToLoad(page);
    await models.studio.leftPanel.insertNode("Text");
    await models.studio.addCommentToSelection(commentText);

    const firstMarker = models.studio.commentMarkers.first();
    const threadId = await firstMarker.getAttribute("data-test-id");
    expect(threadId).toBeDefined();

    if (!threadId) {
      return;
    }

    const threadIdValue = threadId.replace("comment-marker-", "");

    await models.studio.deleteSelectionWithComments();

    const url = page.url();
    expect(url).not.toContain(`comment=${threadIdValue}`);

    const commentMarker = await models.studio.getCommentMarketById(
      threadIdValue
    );
    await expect(commentMarker).not.toBeVisible();

    await models.studio.openCommentTab();
    await models.studio.clickCommentPost(threadIdValue);
    await page.waitForURL(`**/*comment=${threadIdValue}*`);
    let urlAfterClick = page.url();
    expect(urlAfterClick).toContain(`comment=${threadIdValue}`);

    await models.studio.closeCommentThread();
    await page.waitForFunction(
      (id) => !window.location.href.includes(`comment=${id}`),
      threadIdValue
    );
    const urlAfterClose = page.url();
    expect(urlAfterClose).not.toContain(`comment=${threadIdValue}`);

    await goToProject(
      page,
      `projects/${projectId}?comment=${threadIdValue}&comments=true`,
      { timeout: 10000 }
    );

    const finalUrl = page.url();
    const decodedUrl = decodeURIComponent(finalUrl);
    expect(decodedUrl).toContain(`comment=${threadIdValue}`);
    expect(decodedUrl.includes(`arena_type=component`)).toBe(false);

    await models.studio.createNewPageInOwnArena(pageName);
    await models.studio.openCommentTab();

    const firstPost = models.studio.commentPosts.first();
    const postId = await firstPost.getAttribute("data-test-id");
    expect(postId).toBeDefined();

    if (!postId) {
      return;
    }

    const postIdValue = postId.replace("comment-post-", "");

    await models.studio.clickCommentPost(postIdValue);
    await page.waitForURL(`**/*comment=${postIdValue}*`);
    urlAfterClick = page.url();
    expect(urlAfterClick).toContain(`comment=${postIdValue}`);

    const pageUuid = await getComponentUuid(page, pageName);

    if (pageUuid) {
      expect(urlAfterClick).toContain(
        `/-/${pageName}?arena_type=page&arena=${pageUuid}&comment=${postIdValue}`
      );
    }
  });
});
