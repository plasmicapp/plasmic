describe("rich-text", function () {
  it("successfully edit text with format.", function () {
    const focusFrame = () => {
      return cy
        .get("[data-test-frame-uid]")
        .its("0.contentDocument.body")
        .should("not.be.empty")
        .then(cy.wrap);
    };
    cy.setupNewProject({ name: "rich-text" })
      .withinStudioIframe(() => {
        cy.createNewFrame()
          .focusCreatedFrameRoot()
          .insertFromAddDrawer("Text")
          .then(focusFrame)
          .find(".__wab_editor")
          .wait(1000)
          .dblclick({ force: true })
          .find('[contenteditable="true"]')
          .type("{selectall}{backspace}", { delay: 100 })
          .type(
            "{mod+i}The {mod+b}Blue Moon{mod+b}{mod+i} was there.{enter}{enter}...or {mod+u}so we thought!{mod+u}{esc}"
          )
          .enterLiveMode()
          .find(".__wab_text")
          .should(
            "have.html",
            '<span class="plasmic_default__all plasmic_default__span" style="font-style: italic;">The </span><span class="plasmic_default__all plasmic_default__span" style="font-style: italic; font-weight: 700;">Blue Moon</span> was there.\n\n...or <span class="plasmic_default__all plasmic_default__span" style="text-decoration-line: underline;">so we thought!</span>'
          )
          .exitLiveMove()
          .get(`[data-test-class="tpl-tag-select"] input`)
          .type("a{enter}", { force: true })
          .then(focusFrame)
          .find(".__wab_editor")
          .contains("so we thought!");
      })
      .removeCurrentProject();
  });
});
