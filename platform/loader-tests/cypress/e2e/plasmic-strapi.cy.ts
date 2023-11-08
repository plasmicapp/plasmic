// @ts-ignore

describe("Plasmic Strapi", () => {
  it("should work", () => {
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

    cy.visit("/");
    cy.contains("Café Coffee Day").should("be.visible");
    cy.get("img").should("have.attr", "src");
    cy.matchFullPageSnapshot("plasmic-strapi");
  });
});
