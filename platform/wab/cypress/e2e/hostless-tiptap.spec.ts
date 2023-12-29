function initialSetup() {
  cy.insertFromAddDrawer("hostless-tiptap");
  cy.get(`[data-test-id="prop-editor-row-contentHtml"] label`).rightclick();
  cy.contains("Use dynamic value").click();
  cy.contains("Switch to Code").click();
  cy.resetMonacoEditorToCode(
    `'<p><strong><em>istanbul</em>hello</strong>world</p><p><strong><em><s><u>Cappadocia</u></s></em></strong> fun <span data-type="mention" data-id="sherlock221b">@sherlock221b</span> <code>a = b</code> easy <a target="_blank" rel="noopener noreferrer nofollow" class="ρi ρmjm82" href="http://google.com">google.com</a> island<a target="_blank" rel="noopener noreferrer nofollow" class="ρi ρmjm82">blah blah</a>happy</p>'`
  );

  cy.insertFromAddDrawer("Text");
  cy.addHtmlAttribute("id", "tiptap-state-text");
  cy.get(`[data-test-id="text-content"] label`).rightclick();
  cy.contains("Use dynamic value").click();
  cy.contains("Switch to Code").click();
  cy.resetMonacoEditorToCode(
    `JSON.stringify($state.tiptapRichTextEditor.content)`
  );
}

describe("hostless-tiptap", () => {
  beforeEach(() => {
    cy.setupProjectWithHostlessPackages({
      hostLessPackagesInfo: [
        {
          name: "tiptap",
          npmPkg: ["@plasmicpkgs/tiptap"],
        },
      ],
    });
  });

  it("has no extensions added by default", () => {
    cy.withinStudioIframe(() => {
      cy.createNewPageInOwnArena("Homepage").then((framed) => {
        initialSetup();

        cy.withinLiveMode(() => {
          cy.get("#tiptap-state-text").should(
            "have.text",
            `{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"istanbulhelloworld"}]},{"type":"paragraph","content":[{"type":"text","text":"Cappadocia fun @sherlock221b a = b easy google.com islandblah blahhappy"}]}]}`
          );
        });
      });
    });
  });

  it("works - bold, italic, underline, strike, code, link, mention", () => {
    // Create a project to use it
    cy.withinStudioIframe(() => {
      cy.createNewPageInOwnArena("Homepage").then((framed) => {
        initialSetup();
        cy.selectTreeNode(["Tiptap Rich Text Editor"]);
        cy.get(`.SidebarSection__Body`)
          .get('[data-test-id="custom-action-bold"]')
          .click();
        cy.get(`.SidebarSection__Body`)
          .get('[data-test-id="custom-action-italic"]')
          .click();
        cy.get(`.SidebarSection__Body`)
          .get('[data-test-id="custom-action-underline"]')
          .click();
        cy.get(`.SidebarSection__Body`)
          .get('[data-test-id="custom-action-strike"]')
          .click();
        cy.get(`.SidebarSection__Body`)
          .get('[data-test-id="custom-action-code"]')
          .click();
        cy.get(`.SidebarSection__Body`)
          .get('[data-test-id="custom-action-link"]')
          .click();
        cy.get(`.SidebarSection__Body`)
          .get('[data-test-id="custom-action-mention"]')
          .click();

        cy.withinLiveMode(() => {
          cy.get("#tiptap-state-text").should(
            "have.text",
            `{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","marks":[{"type":"bold"},{"type":"italic"}],"text":"istanbul"},{"type":"text","marks":[{"type":"bold"}],"text":"hello"},{"type":"text","text":"world"}]},{"type":"paragraph","content":[{"type":"text","marks":[{"type":"bold"},{"type":"italic"},{"type":"underline"},{"type":"strike"}],"text":"Cappadocia"},{"type":"text","text":" fun "},{"type":"mention","attrs":{"id":"sherlock221b","label":null}},{"type":"text","text":" "},{"type":"text","marks":[{"type":"code"}],"text":"a = b"},{"type":"text","text":" easy "},{"type":"text","marks":[{"type":"link","attrs":{"href":"http://google.com","target":"_blank","rel":"noopener noreferrer nofollow","class":"ρi ρmjm82"}}],"text":"google.com"},{"type":"text","text":" islandblah blahhappy"}]}]}`
          );
        });
      });
    });
  });
});
