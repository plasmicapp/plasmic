import { testIds } from "../../src/wab/client/test-helpers/test-ids";
import {
  Framed,
  openArtboardSettings,
  removeCurrentProject,
  setupNewProject,
  switchToResponsivenessTab,
} from "../support/util";

describe("arena", function () {
  beforeEach(() => {
    setupNewProject({
      name: "arena",
    });
  });

  afterEach(() => {
    removeCurrentProject();
  });

  it("activates and deactivates global screen variants", function () {
    cy.withinStudioIframe(() => {
      cy.createNewFrame().then((framed: Framed) => {
        cy.renameSelectionTag("Screen");

        cy.justLog("Add a child");
        cy.focusFrameRoot(framed);
        cy.insertFromAddDrawer("Text");

        cy.justLog("Extract it as a component.");
        cy.extractComponentNamed("Text Input");

        cy.justLog("Open component in its own frame.");
        cy.waitForNewFrame(() => {
          cy.projectPanel().contains("Text Input").rightclick();
          cy.contains("in new artboard").click({ force: true });
        }).then((framed2: Framed) => {
          cy.focusFrameRoot(framed2);

          cy.chooseFontSize("25px");
          cy.switchToComponentDataTab();
          cy.get(testIds.globalVariantsHeader.selector).click();

          switchToResponsivenessTab();
          cy.contains("Start with a preset").click();
          cy.contains("Desktop first").click({ force: true });
          cy.contains("Desktop, Mobile").click({ force: true });
          cy.get("input[placeholder='Max width']").click().clear().type("210");
          cy.selectVariant("Screen", "Mobile");
          cy.chooseFontSize("30px");

          cy.justLog("Back to the first artboard");
          cy.focusFrameRoot(framed);

          cy.justType("--");
          openArtboardSettings();
          cy.get(`[data-test-id="artboard-size-width"]`)
            .clear({ force: true })
            .type("200px{enter}");

          cy.focusFrameRoot(framed);
          framed.rootElt().children().dblclick({ force: true });

          cy.getFontSizeInput().should("contain.value", "30");

          openArtboardSettings();
          cy.get(`[data-test-id="artboard-size-width"]`)
            .clear({ force: true })
            .type("211px{enter}");

          cy.focusFrameRoot(framed);

          framed.rootElt().children().dblclick({ force: true });

          cy.getFontSizeInput().should("contain.value", "25");
        });
      });
    });
  });
});
