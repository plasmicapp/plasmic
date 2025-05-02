import { removeCurrentProject, setupNewProject } from "../support/util";

describe("components-props", function () {
  beforeEach(() => {
    setupNewProject({
      name: "component-props",
    });
  });

  afterEach(() => {
    removeCurrentProject();
  });

  it("can create all component prop types", function () {
    cy.withinStudioIframe(() => {
      cy.createNewComponent("Component with all prop types").then(() => {
        cy.createComponentProp({ propName: "textProp", propType: "text" });
        cy.createComponentProp({ propName: "numberProp", propType: "num" });
        cy.createComponentProp({ propName: "booleanProp", propType: "bool" });
        cy.createComponentProp({ propName: "objectProp", propType: "any" });
        cy.createComponentProp({
          propName: "queryDataProp",
          propType: "queryData",
        });
        cy.createComponentProp({
          propName: "eventHandlerProp",
          propType: "eventHandler",
        });
        cy.createComponentProp({ propName: "hrefProp", propType: "href" });
        cy.createComponentProp({
          propName: "dateProp",
          propType: "dateString",
        });
        cy.createComponentProp({
          propName: "dateRangeProp",
          propType: "dateRangeStrings",
        });
        cy.createComponentProp({ propName: "colorProp", propType: "color" });
        cy.createComponentProp({ propName: "imageProp", propType: "img" });
      });
    });
  });

  it("can show preview values, default values correctly", function () {
    cy.withinStudioIframe(() => {
      cy.createNewComponent("Component with props").then((framed) => {
        cy.createComponentProp({
          propName: "textProp",
          propType: "text",
          defaultValue: "default text",
          previewValue: "preview text",
        });
        cy.createComponentProp({
          propName: "numberProp",
          propType: "num",
          defaultValue: "0",
          previewValue: "42",
        });

        cy.insertTextWithDynamic("`textProp = ${$props.textProp}`");
        cy.insertTextWithDynamic("`numberProp = ${$props.numberProp}`");
        cy.insertTextWithDynamic(
          "`numberProp * 10 = ${$props.numberProp * 10}`"
        ); // verify it's a number

        cy.log(
          "Verify component shows preview values, or default value as fallback"
        );
        framed
          .rootElt()
          .contains("textProp = preview text")
          .should("be.visible");
        framed.rootElt().contains("numberProp = 42").should("be.visible");
        framed.rootElt().contains("numberProp * 10 = 420").should("be.visible");

        cy.setComponentPropPreviewValue("textProp", "Hello, world!");
        framed
          .rootElt()
          .contains("textProp = Hello, world!")
          .should("be.visible");

        cy.setComponentPropPreviewValue("numberProp", undefined);
        framed.rootElt().contains("numberProp = 0").should("be.visible");
        framed.rootElt().contains("numberProp * 10 = 0").should("be.visible");

        cy.setComponentPropDefaultValue("numberProp", undefined);
        framed
          .rootElt()
          .contains("numberProp = undefined")
          .should("be.visible");
        framed.rootElt().contains("numberProp * 10 = NaN").should("be.visible");

        cy.createNewPage("Page using component props").then((framed2) => {
          cy.insertFromAddDrawer("Component with props");
          cy.log(
            "Verify component instance shows set values, or default values as fallback"
          );
          framed2
            .rootElt()
            .contains("textProp = default text")
            .should("be.visible");
          framed2
            .rootElt()
            .contains("numberProp = undefined")
            .should("be.visible");
          framed2
            .rootElt()
            .contains("numberProp * 10 = NaN")
            .should("be.visible");

          cy.setDataPlasmicProp("textProp", "", { reset: true });
          framed2
            .rootElt()
            .contains(/^textProp = $/)
            .should("be.visible");

          cy.removePropValue("textProp");
          framed2
            .rootElt()
            .contains("textProp = default text")
            .should("be.visible");

          cy.setDataPlasmicProp("numberProp", "0", { reset: true });
          framed2.rootElt().contains("numberProp = 0").should("be.visible");
          framed2
            .rootElt()
            .contains("numberProp * 10 = 0")
            .should("be.visible");

          cy.removePropValue("numberProp");
          framed2
            .rootElt()
            .contains("numberProp = undefined")
            .should("be.visible");
          framed2
            .rootElt()
            .contains("numberProp * 10 = NaN")
            .should("be.visible");
        });
      });
    });
  });
});
