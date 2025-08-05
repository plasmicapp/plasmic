import { DevFlagsType } from "../../src/wab/shared/devflags";
import {
  removeCurrentProject,
  setupProjectFromTemplate,
} from "../support/util";

describe("state-management-dependents", function () {
  let origDevFlags: DevFlagsType;
  beforeEach(() => {
    cy.getDevFlags().then((devFlags) => {
      origDevFlags = devFlags;
      cy.upsertDevFlags({
        ...origDevFlags,
        plexus: false,
      });
    });
    setupProjectFromTemplate("state-management");
  });
  afterEach(() => {
    if (origDevFlags) {
      cy.upsertDevFlags(origDevFlags);
    }
    removeCurrentProject();
  });

  it("can create dependent states", () => {
    cy.withinStudioIframe(() => {
      cy.createNewComponent("Dependent States").then((framed) => {
        cy.focusFrameRoot(framed);

        const options = ["option1", "option2", "option3"];

        cy.insertFromAddDrawer("Select");
        cy.bindPlasmicPropToCustomCode("options", JSON.stringify(options));

        cy.insertFromAddDrawer("Text Input");
        cy.bindPlasmicPropToObjectPath("value", ["select → value"]);

        cy.insertFromAddDrawer("TextInput");
        cy.bindPlasmicPropToCustomCode(
          "value",
          `$state.textInput.value.toUpperCase()`
        );

        cy.checkNumberOfStatesInComponent(0, 3);

        options.forEach((opt) => {
          cy.selectTreeNode(["root", "Select"]).click({ force: true });
          cy.selectDataPlasmicProp("value", opt).wait(200);

          framed.rootElt().find(`button`).contains(opt);
          framed.rootElt().find(`input[value=${opt}]`).should("have.length", 1);
          framed
            .rootElt()
            .find(`input[value=${opt.toUpperCase()}]`)
            .should("have.length", 1);
        });

        cy.withinLiveMode(() => {
          options.forEach((opt) => {
            cy.get("#plasmic-app > div").within(() => {
              cy.get("button")
                .parent()
                .within(() => {
                  cy.get("select").select(opt, { force: true });
                });
              cy.get(`input[value=${opt}]`).should("have.length", 1);
              cy.get(`input[value=${opt.toUpperCase()}]`).should(
                "have.length",
                1
              );
              cy.get(`input[value=${opt}]`).type("hello");
              cy.get(`input[value=${opt}hello]`).should("have.length", 1);
              cy.get(`input[value=${opt.toUpperCase()}HELLO]`).should(
                "have.length",
                1
              );
            });
          });
        });
      });
      cy.checkNoErrors();
    });
  });
});
