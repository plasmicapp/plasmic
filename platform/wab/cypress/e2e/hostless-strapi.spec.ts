import { VERT_CONTAINER_CAP } from "../../src/wab/shared/Labels";
import { removeCurrentProject } from "../support/util";

describe("hostless-strapi", function () {
  this.beforeEach(() => {
    // Create intercept to stub API calls
    cy.intercept(/restaurants/, {
      fixture: "strapi-restaurants.json",
    });
    cy.intercept(/undefined/, {
      fixture: "strapi-error.json",
    });

    // Create intercepts for the images
    cy.fixture("images/strapi/Cafe_Coffee_Day_logo.png");
    cy.fixture("images/strapi/Chili_s_Logo_svg.png");
    cy.fixture("images/strapi/Chipotle_Mexican_Grill_logo_svg.png");
    cy.fixture("images/strapi/Big_Smoke_Burger_logo_svg.png");
    cy.fixture("images/strapi/Burger_King_2020_svg.png");
    cy.fixture("images/strapi/Bonchon_Logo.png");
    cy.fixture("images/strapi/Buffalo_Wild_Wings_logo_vertical_svg.png");
    cy.intercept(
      "https://res.cloudinary.com/tubone-plasmic/image/upload/v1650939343/Cafe_Coffee_Day_logo_338419f75a.png",
      { fixture: "images/strapi/Cafe_Coffee_Day_logo.png" }
    );
    cy.intercept(
      "https://res.cloudinary.com/tubone-plasmic/image/upload/v1650939343/Chili_s_Logo_svg_9b74d95e58.png",
      { fixture: "images/strapi/Chili_s_Logo_svg.png" }
    );
    cy.intercept(
      "https://res.cloudinary.com/tubone-plasmic/image/upload/v1650939343/Chipotle_Mexican_Grill_logo_svg_53d34599eb.png",
      { fixture: "images/strapi/Chipotle_Mexican_Grill_logo_svg.png" }
    );
    cy.intercept(
      "https://res.cloudinary.com/tubone-plasmic/image/upload/v1650939374/Big_Smoke_Burger_logo_svg_e3ca76d953.png",
      { fixture: "images/strapi/Big_Smoke_Burger_logo_svg.png" }
    );
    cy.intercept(
      "https://res.cloudinary.com/tubone-plasmic/image/upload/v1650939343/Burger_King_2020_svg_ac8ab9c5f1.png",
      { fixture: "images/strapi/Burger_King_2020_svg.png" }
    );
    cy.intercept(
      "https://res.cloudinary.com/tubone-plasmic/image/upload/v1650939343/Bonchon_Logo_7f7f16bce2.png",
      { fixture: "images/strapi/Bonchon_Logo.png" }
    );
    cy.intercept(
      "https://res.cloudinary.com/tubone-plasmic/image/upload/v1650939343/Buffalo_Wild_Wings_logo_vertical_svg_cc56dc61aa.png",
      { fixture: "images/strapi/Buffalo_Wild_Wings_logo_vertical_svg.png" }
    );
  });

  afterEach(() => {
    removeCurrentProject();
  });

  it("can put strapi fetcher with strapi field, fetch and show data", function () {
    // Create hostless plasmic project
    cy.setupProjectWithHostlessPackages({
      hostLessPackagesInfo: {
        name: "plasmic-strapi",
        npmPkg: ["@plasmicpkgs/plasmic-strapi"],
      },
    }).then(() => {
      cy.withinStudioIframe(() => {
        // Test the components
        cy.createNewFrame().then((framed) => {
          cy.focusFrameRoot(framed);

          // Add the StrapiCollection component and verify the initial message
          cy.insertFromAddDrawer("StrapiCollection");
          cy.getSelectedElt().should(
            "contain.text",
            "Please specify a valid collection."
          );
          cy.getSelectedElt().should("be.visible");
          cy.withinLiveMode(() => {
            cy.contains("Please specify a valid collection.").should(
              "be.visible"
            );
          });

          // Put the collection name and check the message
          cy.clickDataPlasmicProp("name");
          cy.justType("restaurants");
          cy.justType(`{enter}`);
          cy.wait(500);
          cy.getSelectedElt().should(
            "contain.text",
            "StrapiField must specify a field name"
          );
          cy.getSelectedElt().should("be.visible");
          cy.withinLiveMode(() => {
            cy.contains("StrapiField must specify a field name").should(
              "be.visible"
            );
          });

          // Select 'name' in the field and ensure the data was rendered correctly
          cy.getSelectedElt()
            .children()
            .first()
            .children()
            .click({ force: true });
          cy.selectDataPlasmicProp("path", "name");
          cy.getSelectedElt().should("contain.text", "Café Coffee Day");
          cy.getSelectedElt().should("be.visible");
          cy.withinLiveMode(() => {
            cy.contains("Café Coffee Day").should("be.visible");
          });

          // Change the field to be 'photo' and ensure the image has been rendered correcly
          cy.selectDataPlasmicProp("path", "photo");
          cy.focusFrameRoot(framed);
          cy.getSelectedElt().find("img").should("have.attr", "src");
          cy.withinLiveMode(() => {
            cy.get(".plasmic_default__div")
              .find("img")
              .should("have.attr", "src");
          });

          // Ensure no errors happened
          cy.checkNoErrors();
        });
      });
    });
  });

  it("can use context to data bind", function () {
    // Create hostless plasmic project
    cy.setupProjectWithHostlessPackages({
      hostLessPackagesInfo: {
        name: "plasmic-strapi",
        npmPkg: ["@plasmicpkgs/plasmic-strapi"],
      },
    }).then(() => {
      cy.withinStudioIframe(() => {
        // Test the components
        cy.createNewFrame().then((framed) => {
          cy.focusFrameRoot(framed);

          // Add the StrapiCollection component and verify the initial message
          cy.insertFromAddDrawer("StrapiCollection");

          // Put the collection name and check the message
          cy.clickDataPlasmicProp("name");
          cy.justType("restaurants");
          cy.justType(`{enter}`);
          cy.wait(500);
          cy.getSelectedElt().should(
            "contain.text",
            "StrapiField must specify a field name"
          );

          // Bind 'name' and 'photo' using context
          cy.getSelectedElt()
            .children()
            .first()
            .click({ force: true })
            .justType("{del}");
          cy.insertFromAddDrawer(VERT_CONTAINER_CAP);
          cy.insertFromAddDrawer("Text").renameTreeNode("Product Name", {
            programatically: true,
          });
          cy.get(`[data-test-id="text-content"] label`).rightclick();
          cy.contains("Use dynamic value").click();
          cy.selectPathInDataPicker([
            "currentStrapiRestaurantsItem",
            "attributes",
            "name",
          ]);

          cy.insertFromAddDrawer("Image");
          cy.get(`[data-test-id="image-picker"]`).rightclick();
          cy.contains("Use dynamic value").click();
          cy.selectPathInDataPicker([
            "currentStrapiRestaurantsItem",
            "attributes",
            "photo",
            "data",
            "attributes",
            "url",
          ]);

          cy.withinLiveMode(() => {
            cy.contains("Café Coffee Day").should("be.visible");
            cy.get(".plasmic_default__div")
              .find("img")
              .should("have.attr", "src");
          });
          // Ensure no errors happened
          cy.checkNoErrors();
        });
      });
    });
  });
});
