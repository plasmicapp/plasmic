import {
  removeCurrentProject,
  setupProjectFromTemplate,
} from "../support/util";
const isOddChild = (index: number) => (index + 1) % 2 !== 0;
describe("interactions-variants", function () {
  beforeEach(() => {
    setupProjectFromTemplate("state-management");
  });
  afterEach(() => {
    removeCurrentProject();
  });
  it("can apply arbitrary CSS selectors to nodes", () => {
    cy.withinStudioIframe(() => {
      cy.createNewPageInOwnArena("Arbitrary CSS Selectors").then((framed) => {
        const items = new Array(10).fill(0);
        const checkCssInCanvas = (
          cssProp: string,
          cssPropValue: string,
          condition = (_index: number) => true
        ) => {
          items.forEach((_item, index) => {
            framed
              .rootElt()
              .find("p")
              .eq(index)
              .should(
                condition(index) ? "have.css" : "not.have.css",
                cssProp,
                cssPropValue
              );
          });
        };
        const checkCssInPreview = (
          cssProp: string,
          cssPropValue: string,
          condition = (_index: number) => true
        ) => {
          items.forEach((_item, index) => {
            cy.contains(`Item ${index}`).should(
              condition(index) ? "have.css" : "not.have.css",
              cssProp,
              cssPropValue
            );
          });
        };
        cy.justLog("Add children");
        cy.focusFrameRoot(framed);
        cy.insertFromAddDrawer("Text");
        cy.renameTreeNode("my-text");
        cy.changeTagType("Paragraph");
        cy.repeatOnCustomCode(`[${items}]`);
        cy.get(`[data-test-id="text-content"] label`).rightclick();
        cy.contains("Use dynamic value").click();
        cy.contains("Switch to Code").click();
        cy.resetMonacoEditorToCode("`Item ${currentIndex}`");
        cy.switchToDesignTab();
        cy.toggleElementVariants();
        cy.addElementVariant(":nth-child(odd)");
        checkCssInCanvas("fontSize", "30px", () => false);
        cy.chooseFontSize("30");
        checkCssInCanvas("fontSize", "30px");
        // Not recording, but still viewing
        cy.stopRecordingElementVariant();
        checkCssInCanvas("fontSize", "30px");
        // not recording, not viewing
        cy.deactivateElementVariant();
        checkCssInCanvas("fontSize", "30px", isOddChild);
        // shows that multiple variants can be applied on an element
        cy.addElementVariant(":first-child");
        checkCssInCanvas("text-decoration-line", "underline", () => false);
        cy.underlineText();
        checkCssInCanvas("text-decoration-line", "underline");
        // not recording, but still viewing
        cy.stopRecordingElementVariant();
        checkCssInCanvas("text-decoration-line", "underline");
        // not recording, not viewing
        cy.deactivateElementVariant();
        checkCssInCanvas(
          "text-decoration-line",
          "underline",
          (index) => index === 0
        );
        cy.addElementVariant(":hover");
        checkCssInCanvas("font-family", "Montserrat, sans-serif", () => false);
        cy.chooseFont("Montserrat");
        checkCssInCanvas("font-family", "Montserrat, sans-serif");
        // not recording, but still viewing
        cy.stopRecordingElementVariant();
        checkCssInCanvas("font-family", "Montserrat, sans-serif");
        // not recording, not viewing
        cy.deactivateElementVariant();
        checkCssInCanvas("font-family", "Montserrat, sans-serif", () => false);
        // interactive element variants are not applied in non-interactive canvas on interaction
        framed.rootElt().find("p").eq(0).realHover();
        checkCssInCanvas("font-family", "Montserrat, sans-serif", () => false);
        cy.withinLiveMode(() => {
          // Test :first-child arbitrary selector
          // only first child is underlined
          checkCssInPreview(
            "text-decoration-line",
            "underline",
            (index) => index === 0
          );
          // Test interactive selector
          // only the hovered element should have the font-family set
          cy.contains("Item 2").realHover();
          checkCssInPreview(
            "font-family",
            "Montserrat, sans-serif",
            (index) => index === 2
          );
          // Test :nth-child(odd) arbitrary selector
          checkCssInPreview("fontSize", "30px", isOddChild);
        });
      });
    });
  });
});
