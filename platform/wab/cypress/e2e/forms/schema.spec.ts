import {
  deleteDataSourceOfCurrentTest,
  Framed,
  removeCurrentProject,
} from "../../support/util";

describe("schema", function () {
  beforeEach(() => {
    cy.createFakeDataSource();
    cy.setupProjectWithHostlessPackages({
      hostLessPackagesInfo: [
        {
          name: "antd5",
          npmPkg: ["@plasmicpkgs/antd5"],
        },
      ],
      devFlags: {
        schemaDrivenForms: true,
      },
    });
  });

  afterEach(() => {
    deleteDataSourceOfCurrentTest();
    removeCurrentProject();
  });

  it("can use schema forms for new entry", function () {
    cy.withinStudioIframe(() => {
      cy.createNewComponent("Schema Form").then((framed: Framed) => {
        cy.insertFromAddDrawer("plasmic-antd5-form");

        cy.contains("Connect to Table").click();

        cy.wait(1000);
        cy.selectDataPlasmicProp("formType", "New Entry");
        cy.pickIntegration();
        cy.setSelectByLabel("dataTablePickerTable", "athletes");
        cy.contains("Save").click();

        const expectedFormItems = [
          { name: "firstName", label: "firstName", type: "text" },
          { name: "lastName", label: "lastName", type: "text" },
          { name: "sport", label: "sport", type: "text" },
          { name: "age", label: "age", type: "number" },
        ];

        cy.checkFormValuesInCanvas(expectedFormItems, framed);

        cy.switchToComponentDataTab();
        cy.addComponentQuery();
        cy.setSelectByLabel("data-source-modal-pick-resource-btn", "athletes");
        cy.saveDataSourceModal();

        cy.insertFromAddDrawer("Text");
        cy.bindTextContentToCustomCode("JSON.stringify($queries.query.data)");

        cy.withinLiveMode(() => {
          cy.checkFormValuesInLiveMode(expectedFormItems);

          cy.updateFormValuesLiveMode({
            inputs: {
              firstName: "Foo",
              lastName: "Bar",
              sport: "Baz",
              age: "123",
            },
          });

          cy.get("#plasmic-app div").contains("Submit").click();
          cy.get("#plasmic-app div").contains(
            JSON.stringify({
              firstName: "Foo",
              lastName: "Bar",
              sport: "Baz",
              age: 123,
            })
          );
        });

        cy.checkNoErrors();
      });
    });
  });

  it("can use schema forms for update entry", function () {
    cy.withinStudioIframe(() => {
      cy.createNewComponent("Schema Form").then((framed: Framed) => {
        cy.insertFromAddDrawer("plasmic-antd5-form");

        cy.contains("Connect to Table").click();

        cy.wait(1000);
        cy.selectDataPlasmicProp("formType", "Update Entry");
        cy.pickIntegration();
        cy.setSelectByLabel("dataTablePickerTable", "athletes");
        cy.setSelectByLabel("dataTablePickerLookupField", "id");
        cy.setDataPlasmicProp("id", "1");
        cy.wait(2000);
        cy.contains("Save").click();

        const expectedFormItems = [
          { name: "firstName", label: "firstName", type: "text" },
          { name: "lastName", label: "lastName", type: "text" },
          { name: "sport", label: "sport", type: "text" },
          { name: "age", label: "age", type: "number" },
        ];

        cy.checkFormValuesInCanvas(expectedFormItems, framed);

        cy.switchToComponentDataTab();
        cy.addComponentQuery();
        cy.setSelectByLabel("data-source-modal-pick-resource-btn", "athletes");
        cy.saveDataSourceModal();

        cy.insertFromAddDrawer("Text");
        cy.bindTextContentToCustomCode("JSON.stringify($queries.query.data)");

        cy.withinLiveMode(() => {
          cy.checkFormValuesInLiveMode(expectedFormItems);

          cy.updateFormValuesLiveMode({
            inputs: {
              firstName: "{selectall}{del}Foo",
              lastName: "{selectall}{del}Bar",
              sport: "{selectall}{del}Baz",
              age: "{selectall}{del}123",
            },
          });

          cy.get("#plasmic-app div").contains("Submit").click();
          cy.get("#plasmic-app div").contains(
            JSON.stringify({
              id: 1,
              firstName: "Foo",
              lastName: "Bar",
              sport: "Baz",
              age: 123,
            })
          );
        });

        cy.checkNoErrors();
      });
    });
  });

  it("switching table resets fields/onFinish", function () {
    cy.withinStudioIframe(() => {
      cy.createNewComponent("Schema Form").then((framed: Framed) => {
        cy.insertFromAddDrawer("plasmic-antd5-form");

        cy.contains("Connect to Table").click();

        cy.wait(1000);
        cy.selectDataPlasmicProp("formType", "New Entry");
        cy.pickIntegration();
        cy.setSelectByLabel("dataTablePickerTable", "athletes");
        cy.contains("Save").click();

        const expectedFormItems1 = [
          { name: "firstName", label: "firstName", type: "text" },
          { name: "lastName", label: "lastName", type: "text" },
          { name: "sport", label: "sport", type: "text" },
          { name: "age", label: "age", type: "number" },
        ];

        cy.checkFormValuesInCanvas(expectedFormItems1, framed);

        cy.switchToComponentDataTab();
        cy.addComponentQuery();
        cy.setSelectByLabel("data-source-modal-pick-resource-btn", "athletes");
        cy.saveDataSourceModal();

        cy.insertFromAddDrawer("Text");
        cy.bindTextContentToCustomCode("JSON.stringify($queries.query.data)");

        cy.withinLiveMode(() => {
          cy.checkFormValuesInLiveMode(expectedFormItems1);

          cy.updateFormValuesLiveMode({
            inputs: {
              firstName: "Foo",
              lastName: "Bar",
              sport: "Baz",
              age: "123",
            },
          });

          cy.get("#plasmic-app div").contains("Submit").click();
          cy.get("#plasmic-app div").contains(
            JSON.stringify({
              firstName: "Foo",
              lastName: "Bar",
              sport: "Baz",
              age: 123,
            })
          );
        });

        cy.selectTreeNode(["root", "Form"]);
        cy.get(`[data-test-id="form-data"]`).click();
        cy.setSelectByLabel("dataTablePickerTable", "products");
        cy.contains("Save").click();
        cy.contains("Confirm").click();

        const expectedFormItems2 = [
          { name: "id", label: "id", type: "text" },
          { name: "name", label: "name", type: "text" },
          { name: "price", label: "price", type: "number" },
        ];

        cy.checkFormValuesInCanvas(expectedFormItems2, framed);

        cy.switchToComponentDataTab();
        cy.addComponentQuery();
        cy.setSelectByLabel("data-source-modal-pick-resource-btn", "products");
        cy.saveDataSourceModal();

        cy.insertFromAddDrawer("Text");
        cy.bindTextContentToCustomCode("JSON.stringify($queries.query2.data)");

        cy.withinLiveMode(() => {
          cy.checkFormValuesInLiveMode(expectedFormItems2);

          cy.updateFormValuesLiveMode({
            inputs: {
              name: "Acai",
              price: "15",
            },
          });

          cy.get("#plasmic-app div").contains("Submit").click();
          cy.get("#plasmic-app div").contains(
            JSON.stringify({ name: "Acai", price: 15 })
          );
        });

        cy.checkNoErrors();
      });
    });
  });
});
