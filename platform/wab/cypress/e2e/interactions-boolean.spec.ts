import {
  removeCurrentProject,
  setupProjectFromTemplate,
} from "../support/util";

describe("state-management-boolean-interactions", function () {
  beforeEach(() => {
    setupProjectFromTemplate("state-management");
  });
  afterEach(() => {
    removeCurrentProject();
  });

  it("can create all types of boolean interactions", () => {
    cy.withinStudioIframe(() => {
      cy.switchArena("boolean interactions").then((framed) => {
        framed.rootElt().contains("Set to true").click({ force: true });
        cy.addInteraction("onClick", {
          actionName: "updateVariable",
          args: {
            variable: ["booleanVar"],
            operation: "newValue",
            value: "true",
          },
        });

        framed.rootElt().contains("Set to false").click({ force: true });
        cy.addInteraction("onClick", {
          actionName: "updateVariable",
          args: {
            variable: ["booleanVar"],
            operation: "newValue",
            value: "false",
          },
        });

        framed.rootElt().contains("Toggle").click({ force: true });
        cy.addInteraction("onClick", {
          actionName: "updateVariable",
          args: {
            variable: ["booleanVar"],
            operation: "toggle",
          },
        });

        framed.rootElt().contains("Clear variable").click({ force: true });
        cy.addInteraction("onClick", {
          actionName: "updateVariable",
          args: {
            variable: ["booleanVar"],
            operation: "clearValue",
          },
        });

        cy.withinLiveMode(() => {
          cy.get("#plasmic-app div").should("contain.text", "true");

          cy.contains("Set to false").click();
          cy.get("#plasmic-app div").should("contain.text", "false");

          cy.contains("Set to true").click();
          cy.get("#plasmic-app div").should("contain.text", "true");

          cy.contains("Toggle").click();
          cy.get("#plasmic-app div").should("contain.text", "false");

          cy.contains("Toggle").click();
          cy.get("#plasmic-app div").should("contain.text", "true");

          cy.contains("Clear").click();
          cy.get("#plasmic-app div").should("contain.text", "undefined");
        });
      });
    });
  });
});
