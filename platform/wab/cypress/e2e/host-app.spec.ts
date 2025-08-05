// This test depends on the host-test package running.

import { configureProjectAppHost, Framed } from "../support/util";

describe("host-app", function () {
  it("Should work", function () {
    cy.setupNewProject({ name: "host-app" })
      .then((projectId) => {
        cy.withinStudioIframe(() => {
          configureProjectAppHost("plasmic-host");
        });
        cy.withinStudioIframe(() => {
          cy.createNewFrame().then((framed) => {
            // cy.clearNotifications();
            cy.insertFromAddDrawer("Badge");
            cy.renameTreeNode("badge");
            cy.justLog("Test component rendering on the Canvas");
            framed.rootElt().contains("Happy 2022!").should("exist");
            cy.justLog("Test default value");
            framed.rootElt().contains("Hello Plasmic!").should("exist");
            framed.rootElt().contains("Click here").should("exist");
            framed.rootElt().contains("You haven't clicked").should("exist");
            framed.rootElt().contains("State value: 0").should("exist");
            framed
              .rootElt()
              .find(`[data-test-id="badge-component"]`)
              .should("have.css", "background-color", "rgb(200, 200, 255)");
            cy.justLog("Test default styles");
            framed
              .rootElt()
              .find(`[data-test-id="badge-component"]`)
              .should("have.css", "height", "200px");
            framed
              .rootElt()
              .find(`[data-test-id="badge-component"]`)
              .should("have.css", "width", "150px");
            cy.justLog("Test updated styles");
            cy.setSelectedDimStyle("width", "160px");
            framed
              .rootElt()
              .find(`[data-test-id="badge-component"]`)
              .should("have.css", "width", "160px");
            cy.withinLiveMode(() => {
              cy.justLog("Test live frame rendering");
              cy.contains("Hello Plasmic!").should("exist");
              cy.contains("Happy 2022!").should("exist");
              cy.get(`[data-test-id="badge-component"]`).should(
                "have.css",
                "background-color",
                "rgb(200, 200, 255)"
              );
              cy.get(`[data-test-id="badge-component"]`).should(
                "have.css",
                "height",
                "200px"
              );
              cy.get(`[data-test-id="badge-component"]`).should(
                "have.css",
                "width",
                "160px"
              );
              cy.justLog("Test component state / hooks");
              cy.contains("You haven't clicked").should("exist");
              cy.contains("Click here").click();
              cy.contains("You clicked 1 times").should("exist");
              cy.contains("Click here").click();
              cy.contains("You clicked 2 times").should("exist");
            });
            cy.justLog("Test props");
            cy.switchToSettingsTab();
            cy.get(".canvas-editor__right-pane")
              .find(`[placeholder="2022"]`)
              .focus()
              .type("2023")
              .blur({ force: true });
            cy.justType("{enter}");
            framed.rootElt().contains("Happy 2023!").should("exist");
            cy.withinLiveMode(() => {
              cy.contains("Happy 2023!").should("exist");
            });
          });
          cy.checkNoErrors();
        });
        cy.withinStudioIframe(() => {
          configureProjectAppHost("plasmic-host-updated");
        });
        cy.withinStudioIframe(
          () => {
            cy.justLog("Test updating props");
            cy.wait(1000);
            // Takes a while to get to the Confirm popup :-/
            cy.contains("Confirm", { timeout: 60000 }).click();
            cy.waitStudioLoaded();
            cy.waitForFrameToLoad();
            // cy.clearNotifications();
            cy.selectTreeNode(["root", "badge"]);
            cy.justLog("Check updated default value");
            cy.get(".canvas-editor__right-pane")
              .contains("Plasmician")
              .should("exist");
            cy.justLog("Test updated prop type");
            cy.get(".canvas-editor__right-pane")
              .contains("button", "2023")
              .click();
            cy.contains(`div[role="option"]`, "2020").click({ force: true });
            cy.insertTextWithDynamic("`Clicks: ${$state.badge.clicks}`");
            cy.getFramedByName("artboard").then((framed: Framed) => {
              framed.rootElt().contains("State value: 0").should("exist");
              framed.rootElt().contains("Clicks: 0").should("exist");
            });
            cy.withinLiveMode(() => {
              cy.contains("Hello Plasmician!").should("exist");
              cy.contains("Happy 2020!").should("exist");
              cy.contains("Click here").click();
              cy.contains("You clicked 1 times").should("exist");
              cy.contains("State value: 1");
              cy.contains("Clicks: 1");
              cy.contains("Click here").click();
              cy.contains("You clicked 2 times").should("exist");
              cy.contains("State value: 2");
              cy.contains("Clicks: 2");
            });
            cy.checkNoErrors();
          },
          { noWaitStudioLoaded: true }
        );
        cy.justLog("Check the project is not saving again once it opens");
        cy.openProject({ projectId });
        cy.withinStudioIframe(() => {
          cy.curWindow().then((win) => {
            cy.stub(win.console, "log").as("consoleLog");
          });
          cy.checkNoErrors();
          cy.waitForSave();
          cy.get("@consoleLog").should(
            "be.calledWith",
            "Save result is",
            "SkipUpToDate"
          );
          cy.get("@consoleLog").should(
            "not.be.calledWith",
            "Save result is",
            "Success"
          );
        });
        cy.withinStudioIframe(() => {
          configureProjectAppHost("plasmic-host-updated-old-host");
        });
        cy.withinStudioIframe(() => {
          cy.justLog("Test updating props");
          cy.waitStudioLoaded();
          cy.waitForFrameToLoad();
          cy.selectTreeNode(["root", "badge"]);
          cy.getFramedByName("artboard").then((framed: Framed) => {
            framed.rootElt().contains("State value: 0").should("exist");
          });
          cy.get(
            ".ant-notification-notice-warning:has(.ant-notification-notice-message:contains(Unsupported host app detected))"
          )
            .find(".ant-notification-notice-close")
            .click();
          cy.checkNoErrors();
        });
      })
      .then(() => {
        cy.removeCurrentProject();
      });
  });
  it("Should accept host URLs with query params", function () {
    cy.setupNewProject({ name: "host-app" }).then(() => {
      cy.withinStudioIframe(() => {
        configureProjectAppHost("plasmic-host?");
      });
      cy.withinStudioIframe(() => {
        cy.justLog("plasmic-host? loaded successfully");
        configureProjectAppHost("plasmic-host?foo=bar");
      });
      cy.withinStudioIframe(() => {
        cy.justLog("plasmic-host?foo=bar loaded successfully");
        configureProjectAppHost("plasmic-host?foo=bar&baz=");
      });
      cy.withinStudioIframe(() => {
        // run an extra cy.withinStudioIframe to ensure Studio loaded successfully
        cy.justLog("plasmic-host?foo=bar&baz= loaded successfully");
      });
    });
  });
});
