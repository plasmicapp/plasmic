import {
  removeCurrentProject,
  setupProjectFromTemplate,
} from "../support/util";

describe("state-management-conditional-actions", function () {
  beforeEach(() => {
    setupProjectFromTemplate("state-management");
  });
  afterEach(() => {
    removeCurrentProject();
  });

  it("can create conditional actions", () => {
    cy.withinStudioIframe(() => {
      cy.switchArena("conditional actions").then((framed) => {
        cy.focusFrameRoot(framed);

        framed.rootElt().contains("Run interaction").click({ force: true });
        cy.addInteraction("onClick", [
          {
            actionName: "updateVariable",
            args: {
              variable: ["action1"],
              operation: "increment",
            },
          },
          {
            actionName: "updateVariable",
            args: {
              variable: ["action2"],
              operation: "increment",
            },
            mode: "when",
            conditionalExpr: "$state.action1 % 2",
          },
          {
            actionName: "updateVariable",
            args: {
              variable: ["action3"],
              operation: "increment",
            },
            mode: "never",
          },
        ]);

        const expected = [0, 0, 0];
        cy.withinLiveMode(() => {
          const checkIfCountersAreEqual = () => {
            for (let i = 0; i < expected.length; i++) {
              cy.get("#plasmic-app div").should(
                "contain.text",
                `action${i + 1}: ${expected[i]}`
              );
            }
          };
          const updateExpectedCounters = () => {
            expected[0]++;
            if (expected[0] % 2) {
              expected[1]++;
            }
          };

          for (let i = 0; i < 10; i++) {
            cy.contains("Run interaction").click();
            updateExpectedCounters();
            checkIfCountersAreEqual();
          }
        });
      });
      cy.checkNoErrors();
    });
  });
});
