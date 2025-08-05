import { VERT_CONTAINER_CAP } from "../../src/wab/shared/Labels";
import { Framed, removeCurrentProject, setupNewProject } from "../support/util";

Cypress.config("defaultCommandTimeout", 20000);

// Mostly regression tests
describe("component-ops - tricky operations", function () {
  beforeEach(() => {
    setupNewProject({
      name: "component-ops",
    });
  });

  afterEach(() => {
    removeCurrentProject();
  });

  it("can extract component with VarRefs, states, implicit states", function () {
    cy.withinStudioIframe(() => {
      cy.createNewComponent("CompA").then((framedA) => {
        cy.focusFrameRoot(framedA);
        cy.switchToComponentDataTab();
        cy.log("Add prop with default value");
        cy.get(`[data-test-id="add-prop-btn"]`).click({ force: true });
        cy.get(`[data-test-id="prop-name"]`).type("withDefaultValue");
        cy.get(`[data-test-id="default-value"]`)
          .find("input")
          .type("defaultValue1");
        cy.get(`button[data-test-id="prop-submit"]`).click();
        cy.log("Add public state");
        cy.addState({
          name: "count",
          variableType: "number",
          accessType: "writable",
          initialValue: "5",
        });

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        cy.createNewComponent("CompB").then((framedB) => {
          cy.insertFromAddDrawer(VERT_CONTAINER_CAP);
          cy.justType("{enter}");
          cy.insertFromAddDrawer("CompA");
          cy.justType("{enter}");
          cy.switchToSettingsTab();
          cy.log(
            "Make sure linking to a new prop will preserve the default value"
          );
          cy.get(`[data-plasmic-prop="withDefaultValue"]`).first().rightclick();
          cy.contains("Allow external access").trigger("mouseover");
          cy.wait(200);
          cy.contains("Create new prop").click();
          cy.linkNewProp("linkProp1");
          cy.get(`[data-test-id="prop-editor-row-default-withDefaultValue"]`)
            .first()
            .contains("defaultValue1")
            .should("exist");
          cy.insertFromAddDrawer(VERT_CONTAINER_CAP);
          cy.get(
            '[data-test-id="html-attributes-section"] [data-test-id="show-extra-content"]'
          ).click();
          cy.log(
            "Make sure linking attr to a new prop will preserve the default value"
          );
          cy.get('[data-plasmic-prop="tabIndex"]')
            .first()
            .type("5{enter}")
            .rightclick();
          cy.contains("Allow external access").trigger("mouseover");
          cy.wait(200);
          cy.contains("Create new prop").click();
          cy.linkNewProp("linkProp2");
          cy.get(`[data-test-id="prop-editor-row-default-tabIndex"]`)
            .find('[value="5"]')
            .should("exist");
          cy.log("Create multiple VarRefs to the same prop");
          cy.get('[data-plasmic-prop="title"]')
            .first()
            .type("5{enter}")
            .rightclick();
          cy.contains("Allow external access").trigger("mouseover");
          cy.get('[role="menuitem"]').contains("linkProp2").click();
          cy.get(`[data-test-id="prop-editor-row-default-title"]`)
            .contains("5")
            .should("exist");
          cy.justType("{shift+enter}");
          cy.log(
            "Try extract component, with multiple var refs and implicit state"
          );
          cy.extractComponentNamed("CompC");
          cy.log("Check no extra props");
          cy.get(
            `[data-test-id^="prop-editor-row-"]:not([data-test-id^="prop-editor-row-default"])`
          ).should("have.length", 2);
          cy.checkNoErrors();
        });
      });
    });
  });

  it("can hide element on hover", function () {
    cy.withinStudioIframe(() => {
      cy.createNewComponent("CompA").then(() => {
        cy.switchToComponentsTab();
        cy.get('[data-test-id="listitem-component-CompA"]').rightclick();
        cy.get('[data-test-id="edit-component"]').click();
        cy.waitForFrameToLoad();
        cy.curDocument()
          .get(".canvas-editor__frames .canvas-editor__viewport")
          .then(($frame) => {
            const frame = $frame[0] as HTMLIFrameElement;
            return new Framed(frame);
          })
          .then((framed) => {
            cy.switchToTreeTab();
            cy.focusFrameRoot(framed);
            cy.insertFromAddDrawer("Text");
            cy.renameTreeNode("text1");
            cy.insertFromAddDrawer("Text");
            cy.renameTreeNode("text2");
            cy.log("Should be able to hide element on hover");
            cy.waitForNewFrame(() => {
              cy.get(
                '[data-event="component-arena-add-interaction-variant"]'
              ).click();
            }).then((hoverFramed) => {
              cy.get(
                'input[placeholder="e.g. :hover, :focus, :nth-child(odd)"]'
              ).type("Hover{enter}");
              cy.contains("Done").click({ force: true });
              cy.focusFrameRoot(hoverFramed);
              cy.selectTreeNode(["vertical stack", "text2"]);
              cy.justType("{del}");
              cy.contains("Delete instead").should("be.visible");
            });
          });
        cy.checkNoErrors();
      });
    });
  });

  it("Can de-slot a slot whose args also have tpl slots", function () {
    cy.withinStudioIframe(() => {
      cy.createNewComponent("CompA").then((framedA) => {
        cy.createNewComponent("CompB").then((framedB) => {
          cy.createNewComponent("CompC").then((framedC) => {
            cy.justType("{shift+1}");
            cy.focusFrameRoot(framedA);
            cy.insertFromAddDrawer("Text");
            cy.convertToSlot();
            cy.focusFrameRoot(framedB);
            cy.insertFromAddDrawer("CompA");
            cy.justType("{enter}{del}");
            cy.insertFromAddDrawer("Text");
            cy.insertFromAddDrawer("Text");
            cy.convertToSlot();
            cy.justType("{shift+enter}{enter}");
            cy.convertToSlot();
            // Make sure the slots were created correctly
            cy.selectTreeNode([
              "vertical stack",
              "CompA",
              'Slot: "children"',
              'Slot Target: "children"',
            ]);
            cy.selectTreeNode([
              "vertical stack",
              "CompA",
              'Slot: "children"',
              'Slot Target: "slot"',
            ]);
            cy.focusFrameRoot(framedC);
            cy.insertFromAddDrawer("CompB");
            cy.selectTreeNode(["vertical stack", "CompB", 'Slot: "children"']);
            cy.insertFromAddDrawer("Text");
            cy.convertToSlot();
            cy.focusFrameRoot(framedA);
            cy.selectTreeNode(["vertical stack", 'Slot Target: "children"']);
            cy.getSelectedElt().rightclick({ force: true });
            cy.contains("De-slot").click({ force: true });
            cy.wait(500);
            cy.waitAllEval();
            cy.selectTreeNode(["vertical stack"]);
            cy.justType("{enter}{enter}");
            framedA.enterIntoTplTextBlock("--->Hello!");
            cy.focusFrameRoot(framedC);
            cy.log("Should no longer have slots");
            cy.justType("{enter}{enter}{enter}");
            cy.getSelectedTreeNode().should("contain", "CompB");
            framedC.rootElt().contains("--->Hello!").should("exist");
            cy.checkNoErrors();
          });
        });
      });
    });
  });
});
