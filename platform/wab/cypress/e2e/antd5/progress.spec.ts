import { DevFlagsType } from "../../../src/wab/shared/devflags";
import { removeCurrentProject } from "../../support/util";

describe("Antd5 progress", () => {
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
    });
  });

  afterEach(() => {
    if (origDevFlags) {
      cy.upsertDevFlags(origDevFlags);
    }
    removeCurrentProject();
  });

  it("works", () => {
    // Create a project to use it
    cy.withinStudioIframe(() => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      cy.createNewPageInOwnArena("Homepage").then((framed) => {
        // turnOffDesignMode();
        cy.addState({
          name: "basePercent",
          variableType: "number",
          accessType: "private",
          initialValue: "0",
        }).wait(200);
        cy.addState({
          name: "success",
          variableType: "number",
          accessType: "private",
          initialValue: "0",
        }).wait(200);
        cy.insertFromAddDrawer("plasmic-antd5-progress");
        cy.get(`[data-test-id="prop-editor-row-percent"] label`).rightclick();
        cy.contains("Use dynamic value").click();
        cy.get(`[data-test-id="data-picker"]`).contains("basePercent").click();
        cy.get(`[data-test-id="data-picker"]`)
          .contains("button", "Save")
          .click();
        cy.get(
          `#component-props-section [data-test-id="show-extra-content"]`
        ).click();
        cy.get(
          `[data-test-id="prop-editor-row-successPercent"] label`
        ).rightclick();
        cy.contains("Use dynamic value").click();
        cy.get(`[data-test-id="data-picker"]`).contains("success").click();
        cy.get(`[data-test-id="data-picker"]`)
          .contains("button", "Save")
          .click();

        cy.get(
          `[data-test-id="prop-editor-row-infoFormat"] label`
        ).rightclick();
        cy.contains("Use dynamic value").click();
        cy.contains("Switch to Code").click();
        cy.resetMonacoEditorToCode(`successPercent + "/" + percent`);

        cy.insertFromAddDrawer("Button");
        cy.get(`[data-test-id="text-content"] label`).rightclick();
        cy.contains("Use dynamic value").click();
        cy.contains("Switch to Code").click();
        cy.resetMonacoEditorToCode(`"Increment"`);
        cy.addInteraction("onClick", {
          actionName: "customFunction",
          args: {
            customFunction: `$state.basePercent += 5;`,
          },
        });

        cy.insertFromAddDrawer("Button");
        cy.get(`[data-test-id="text-content"] label`).rightclick();
        cy.contains("Use dynamic value").click();
        cy.contains("Switch to Code").click();
        cy.resetMonacoEditorToCode(`"Inc Success"`);
        cy.addInteraction("onClick", {
          actionName: "customFunction",
          args: {
            customFunction: `$state.success += 5;`,
          },
        });

        // Check live mode.
        cy.withinLiveMode(() => {
          cy.get(".ant-progress-text").should("have.text", "0/0");
          cy.contains(`Increment`).click();
          cy.contains(`Increment`).click();
          cy.contains(`Increment`).click();
          cy.contains(`Increment`).click();
          cy.contains(`Increment`).click();
          cy.contains(`Increment`).click();
          cy.contains(`Increment`).click();
          cy.contains(`Inc Success`).click();
          cy.contains(`Inc Success`).click();
          cy.contains(`Inc Success`).click();
          cy.contains(`Increment`).click();
          cy.get(".ant-progress-text").should("have.text", "15/40");
        });
      });
    });
  });
});
