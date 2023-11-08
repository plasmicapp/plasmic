// @ts-ignore

describe("Plasmic Sanity", () => {
  it("should work", () => {
    // Create intercept to stub API calls
    cy.intercept(/_type/, {
      fixture: "sanity-io-all.json",
    }).as("getAll");
    cy.intercept(/screening/, { fixture: "sanity-io-screening.json" }).as(
      "getScreening"
    );
    cy.intercept(/movie/, { fixture: "sanity-io-movies.json" }).as("getMovies");

    // Create intercepts for the images
    cy.fixture("images/sanity-io/1.jpeg");
    cy.fixture("images/sanity-io/2.jpeg");
    cy.fixture("images/sanity-io/3.jpeg");
    cy.fixture("images/sanity-io/4.jpeg");
    cy.fixture("images/sanity-io/5.jpeg");
    cy.fixture("images/sanity-io/6.jpeg");
    cy.fixture("images/sanity-io/7.jpeg");
    cy.fixture("images/sanity-io/8.jpeg");
    cy.fixture("images/sanity-io/9.jpeg");
    cy.fixture("images/sanity-io/10.jpeg");
    cy.fixture("images/sanity-io/11.jpeg");
    cy.fixture("images/sanity-io/12.jpeg");
    cy.fixture("images/sanity-io/13.jpeg");
    cy.fixture("images/sanity-io/14.jpeg");
    cy.intercept(
      "https://cdn.sanity.io/images/b2gfz67v/production/69ad5d60ff19c456954513e8c67e9563c780d5e1-780x1170.jpg?w=300",
      { fixture: "images/sanity-io/1.jpeg" }
    );
    cy.intercept(
      "https://cdn.sanity.io/images/b2gfz67v/production/236a8e4d456db62a04f85c39abcfd74c50e0c37b-780x1170.jpg?w=300",
      { fixture: "images/sanity-io/2.jpeg" }
    );
    cy.intercept(
      "https://cdn.sanity.io/images/b2gfz67v/production/e22a88d23751a84df81f03ef287ae85fc992fe12-780x1170.jpg?w=300",
      { fixture: "images/sanity-io/3.jpeg" }
    );
    cy.intercept(
      "https://cdn.sanity.io/images/b2gfz67v/production/7aa06723bb01a7a79055b6d6f5be80329a0e5b58-780x1170.jpg?w=300",
      { fixture: "images/sanity-io/4.jpeg" }
    );
    cy.intercept(
      "https://cdn.sanity.io/images/b2gfz67v/production/60aaeca6580e3bc248678e344fab5d4e5638cc8c-780x1170.jpg?w=300",
      { fixture: "images/sanity-io/5.jpeg" }
    );
    cy.intercept(
      "https://cdn.sanity.io/images/b2gfz67v/production/222ce0eaef8662485762791f5c31b60ae627e83d-780x1170.jpg?w=300",
      { fixture: "images/sanity-io/6.jpeg" }
    );
    cy.intercept(
      "https://cdn.sanity.io/images/b2gfz67v/production/c6683ff02881704e326ca8b198af122e18513570-780x1170.jpg?w=300",
      { fixture: "images/sanity-io/7.jpeg" }
    );
    cy.intercept(
      "https://cdn.sanity.io/images/b2gfz67v/production/5b433475b541fc1f2903d9b281efdde7ac9c28a5-780x1170.jpg?w=300",
      { fixture: "images/sanity-io/8.jpeg" }
    );
    cy.intercept(
      "https://cdn.sanity.io/images/b2gfz67v/production/fc958a52785af03fea2cf33032b24b72332a5539-780x1170.jpg?w=300",
      { fixture: "images/sanity-io/9.jpeg" }
    );
    cy.intercept(
      "https://cdn.sanity.io/images/b2gfz67v/production/0a88401628a8205b658f2269a1718542d6a5ac44-780x1170.jpg?w=300",
      { fixture: "images/sanity-io/10.jpeg" }
    );
    cy.intercept(
      "https://cdn.sanity.io/images/b2gfz67v/production/332ce1adc107e1cd5444369dd88c7fcf78aaa57c-780x1170.jpg?w=300",
      { fixture: "images/sanity-io/11.jpeg" }
    );
    cy.intercept(
      "https://cdn.sanity.io/images/b2gfz67v/production/a1c52c102311a337b6795e207aaccf967c2b98cc-780x1170.jpg?w=300",
      { fixture: "images/sanity-io/12.jpeg" }
    );
    cy.intercept(
      "https://cdn.sanity.io/images/b2gfz67v/production/2db1db44ba70003091c0a1dc4c4b5eeb78dde498-780x1170.jpg?w=300",
      { fixture: "images/sanity-io/13.jpeg" }
    );
    cy.intercept(
      "https://cdn.sanity.io/images/b2gfz67v/production/094eaa00429d71f899271fbd223789c323587d7b-780x1170.jpg?w=300",
      { fixture: "images/sanity-io/14.jpeg" }
    );

    cy.visit("/");
    cy.contains("WALL·E").should("be.visible");
    cy.get("img").should("have.attr", "src");
    cy.matchFullPageSnapshot("plasmic-sanity-io");
  });
});
