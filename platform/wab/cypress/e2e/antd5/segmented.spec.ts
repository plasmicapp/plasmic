import { turnOffDesignMode } from "../../support/util";

describe("Antd5 segmented", () => {
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

  it("state", () => {
    // Create a project to use it
    cy.withinStudioIframe(() => {
      cy.createNewPageInOwnArena("Homepage").then((framed) => {
        turnOffDesignMode();
        cy.insertFromAddDrawer("plasmic-antd5-segmented");
        cy.insertFromAddDrawer("Text");
        cy.addHtmlAttribute("id", "segmented-state");
        cy.renameTreeNode("text-segmented-state");
        cy.get(`[data-test-id="text-content"] label`).rightclick();
        cy.contains("Use dynamic value").click();
        cy.get(`[data-test-id="data-picker"]`)
          .contains("segmented → value")
          .click();
        cy.get(`[data-test-id="data-picker"]`)
          .contains("button", "Save")
          .click();

        // Check live mode.
        cy.withinLiveMode(() => {
          cy.get(".ant-segmented").contains("Option 2").click();
          cy.get("#segmented-state").should("have.text", "Option 2");
          cy.get(".ant-segmented").contains("Option 3").click();
          cy.get("#segmented-state").should("have.text", "Option 3");
          cy.get(".ant-segmented").contains("Option 1").click();
          cy.get("#segmented-state").should("have.text", "Option 1");
        });
      });
    });
  });
  it("custom actions for slot Options", () => {
    // Create a project to use it
    cy.withinStudioIframe(() => {
      cy.createNewPageInOwnArena("Homepage").then((framed) => {
        turnOffDesignMode();
        cy.switchToTreeTab();
        cy.insertFromAddDrawer("plasmic-antd5-segmented");
        cy.get(
          `#component-props-section [data-test-id="show-extra-content"]`
        ).click();
        // test that custom actions only appear for customOptions
        cy.get(`[data-test-id="prop-editor-row-options"] label`).should(
          "exist"
        );
        cy.contains(`Slot: Options`).should("not.exist");
        cy.contains(`Add new option`).should("not.exist");
        cy.contains(`Delete current option`).should("not.exist");

        cy.get(`[data-test-id="prop-editor-row-useSlotOptions"] label`)
          .eq(0)
          .rightclick();
        cy.contains("Use dynamic value").click();
        cy.contains("Switch to Code").click();
        cy.resetMonacoEditorToCode(`true`);
        cy.get(`[data-test-id="prop-editor-row-options"] label`).should(
          "not.exist"
        );
        cy.contains(`Slot: Options`).should("exist");
        cy.contains(`Add new option`).should("exist");
        cy.contains(`Delete current option`).should("not.exist");

        cy.contains(`Add new option`).click();
        cy.contains(`Add new option`).click();
        cy.contains(`Add new option`).click();
        cy.contains(`Add new option`).click();

        cy.get(`[data-test-id="prop-editor-row-value"] button`).eq(1).click();
        cy.get(`[role="listbox"]`).contains("Option 5").click();

        cy.contains(`Delete current option`).should("exist");
        cy.contains(`Delete current option`).click();

        cy.insertFromAddDrawer("Text");
        cy.addHtmlAttribute("id", "segmented-state");
        cy.renameTreeNode("text-segmented-state");
        cy.get(`[data-test-id="text-content"] label`).rightclick();
        cy.contains("Use dynamic value").click();
        cy.get(`[data-test-id="data-picker"]`)
          .contains("segmented → value")
          .click();
        cy.get(`[data-test-id="data-picker"]`)
          .contains("button", "Save")
          .click();

        // Check live mode.
        cy.withinLiveMode(() => {
          cy.get("#segmented-state").should("have.text", "Option 4");
          cy.get(`.ant-segmented-item`).should("have.length", 5);
          cy.get(`.ant-segmented-item`).eq(0).contains("Option 1");
          cy.get(`.ant-segmented-item`).eq(1).contains("Option 2");
          cy.get(`.ant-segmented-item`).eq(2).contains("Option 3");
          cy.get(`.ant-segmented-item`).eq(3).contains("Option 4");
          cy.get(`.ant-segmented-item`).eq(4).contains("Option 6");
        });
      });
    });
  });
});
