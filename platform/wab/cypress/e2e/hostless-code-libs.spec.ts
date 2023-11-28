import { Framed, removeCurrentProject, withinLiveMode } from "../support/util";

describe("Make sure code libs work on canvas", function () {
  beforeEach(() => {
    // Intercept so our tests don't depend on external URLS.
    // Fetched by axios and isomorphic-fetch
    cy.intercept("https://api.publicapis.org/entries?title=cats", {
      body: {
        count: 1,
        entries: [
          {
            API: "Cats",
            Description: "Pictures of cats from Tumblr",
            Auth: "apiKey",
            HTTPS: true,
            Cors: "no",
            Link: "https://docs.thecatapi.com/",
            Category: "Animals",
          },
        ],
      },
    });
  });
  afterEach(() => {
    removeCurrentProject();
  });
  it("Make sure code libs work on canvas", function () {
    cy.setupProjectFromTemplate("code-libs").then(() => {
      cy.withinStudioIframe(() => {
        cy.waitForFrameToLoad();
        cy.turnOffDesignMode();
        cy.waitForFrameToLoad();
        cy.switchInteractiveMode();
        cy.refreshFocusedArena();
        cy.waitForFrameToLoad();
        cy.curDocument()
          .get(".canvas-editor__frames .canvas-editor__viewport")
          .then(($frame) => {
            const frame = $frame[0] as HTMLIFrameElement;
            return new Framed(frame);
          })
          .then((framed: Framed) => {
            const checkContents = (
              chainable: () =>
                | Cypress.Chainable<JQuery<HTMLElement>>
                | typeof cy
            ) => {
              chainable().contains(`Axios response: "Animals"`).should("exist");
              // Cypress doesn't support accessing the clipboard :/
              chainable()
                .contains(`Copy to clipboard type: "function"`)
                .should("exist");
              chainable().contains(`date-fns result: 48 hours`).should("exist");
              chainable()
                .contains(`day.js number of days in August: 31`)
                .should("exist");
              chainable()
                .contains(`Faker name: "Maddison", PT-BR name: "Maria Eduarda"`)
                .should("exist");
              chainable()
                .contains(
                  `fast-stringify: {"foo":"[ref=.]","bar":{"bar":"[ref=.bar]","foo":"[ref=.]"}}`
                )
                .should("exist");
              chainable()
                .contains(
                  `Immer - state before: "done === false"; state after: "done === true"`
                )
                .should("exist");
              /*
              TODO: isomorphic-fetch
              chainable()
                .contains(`Isomorphic-fetch response: "Animals"`)
                .should("exist");
                */
              chainable().contains(`jquery: red box width: 50`).should("exist");
              chainable()
                .contains(`lodash partition: [[1,3],[2,4]]`)
                .should("exist");
              chainable()
                .contains(
                  `marked: <p>This text is <em><strong>really important</strong></em></p>`
                )
                .should("exist");
              chainable()
                .contains(`MD5 hash: cd946e1909bfe736ec8921983eb9115f`)
                .should("exist");
              chainable()
                .contains(
                  `nanoid with single-character alphabet for stable results: 000000`
                )
                .should("exist");
              chainable().contains(`papaparse: 5 rows, 4 cols`).should("exist");
              chainable()
                .contains(`pluralize "house": "houses"`)
                .should("exist");
              chainable().contains(`random: 65`).should("exist");
              chainable().contains(`semver: 3.3.0`).should("exist");
              chainable()
                .contains(`tinycolor2: rgb(255, 0, 0)`)
                .should("exist");
              chainable()
                .contains(
                  `uuid NIL: 00000000-0000-0000-0000-000000000000, validate: true`
                )
                .should("exist");
              chainable()
                .contains(
                  `zod parse valid: {"username":"Test"}, safeParse with invalid data success: false`
                )
                .should("exist");
            };
            checkContents(() => framed.rootElt());
            withinLiveMode(() => {
              checkContents(() => cy);
            });
            cy.checkNoErrors();
          });
      });
    });
  });
});
