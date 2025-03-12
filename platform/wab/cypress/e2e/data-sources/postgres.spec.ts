import { v4 } from "uuid";
import { DevFlagsType } from "../../../src/wab/shared/devflags";
import { HORIZ_CONTAINER_CAP } from "../../../src/wab/shared/Labels";
import {
  createTutorialDataSource,
  Framed,
  removeCurrentProject,
  setupNewProject,
} from "../../support/util";

const TUTORIAL_DB_TYPE = "northwind";

describe("Postgres Data Source", () => {
  let dsname = "";
  let origDevFlags: DevFlagsType;
  beforeEach(() => {
    cy.getDevFlags().then((devFlags) => {
      origDevFlags = devFlags;
      cy.upsertDevFlags({
        ...origDevFlags,
        plexus: false,
      });
    });
    dsname = `TutorialDB ${v4()}`;
    createTutorialDataSource(TUTORIAL_DB_TYPE, dsname);
    return setupNewProject({
      name: "Postgres Data Source",
    });
  });

  afterEach(() => {
    cy.deleteDataSourceOfCurrentTest();
    removeCurrentProject();
    if (origDevFlags) {
      cy.upsertDevFlags(origDevFlags);
    }
  });

  it("postgres basic queries", () => {
    cy.withinStudioIframe(() => {
      const customers = [
        "Maria Anders",
        "Ana Trujillo",
        "Antonio Moreno",
        "Thomas Hardy",
        "Christina Berglund",
      ];
      cy.createNewPageInOwnArena("Homepage").then((page: Framed) => {
        // Creating customers query ordered by country
        cy.switchToComponentDataTab();
        cy.addComponentQuery();
        cy.pickDataSource(dsname);
        cy.selectDataPlasmicProp(
          "data-source-modal-pick-resource-btn",
          "customers"
        );
        cy.selectDataPlasmicProp("data-source-sort", "customer_id");
        cy.setDataPlasmicProp("data-source-pagination-size", "5");
        cy.saveDataSourceModal();
        // Add repeated stack with list of contact_name from $queries.query
        cy.insertFromAddDrawer(HORIZ_CONTAINER_CAP);
        cy.repeatOnCustomCode("$queries.query.data");
        cy.insertFromAddDrawer("Heading");
        cy.bindTextContentToObjectPath(["currentItem", "contact_name"]);
        // Verify render on design mode and live frame
        customers.forEach((c) => {
          page.rootElt().should("contain", c);
        });
        cy.withinLiveMode(() => {
          customers.forEach((c) => {
            cy.contains(c).should("exist");
          });
        });
      });
      // Verify it works on focused arenas
      cy.waitForNewFrame(() => cy.turnOffDesignMode()).then((page: Framed) => {
        customers.forEach((c) => {
          page.rootElt().should("contain", c);
        });
      });

      cy.refreshFocusedArena();
      cy.getFramed().then((page: Framed) => {
        customers.forEach((c) => {
          page.rootElt().should("contain", c);
        });

        cy.focusFrameRoot(page);
        // Create state to test $steps result of operations
        cy.addState({
          name: "insertedId",
          variableType: "text",
          accessType: "private",
          initialValue: undefined,
        }).wait(200);
        cy.insertFromAddDrawer("Text");
        cy.bindTextContentToObjectPath(["insertedId"]);

        // Create button with Update by operation
        cy.insertFromAddDrawer("Button");
        cy.bindTextContentToCustomCode(`"Update"`);
        cy.addInteraction("onClick", [
          {
            actionName: "dataSourceOp",
            args: {
              dataSourceOp: {
                integration: dsname,
                args: {
                  operation: { value: "updateById" },
                  resource: { value: "customers" },
                  "data-source-modal-keys-customer_id-json-editor": {
                    isDynamicValue: true,
                    value: "$queries.query.data[0].customer_id",
                  },
                  "data-source-modal-variables-contact_name-json-editor": {
                    value: "New Name",
                  },
                },
              },
            },
          },
          {
            actionName: "updateVariable",
            args: {
              variable: ["insertedId"],
              operation: "newValue",
              value: `($steps.tutorialdbUpdateById.data[0].customer_id)`,
            },
          },
        ]);
        // Create button with Create operation
        cy.insertFromAddDrawer("Button");
        cy.bindTextContentToCustomCode(`"Create"`);
        cy.addInteraction("onClick", [
          {
            actionName: "dataSourceOp",
            args: {
              dataSourceOp: {
                integration: dsname,
                args: {
                  operation: { value: "create" },
                  resource: { value: "customers" },
                  "data-source-modal-variables-company_name-json-editor": {
                    value: "Testing",
                  },
                  "data-source-modal-variables-contact_name-json-editor": {
                    value: "Created Name",
                  },
                  "data-source-modal-variables-city-json-editor": {
                    value: "Aaa",
                  },
                  "data-source-modal-variables-customer_id-json-editor": {
                    value: "AAAAA",
                  },
                },
              },
            },
          },
          {
            actionName: "updateVariable",
            args: {
              variable: ["insertedId"],
              operation: "newValue",
              value: `($steps.tutorialdbCreate.data[0].customer_id)`,
            },
          },
        ]);
        cy.withinLiveMode(() => {
          cy.contains("Update").click();
          cy.wait(5000);
          customers[0] = "New Name";
          customers.forEach((c) => {
            cy.contains(c).should("exist");
          });
          cy.contains("ALFKI").should("exist");
          cy.contains("Create").click();
          cy.wait(5000);
          customers[4] = "Created Name";
          customers.forEach((c) => {
            cy.contains(c).should("exist");
          });
          cy.contains("AAAAA").should("exist");
        });
      });
      cy.checkNoErrors();
    });
  });
});
