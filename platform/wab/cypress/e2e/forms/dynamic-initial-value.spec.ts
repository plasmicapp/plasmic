import { DevFlagsType } from "../../../src/wab/shared/devflags";
import {
  checkFormValuesInCanvas,
  Framed,
  removeCurrentProject,
} from "../../support/util";

describe("dynamic-initial-value", function () {
  let origDevFlags: DevFlagsType;
  beforeEach(() => {
    cy.getDevFlags().then((devFlags) => {
      origDevFlags = devFlags;
      cy.upsertDevFlags({
        ...origDevFlags,
        plexus: false,
      });
    });
    cy.setupProjectWithHostlessPackages({
      hostLessPackagesInfo: [
        {
          name: "antd5",
          npmPkg: ["@plasmicpkgs/antd5"],
        },
      ],
      devFlags: {
        simplifiedForms: true,
      },
    });
  });

  afterEach(() => {
    if (origDevFlags) {
      cy.upsertDevFlags(origDevFlags);
    }
    removeCurrentProject();
  });

  it("it works for simplified forms", function () {
    cy.withinStudioIframe(() => {
      cy.createNewComponent("Form").then((framed: Framed) => {
        cy.insertFromAddDrawer("Text");
        cy.bindTextContentToCustomCode("JSON.stringify($state.form.value)");

        cy.insertFromAddDrawer("plasmic-antd5-form");

        cy.get(`[data-test-id="formItems-add-btn"]`).click();
        cy.wait(500);
        cy.setDataPlasmicProp("name", "test");

        cy.setDataPlasmicProp("initialValue", "hello");
        framed
          .rootElt()
          .contains(JSON.stringify({ test: "hello" }))
          .should("exist");

        cy.setSelectByLabel("inputType", "Text Area");
        cy.wait(200);

        cy.setDataPlasmicProp("initialValue", "foo bar", { reset: true });
        framed
          .rootElt()
          .contains(JSON.stringify({ test: "foo bar" }))
          .should("exist");

        cy.setSelectByLabel("inputType", "Number");
        cy.wait(200);
        cy.setDataPlasmicProp("initialValue", "123", { reset: true });
        framed
          .rootElt()
          .contains(JSON.stringify({ test: 123 }))
          .should("exist");

        cy.setSelectByLabel("inputType", "Checkbox");
        cy.clickDataPlasmicProp("initialValue");
        framed
          .rootElt()
          .contains(JSON.stringify({ test: false }))
          .should("exist");

        cy.setSelectByLabel("inputType", "Checkbox");
        cy.clickDataPlasmicProp("initialValue");
        framed
          .rootElt()
          .contains(JSON.stringify({ test: true }))
          .should("exist");

        cy.closeSidebarModal();
        cy.checkNoErrors();
      });
    });
  });

  const commonTplTreePath = [
    "root",
    "Form",
    `Slot: "children"`,
    "testItem",
    `Slot: "children"`,
  ];

  it("it works for advanced forms", function () {
    cy.withinStudioIframe(() => {
      cy.createNewComponent("Form").then((framed: Framed) => {
        cy.insertFromAddDrawer("Text");
        cy.bindTextContentToCustomCode("JSON.stringify($state.form.value)");

        cy.insertFromAddDrawer("plasmic-antd5-form");
        // remove default form items (name, message)
        cy.removeItemFromArrayProp("formItems", 0);
        cy.removeItemFromArrayProp("formItems", 0);

        cy.clickDataPlasmicProp("simplified-mode-toggle");
        cy.wait(500);
        // nav to slot
        cy.selectTreeNode(commonTplTreePath.slice(0, 3));
        cy.insertFromAddDrawer("plasmic-antd5-form-item");
        cy.get(`[data-test-id="omnibar-add-Text"]`).click();
        cy.wait(500);
        cy.renameTreeNode("testItem", { programatically: true });
        cy.setDataPlasmicProp("name", "test");
        cy.setDataPlasmicProp("initialValue", "hello");
        framed
          .rootElt()
          .contains(JSON.stringify({ test: "hello" }))
          .should("exist");
        checkFormValuesInCanvas(
          [
            {
              name: "test",
              label: "Label",
              type: "Text",
              value: "hello",
            },
          ],
          framed
        );
        cy.selectTreeNode([...commonTplTreePath, "Input"]);
        cy.justType("{del}");
        cy.justType("{shift}{enter}");
        cy.clickDataPlasmicProp("initialValue");
        cy.get(`[data-test-id="data-picker"]`).contains(`"hello"`);
        cy.closeDataPicker();

        cy.selectTreeNode(commonTplTreePath);
        cy.insertFromAddDrawer("plasmic-antd5-input-number");
        cy.justType("{shift}{enter}{shift}{enter}");
        cy.wait(200);
        cy.setDataPlasmicProp("initialValue", "123", { reset: true });
        framed
          .rootElt()
          .contains(JSON.stringify({ test: 123 }))
          .should("exist");
        checkFormValuesInCanvas(
          [
            {
              name: "test",
              label: "Label",
              type: "Number",
              value: "123",
            },
          ],
          framed
        );
        cy.selectTreeNode([...commonTplTreePath, "Number Input"]);
        cy.justType("{del}");
        cy.justType("{shift}{enter}");
        cy.clickDataPlasmicProp("initialValue");
        cy.get(`[data-test-id="data-picker"]`).contains(`123`);
        cy.closeDataPicker();

        cy.selectTreeNode(commonTplTreePath);
        cy.insertFromAddDrawer("plasmic-antd5-checkbox");
        cy.justType("{shift}{enter}{shift}{enter}");
        cy.clickDataPlasmicProp("initialValue");
        framed
          .rootElt()
          .contains(JSON.stringify({ test: false }))
          .should("exist");
        cy.clickDataPlasmicProp("initialValue");
        framed
          .rootElt()
          .contains(JSON.stringify({ test: true }))
          .should("exist");
        checkFormValuesInCanvas(
          [
            {
              name: "test",
              label: "Label",
              type: "Checkbox",
              value: true,
            },
          ],
          framed
        );
        cy.selectTreeNode([...commonTplTreePath, "Checkbox"]);
        cy.justType("{del}");
        cy.justType("{shift}{enter}");
        cy.clickDataPlasmicProp("initialValue");
        cy.get(`[data-test-id="data-picker"]`).contains(`true`);
        cy.closeDataPicker();

        cy.selectTreeNode(commonTplTreePath);
        cy.insertFromAddDrawer("plasmic-antd5-select");
        cy.justType("{shift}{enter}{shift}{enter}");
        cy.wait(200);
        cy.setDataPlasmicProp("initialValue", "option1", { reset: true });
        framed
          .rootElt()
          .contains(JSON.stringify({ test: "option1" }))
          .should("exist");
        checkFormValuesInCanvas(
          [
            {
              name: "test",
              label: "Label",
              type: "Select",
              value: "Option 1",
            },
          ],
          framed
        );
        cy.selectTreeNode([...commonTplTreePath, "Select"]);
        cy.justType("{del}");
        cy.justType("{shift}{enter}");
        cy.clickDataPlasmicProp("initialValue");
        cy.get(`[data-test-id="data-picker"]`).contains(`"option1"`);
        cy.closeDataPicker();

        cy.selectTreeNode(commonTplTreePath);
        cy.insertFromAddDrawer("plasmic-antd5-radio-group");
        cy.justType("{shift}{enter}{shift}{enter}");
        cy.wait(200);
        cy.setDataPlasmicProp("initialValue", "option2", { reset: true });
        framed
          .rootElt()
          .contains(JSON.stringify({ test: "option2" }))
          .should("exist");
        checkFormValuesInCanvas(
          [
            {
              name: "test",
              label: "Label",
              type: "Radio Group",
              value: "option2",
            },
          ],
          framed
        );
        cy.selectTreeNode([...commonTplTreePath, "Radio Group"]);
        cy.justType("{del}");
        cy.justType("{shift}{enter}");
        cy.clickDataPlasmicProp("initialValue");
        cy.get(`[data-test-id="data-picker"]`).contains(`"option2"`);
        cy.closeDataPicker();

        cy.selectTreeNode(commonTplTreePath);
        // should work with plume components too
        cy.insertFromAddDrawer("Checkbox");
        cy.justType("{shift}{enter}{shift}{enter}");
        cy.clickDataPlasmicProp("initialValue");
        framed
          .rootElt()
          .contains(JSON.stringify({ test: false }))
          .should("exist");
        cy.clickDataPlasmicProp("initialValue");
        framed
          .rootElt()
          .contains(JSON.stringify({ test: true }))
          .should("exist");
        checkFormValuesInCanvas(
          [
            {
              name: "test",
              label: "Label",
              type: "Checkbox",
              value: true,
            },
          ],
          framed
        );
        cy.selectTreeNode([...commonTplTreePath, "Checkbox"]);
        cy.justType("{del}");
        cy.justType("{shift}{enter}");
        cy.clickDataPlasmicProp("initialValue");
        cy.get(`[data-test-id="data-picker"]`).contains(`true`);
        cy.closeDataPicker();

        cy.selectTreeNode(commonTplTreePath);
        cy.insertFromAddDrawer("Text Input");
        cy.justType("{shift}{enter}{shift}{enter}");
        cy.wait(200);
        cy.setDataPlasmicProp("initialValue", "foo bar", { reset: true });
        framed
          .rootElt()
          .contains(JSON.stringify({ test: "foo bar" }))
          .should("exist");
        checkFormValuesInCanvas(
          [
            {
              name: "test",
              label: "Label",
              type: "Text",
              value: "foo bar",
            },
          ],
          framed
        );

        cy.checkNoErrors();
      });
    });
  });
});
