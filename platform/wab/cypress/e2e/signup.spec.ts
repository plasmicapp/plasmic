/**
 * This file is prefixed with 00 because this spec should run first.  It clears
 * the intro splash flag (e.g. we're running specs with a fresh DB reset, which
 * is what CI does).
 */

import { v4 } from "uuid";
import { logout, removeCurrentProject, setupNewProject } from "../support/util";

// The test currently works but is visually broken by the new loading screen.
// Related: https://linear.app/plasmic/issue/PLA-11151/
// TODO: Update this test to not go through TeamCreation flow, which is hidden
// by the loading screen.

describe("Signup flow", function () {
  it("can sign up (password), take survey, continue to original project href", function () {
    setupNewProject({
      name: "signup",
      inviteOnly: false,
      skipVisit: true,
    })
      .then((projectId) => {
        logout();
        cy.clearCookies();

        const randomUserId = v4();
        const randomUserEmail = `fakeuser+${randomUserId}@gmail.com`;

        cy.openProject({ projectId });

        // Should be taken to log in form.
        // Switch to signup form.
        cy.contains("Create account", { timeout: 120000 }).click();
        cy.get("input[name=email]").type(randomUserEmail);
        cy.get("input[name=password]").type("!53kr3tz!");
        cy.get("input[name=firstName]").type("Fakey");
        cy.get("input[name=lastName]").type("Fake");
        cy.get("button[type=submit]:contains(Sign up)").click();

        // Complete the survey.
        cy.contains("How did you hear about us", { timeout: 10000 }).click();
        cy.focused().click();
        cy.get(".ant-select-item:contains(Product Hunt)").click();
        cy.contains("What kind of work do you do").click();
        cy.focused().click();

        // TODO Remove this if it turns out to be unneeded.
        // Sometimes, clicking on Developer doesn't seem to do anything. Here is some code to run this in a loop....
        // function loop(count: number): any {
        //   return cy
        //     .get(".ant-select-item:contains(Software development)")
        //     .click()
        //     .then(() => {
        //       if (
        //         false &&
        //         Cypress.$(".ant-select-item:contains(Software development)")
        //           .length &&
        //         count < 9
        //       ) {
        //         return loop(count + 1);
        //       } else {
        //         cy.contains("Continue").click();
        //
        //         // Expect to land in the studio project.
        //         return cy.withinStudioIframe(() => {});
        //       }
        //     });
        // }
        // loop(0);
        cy.get(".ant-select-item:contains(Software development)").click();
        cy.contains("What do you want to build").click();
        cy.focused().click();
        cy.get(".ant-select-item:contains(External app)").click();

        cy.contains("Continue").click();

        cy.contains("Verify your email", { timeout: 10000 });

        cy.visit("/email-verification?token=invalid-token");

        cy.contains("Sorry, something went wrong with that link", {
          timeout: 10000,
        });

        cy.getUserEmailVerificationToken(randomUserEmail).then((token) => {
          cy.visit(
            `/email-verification?token=${encodeURIComponent(
              token
            )}&continueTo=${encodeURIComponent(`/projects/${projectId}`)}`
          );

          cy.contains("Thanks for verifying your email", { timeout: 10000 });

          cy.contains("Continue").click();

          cy.contains("Name this organization").click();
          cy.contains(
            "Insert your organization name to create an organization",
            {
              timeout: 2000,
            }
          );
          cy.contains("Tell us about your organization").click();

          cy.focused().type("Fake org");

          cy.contains("Name this organization").click();

          cy.contains("Share organization files and create together", {
            timeout: 10000,
          });

          cy.get(`[data-test-id="invite-emails"]`).click();

          cy.focused().type("user1@gmail.com{enter}user2@g{enter}{esc}");

          cy.contains("Send invites").click();

          cy.contains("Enter valid emails only, comma separated...", {
            timeout: 5000,
          });

          cy.get(`[data-test-id="invite-emails"]`).click();

          cy.focused().type("{backspace}user2@gmail.com{enter}{esc}");

          cy.contains("Send invites").click();

          // Expect to land in the studio project.
          return cy.withinStudioIframe(() => {});
        });
      })
      .then(() => {
        removeCurrentProject();
      });
  });
});
