import {
  removeCurrentProject,
  setupProjectFromTemplate,
} from "../support/util";

describe("state-management-custom-interactions", function () {
  beforeEach(() => {
    setupProjectFromTemplate("state-management");
  });
  afterEach(() => {
    removeCurrentProject();
  });

  it("can create page navigation and custom function interactions", () => {
    cy.withinStudioIframe(() => {
      cy.switchArena("page navigation interactions").then((framed) => {
        framed.rootElt().contains("Go to page1").click({ force: true });
        cy.addInteraction("onClick", {
          actionName: "navigation",
          args: {
            destination: "/page1",
          },
        });

        framed.rootElt().contains("Go to page2").click({ force: true });
        cy.addInteraction("onClick", {
          actionName: "navigation",
          args: {},
          dynamicArgs: {
            destination: "`/page2/foo`",
          },
        });

        framed
          .rootElt()
          .contains("Go to page2 (dynamic value)")
          .click({ force: true });
        cy.addInteraction("onClick", {
          actionName: "navigation",
          args: {},
          dynamicArgs: {
            destination: "`/page2/${$state.count}`",
          },
        });

        cy.withinLiveMode(() => {
          cy.contains("Go to page1").click();
          cy.get("#plasmic-app div").should("contain.text", "This is page 1");
          cy.contains("Go back").click();

          cy.contains("Go to page2").click();
          cy.get("#plasmic-app div").should(
            "contain.text",
            "This is page 2:  foo"
          );
          cy.contains("Go back").click();

          cy.contains("Increment").click();
          cy.contains("Go to page2 (dynamic value)").click();
          cy.get("#plasmic-app div").should(
            "contain.text",
            "This is page 2:  6"
          );
          cy.contains("Go back").click();

          cy.contains("Increment").click();
          cy.contains("Increment").click();
          cy.contains("Go to page2 (dynamic value)").click();
          cy.get("#plasmic-app div").should(
            "contain.text",
            "This is page 2:  7"
          );
          cy.contains("Go back").click();
        });
      });
      cy.switchArena("custom function interactions").then((framed) => {
        framed.rootElt().contains("custom increment").click({ force: true });
        cy.addInteraction("onClick", {
          actionName: "customFunction",
          args: {
            customFunction: `$state.count++;`,
          },
        });

        cy.withinLiveMode(() => {
          cy.contains("custom increment").click();
          cy.get("#plasmic-app div").should("contain.text", "6");
        });
      });
    });
  });
});
