import { DevFlagsType } from "../../src/wab/shared/devflags";
import { removeCurrentProject, setupNewProject } from "../support/util";

describe("data-rep", function () {
  let origDevFlags: DevFlagsType;
  beforeEach(() => {
    cy.getDevFlags().then((devFlags) => {
      origDevFlags = devFlags;
      cy.upsertDevFlags({
        ...origDevFlags,
        plexus: false,
      });
    });
    setupNewProject({
      name: "data-rep",
    });
  });

  afterEach(() => {
    if (origDevFlags) {
      cy.upsertDevFlags(origDevFlags);
    }
    removeCurrentProject();
  });

  // it("can repeat node, bind element and index using custom code, change element and index name, remove repetition", () => {
  //   cy.withinStudioIframe(() => {
  //     cy.createNewFrame().then((framed) => {
  //       // Add a child and a grandchild.
  //       cy.focusFrameRoot(framed);
  //       cy.insertFromAddDrawer(VERT_CONTAINER_CAP);
  //       cy.justType("{enter}");
  //       cy.insertFromAddDrawer(VERT_CONTAINER_CAP);
  //       cy.justType("{enter}");

  //       // Repeat element with collection ["foo", "bar", "baz"].
  //       cy.repeatOnCustomCode(`["foo", "bar", "baz"]`);

  //       // Create a text and bind it to custom code using current item and index.
  //       cy.insertFromAddDrawer("Text");
  //       cy.bindTextContentToCustomCode("`${currentItem} (${currentIndex})`");

  //       // Focus root and test if canvas and live mode contain text bound to
  //       // repeating data.
  //       const checkValue = (expected: string[]) => {
  //         cy.waitAllEval();
  //         for (const e of expected) {
  //           framed.rootElt().contains(e).should("be.visible");
  //         }
  //         cy.withinLiveMode(() => {
  //           cy.get("#plasmic-app .__wab_text").each((item, index, list) => {
  //             expect(list).to.have.length(expected.length);
  //             expect(item).to.contain(expected[index]);
  //           });
  //         });
  //       };
  //       const expectedRepeating = ["foo (0)", "bar (1)", "baz (2)"];
  //       checkValue(expectedRepeating);

  //       // Change element and index name.
  //       cy.focusFrameRoot(framed);
  //       cy.justType("{enter}");
  //       cy.justType("{enter}");
  //       cy.get(`[data-test-id="repeating-element-name"] input`).type(
  //         "{selectall}{backspace}el{enter}"
  //       );
  //       cy.get(`[data-test-id="repeating-element-index-name"] input`).type(
  //         "{selectall}{backspace}idx{enter}"
  //       );

  //       // Fix custom code expression, check if evaluation returns fullExpectedValue.
  //       cy.justType("{enter}");
  //       cy.justType("{enter}");
  //       cy.resetMonacoEditorToCode("`${el} (${idx})`");
  //       checkValue(expectedRepeating);

  //       // Remove repetition, fix text and check final value.
  //       cy.focusFrameRoot(framed);
  //       cy.justType("{enter}");
  //       cy.justType("{enter}");
  //       cy.get('[data-test-id="repeating-element-section"]')
  //         .contains("Repeat element")
  //         .rightclick();
  //       cy.contains("Remove repetition").click();
  //       cy.justType("{enter}");
  //       cy.get(`[data-test-id="text-content"] label`).rightclick();
  //       cy.contains("Remove dynamic value").click();
  //       cy.waitAllEval();
  //       cy.get("[data-test-frame-uid]")
  //         .its("0.contentDocument.body")
  //         .should("not.be.empty")
  //         .then(cy.wrap)
  //         .find(".__wab_editor")
  //         .wait(1000)
  //         .dblclick({ force: true })
  //         .find('[contenteditable="true"]')
  //         .type("{selectall}{backspace}", { delay: 100 })
  //         .type("Hello World!{esc}", { delay: 100 });
  //       checkValue(["Hello World!"]);

  //       cy.checkNoErrors();
  //     });
  //   });
  // })

  it("can repeat select options and have multiple levels of repetition", () => {
    cy.withinStudioIframe(() => {
      cy.createNewFrame().then((framed) => {
        // Add a Plume Select.
        cy.focusFrameRoot(framed);
        cy.insertFromAddDrawer("Select");

        // Unset options prop
        cy.get(`[data-test-id="prop-editor-row-options"]`).rightclick();
        cy.contains("Unset Options").click();

        // Set "is open" variant, select and clear "children" slot content.
        cy.get('[data-test-id="variants-picker-section"]')
          .contains("Is open")
          .parents(`[data-plasmic-role="labeled-item"]`)
          .find("input")
          .click({ force: true });
        cy.selectTreeNode(["root", "Select", 'Slot: "children"']);

        // Add OptionGroup and make it repeat.
        cy.insertFromAddDrawer("Option Group");
        cy.repeatOnCustomCode(`["Group A", "Group B"]`);

        // Add Option and make it repeat.
        cy.selectTreeNode([
          "root",
          "Select",
          'Slot: "children"',
          "Option Group",
          'Slot: "children"',
        ]);
        cy.getSelectedTreeNode().rightclick();
        cy.contains("Clear slot content").click();
        cy.insertFromAddDrawer("Option");
        cy.repeatOnCustomCode(
          '[{label: "Opt 1", value: 1}, {label: "Opt 2", value: 2}, {label: "Opt 3", value: 3}]'
        );

        // Bind stuff to data.
        cy.selectTreeNode([
          "root",
          "Select",
          'Slot: "children"',
          "Option Group",
          'Slot: "title"',
          "Group Name",
        ]);
        cy.bindTextContentToCustomCode("currentItem");
        cy.selectTreeNode([
          "root",
          "Select",
          'Slot: "children"',
          "Option Group",
          'Slot: "children"',
          "Option",
          'Slot: "children"',
          '"Option"',
        ]);
        cy.bindTextContentToCustomCode("currentItem.label");

        const expectedGroups = ["Group A", "Group B"];
        const expectedOptions = [
          "Opt 1",
          "Opt 2",
          "Opt 3",
          "Opt 1",
          "Opt 2",
          "Opt 3",
        ];

        // Check existence of bound option groups and options in live mode.
        cy.withinLiveMode(() => {
          cy.get("#plasmic-app button").click();

          cy.get('[role="presentation"]').each((group, idx, list) => {
            expect(list).to.have.length(expectedGroups.length);
            expect(group).to.contain(expectedGroups[idx]);
          });

          cy.get('[role="option"]').each((option, idx, list) => {
            expect(list).to.have.length(expectedOptions.length);
            expect(option).to.contain(expectedOptions[idx]);
          });
        });
      });
    });
  });

  it("can repeat rich text children", () => {
    cy.withinStudioIframe(() => {
      cy.createNewFrame().then((framed) => {
        // Add a child.
        cy.focusFrameRoot(framed);

        // Create a text and add link inside it.
        cy.insertFromAddDrawer("Text");
        cy.get("[data-test-frame-uid]")
          .its("0.contentDocument.body")
          .should("not.be.empty")
          .then(cy.wrap)
          .find(".__wab_editor")
          .dblclick({ force: true })
          .find('[contenteditable="true"]')
          .type("{selectall}{backspace}", { delay: 100 })
          .type("Hello World!", { delay: 100 })
          .setSelection("World")
          .type("{mod+k}")
          .justType("/{enter}")
          .wait(300)
          .justType("{esc}");

        // Repeat link on ["foo", "bar", "baz"] and set text content.
        cy.focusFrameRoot(framed);
        cy.selectTreeNode(["root", '"Hello [child]!"', '"World"']);
        cy.repeatOnCustomCode(`["foo", "bar", "baz"]`);
        cy.wait(500);
        cy.get(`[data-test-id="repeating-element-name"] input`).type(
          "{selectall}{backspace}item{enter}"
        );
        cy.get(`[data-test-id="text-content"] label`).rightclick();
        cy.contains("Use dynamic value").click();
        cy.selectPathInDataPicker(["item"]);

        // Check expected content (canvas and live mode).
        cy.focusFrameRoot(framed);
        cy.waitAllEval();
        framed.rootElt().contains(`Hello foobarbaz!`).should("be.visible");
        cy.withinLiveMode(() => {
          cy.get("#plasmic-app").should("contain.text", "Hello foobarbaz!");
        });
      });
    });
  });
});
