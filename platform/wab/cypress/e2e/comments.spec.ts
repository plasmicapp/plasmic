import { ApiCommentThread } from "../../src/wab/shared/ApiSchema";
import { Component } from "../../src/wab/shared/model/classes";

describe("routing", () => {
  afterEach(() => {
    cy.removeCurrentProject();
  });

  it("should open, close thread dialog, update url and arenas for comment", () => {
    cy.setupNewProject({
      name: "comment-navigation",
      devFlags: { comments: true },
    }).then((projectId) => {
      const componentName = "MyComponent";
      const pageName = "Page";
      let threadId: string;
      let componentUuid: string;
      const commentText: string = "Test Comment";
      cy.withinStudioIframe(() => {
        cy.createNewComponent(componentName).then(() => {
          cy.insertFromAddDrawer("Text");
          // add comment
          cy.curWindow().then((win) => {
            cy.addCommentToSelection(commentText).then(() => {
              const dbg = (win as any).dbg;
              const { studioCtx } = dbg;
              const commentsCtx = studioCtx.commentsCtx;
              const component = studioCtx.site.components.find(
                (c: Component) => c.name === componentName
              );
              componentUuid = component?.uuid;
              const thread = commentsCtx
                .computedData()
                .allThreads.find((t: ApiCommentThread) =>
                  t.comments.some((c) => c.body === commentText)
                );
              expect(thread).to.exist;
              threadId = thread.id;
              // url should not have the thread id when not opened
              cy.url().should("not.include", `comment=${threadId}`);
              cy.openCommentThread(threadId);
              // url should have the thread id when opened
              cy.url().should("include", `comment=${threadId}`);
              cy.closeCommentThread();
              // url should have the thread id when closed
              cy.url().should("not.include", `comment=${threadId}`);
              cy.visit(
                `projects/${projectId}?comment=${threadId}&comments=true`,
                {
                  timeout: 10000,
                }
              ).wait(4000);
              // should switch to the thread arena on load
              cy.url().should(
                "include",
                `/-/${componentName}?arena_type=component&arena=${componentUuid}&comment=${threadId}`
              );
            });
          });
        });
      });
      cy.withinStudioIframe(() => {
        cy.createNewPageInOwnArena(pageName).then(() => {
          cy.openCommentTab();
          expect(threadId).to.exist;
          // clicking comment post from other arena should navigate to thread arena
          cy.clickCommentPost(threadId);
          cy.url().should(
            "include",
            `/-/${componentName}?arena_type=component&arena=${componentUuid}&comment=${threadId}`
          );
        });
      });
    });
  });
  it("should open, close thread dialog, but not update url for deleted subject comment", () => {
    cy.setupNewProject({
      name: "deleted-subject-thread",
      devFlags: { comments: true },
    }).then((projectId) => {
      const componentName = "MyComponent";
      const pageName = "Page";
      let threadId: string;
      const commentText: string = "Test Comment";
      cy.withinStudioIframe(() => {
        cy.createNewComponent(componentName).then(() => {
          cy.insertFromAddDrawer("Text");
          cy.curWindow().then((win) => {
            cy.addCommentToSelection(commentText).then(() => {
              const dbg = (win as any).dbg;
              const { studioCtx } = dbg;
              const commentsCtx = studioCtx.commentsCtx;
              const thread = commentsCtx
                .computedData()
                .allThreads.find((t: ApiCommentThread) =>
                  t.comments.some((c) => c.body === commentText)
                );
              expect(thread).to.exist;
              threadId = thread.id;
              cy.deleteSelectionWithComments().wait(4000);
              // url should not have the thread id when not opened
              cy.url().should("not.include", `comment=${threadId}`);
              // comment marker on canvas should not exist for thread with deleted subject
              cy.get(`[data-test-id='comment-marker-${threadId}']`).should(
                "not.exist"
              );
              // open comment thread form right tab
              cy.openCommentTab();
              cy.clickCommentPost(threadId);
              cy.url().should("include", `comment=${threadId}`);
              cy.closeCommentThread();
              // url should have the thread id when closed
              cy.url().should("not.include", `comment=${threadId}`);
              cy.visit(
                `projects/${projectId}?comment=${threadId}&comments=true`,
                {
                  timeout: 10000,
                }
              ).wait(4000);
              // url does not change to another arena
              cy.url().then((url) => {
                const decodedUrl = decodeURIComponent(url);
                expect(decodedUrl).to.include(
                  `/-/Custom-arena-1?arena_type=custom&arena=Custom arena 1&comment=${threadId}`
                );
              });
            });
          });
        });
      });
      cy.withinStudioIframe(() => {
        cy.createNewPageInOwnArena(pageName).then(() => {
          cy.openCommentTab();
          expect(threadId).to.exist;
          // clicking comment post from other arena should navigate to thread arena
          cy.clickCommentPost(threadId);
          cy.curWindow().then((win) => {
            const dbg = (win as any).dbg;
            const { studioCtx } = dbg;
            const page = studioCtx.site.components.find(
              (c: Component) => c.name === pageName
            );
            expect(page).to.exist;
            cy.url().should(
              "include",
              `/-/${pageName}?arena_type=page&arena=${page.uuid}&comment=${threadId}`
            );
          });
        });
      });
    });
  });
});
