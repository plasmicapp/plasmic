import {
  removeCurrentProject,
  setupProjectFromTemplate,
} from "../support/util";

describe("state-management-numbers-interactions", function () {
  beforeEach(() => {
    setupProjectFromTemplate("state-management");
  });
  afterEach(() => {
    removeCurrentProject();
  });

  it("can create all types of number interactions", () => {
    cy.withinStudioIframe(() => {
      cy.switchArena("number interactions").then((framed) => {
        framed.rootElt().contains("Set to").click({ force: true });
        cy.addInteraction("onClick", {
          actionName: "updateVariable",
          args: {
            variable: ["numberVar"],
            operation: "newValue",
            value: "10",
          },
        });

        framed.rootElt().contains("Increment").click({ force: true });
        cy.addInteraction("onClick", {
          actionName: "updateVariable",
          args: {
            variable: ["numberVar"],
            operation: "increment",
          },
        });

        framed.rootElt().contains("Decrement").click({ force: true });
        cy.addInteraction("onClick", {
          actionName: "updateVariable",
          args: {
            variable: ["numberVar"],
            operation: "decrement",
          },
        });

        framed.rootElt().contains("Clear variable").click({ force: true });
        cy.addInteraction("onClick", {
          actionName: "updateVariable",
          args: {
            variable: ["numberVar"],
            operation: "clearValue",
          },
        });

        cy.withinLiveMode(() => {
          cy.get("#plasmic-app div").should("contain.text", "0");
          cy.get("#plasmic-app div").should(
            "contain.text",
            JSON.stringify({ numberVar: 0 })
          );

          cy.contains("Set to").click();
          cy.get("#plasmic-app div").should("contain.text", "10");
          cy.get("#plasmic-app div").should(
            "contain.text",
            JSON.stringify({ numberVar: 10 })
          );

          cy.contains("Increment").click();
          cy.get("#plasmic-app div").should("contain.text", "11");
          cy.get("#plasmic-app div").should(
            "contain.text",
            JSON.stringify({ numberVar: 11 })
          );

          cy.contains("Decrement").click();
          cy.get("#plasmic-app div").should("contain.text", "10");
          cy.get("#plasmic-app div").should(
            "contain.text",
            JSON.stringify({ numberVar: 10 })
          );

          cy.contains("Clear").click();
          cy.get("#plasmic-app div").should("contain.text", JSON.stringify({}));
        });
      });
    });
  });
});
