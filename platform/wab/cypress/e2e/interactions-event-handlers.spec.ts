import {
  removeCurrentProject,
  setupProjectFromTemplate,
} from "../support/util";

describe("interactions-event-handlers", function () {
  beforeEach(() => {
    setupProjectFromTemplate("state-management");
  });
  afterEach(() => {
    removeCurrentProject();
  });

  it("can create event handler interactions", () => {
    cy.withinStudioIframe(() => {
      cy.switchArena("invoke event handler interactions").then((framed) => {
        cy.createNewEventHandler("onIncrement", [
          { name: "val", type: "num" },
          { name: "message", type: "text" },
        ]);
        framed
          .rootElt()
          .contains("invoke event handler")
          .click({ force: true });
        cy.addInteraction("onClick", {
          actionName: "invokeEventHandler",
          args: {
            eventRef: `onIncrement`,
            args: {
              val: "$props.defaultCount+1",
              message: "`Last number: ${$props.defaultCount}`",
            },
          },
        });

        cy.switchArena("use invoke event handler").then((framed2) => {
          framed2
            .rootElt()
            .contains("invoke event handler")
            .click({ force: true });
          cy.addInteraction("onIncrement", [
            {
              actionName: "updateVariable",
              args: {
                variable: ["count"],
                operation: "newValue",
                value: "val",
              },
            },
            {
              actionName: "updateVariable",
              args: {
                variable: ["lastMessage"],
                operation: "newValue",
                value: "message",
              },
            },
          ]);

          cy.withinLiveMode(() => {
            cy.get("#plasmic-app div").should("contain.text", "5");
            cy.get("#plasmic-app div").should("contain.text", "none");

            cy.contains("invoke event handler").click();
            cy.get("#plasmic-app div").should("contain.text", "6");
            cy.get("#plasmic-app div").should("contain.text", "Last number: 5");

            cy.contains("invoke event handler").click();
            cy.get("#plasmic-app div").should("contain.text", "7");
            cy.get("#plasmic-app div").should("contain.text", "Last number: 6");
          });
        });
      });
    });
  });
});
