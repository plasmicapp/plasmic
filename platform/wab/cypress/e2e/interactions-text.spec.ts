import {
  removeCurrentProject,
  setupProjectFromTemplate,
} from "../support/util";

describe("state-management-text-interactions", function () {
  beforeEach(() => {
    setupProjectFromTemplate("state-management");
  });
  afterEach(() => {
    removeCurrentProject();
  });

  it("can create all types of text interactions", () => {
    cy.withinStudioIframe(() => {
      cy.switchArena("text interactions").then((framed) => {
        framed.rootElt().contains("Set to").click({ force: true });
        cy.addInteraction("onClick", {
          actionName: "updateVariable",
          args: {
            variable: ["textVar"],
            operation: "newValue",
            value: `"goodbye"`,
          },
        });

        framed.rootElt().contains("Clear variable").click({ force: true });
        cy.addInteraction("onClick", {
          actionName: "updateVariable",
          args: {
            variable: ["textVar"],
            operation: "clearValue",
          },
        });

        cy.withinLiveMode(() => {
          cy.get("#plasmic-app div").should("contain.text", "hello");

          cy.contains("Set to").click();
          cy.get("#plasmic-app div").should("contain.text", "goodbye");

          cy.contains("Clear").click();
          cy.get("#plasmic-app div").should("contain.text", "undefined");
        });
      });
    });
  });
});
