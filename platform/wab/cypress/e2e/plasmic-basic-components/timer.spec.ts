describe.skip("hostless-timer", () => {
  beforeEach(() => {
    cy.setupProjectWithHostlessPackages({
      hostLessPackagesInfo: [
        {
          name: "plasmic-basic-components",
          npmPkg: ["@plasmicpkgs/plasmic-basic-components"],
        },
      ],
    });
  });

  function assertState(value: string) {
    cy.switchToDataTab();
    cy.get(
      `[data-test-id="variables-section"] [data-test-id="count"] a`
    ).should("have.text", value);
    cy.switchToSettingsTab();
  }

  it("works", () => {
    // Create a project to use it
    cy.withinStudioIframe(() => {
      cy.createNewPageInOwnArena("Homepage").then((framed) => {
        cy.addState({
          name: "isRunning",
          variableType: "boolean",
          accessType: "writable",
          isInitValDynamicValue: true,
          initialValue: "false",
        }).wait(200);
        cy.addState({
          name: "count",
          variableType: "number",
          accessType: "writable",
          initialValue: "0",
        }).wait(200);
        cy.addState({
          name: "interval",
          variableType: "number",
          accessType: "writable",
          initialValue: "2",
        }).wait(200);

        cy.insertFromAddDrawer("Text");
        cy.addHtmlAttribute("id", "count-state-text");
        cy.renameTreeNode("Count State Text");
        cy.get(`[data-test-id="text-content"] label`).rightclick();
        cy.contains("Use dynamic value").click();
        cy.contains("Switch to Code").click();
        cy.resetMonacoEditorToCode(`$state.count`);

        cy.insertFromAddDrawer("Button");
        cy.get(`[data-test-id="text-content"] label`).rightclick();
        cy.contains("Use dynamic value").click();
        cy.contains("Switch to Code").click();
        cy.resetMonacoEditorToCode(`"Start"`);
        cy.addInteraction("onClick", {
          actionName: "customFunction",
          args: {
            customFunction: `$state.isRunning = true;`,
          },
        });

        cy.insertFromAddDrawer("Button");
        cy.get(`[data-test-id="text-content"] label`).rightclick();
        cy.contains("Use dynamic value").click();
        cy.contains("Switch to Code").click();
        cy.resetMonacoEditorToCode(`"Stop"`);
        cy.addInteraction("onClick", {
          actionName: "customFunction",
          args: {
            customFunction: `$state.isRunning = false;`,
          },
        });

        cy.insertFromAddDrawer("Text Input");
        cy.get(`[data-test-id="prop-editor-row-name"] label`).rightclick();
        cy.contains("Use dynamic value").click();
        cy.contains("Switch to Code").click();
        cy.resetMonacoEditorToCode(`"interval"`);
        cy.get(`[data-test-id="prop-editor-row-value"] label`).rightclick();
        cy.contains("Use dynamic value").click();
        cy.get(`[data-test-id="data-picker"]`).contains("interval").click();
        cy.get(`[data-test-id="data-picker"]`)
          .contains("button", "Save")
          .click();
        cy.addInteraction("onChange", {
          actionName: "customFunction",
          args: {
            customFunction: `$state.interval = event.target.value`,
          },
        });

        cy.insertFromAddDrawer("hostless-timer");

        cy.get(
          `[data-test-id="prop-editor-row-intervalSeconds"] label`
        ).rightclick();
        cy.contains("Use dynamic value").click();
        cy.contains("Switch to Code").click();
        cy.resetMonacoEditorToCode(`$state.interval`);

        cy.addInteraction("onTick", {
          actionName: "customFunction",
          args: {
            customFunction: `$state.count++`,
          },
        });

        assertState("0");
        cy.get(`[data-test-id="prop-editor-row-runWhileEditing"] label`)
          .eq(0)
          .rightclick();
        cy.contains("Use dynamic value").click();
        cy.contains("Switch to Code").click();
        cy.resetMonacoEditorToCode(`true`);

        // NOTE: State can not be changed in non-interactive mode!
        cy.turnOffDesignMode();
        cy.switchInteractiveMode();

        cy.selectTreeNode(["Timer"]);

        cy.switchToDataTab();
        cy.get(
          `[data-test-id="variables-section"] [data-test-id="count"] a`
        ).should("not.have.text", "0");
        cy.switchToSettingsTab();

        cy.get(`[data-test-id="prop-editor-row-runWhileEditing"] label`)
          .eq(0)
          .rightclick();
        cy.contains("Remove dynamic value").click();
        cy.wait(1000);
        cy.get(`[data-test-id="prop-editor-row-runWhileEditing"] label`)
          .eq(0)
          .rightclick();
        cy.contains("Use dynamic value").click();
        cy.contains("Switch to Code").click();
        cy.resetMonacoEditorToCode(`false`);

        cy.get(`[data-test-id="prop-editor-row-isRunning"] label`)
          .eq(0)
          .rightclick();
        cy.contains("Use dynamic value").click();
        cy.contains("Switch to Code").click();
        cy.resetMonacoEditorToCode(`$state.isRunning`);

        cy.withinLiveMode(() => {
          // checks "mode" state
          cy.get("#count-state-text").should("have.text", "0");
          cy.wait(6000);
          cy.get("#count-state-text").should("have.text", "0");
          cy.contains("Start").click();
          cy.wait(1000);
          cy.get("#count-state-text").should("have.text", "0");
          cy.wait(1000);
          cy.get("#count-state-text").should("have.text", "1");
          cy.wait(2000);
          cy.get("#count-state-text").should("have.text", "2");
          cy.wait(4000);
          cy.get("#count-state-text").should("have.text", "4");

          cy.contains("Stop").click();
          cy.wait(6000);
          cy.get("#count-state-text").should("have.text", "4");

          cy.get("input[name='interval']").type("{selectall}{backspace}");
          cy.get("input[name='interval']").type("4");
          cy.get("input[name='interval']").type("{enter}");

          cy.contains("Start").click();
          cy.wait(4000);
          cy.get("#count-state-text").should("have.text", "5");
        });
      });
    });
  });
});
