import { removeCurrentProject, setupNewProject } from "../support/util";

describe("dynamic-pages", function () {
  beforeEach(() => {});

  afterEach(() => {
    removeCurrentProject();
  });

  it("works", () => {
    setupNewProject({
      name: "dynamic-pages",
    });
    cy.withinStudioIframe(() => {
      cy.createNewPage("Index").then((indexFrame) => {
        // Ensure that page panel is expanded, set index URL to /.
        cy.switchToComponentDataTab();
        cy.get('[data-test-id="page-path"] input').type(
          "{selectall}{backspace}/{enter}",
          { delay: 100 }
        );

        // Create greeter page.
        cy.createNewPage("Greeter").then((helloFrame) => {
          // Set path to /hello/[name].
          cy.switchToComponentDataTab();
          cy.get('[data-test-id="page-path"] input').type(
            "{selectall}{backspace}/hello/[name]{enter}",
            { delay: 100 }
          );

          // Set [name] preview value to "World".
          cy.get('[data-test-id="page-param-name"] input').type(
            "{selectall}{backspace}World{enter}"
          );

          // Insert text "Hello XXX!", extract XXX as span and bind to page param.
          cy.insertFromAddDrawer("Text");
          cy.get("[data-test-frame-uid]")
            .its("1.contentDocument.body")
            .should("not.be.empty")
            .then(cy.wrap)
            .find(".__wab_editor")
            .wait(1000)
            .dblclick({ force: true })
            .find('[contenteditable="true"]')
            .type("{selectall}{backspace}", { delay: 100 })
            .type("Hello XXX!", { delay: 100 })
            .setSelection("XXX")
            .wait(300)
            .type("{mod+shift+s}")
            .wait(300)
            .justType("{esc}");
          cy.focusFrameRoot(helloFrame);
          cy.selectTreeNode(["root", '"Hello [child]!"', '"XXX"']);
          cy.get(`[data-test-id="text-content"] label`).rightclick();
          cy.contains("Use dynamic value").click();
          cy.selectPathInDataPicker(["Page URL path params", "name"]);

          // Add Head component and bind title to page param.
          cy.focusFrameRoot(helloFrame);
          cy.insertFromAddDrawer("hostless-plasmic-head");
          cy.get('[data-test-id="prop-editor-row-title"] label').rightclick();
          cy.contains("Use dynamic value").click();
          cy.selectPathInDataPicker(["Page URL path params", "name"]);

          // Go to preview mode and test if page contains "Hello World!"
          cy.withinLiveMode(() => {
            cy.get("#plasmic-app .__wab_text").should(
              "contain.text",
              "Hello World!"
            );
          });

          // Go to index page, add links to /hello/foo, /hello/bar and /hello/baz.
          cy.focusFrameRoot(indexFrame);
          cy.insertFromAddDrawer("Text");
          cy.get("[data-test-frame-uid]")
            .its("0.contentDocument.body")
            .should("not.be.empty")
            .then(cy.wrap)
            .find(".__wab_editor")
            .dblclick({ force: true })
            .find('[contenteditable="true"]')
            .type("{selectall}{backspace}", { delay: 100 })
            .type("Say hello to NAME", { delay: 100 })
            .setSelection("NAME")
            .wait(300)
            .type("{mod+shift+s}")
            .wait(300)
            .justType("{esc}");
          cy.focusFrameRoot(indexFrame);
          cy.selectTreeNode(["root", '"Say hello to [child]"']);
          cy.repeatOnCustomCode(`["foo", "bar", "baz"]`);
          cy.selectTreeNode(["root", '"Say hello to [child]"', '"NAME"']);
          cy.get(`[data-test-id="text-content"] label`).rightclick();
          cy.contains("Use dynamic value").click();
          cy.selectPathInDataPicker(["currentItem"]);
          cy.selectTreeNode(["root", '"Say hello to [child]"']);
          cy.justType("{mod+alt+l}");
          cy.get(`[data-test-id="prop-editor-row-href"] label`).rightclick();
          cy.contains("Use dynamic value").click();
          cy.ensureDataPickerInCustomCodeMode();
          cy.resetMonacoEditorToCode("`/hello/${currentItem}`");
          const expected = [
            "Say hello to foo",
            "Say hello to bar",
            "Say hello to baz",
          ];

          // In live mode, click link to /hello/foo and ensure that page shows
          // "Hello foo!" as expected.
          cy.withinLiveMode(() => {
            cy.get("#plasmic-app a.__wab_text").each((item, index, list) => {
              expect(list).to.have.length(expected.length);
              expect(item).to.contain(expected[index]);
            });
            cy.get("#plasmic-app a.__wab_text:first-child").click();
            cy.get("#plasmic-app .__wab_text").should(
              "contain.text",
              "Hello foo!"
            );
          });
        });
      });
    });
  });
});
