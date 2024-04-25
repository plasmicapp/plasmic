import { cloneDeep } from "lodash";
import { Framed, getFormValue, removeCurrentProject } from "../../support/util";

describe("simplified", function () {
  beforeEach(() => {
    cy.setupProjectWithHostlessPackages({
      hostLessPackagesInfo: [
        {
          name: "antd5",
          npmPkg: ["@plasmicpkgs/antd5"],
        },
      ],
    });
  });

  afterEach(() => {
    removeCurrentProject();
  });

  it("can create/add/remove form items in simplified mode", function () {
    cy.withinStudioIframe(() => {
      cy.createNewComponent("Simplified Form").then((framed: Framed) => {
        cy.addState({
          name: "submittedData",
          variableType: "object",
          accessType: "private",
          initialValue: undefined,
        });
        cy.insertFromAddDrawer("plasmic-antd5-form");
        cy.addInteraction("onFinish", {
          actionName: "updateVariable",
          args: {
            variable: ["submittedData"],
            value: "$state.form.value",
          },
        });
        cy.addFormItem("formItems", { label: "Field1", name: "field1" });
        cy.addFormItem("formItems", {
          label: "Field2",
          name: "field2",
          initialValue: "hello",
        });
        const expectedFormItems = [
          { name: "name", label: "Name", type: "text" },
          { name: "message", label: "Message", type: "Text Area" },
          { name: "field1", label: "Field1", type: "text" },
          { name: "field2", label: "Field2", type: "text", value: "hello" },
        ];
        cy.checkFormValuesInCanvas(expectedFormItems, framed);
        cy.insertFromAddDrawer("Text");
        cy.bindTextContentToCustomCode(
          "JSON.stringify($state.submittedData, Object.keys($state.submittedData).sort())"
        );
        cy.withinLiveMode(() => {
          cy.checkFormValuesInLiveMode(expectedFormItems);

          //submit form
          cy.get("#plasmic-app div").find("button").click();
          cy.get("#plasmic-app div").contains(getFormValue(expectedFormItems));

          const liveModeExpectedFormItems = cloneDeep(expectedFormItems);
          liveModeExpectedFormItems[0].value = "foo";
          liveModeExpectedFormItems[1].value = "bar";

          cy.updateFormValuesLiveMode({
            inputs: { name: "foo", message: "bar" },
          });
          cy.checkFormValuesInLiveMode(liveModeExpectedFormItems);
          cy.get("#plasmic-app div").find("button").click();
          cy.get("#plasmic-app div").contains(
            getFormValue(liveModeExpectedFormItems)
          );
        });

        cy.selectTreeNode(["Form"]);
        cy.removeItemFromArrayProp("formItems", 0);
        const expectedFormItems2 = cloneDeep(expectedFormItems);
        expectedFormItems2.splice(0, 1);
        cy.checkFormValuesInCanvas(expectedFormItems2, framed);
        cy.withinLiveMode(() => {
          cy.checkFormValuesInLiveMode(expectedFormItems2);

          //submit form
          cy.get("#plasmic-app div").find("button").click();
          cy.get("#plasmic-app div").contains(getFormValue(expectedFormItems2));

          const liveModeExpectedFormItems = cloneDeep(expectedFormItems2);
          liveModeExpectedFormItems[0].value = "foo";
          liveModeExpectedFormItems[1].value = "bar";
          liveModeExpectedFormItems[2].value = "baz";

          cy.updateFormValuesLiveMode({
            inputs: {
              message: "foo",
              field1: "bar",
              field2: "{selectall}{del}baz",
            },
          });
          cy.checkFormValuesInLiveMode(liveModeExpectedFormItems);
          cy.get("#plasmic-app div").find("button").click();
          cy.get("#plasmic-app div").contains(
            getFormValue(liveModeExpectedFormItems)
          );
        });

        cy.checkNoErrors();
      });
    });
  });
});
