import {
  removeCurrentProject,
  setupProjectFromTemplate,
} from "../support/util";

describe("state-management-counter", function () {
  beforeEach(() => {
    setupProjectFromTemplate("state-management");
  });
  afterEach(() => {
    removeCurrentProject();
  });

  it("can create private/readonly/writable counter", () => {
    cy.withinStudioIframe(() => {
      cy.createNewComponent("counter").then((framed) => {
        cy.focusFrameRoot(framed);

        cy.addState({
          name: "count",
          variableType: "number",
          accessType: "private",
          initialValue: "5",
        }).wait(200);
        cy.insertFromAddDrawer("Text");
        cy.get(`[data-test-id="text-content"] label`).rightclick();
        cy.contains("Use dynamic value").click();
        cy.selectPathInDataPicker(["count"]);
        cy.getSelectedElt().should("contain.text", "5");

        cy.insertFromAddDrawer("Button");
        cy.bindTextContentToCustomCode(`"Increment"`);
        cy.addInteraction("onClick", {
          actionName: "updateVariable",
          args: {
            variable: ["count"],
            operation: "increment",
          },
        });
      });

      cy.createNewPage("page").then((framed) => {
        cy.focusFrameRoot(framed);

        cy.insertFromAddDrawer("counter");
        cy.getSelectedElt().should("contain.text", "5");
        cy.checkNumberOfStatesInComponent(0, 0);

        cy.selectTreeNode(["root", "counter"]).rightclick();
        cy.contains("in place").click();
        cy.changeStateAccessType("count", "private", "writable");
        // leave spotlight mode
        cy.selectTreeNode(["root", "counter"]).click();
        cy.getSelectedElt().should("contain.text", "5");
        cy.checkNumberOfStatesInComponent(0, 1);

        cy.insertFromAddDrawer("Button");
        cy.bindTextContentToCustomCode(`"Reset"`);
        cy.addInteraction("onClick", {
          actionName: "updateVariable",
          args: {
            variable: ["counter → count"],
            operation: "newValue",
            value: "0",
          },
        });

        cy.withinLiveMode(() => {
          cy.get("#plasmic-app div").should("contain.text", "5");
          cy.contains("Increment").click();
          cy.get("#plasmic-app div").should("contain.text", "6");
          cy.contains("Reset").click();
          cy.get("#plasmic-app div").should("contain.text", "0");
        });

        cy.selectTreeNode(["root", "counter"]).rightclick();
        cy.contains("in place").click();
        cy.changeStateAccessType("count", "writable", "readonly");
        cy.selectTreeNode(["root", "counter"]).click();
        cy.checkNumberOfStatesInComponent(0, 1);
        cy.getSelectedElt().should("contain.text", "5");

        cy.withinLiveMode(() => {
          cy.get("#plasmic-app div").should("contain.text", "5");
          cy.contains("Increment").click();
          cy.get("#plasmic-app div").should("contain.text", "6");
          // the state is readonly so it shouldn't update
          cy.contains("Reset").click();
          cy.get("#plasmic-app div").should("contain.text", "6");
        });

        cy.checkNoErrors();
      });
    });
  });
});
