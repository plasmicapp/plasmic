import { v4 } from "uuid";
import { removeCurrentProject } from "../support/util";

describe("hostless-cms", function () {
  afterEach(() => {
    removeCurrentProject();
  });

  it("can create cms with data, fetch using hostless package, change model", function () {
    const cmsName = `CMS ${v4()}`;
    cy.login();
    // Create CMS
    cy.visit(`/projects/`, { log: false, timeout: 120000 });
    cy.contains("Plasmic's First Workspace").click();
    cy.contains("Integrations").click();
    cy.contains("New CMS").click();
    cy.get(`[data-test-id="prompt"]`).click();
    cy.wait(200);
    cy.justType(cmsName);
    cy.contains("Add").click();

    // Create new model
    cy.get(`[data-test-id="cmsModels"]`).click();
    cy.get(`[data-test-id="addModelButton"]`).click();
    cy.get(`[data-test-id="prompt"]`).click();
    cy.justType("First model");
    cy.contains("Add").click();
    // Create field
    cy.contains("Add field").click();
    cy.contains("newField").click();
    cy.get(`[id="schema_fields_0_identifier"]`).click();
    cy.justType(`{selectAll}first field`);
    // Create other field
    cy.contains("Add field").click();
    cy.contains("newField").click();
    cy.get(`[id="schema_fields_1_identifier"]`).click();
    cy.justType(`{selectAll}second field`);
    cy.contains("Save").click({ force: true });
    cy.contains("Saved!");

    // Add rows
    cy.get(`[data-test-id="cmsContent"]`).click();
    cy.get(`[data-test-id="addEntryButton"]`).click();
    cy.wait(500);
    cy.get(`[id="number__firstField"]`).click();
    cy.justType("1 - first");
    cy.get(`[id="number__secondField"]`).click();
    cy.justType("1 - second");
    cy.wait(500);
    cy.contains("Publish").wait(2000).click();
    cy.contains("Your changes have been published.");
    cy.get(`[data-test-id="addEntryButton"]`).click();
    cy.contains("Untitled entry");
    cy.wait(500);
    cy.get(`[id="number__firstField"]`).click();
    cy.justType("2 - first");
    cy.get(`[id="number__secondField"]`).click();
    cy.justType("2 - second");
    cy.contains("Publish").wait(2000).click();
    cy.contains("Your changes have been published.");

    cy.get(`[data-test-id="cmsSettings"]`).click();

    // const cmsId = "kALxsG6wQ2dTo2uvAA6xoz";
    // const cmsPublicToken =
    //   "98KAclsCAVpTh6G0syrtzx08JsjdtJAifPi11r4OzUFqfLs2t1J4v72lgEvGHDubZBiSA9cA1gx84kMO3bCA";
    cy.getTextFromId("databaseId").then((cmsId) =>
      cy.getTextFromId("publicToken").then((cmsPublicToken) => {
        // Create new plasmic project using the cms package
        cy.setupProjectWithHostlessPackages({
          hostLessPackagesInfo: {
            name: "plasmic-cms",
            npmPkg: ["@plasmicpkgs/plasmic-cms"],
          },
        }).then(() => {
          cy.withinStudioIframe(() => {
            // Test the components
            cy.switchToProjectSettingsTab();
            cy.contains("CMS Credentials Provider").click();
            cy.get(`#sidebar-modal button[data-test-id="collapse"]`).click();
            cy.wait(200);
            cy.setSelectedDimStyle(
              "host",
              `{selectall}${Cypress.config("baseUrl")}`
            );
            cy.setSelectedDimStyle("databaseId", cmsId);
            cy.setSelectedDimStyle("databaseToken", cmsPublicToken);
            cy.switchToTreeTab();

            cy.createNewFrame().then((framed) => {
              cy.focusFrameRoot(framed);
              // Add Data loader
              cy.insertFromAddDrawer("hostless-plasmic-cms-query-repeater");
              cy.wait(2000);
              cy.getSelectedElt()
                .should("contain.text", "1 - first")
                .should("contain.text", "2 - first");
              cy.justType("{enter}{enter}");
              cy.renameTreeNode("CMS Container", { programatically: true });

              // Change cms field
              cy.selectTreeNode(["Slot", "CMS Container", "CMS Entry Field"]);

              cy.get(".canvas-editor__right-pane")
                .contains("button", "firstField")
                .click();
              cy.contains(`div[role="option"]`, "secondField").click({
                force: true,
              });
              cy.selectTreeNode(["CMS Data Fetcher"])
                .getSelectedElt()
                .should("contain.text", "1 - second")
                .should("contain.text", "2 - second");

              cy.checkNoErrors();
            });

            cy.createNewFrame().then((framed) => {
              cy.focusFrameRoot(framed);
              // Add Data loader
              cy.insertFromAddDrawer("hostless-plasmic-cms-query-repeater");
              cy.wait(2000);
              cy.justType("{enter}{enter}");
              cy.renameTreeNode("CMS Container", { programatically: true });

              // Add text to data bind
              cy.selectTreeNode([
                "Slot",
                "CMS Container",
                "CMS Entry Field",
              ]).justType("{del}");
              cy.insertFromAddDrawer("Text");
              cy.get(`[data-test-id="text-content"] label`).rightclick();
              cy.contains("Use dynamic value").click();
              cy.selectPathInDataPicker([
                "plasmicCmsFirstModelItem",
                "data",
                "firstField",
              ]);

              cy.selectTreeNode(["CMS Data Fetcher"])
                .getSelectedElt()
                .should("contain.text", "1 - first")
                .should("contain.text", "2 - first");

              cy.checkNoErrors();
            });
          });
        });
      })
    );
  });
});
