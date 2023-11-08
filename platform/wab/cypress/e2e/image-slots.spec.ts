import {
  checkNoErrors,
  convertToSlot,
  createNewComponent,
  createNewFrame,
  dragGalleryItemRelativeToElt,
  focusFrameRoot,
  getSelectedElt,
  getSelectionTag,
  justType,
  removeCurrentProject,
  setImageSource,
  setupNewProject,
  switchToTreeTab,
  undoAndRedo,
  waitAllEval,
  withinLiveMode,
} from "../support/util";

describe("image-slots", function () {
  beforeEach(() => {
    setupNewProject({
      name: "image-slots",
    });
  });

  afterEach(() => {
    removeCurrentProject();
  });

  it("can create, override content, edit default content", function () {
    cy.withinStudioIframe(() => {
      createNewComponent("Widget").then((framed) => {
        // Drop an img.
        dragGalleryItemRelativeToElt("Image", framed.getFrame(), 70, 10);

        createNewFrame().then((framed2) => {
          // Zoom out.
          justType("{shift}1");

          // Insert two Widgets.
          dragGalleryItemRelativeToElt("Widget", framed2.getFrame(), 10, 10);
          dragGalleryItemRelativeToElt("Widget", framed2.getFrame(), 10, 100);

          // Back to frame 1, convert to slot.
          focusFrameRoot(framed);
          framed.rootElt().children().last().click({ force: true });
          convertToSlot();

          // Back to frame 2.
          focusFrameRoot(framed2);

          // Edit 1st Widget's image by deleting it.
          justType("{enter}{enter}{enter}{del}");

          // Back to frame 2 root.
          focusFrameRoot(framed2);

          function getSecondImageSlotContent() {
            focusFrameRoot(framed2);
            return framed2.rootElt().children().last().children();
          }

          // Edit 2nd Widget's slot.
          getSecondImageSlotContent().click({ force: true });
          framed2.plotTextAtSelectedElt("out here");

          // Reset 2nd Widget's slot.
          justType("{shift}{enter}");
          getSelectionTag().rightclick({ force: true });
          cy.contains("Revert to").click({ force: true });

          // Edit the default slot contents.
          focusFrameRoot(framed);
          justType("{enter}{enter}{enter}");
          const imgUrl = "https://picsum.photos/50/50";
          setImageSource(imgUrl);

          // Select 2nd Widget slot.
          getSecondImageSlotContent().click({ force: true });
          justType("{shift}{enter}");

          switchToTreeTab();
          withinLiveMode(() => {
            cy.get("img").should("have.attr", "src", imgUrl);
          });

          const checkEndState = () => {
            waitAllEval();

            framed.rebind();
            framed2.rebind();

            // Make sure that we are selecting the slot. This is due to
            // a flakiness in the redo logic. If we ensure that the selection
            // state is the same after undoing/redoing, we can stop doing
            // this.
            getSecondImageSlotContent().click({ force: true });
            justType("{shift}{enter}");

            // Check that we're selecting the slot.
            getSelectionTag().should("contain", `Slot: "children"`);

            // Expect final image.
            getSelectedElt().should("have.attr", "src", imgUrl);

            // Check that the first Widget's slot remains empty.
            framed2
              .rootElt()
              .children()
              .first()
              .children()
              .should("have.class", "__wab_placeholder");

            checkNoErrors();
          };

          checkEndState();
          undoAndRedo();
          checkEndState();
        });
      });
    });
  });
});
