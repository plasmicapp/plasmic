import { VERT_CONTAINER_CAP } from "../../src/wab/shared/Labels";
import { removeCurrentProject, setupNewProject } from "../support/util";

describe("data-binding", function () {
  beforeEach(() => {
    setupNewProject({
      name: "data-binding",
    });
  });

  afterEach(() => {
    removeCurrentProject();
  });

  it("can access $props in data picker, bind text content to them, evaluate default value and given value, rename prop", () => {
    cy.withinStudioIframe(() => {
      cy.createNewFrame().then((framed) => {
        // Add a child.
        cy.focusFrameRoot(framed);
        cy.insertFromAddDrawer(VERT_CONTAINER_CAP);
        cy.justType("{enter}");

        // Extract it as a component.
        cy.extractComponentNamed("Comp");

        // Enter Comp spotlight mode.
        framed.rootElt().children().dblclick({ force: true });

        // Create a link.
        cy.insertFromAddDrawer("Link");

        // Link a.href to new prop.
        cy.get(`[data-test-id="prop-editor-row-href"] label`).rightclick();
        cy.contains("Allow external access").trigger("mouseover");
        cy.contains("Create new prop").click();
        cy.linkNewProp("linkProp");

        // Set default value for linkProp.
        const defaultPropValue = "https://default.value.for.link.prop";
        cy.get(`[data-test-id="prop-editor-row-default-href"] textarea`).type(
          `{selectall}{backspace}${defaultPropValue}`
        );

        // Connect text content to data.
        cy.get(`[data-test-id="text-content"] label`).rightclick();
        cy.contains("Use dynamic value").click();
        cy.get(`[data-test-id="data-picker"]`).contains("linkProp").click();
        cy.get(`[data-test-id="data-picker"]`)
          .contains("button", "Save")
          .click();

        // Leave spotlight mode.
        cy.focusFrameRoot(framed);

        // Check existence of link with `href` linked to prop and content bound
        // to prop both in canvas and in codegen.
        const checkValue = (expected: string) => {
          cy.waitAllEval();
          framed.rootElt().contains(expected).should("be.visible");
          cy.withinLiveMode(() => {
            cy.get("#plasmic-app a")
              .should("have.attr", "href", expected)
              .should("contain.text", expected);
          });
        };
        checkValue(defaultPropValue);

        // Select TplComponent and set prop.
        const instancePropValue = "https://instance.prop.value";
        cy.justType("{enter}");
        cy.get(`[data-test-id="prop-editor-row-linkProp"] textarea`).type(
          `{selectall}{backspace}${instancePropValue}{enter}`
        );
        checkValue(instancePropValue);

        // Enter Comp spotlight mode, rename linkProp to newPropName, leave
        // spotlight and check evaluated value.
        framed.rootElt().children().dblclick({ force: true });
        cy.switchToComponentDataTab();
        cy.get(`[data-test-id="props-section"]`)
          .contains("linkProp")
          .dblclick();
        cy.justType("newPropName{enter}");
        cy.focusFrameRoot(framed);
        checkValue(instancePropValue);

        cy.checkNoErrors();
      });
    });
  });

  it("can bind tag attribute to data, component prop to data, visibility to data", () => {
    cy.withinStudioIframe(() => {
      cy.createNewFrame().then((framed) => {
        // Add a child.
        cy.focusFrameRoot(framed);
        cy.insertFromAddDrawer(VERT_CONTAINER_CAP);
        cy.justType("{enter}");
        cy.insertFromAddDrawer(VERT_CONTAINER_CAP);
        cy.justType("{enter}");

        // Extract it as a component.
        cy.extractComponentNamed("Comp");

        // Enter Comp spotlight mode.
        framed.rootElt().children().children().dblclick({ force: true });

        // Create a link.
        cy.insertFromAddDrawer("Link");

        // Link a.href to new prop.
        cy.get(`[data-test-id="prop-editor-row-href"] label`).rightclick();
        cy.contains("Allow external access").trigger("mouseover");
        cy.contains("Create new prop").click();
        cy.linkNewProp("linkProp");

        // Set default value for linkProp.
        const defaultPropValue = "https://default.value.for.link.prop";
        cy.get(`[data-test-id="prop-editor-row-default-href"] textarea`).type(
          `{selectall}{backspace}${defaultPropValue}`
        );

        // Expand HTML Attributes.
        cy.get(
          '[data-test-id="html-attributes-section"] [data-test-id="collapse"]'
        ).click({ force: true });

        // Bind `title` attribute.
        cy.get('[data-test-id="prop-editor-row-title"] label').rightclick();
        cy.contains("Use dynamic value").click();
        cy.selectPathInDataPicker(["linkProp"]);

        // Extract Link as a component.
        cy.extractComponentNamed("Link");

        // Unlink from component prop and bind to custom code expression.
        cy.get(`[data-test-id="prop-editor-row-linkProp"] label`).rightclick();
        cy.contains("Unlink from component prop").click();
        cy.get('[data-test-id="prop-editor-row-linkProp"] label').rightclick();
        cy.contains("Use dynamic value").click();
        cy.selectPathInDataPicker(["linkProp"], false);
        cy.contains("Switch to Code").click();
        cy.resetMonacoEditorToCode(
          '"https://google.com/search?q=" + $props.linkProp'
        );

        // Set "Link" visibility based in linkProp content.

        cy.get(`[data-test-id="visibility-choices"]`).rightclick();
        cy.contains("Use dynamic value").click();
        cy.contains("Switch to Code").click();
        cy.resetMonacoEditorToCode('!$props.linkProp.includes("invisible")');

        // Leave spotlight mode, duplicate "Comp" TplComponent, set linkProp to "invisible".
        cy.focusFrameRoot(framed);
        cy.justType("{enter}");
        cy.justType("{enter}");
        cy.justType("{cmd}d");
        cy.get(`[data-test-id="prop-editor-row-linkProp"] textarea`).type(
          "invisible{enter}"
        );

        cy.withinLiveMode(() => {
          cy.get("#plasmic-app a")
            .should(
              "have.attr",
              "href",
              "https://google.com/search?q=" + defaultPropValue
            )
            .should(
              "have.attr",
              "title",
              "https://google.com/search?q=" + defaultPropValue
            );
        });
      });
    });
  });

  it("can bind rich text children to data", () => {
    cy.withinStudioIframe(() => {
      cy.createNewFrame().then((framed) => {
        // Add a child.
        cy.focusFrameRoot(framed);
        cy.insertFromAddDrawer(VERT_CONTAINER_CAP);
        cy.justType("{enter}");

        // Extract it as a component.
        cy.extractComponentNamed("Comp");

        // Enter Comp spotlight mode.
        framed.rootElt().children().dblclick({ force: true });

        // Create a text and add link inside it.
        cy.insertFromAddDrawer("Text");
        cy.get("[data-test-frame-uid]")
          .its("0.contentDocument.body")
          .should("not.be.empty")
          .then(cy.wrap)
          .find(".__wab_editor")
          .wait(1000)
          .dblclick({ force: true })
          .find('[contenteditable="true"]')
          .type("{selectall}{backspace}", { delay: 100 })
          .type("Hello World!", { delay: 100 })
          .setSelection("World")
          .type("{mod+k}")
          .justType("/{enter}")
          .wait(300)
          .justType("{esc}");

        // Link a.href of link to new prop "linkProp", set default value.
        cy.focusFrameRoot(framed);
        framed.rootElt().children().dblclick({ force: true });
        cy.selectTreeNode([
          "root",
          "Comp",
          "vertical stack",
          '"Hello [child]!"',
          '"World"',
        ]);
        cy.get(`[data-test-id="prop-editor-row-href"] label`).rightclick();
        cy.contains("Allow external access").trigger("mouseover");
        cy.contains("Create new prop").click();
        cy.linkNewProp("linkProp");
        const defaultPropValue = "https://default.value.for.link.prop";
        cy.get(`[data-test-id="prop-editor-row-default-href"] textarea`).type(
          `{selectall}{backspace}${defaultPropValue}`
        );

        // Connect link text content to data.
        cy.get(`[data-test-id="text-content"] label`).rightclick();
        cy.contains("Use dynamic value").click();
        cy.get(`[data-test-id="data-picker"]`).contains("linkProp").click();
        cy.get(`[data-test-id="data-picker"]`)
          .contains("button", "Save")
          .click();

        // Check expected content (canvas and live mode).
        cy.focusFrameRoot(framed);
        cy.waitAllEval();
        framed
          .rootElt()
          .contains(`Hello ${defaultPropValue}!`)
          .should("be.visible");
        cy.withinLiveMode(() => {
          cy.get("#plasmic-app a")
            .should("have.attr", "href", defaultPropValue)
            .should("contain.text", defaultPropValue);
        });
      });
    });
  });

  // TODO: test fallback
});
