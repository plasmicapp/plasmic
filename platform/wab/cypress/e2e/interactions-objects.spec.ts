import {
  removeCurrentProject,
  setupProjectFromTemplate,
} from "../support/util";

describe("state-management-object-interactions", function () {
  beforeEach(() => {
    setupProjectFromTemplate("state-management");
  });
  afterEach(() => {
    removeCurrentProject();
  });

  it("can create all types of object and array interactions", () => {
    cy.withinStudioIframe(() => {
      cy.switchArena("object interactions").then((framed) => {
        framed.rootElt().contains("Set to").click({ force: true });
        cy.addInteraction("onClick", {
          actionName: "updateVariable",
          args: {
            variable: ["objectVar"],
            operation: "newValue",
            value: `({a: 3, b: 4})`,
          },
        });

        framed.rootElt().contains("Clear variable").click({ force: true });
        cy.addInteraction("onClick", {
          actionName: "updateVariable",
          args: {
            variable: ["objectVar"],
            operation: "clearValue",
          },
        });

        cy.withinLiveMode(() => {
          cy.get("#plasmic-app div").should(
            "contain.text",
            JSON.stringify({ a: 1, b: 2 })
          );

          cy.contains("Set to").click();
          cy.get("#plasmic-app div").should(
            "contain.text",
            JSON.stringify({ a: 3, b: 4 })
          );

          cy.contains("Clear").click();
          cy.get("#plasmic-app div").should("contain.text", "undefined");
        });
      });
      cy.switchArena("array interactions").then((framed) => {
        framed.rootElt().contains("Set to").click({ force: true });
        cy.addInteraction("onClick", {
          actionName: "updateVariable",
          args: {
            variable: ["arrayVar"],
            operation: "newValue",
            value: `[{text: "foo2"},{text: "bar2"}]`,
          },
        });

        framed.rootElt().contains("Remove foo").click({ force: true });
        cy.addInteraction("onClick", {
          actionName: "updateVariable",
          args: {
            variable: ["arrayVar"],
            operation: "splice",
            deleteCount: "1",
          },
          dynamicArgs: {
            startIndex: "currentIndex",
          },
        });

        framed.rootElt().contains("Remove below foo").click({ force: true });
        cy.addInteraction("onClick", {
          actionName: "updateVariable",
          args: {
            variable: ["arrayVar"],
            operation: "splice",
          },
          dynamicArgs: {
            startIndex: "currentIndex",
            deleteCount: "$state.arrayVar.length - currentIndex",
          },
        });

        framed.rootElt().contains("Push element").click({ force: true });
        cy.addInteraction("onClick", {
          actionName: "updateVariable",
          args: {
            variable: ["arrayVar"],
            operation: "push",
            value: `{text: "baz"}`,
          },
        });

        framed.rootElt().contains("Clear variable").click({ force: true });
        cy.addInteraction("onClick", {
          actionName: "updateVariable",
          args: {
            variable: ["arrayVar"],
            operation: "clearValue",
          },
        });

        cy.withinLiveMode(() => {
          cy.get("#plasmic-app div").should("contain.text", "length: 2");

          ["foo", "bar"].forEach((text) =>
            cy.get("#plasmic-app div").should("contain.text", text)
          );

          cy.contains("Push element").click();
          cy.get("#plasmic-app div").should("contain.text", "length: 3");
          ["foo", "bar", "baz"].forEach((text) =>
            cy.get("#plasmic-app div").should("contain.text", text)
          );

          cy.contains("Remove below bar").click();
          cy.get("#plasmic-app div").should("contain.text", "length: 1");
          ["foo"].forEach((text) =>
            cy.get("#plasmic-app div").should("contain.text", text)
          );

          cy.contains("Push element").click();
          cy.get("#plasmic-app div").should("contain.text", "length: 2");
          ["foo", "baz"].forEach((text) =>
            cy.get("#plasmic-app div").should("contain.text", text)
          );

          cy.contains("Remove foo").click();
          cy.get("#plasmic-app div").should("contain.text", "length: 1");
          ["baz"].forEach((text) =>
            cy.get("#plasmic-app div").should("contain.text", text)
          );

          cy.contains("Set to").click();
          cy.get("#plasmic-app div").should("contain.text", "length: 2");
          ["foo2", "bar2"].forEach((text) =>
            cy.get("#plasmic-app div").should("contain.text", text)
          );
        });
      });
    });
  });
});
