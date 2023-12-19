describe("hostless-react-slick slider carousel", () => {
  beforeEach(() => {
    cy.setupProjectWithHostlessPackages({
      hostLessPackagesInfo: [
        {
          name: "react-slick",
          npmPkg: ["@plasmicpkgs/react-slick", "react-slick", "slick-carousel"],
          cssImport: [
            "slick-carousel/slick/slick-theme.css",
            "slick-carousel/slick/slick.css",
          ],
        },
      ],
    });
  });

  function assertState(value: string) {
    cy.wait(300);
    cy.switchToDataTab();
    cy.get(
      `[data-test-id="variables-section"] [data-test-id="show-extra-content"]`
    ).click();
    cy.get(`[data-test-id="sliderCarousel.currentSlide"] a`).should(
      "have.text",
      value
    );
    cy.switchToSettingsTab();
  }

  it("works", () => {
    // Create a project to use it
    cy.withinStudioIframe(() => {
      cy.createNewPageInOwnArena("Homepage").then((framed) => {
        const textId = "slider-current-slide-state-text";
        cy.insertFromAddDrawer("hostless-slider");

        cy.insertFromAddDrawer("Text");
        cy.addHtmlAttribute("id", textId);
        cy.renameTreeNode("slider-current-slide-state-text");
        cy.get(`[data-test-id="text-content"] label`).rightclick();
        cy.contains("Use dynamic value").click();
        cy.get(`[data-test-id="data-picker"]`).contains("currentSlide").click();
        cy.get(`[data-test-id="data-picker"]`)
          .contains("button", "Save")
          .click();

        assertState("0");
        cy.selectTreeNode(["Slider Carousel"]);
        cy.get(
          `[data-test-id="prop-editor-row-initialSlide"] label`
        ).rightclick();
        cy.contains("Use dynamic value").click();
        cy.contains("Switch to Code").click();
        cy.resetMonacoEditorToCode(`1`);
        cy.wait(1000);

        cy.contains("Append new slide").click();
        assertState("3");

        cy.contains("Append new slide").click();
        assertState("4");

        cy.contains("Append new slide").click();
        assertState("5");
        cy.wait(1000);

        cy.contains("Delete current slide").click();
        assertState("4");

        cy.contains("Delete current slide").click();
        assertState("3");

        cy.contains("Append new slide").click();
        cy.wait(500);
        cy.contains("Append new slide").click();
        cy.wait(500);
        cy.contains("Append new slide").click();
        cy.wait(500);
        assertState("6");

        cy.contains("Delete current slide").click();
        cy.wait(100);
        cy.contains("Delete current slide").click();
        cy.wait(100);
        cy.contains("Delete current slide").click();
        assertState("3");

        cy.contains("Delete current slide").click();
        cy.wait(100);
        cy.contains("Delete current slide").click();
        cy.wait(100);
        cy.contains("Delete current slide").click();
        cy.wait(100);
        cy.contains("Delete current slide").click();
        cy.wait(100);
        cy.contains("Delete current slide").should("not.exist");
        assertState("0");

        cy.contains("Append new slide").click();
        cy.wait(500);
        cy.contains("Append new slide").click();
        cy.wait(500);
        cy.contains("Append new slide").click();
        cy.wait(500);
        assertState("2");

        cy.contains("Next").click();
        assertState("0");
        cy.contains("Next").click();
        assertState("1");

        // Check live mode.
        cy.withinLiveMode(() => {
          cy.get(`#${textId}`).should("have.text", "1");
        });
      });
    });
  });
});
