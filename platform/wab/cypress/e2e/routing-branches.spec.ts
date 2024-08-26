describe("routing", () => {
  afterEach(() => {
    cy.removeCurrentProject();
  });

  it("should switch branches", () => {
    cy.setupNewProject({
      name: "routing-branches",
      devFlags: { branching: true },
    }).then((projectId) => {
      cy.withinStudioIframe(() => {
        // New project should create a new arena called "Custom arena 1"
        cy.url().should("not.include", `branch=`);

        cy.justLog("Setup Main");
        cy.createNewComponent("DisplayBranch").then((mainFramed) => {
          cy.focusFrameRoot(mainFramed);

          cy.insertFromAddDrawer("Text");
          cy.getSelectedElt().renameTreeNode("text");
          cy.getSelectedElt().chooseFontSize("60px"); // so we can see it easily
          cy.getSelectedElt().dblclick({ force: true });
          mainFramed.enterIntoTplTextBlock("Main");

          cy.publishVersion("need to publish before branching");
        });

        function createNewBranch(branchName: string) {
          cy.waitForNewFrame(
            () => {
              cy.branchPanel()
                .contains("New")
                .click()
                .justType(`${branchName}{enter}`);
            },
            { skipWaitInit: true }
          ).then((newBranchFramed) => {
            cy.focusFrameRoot(newBranchFramed);
            cy.url().should("include", `branch=${branchName}`);
            cy.selectTreeNode(["text"])
              .getSelectedElt()
              .should("contain.text", "Main")
              .dblclick({ force: true });
            newBranchFramed.enterIntoTplTextBlock(branchName);
            cy.wait(300);
          });
        }

        function switchBranch(branchName: string) {
          return cy
            .waitForNewFrame(
              () => {
                cy.waitForSave();
                cy.branchPanel().contains(branchName).click({ force: true });
              },
              { skipWaitInit: true }
            )
            .then((switchBranchFramed) => {
              cy.focusFrameRoot(switchBranchFramed);
              if (branchName === "main") {
                cy.url().should("not.include", `branch=`);
              } else {
                cy.url().should("include", `branch=${branchName}`);
              }
              return cy.wrap(switchBranchFramed);
            });
        }

        cy.justLog("Setup feature branch");
        createNewBranch("Feature");

        cy.justLog("Switching branches with branch panel");
        switchBranch("main").then(() => {
          cy.selectTreeNode(["text"])
            .getSelectedElt()
            .should("contain.text", "Main");
        });
        switchBranch("Feature").then(() => {
          cy.selectTreeNode(["text"])
            .getSelectedElt()
            .should("contain.text", "Feature");
        });
      });

      cy.justLog("Switching branches with URL");
      cy.openProject({ projectId, qs: { branch: "main" } }).withinStudioIframe(
        () => {
          cy.waitForFrameToLoad()
            .selectTreeNode(["text"])
            .getSelectedElt()
            .should("contain.text", "Main");
        }
      );
      cy.openProject({
        projectId,
        qs: { branch: "Feature" },
      }).withinStudioIframe(() => {
        cy.waitForFrameToLoad()
          .selectTreeNode(["text"])
          .getSelectedElt()
          .should("contain.text", "Feature");
      });
      cy.openProject({ projectId, qs: { branch: "main" } }).withinStudioIframe(
        () => {
          cy.waitForFrameToLoad()
            .selectTreeNode(["text"])
            .getSelectedElt()
            .should("contain.text", "Main");
        }
      );
      cy.openProject({
        projectId,
        qs: {
          branch: "NonExistentBranch",
        },
      }).withinStudioIframe(() => {
        // visiting non-existent branch should redirect us to the main branch
        cy.url().should("not.include", `branch=`);
        cy.waitForFrameToLoad()
          .selectTreeNode(["text"])
          .getSelectedElt()
          .should("contain.text", "Main");
      });
    });
  });
});
