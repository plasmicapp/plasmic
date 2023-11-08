import { cloneDeep } from "lodash";
import { Framed, getFormValue, removeCurrentProject } from "../../support/util";

describe.skip("simplified-all-form-items", function () {
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

  it("can create all types of form items", function () {
    cy.withinStudioIframe(() => {
      cy.createNewPage("Simplified Form").then((framed: Framed) => {
        cy.insertFromAddDrawer("plasmic-antd5-form");
        // remove default form items (name, message)
        cy.removeItemFromArrayProp("formItems", 0);
        cy.removeItemFromArrayProp("formItems", 0);

        const expectedFormItems: {
          label: string;
          name: string;
          type: string;
          options?: string[];
          value: string | number;
        }[] = [
          {
            label: "Text Field",
            name: "textField",
            type: "Text",
            value: "text field value",
          },
          {
            label: "Text Area",
            name: "textArea",
            type: "Text Area",
            value: "text area value",
          },
          {
            label: "Password",
            name: "password",
            type: "Password",
            value: "password value",
          },
          {
            label: "Number",
            name: "number",
            type: "Number",
            value: 123,
          },
          {
            label: "Select",
            name: "select",
            type: "Select",
            options: ["opt1", "opt2"],
            value: "opt2",
          },
          {
            label: "Radio Group",
            name: "radioGroup",
            type: "Radio Group",
            options: ["radio1", "radio2"],
            value: "radio1",
          },
        ];
        for (const formItem of expectedFormItems) {
          cy.addFormItem("formItems", {
            label: formItem.label,
            name: formItem.name,
            inputType: formItem.type,
            initialValue: `${formItem.value}`,
            ...(formItem.options
              ? {
                  options: formItem.options,
                }
              : {}),
          });
        }

        cy.checkFormValuesInCanvas(expectedFormItems, framed);

        cy.insertFromAddDrawer("Text");
        cy.bindTextContentToCustomCode(
          "JSON.stringify($state.form.value, Object.keys($state.form.value).sort())"
        );

        cy.getSelectedElt().should(
          "contain.text",
          getFormValue(expectedFormItems)
        );

        cy.withinLiveMode(() => {
          cy.checkFormValuesInLiveMode(expectedFormItems);

          const liveModeExpectedFormItems = cloneDeep(expectedFormItems);
          cy.updateFormValuesLiveMode({
            inputs: {
              textField: "{selectall}{del}new text",
              password: "{selectall}{del}new password",
              textArea: "{selectall}{del}new text area",
              number: "{selectall}{del}456",
            },
            selects: { select: "opt1" },
            radios: { radioGroup: "radio2" },
          });
          liveModeExpectedFormItems[0].value = "new text";
          liveModeExpectedFormItems[1].value = "new text area";
          liveModeExpectedFormItems[2].value = "new password";
          liveModeExpectedFormItems[3].value = 456;
          liveModeExpectedFormItems[4].value = "opt1";
          liveModeExpectedFormItems[5].value = "radio2";

          cy.checkFormValuesInLiveMode(liveModeExpectedFormItems);
          cy.get("#plasmic-app div").contains(
            getFormValue(liveModeExpectedFormItems)
          );
        });

        cy.checkNoErrors();
      });
    });
  });
});
