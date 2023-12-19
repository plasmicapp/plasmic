import { v4 } from "uuid";
import {
  Framed,
  removeCurrentProject,
  setupNewProject,
} from "../../support/util";

describe("HTTP Data Source", () => {
  let dsname = "";
  beforeEach(() => {
    dsname = `HTTP ${v4()}`;
    cy.createDataSource({
      source: "http",
      name: dsname,
      settings: {
        baseUrl: "https://jsonplaceholder.typicode.com/",
        commonHeaders: {
          "Content-Type": "application/json",
        },
      },
    });
    return setupNewProject({
      name: "HTTP Data Source",
    });
  });

  afterEach(() => {
    cy.deleteDataSourceOfCurrentTest();
    removeCurrentProject();
  });

  it("http basic queries", () => {
    cy.withinStudioIframe(() => {
      const USER_NAME = "Leanne Graham";
      cy.createNewPageInOwnArena("Homepage").then((page: Framed) => {
        // Creating customers query ordered by country
        cy.switchToComponentDataTab();
        cy.addComponentQuery();
        cy.pickDataSource(dsname);
        cy.setDataPlasmicProp("data-source-modal-path", "users", {
          clickPosition: "right",
        });
        cy.setDataPlasmicProp("data-source-modal-params-key", "name");
        cy.setDataPlasmicProp("data-source-modal-params-value", USER_NAME);
        cy.saveDataSourceModal();
        // Add text to render the user name
        cy.insertFromAddDrawer("Heading");
        cy.get(`[data-test-id="text-content"] label`).rightclick();
        cy.contains("Use dynamic value").click();
        cy.selectPathInDataPicker(["query", "data", "response", "0", "name"]);
        // Verify render on design mode and live frame
        page.rootElt().should("contain", USER_NAME);

        // Create state to test $steps result of operations
        cy.addState({
          name: "name",
          variableType: "text",
          accessType: "private",
          initialValue: undefined,
        }).wait(200);
        cy.insertFromAddDrawer("Text");
        cy.bindTextContentToObjectPath(["name"]);
        cy.addState({
          name: "statusCode",
          variableType: "number",
          accessType: "private",
          initialValue: undefined,
        }).wait(200);
        cy.insertFromAddDrawer("Text");
        cy.bindTextContentToObjectPath(["statusCode"]);

        // // Create button with Post
        cy.insertFromAddDrawer("Button");
        cy.bindTextContentToCustomCode(`"Post"`);
        cy.addInteraction("onClick", [
          {
            actionName: "dataSourceOp",
            args: {
              dataSourceOp: {
                integration: dsname,
                args: {
                  operation: { value: "post" },
                  "data-source-modal-path": {
                    value: "users",
                    opts: { clickPosition: "right" },
                  },
                  "data-source-modal-body": {
                    inputType: "raw",
                    isDynamicValue: true,
                    value: `({name: "test",})`,
                  },
                },
              },
            },
          },
          {
            actionName: "updateVariable",
            args: {
              variable: ["name"],
              operation: "newValue",
              value: `($steps.httpPost.data.response.name)`,
            },
          },
          {
            actionName: "updateVariable",
            args: {
              variable: ["statusCode"],
              operation: "newValue",
              value: `($steps.httpPost.data.statusCode)`,
            },
          },
        ]);

        cy.withinLiveMode(() => {
          cy.contains(USER_NAME).should("exist");
          cy.contains("Post").click();
          cy.wait(5000);
          cy.contains("test").should("exist");
          cy.contains("201").should("exist");
        });
      });

      cy.checkNoErrors();
    });
  });
});
