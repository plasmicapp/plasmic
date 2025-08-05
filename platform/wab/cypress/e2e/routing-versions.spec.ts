describe("routing", () => {
  afterEach(() => {
    cy.removeCurrentProject();
  });

  it("should switch branch versions", () => {
    cy.setupNewProject({
      name: "routing-branch-versions",
      devFlags: { branching: true },
    }).then((projectId) => {
      cy.withinStudioIframe(() => {
        // New project should create a new arena called "Custom arena 1"
        cy.url()
          .should("not.include", `branch=`)
          .and("not.include", "version=");

        cy.createNewComponent("DisplayBranchVersion").then((framed) => {
          cy.focusFrameRoot(framed);

          cy.justLog("Publishing Main v1");
          cy.insertFromAddDrawer("Text");
          cy.getSelectedElt().renameTreeNode("text");
          cy.getSelectedElt().chooseFontSize("60px"); // so we can see it easily
          cy.getSelectedElt().dblclick({ force: true });
          framed.enterIntoTplTextBlock("Main v1");
          cy.publishVersion("Main v1");

          cy.justLog("Publishing Main v2");
          cy.selectTreeNode(["text"])
            .getSelectedElt()
            .should("contain.text", "Main v1")
            .dblclick({ force: true });
          framed.enterIntoTplTextBlock("Main v2");
          // Wait for Studio to recognize changes before trying to publish.
          cy.contains("Newest changes haven't been published.");
          cy.publishVersion("Main v2");

          cy.justLog("Editing main without publishing");
          cy.selectTreeNode(["text"])
            .getSelectedElt()
            .should("contain.text", "Main v2")
            .dblclick({ force: true });
          framed.enterIntoTplTextBlock("Main latest");
          cy.contains("Newest changes haven't been published.");
        });

        function switchBranchVersion(branchVersion: string) {
          return cy
            .waitForNewFrame(
              () => {
                cy.switchToVersionsTab();
                cy.curWindow().then((win) => {
                  const studioCtx = (win as any).dbg.studioCtx;
                  const msg = `${studioCtx._changeCounter} ${studioCtx._savedChangeCounter}`;
                  cy.justLog("saving " + msg);
                });
                cy.waitForSave();
                cy.curWindow().then((win) => {
                  const studioCtx = (win as any).dbg.studioCtx;
                  const msg = `${studioCtx._changeCounter} ${studioCtx._savedChangeCounter}`;
                  cy.justLog("saved " + msg);
                });
                cy.wait(1000);
                cy.curWindow().then((win) => {
                  const studioCtx = (win as any).dbg.studioCtx;
                  const msg = `${studioCtx._changeCounter} ${studioCtx._savedChangeCounter}`;
                  cy.justLog("waited " + msg);
                });
                cy.contains(branchVersion).click();
              },
              { skipWaitInit: true }
            )
            .then((switchBranchVersionFramed) => {
              cy.focusFrameRoot(switchBranchVersionFramed);
              cy.url()
                .should("not.include", "branch=")
                .and("include", `version=${branchVersion}`);
              return cy.wrap(switchBranchVersionFramed);
            });
        }

        cy.justLog("Switching branch versions with versions tab");
        switchBranchVersion("0.0.1").then(() => {
          cy.contains("Back to current version").should("be.visible");
          cy.selectTreeNode(["text"])
            .getSelectedElt()
            .should("contain.text", "Main v1");
        });
        switchBranchVersion("0.0.2").then(() => {
          cy.contains("Back to current version").should("be.visible");
          cy.selectTreeNode(["text"])
            .getSelectedElt()
            .should("contain.text", "Main v2");
        });

        cy.justLog('Click "Back to current version" button');
        cy.waitForNewFrame(
          () => {
            cy.contains("Back to current version").click();
          },
          { skipWaitInit: true }
        ).then(() => {
          cy.url()
            .should("not.include", `branch=`)
            .and("not.include", "version=");
          cy.contains("Back to current version").should("not.exist");
          cy.selectTreeNode(["text"])
            .getSelectedElt()
            .should("contain.text", "Main latest");
        });
      });

      cy.justLog("Switching branch versions with URL");
      cy.openProject({
        projectId,
        qs: {
          version: "0.0.1",
        },
      }).withinStudioIframe(() => {
        cy.contains("Back to current version").should("be.visible");
        cy.waitForFrameToLoad()
          .selectTreeNode(["text"])
          .getSelectedElt()
          .should("contain.text", "Main v1");
      });
      cy.openProject({
        projectId,
        qs: {
          branch: "main",
          version: "0.0.2",
        },
      }).withinStudioIframe(() => {
        cy.contains("Back to current version").should("be.visible");
        cy.waitForFrameToLoad()
          .selectTreeNode(["text"])
          .getSelectedElt()
          .should("contain.text", "Main v2");
      });
      cy.openProject({
        projectId,
        qs: {
          branch: "main",
          version: "0.0.3",
        },
      }).withinStudioIframe(() => {
        // visiting non-existent branch version should redirect us to the main branch
        cy.url()
          .should("not.include", `branch=`)
          .and("not.include", "version=");
        cy.contains("Back to current version").should("not.exist");
        cy.waitForFrameToLoad()
          .selectTreeNode(["text"])
          .getSelectedElt()
          .should("contain.text", "Main latest");
      });
    });
  });
});
