import { removeCurrentProject } from "../support/util";

describe("registered variants", function () {
  beforeEach(() => {
    cy.setupProjectWithHostlessPackages({
      hostLessPackagesInfo: [
        {
          name: "react-aria",
          npmPkg: ["@plasmicpkgs/react-aria"],
        },
      ],
    });
  });

  afterEach(() => {
    removeCurrentProject();
  });

  it("can CRUD registered variants from canvas", function () {
    cy.withinStudioIframe(() => {
      createAndSwitchToButtonArena().then(() => {
        cy.selectRootNode();
        cy.chooseFontSize("15px"); // Set font-size on base, so we can later assert that it can be overrridden by variants
        cy.waitForNewFrame(() => {
          cy.justLog("Create registered variant artboard");
          cy.variantsTab().contains("Hovered").should("not.exist");
          cy.addRegisteredVariantFromCanvas("Hovered");
        }).then((hoverFrame) => {
          cy.justLog("Verify that registered variant has been added");
          cy.variantsTab().contains("Hovered").should("exist");
          cy.selectTreeNode(["Aria Button"]);
          cy.justType("{enter}{enter}"); // enter children slot
          hoverFrame.enterIntoTplTextBlock("hovered");
          cy.chooseFontSize("20px");
        });

        cy.withinLiveMode(() => {
          cy.contains("Button").should("exist");
          cy.contains("hovered").should("not.exist");

          cy.contains("Button").realHover();
          cy.contains("hovered").should("exist");
          cy.contains("Button").should("not.exist");

          cy.contains(`hovered`).should("have.css", "font-size", "20px");

          cy.curBody().realHover(); // un-hover
          cy.contains("Button").should("exist");
          cy.contains("hovered").should("not.exist");
        });

        cy.justLog("Delete registered variant artboard");
        cy.justType("{shift}{enter}"); // focus frame
        cy.justType("{del}"); // delete hover variant frame
        cy.get(`[data-test-id="confirm"]`).click();
        cy.variantsTab().contains("Hovered").should("not.exist");
        cy.justType("{cmd}z");
        cy.variantsTab().contains("Hovered").should("exist");
        cy.justLog("Update registered variant artboard");
        cy.editRegisteredVariantFromCanvas("Pressed");
        cy.variantsTab().contains("Pressed").should("exist");

        cy.withinLiveMode(() => {
          cy.contains("Button").should("exist");
          cy.contains("hovered").should("not.exist");

          cy.contains("Button").realMouseDown(); // simulate press
          cy.contains("hovered").should("exist");
          cy.contains("Button").should("not.exist");

          cy.contains(`hovered`).should("have.css", "font-size", "20px");

          cy.contains("hovered").realMouseUp(); // simulate press released
          cy.contains("Button").should("exist");
          cy.contains("hovered").should("not.exist");
        });
      });
    });
  });

  it("can CRUD registered variants from variants tab", function () {
    cy.withinStudioIframe(() => {
      createAndSwitchToButtonArena().then(() => {
        cy.selectRootNode();
        cy.chooseFontSize("15px"); // Set font-size on base, so we can later assert that it can be overridden by variants
        cy.waitForNewFrame(() => {
          cy.justLog("Create registered variant artboard");
          cy.variantsTab().contains("Hovered").should("not.exist");
          cy.addRegisteredVariantFromVariantsTab("Hovered");
        }).then((hoverFrame) => {
          cy.justLog("Verify that registered variant has been added");
          cy.variantsTab().contains("Hovered").should("exist");
          cy.selectTreeNode(["Aria Button"]);
          cy.justType("{enter}{enter}"); // enter children slot
          hoverFrame.enterIntoTplTextBlock("hovered");

          cy.chooseFontSize("20px");
        });

        cy.withinLiveMode(() => {
          cy.contains("Button").should("exist");
          cy.contains("hovered").should("not.exist");

          cy.contains("Button").realHover();
          cy.contains("hovered").should("exist");
          cy.contains("Button").should("not.exist");

          cy.contains(`hovered`).should("have.css", "font-size", "20px");

          cy.curBody().realHover(); // un-hover
          cy.contains("Button").should("exist");
          cy.contains("hovered").should("not.exist");
        });

        cy.justLog("Delete registered variant artboard");
        cy.doVariantMenuCommand(false, "Hovered", "Delete");
        cy.selectTreeNode(["Aria Button"]); // to make variants tab available
        cy.variantsTab().contains("Hovered").should("not.exist");

        cy.justType("{cmd}z"); // to undo tree node selection
        cy.justType("{cmd}z"); // to undo variant deletion
        cy.selectTreeNode(["Aria Button"]); // to make variants tab available
        cy.variantsTab().contains("Hovered").should("exist");

        cy.justLog("Update registered variant artboard");
        cy.editRegisteredVariantFromVariantsTab("Hovered", "Pressed");
        cy.variantsTab().contains("Pressed").should("exist");

        cy.withinLiveMode(() => {
          cy.contains("Button").should("exist");
          cy.contains("hovered").should("not.exist");

          cy.contains("Button").realMouseDown(); // simulate press
          cy.contains("hovered").should("exist");
          cy.contains("Button").should("not.exist");

          cy.contains(`hovered`).should("have.css", "font-size", "20px");

          cy.contains("hovered").realMouseUp(); // simulate press released
          cy.contains("Button").should("exist");
          cy.contains("hovered").should("not.exist");
        });
      });
    });
  });

  it("can CRUD registered variants in focus mode", function () {
    cy.withinStudioIframe(() => {
      createAndSwitchToButtonArena().then(() => {
        cy.selectRootNode();
        cy.chooseFontSize("15px"); // Set font-size on base, so we can later assert that it can be overrridden by variants
        cy.turnOffDesignMode();

        cy.focusBaseFrame().then((focusModeFrame) => {
          cy.justLog("Create registered variant artboard");
          cy.variantsTab().contains("Disabled").should("not.exist");
          cy.addRegisteredVariantFromVariantsTab("Disabled");
          cy.variantsTab().contains("Disabled").should("exist");
          cy.selectRootNode();
          cy.justType("{enter}{enter}"); // enter children slot
          focusModeFrame.enterIntoTplTextBlock("this button is disabled");
          cy.chooseFontSize("20px");
          focusModeFrame
            .rootElt()
            .contains("this button is disabled")
            .should("have.css", "font-size", "20px");
          focusModeFrame.rootElt().contains("Button").should("not.exist");

          cy.resetVariants();
          focusModeFrame
            .rootElt()
            .contains("this button is disabled")
            .should("not.exist");
          focusModeFrame
            .rootElt()
            .contains("Button")
            .should("not.have.css", "font-size", "20px");
          cy.selectRootNode();
          cy.switchToSettingsTab();
          cy.get(`[data-plasmic-prop="isDisabled"]`).click(); // toggle disabled
          focusModeFrame
            .rootElt()
            .contains("this button is disabled")
            .should("have.css", "font-size", "20px");

          cy.switchInteractiveMode();
          focusModeFrame
            .rootElt()
            .contains("this button is disabled")
            .should("have.css", "font-size", "20px");
        });

        cy.withinLiveMode(() => {
          cy.contains(`this button is disabled`).should(
            "have.css",
            "font-size",
            "20px"
          );
          cy.contains("Button").should("not.exist");
        });

        cy.justLog("Testing CRUD in interactive canvas");
        cy.focusBaseFrame().then((focusModeFrame) => {
          cy.selectRootNode();
          cy.switchToSettingsTab();
          cy.get(`[data-plasmic-prop="isDisabled"]`).click(); // toggle disabled, so we can simulate hover
          cy.justLog("Update registered variant artboard");
          cy.editRegisteredVariantFromVariantsTab("Disabled", "Hovered");
          cy.variantsTab().contains("Hovered").should("exist");
          cy.variantsTab().contains("Disabled").should("not.exist");
          cy.selectVariant("Registered Variants", "Hovered");
          cy.selectRootNode();
          cy.justType("{enter}{enter}"); // enter children slot
          focusModeFrame.enterIntoTplTextBlock("this button is hovered");
          focusModeFrame
            .rootElt()
            .contains("this button is hovered")
            .should("have.css", "font-size", "20px");
          cy.resetVariants();
          focusModeFrame
            .rootElt()
            .contains("this button is hovered")
            .should("not.exist");
          focusModeFrame.rootElt().contains("Button").realHover(); // in interactive mode, the hover variant should be previewable
          focusModeFrame
            .rootElt()
            .contains(`this button is hovered`)
            .should("have.css", "font-size", "20px");
          focusModeFrame.rootElt().contains("Button").should("not.exist");
          cy.switchInteractiveMode(); // back to non-interactive canvas
          focusModeFrame.rootElt().contains("Button").realHover();
          focusModeFrame
            .rootElt()
            .contains("this button is hovered")
            .should("not.exist");
        });

        cy.withinLiveMode(() => {
          cy.contains(`Button`).should("not.have.css", "font-size", "20px");
          cy.contains("Button").realHover();
          cy.contains(`this button is hovered`).should(
            "have.css",
            "font-size",
            "20px"
          );
          cy.contains("Button").should("not.exist");
          cy.curBody().realHover(); // un-hover
          cy.contains("Button").should("not.have.css", "font-size", "10px");
          cy.contains(`this button is hovered`).should("not.exist");
        });
      });
    });
  });
  function createAndSwitchToButtonArena() {
    return cy.createNewPageInOwnArena("Homepage").then(() => {
      cy.insertFromAddDrawer("plasmic-react-aria-button");
      cy.extractComponentNamed("Button");
      cy.contains("[Open component]").click();
      return cy.getFramed();
    });
  }
});
