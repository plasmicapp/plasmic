import Random from "prando";
import {
  removeCurrentProject,
  setupProjectFromTemplate,
} from "../support/util";

describe("interactions-variants", function () {
  beforeEach(() => {
    setupProjectFromTemplate("state-management");
  });
  afterEach(() => {
    removeCurrentProject();
  });

  it("can create all types of toggle and single variant interactions", () => {
    cy.withinStudioIframe(() => {
      cy.switchArena("toggle variant interactions").then((framed) => {
        framed.rootElt().contains("toggle").click({ force: true });
        cy.addInteraction("onClick", {
          actionName: "updateVariant",
          args: {
            vgroup: "advanced",
            operation: "toggleVariant",
          },
        });

        framed.rootElt().contains("activate variant").click({ force: true });
        cy.addInteraction("onClick", {
          actionName: "updateVariant",
          args: {
            vgroup: "advanced",
            operation: "activateVariant",
          },
        });

        framed.rootElt().contains("deactivate variant").click({ force: true });
        cy.addInteraction("onClick", {
          actionName: "updateVariant",
          args: {
            vgroup: "advanced",
            operation: "deactivateVariant",
          },
        });
        cy.withinLiveMode(() => {
          cy.get("#plasmic-app div").should("contain.text", "no variant");

          cy.contains("activate").click();
          cy.get("#plasmic-app div").should("contain.text", "toggle variant");

          cy.contains("deactivate").click();
          cy.get("#plasmic-app div").should("contain.text", "no variant");

          cy.contains("deactivate").click();
          cy.get("#plasmic-app div").should("contain.text", "no variant");

          cy.get("button").contains("toggle").click();
          cy.get("#plasmic-app div").should("contain.text", "toggle variant");

          cy.contains("activate").click();
          cy.get("#plasmic-app div").should("contain.text", "toggle variant");

          cy.get("button").contains("toggle").click();
          cy.get("#plasmic-app div").should("contain.text", "no variant");
        });
      });
      cy.switchArena("single variant interactions").then((framed) => {
        framed.rootElt().contains("Set to red").click({ force: true });
        cy.addInteraction("onClick", {
          actionName: "updateVariant",
          args: {
            vgroup: "color",
            operation: "newValue",
            value: "red",
          },
        });

        framed.rootElt().contains("Set to green").click({ force: true });
        cy.addInteraction("onClick", {
          actionName: "updateVariant",
          args: {
            vgroup: "color",
            operation: "newValue",
            value: "green",
          },
        });

        framed.rootElt().contains("Set to blue").click({ force: true });
        cy.addInteraction("onClick", {
          actionName: "updateVariant",
          args: {
            vgroup: "color",
            operation: "newValue",
            value: "blue",
          },
        });

        framed.rootElt().contains("clear variant").click({ force: true });
        cy.addInteraction("onClick", {
          actionName: "updateVariant",
          args: {
            vgroup: "color",
            operation: "clearValue",
          },
        });

        cy.withinLiveMode(() => {
          cy.get("#plasmic-app div").should("contain.text", "none");

          cy.contains("Set to red").click();
          cy.get("#plasmic-app div").should("contain.text", "red variant");

          cy.contains("Set to green").click();
          cy.get("#plasmic-app div").should("contain.text", "green variant");

          cy.contains("Set to blue").click();
          cy.get("#plasmic-app div").should("contain.text", "blue variant");

          cy.contains("clear variant").click();
          cy.get("#plasmic-app div").should("contain.text", "none");
        });
      });
    });
  });
  it("can create all types of multi variant interactions", () => {
    cy.withinStudioIframe(() => {
      cy.switchArena("multi variant interactions").then((framed) => {
        ["newValue", "multiToggle", "multiActivate", "multiDeactivate"].forEach(
          (op) => {
            [["foo"], ["bar"], ["foo", "bar"]].forEach((vgroup) => {
              framed
                .rootElt()
                .find(`[data-test-id="${op}"]`)
                .contains(JSON.stringify(vgroup))
                .click({ force: true });
              cy.addInteraction("onClick", {
                actionName: "updateVariant",
                isMultiVariant: true,
                args: {
                  vgroup: "multiVariant",
                  operation: `${op}`,
                  value: vgroup,
                },
              });
            });
          }
        );
        framed
          .rootElt()
          .find(`[data-test-id="clearValue"]`)
          .contains("Clear variant")
          .click({ force: true });
        cy.addInteraction("onClick", {
          actionName: "updateVariant",
          isMultiVariant: true,
          args: {
            vgroup: "multiVariant",
            operation: `clearValue`,
          },
        });

        const variantOptions = ["foo", "bar"];
        let activatedVariants: string[] = [];
        const newVariants = (variants: string[]) => variants;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const clearVariants = (variants: string[]) => [];
        const toggleVariants = (variants: string[]) =>
          variantOptions.filter(
            (v) =>
              (variants.includes(v) && !activatedVariants.includes(v)) ||
              (!variants.includes(v) && activatedVariants.includes(v))
          );
        const activateVariants = (variants: string[]) =>
          variantOptions.filter(
            (v) => activatedVariants.includes(v) || variants.includes(v)
          );
        const deactivateVariants = (variants: string[]) =>
          variantOptions.filter(
            (v) => activatedVariants.includes(v) && !variants.includes(v)
          );

        const rng = new Random(42);
        cy.withinLiveMode(() => {
          cy.get("#plasmic-app div").should("contain.text", "no variant");
          cy.get("#plasmic-app div").should("contain.text", JSON.stringify([]));

          const operations = [
            newVariants,
            clearVariants,
            toggleVariants,
            activateVariants,
            deactivateVariants,
          ];
          const operationsName = [
            "newValue",
            "clearValue",
            "multiToggle",
            "multiActivate",
            "multiDeactivate",
          ];
          const variantCombinations = [["foo"], ["bar"], ["foo", "bar"]];

          for (let i = 0; i < 50; i++) {
            const operationId = Math.floor(rng.next() * operations.length);
            const combinationId = Math.floor(
              rng.next() * variantCombinations.length
            );
            if (operationId === 1) {
              cy.get(
                `#plasmic-app div [data-test-id="${operationsName[operationId]}"]`
              )
                .contains("Clear variant")
                .click();
            } else {
              cy.get(
                `#plasmic-app div [data-test-id="${operationsName[operationId]}"]`
              )
                .contains(JSON.stringify(variantCombinations[combinationId]))
                .click();
            }

            activatedVariants = operations[operationId]!(
              variantCombinations[combinationId]
            );
            if (activatedVariants.length === 0) {
              cy.get("#plasmic-app div").should("contain.text", "no variant");
            } else {
              for (const v of activatedVariants) {
                cy.get("#plasmic-app div").should(
                  "contain.text",
                  `${v} variant`
                );
              }
            }
            cy.get("#plasmic-app div").should(
              "contain.text",
              JSON.stringify(activatedVariants)
            );
          }
        });
      });
    });
  });
});
