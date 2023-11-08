import { FREE_CONTAINER_LOWER } from "../../src/wab/shared/Labels";
import { removeCurrentProject, setupNewProject } from "../support/util";

describe("freestyle", function () {
  beforeEach(() => {
    setupNewProject({
      name: "freestyle",
    });
  });

  afterEach(() => {
    removeCurrentProject();
  });

  it("can draw tweet", function () {
    cy.withinStudioIframe(() => {
      cy.createNewFrame().then((framed) => {
        const frame = framed.getFrame();
        cy.waitFrameEval(framed);

        const initX = 5;
        const initY = 20;
        const lineHeight = 25;
        const spanInterval = 35;
        const imgSize = 30;
        const containerWidth = 176;
        const textLeft = initX + imgSize + 20;

        cy.justType("r");
        cy.drawRectRelativeToElt(
          frame,
          initX + 10,
          initY + 10,
          imgSize,
          imgSize
        );
        cy.waitFrameEval(framed);

        framed.plotText(textLeft + spanInterval * 0, initY + 10, `Yang`);
        framed.plotText(textLeft + spanInterval * 1, initY + 10, `@yang`);
        framed.plotText(textLeft + spanInterval * 2, initY + 10, `23m ago`);
        framed.plotText(textLeft, initY + 10 + lineHeight * 1, `Hello world!`);
        framed.plotText(textLeft, initY + 10 + lineHeight * 2, `3 likes`);

        cy.justType("h");
        cy.drawRectRelativeToElt(
          frame,
          textLeft - 3,
          initY + 8,
          containerWidth - textLeft - 3,
          25
        );
        cy.waitFrameEval(framed);

        cy.justType("v");
        cy.drawRectRelativeToElt(
          frame,
          textLeft - 5,
          initY + 5,
          containerWidth - textLeft,
          80
        );
        cy.waitFrameEval(framed);

        cy.justType("h");
        cy.drawRectRelativeToElt(
          frame,
          initX + 5,
          initY + 3,
          containerWidth - 8,
          110
        );
        cy.waitFrameEval(framed);

        cy.withinLiveMode(() => {
          cy.contains("Yang").should("exist");
          cy.contains("@yang").should("exist");
          cy.contains("23m ago").should("exist");
          cy.contains("Hello world!").should("exist");
        });

        function checkEndState() {
          cy.waitAllEval();
          cy.expectDebugTplTree(`
${FREE_CONTAINER_LOWER}
  ${FREE_CONTAINER_LOWER}
    ${FREE_CONTAINER_LOWER}
    ${FREE_CONTAINER_LOWER}
      ${FREE_CONTAINER_LOWER}
        text
        text
        text
      text
      text`);

          cy.checkNoErrors();
        }

        checkEndState();
        cy.undoAndRedo();
        checkEndState();
      });
    });
  });
});
