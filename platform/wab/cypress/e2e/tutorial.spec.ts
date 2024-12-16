// IDS of hostless projects based on bundles/tutorial-app.json
import { pressPublishButton, TUTORIAL_DB_TYPE } from "../support/util";

const PROJECT_IDS = {
  "loading-boundary": "9Vr5YWkf3w7jj6SsTcCEta",
  "rich-components": "jkU663o1Cz7HrJdwdxhVHk",
  antd5: "ohDidvG9XsCeFumugENU6J",
  base: "gE5G4u5n7anv8KR9zDcgU9",
};

describe("Table and form tutorial", function () {
  it("can complete tutorial", function () {
    cy.deleteProjectAndRevisions(PROJECT_IDS.base).then(() => {
      cy.setupProjectFromTemplate("tutorial-app", {
        skipVisit: true,
        keepProjectIdsAndNames: true,
        dataSourceReplacement: {
          type: TUTORIAL_DB_TYPE,
        },
      }).then((tourProjectId: string) => {
        cy.upsertDevFlags({
          templateTours: {
            [tourProjectId]: "complete",
          },
          hostLessComponents: [
            {
              type: "hostless-package",
              name: "App blocks",
              sectionLabel: "Basics",
              hiddenWhenInstalled: true,
              codeName: "plasmic-rich-components",
              codeLink:
                "https://github.com/plasmicapp/plasmic/tree/master/plasmicpkgs/plasmic-rich-components",
              items: [
                {
                  type: "hostless-component",
                  componentName: "hostless-rich-table",
                  displayName: "Table",
                  imageUrl: "https://static1.plasmic.app/table.svg",
                  gray: true,
                },
                {
                  type: "hostless-component",
                  componentName: "plasmic-antd5-form",
                  displayName: "Form",
                  imageUrl: "https://static1.plasmic.app/form.svg",
                },
              ],
              projectId: [PROJECT_IDS["rich-components"], PROJECT_IDS.antd5],
            },
            {
              type: "hostless-package",
              name: "Form",
              sectionLabel: "Basics",
              hiddenWhenInstalled: true,
              codeName: "antd5-form",
              codeLink:
                "https://github.com/plasmicapp/plasmic/tree/master/plasmicpkgs/plasmic-rich-components",
              items: [
                {
                  type: "hostless-component",
                  componentName: "plasmic-antd5-form",
                  displayName: "Form",
                  imageUrl: "https://static1.plasmic.app/form.svg",
                },
              ],
              projectId: PROJECT_IDS.antd5,
            },
          ],
        }).then(() => {
          cy.cloneProject({
            projectId: tourProjectId,
          }).then(
            (clonedProject: { projectId: string; workspaceId: string }) => {
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const { projectId, workspaceId } = clonedProject;

              cy.openProject({
                projectId,
              });

              cy.withinStudioIframe(() => {
                cy.wait(300);

                cy.contains(
                  "The Customer Operations team needs your help!"
                ).should("exist");

                // #welcome - 1 / 40
                cy.get("#tour-popup-welcome").should("be.visible");
                cy.get("#tour-primary-btn").click();
                cy.wait(300);

                // #part1-intro - 2 / 40
                cy.get("#tour-popup-part1-intro").should("be.visible");
                cy.get('[data-test-id="add-button"]').click();
                cy.wait(300);

                // #insert-panel - 3 / 40
                cy.get("#tour-popup-insert-panel").should("be.visible");
                cy.get("#tour-primary-btn").click();
                cy.wait(300);

                // #rich-table-add - 4 / 40
                cy.get("#tour-popup-rich-table-add").should("be.visible");
                cy.insertFromAddDrawer("hostless-rich-table");
                cy.wait(300);

                // #data-query-switch-component-tab - 5 / 40
                cy.get("#tour-popup-data-query-switch-component-tab").should(
                  "be.visible"
                );
                cy.switchToDataTab();
                cy.wait(300);

                // #data-tab - 6 / 40
                cy.get("#tour-popup-data-tab").should("be.visible");
                cy.get("#tour-primary-btn").click();
                cy.wait(300);

                // #data-query-add - 7 / 40
                cy.get("#tour-popup-data-query-add").should("be.visible");
                cy.get("#data-queries-add-btn").click();
                cy.wait(300);

                // #data-query-modal-draft - 8 / 40
                cy.get("#tour-popup-data-query-modal-draft").should(
                  "be.visible"
                );
                cy.get("#tour-primary-btn").click();
                cy.wait(300);

                // #data-query-modal-preview - 9 / 40
                cy.get("#tour-popup-data-query-modal-preview").should(
                  "be.visible"
                );
                cy.get("#tour-primary-btn").click();
                cy.wait(300);

                // #data-query-modal-save - 10 / 40
                cy.get("#tour-popup-data-query-modal-save").should(
                  "be.visible"
                );
                cy.get("#data-source-modal-save-btn").click();
                cy.wait(700);

                // #configure-table-settings-tab - 11 / 40
                cy.get("#tour-popup-configure-table-settings-tab").should(
                  "be.visible"
                );
                cy.switchToSettingsTab();
                cy.wait(300);

                // #configure-table - 12 / 40
                cy.get("#tour-popup-configure-table").should("be.visible");

                cy.get('[data-test-id="prop-editor-row-data"]').click();
                cy.get(`[data-key="'customers'"]`).click();
                cy.wait(300);

                // #part1-turn-on-interactive-mode - 13 / 40
                cy.get("#tour-popup-part1-turn-on-interactive-mode").should(
                  "be.visible"
                );
                cy.get("#interactive-canvas-switch").click();
                cy.wait(300);

                // #part1-turn-off-interactive-mode - 14 / 40
                cy.get("#tour-popup-part1-turn-off-interactive-mode").should(
                  "be.visible"
                );
                cy.get("#interactive-canvas-switch").click();
                cy.wait(300);

                // #part2-intro - 15 / 40
                cy.get("#tour-popup-part2-intro").should("be.visible");
                cy.get("#tour-primary-btn").click();
                cy.wait(300);

                // #configure-table-select-rows - 16 / 40
                cy.get("#tour-popup-configure-table-select-rows").should(
                  "be.visible"
                );

                cy.get(
                  '[data-test-id="prop-editor-row-canSelectRows"]'
                ).click();
                cy.get(`[data-key="'click'"]`).click();
                cy.wait(300);

                // #form-open-add-drawer - 17 / 40
                cy.get("#tour-popup-form-open-add-drawer").should("be.visible");
                cy.get('[data-test-id="add-button"]').click();
                cy.wait(300);

                // #form-add - 18 / 40
                cy.get("#tour-popup-form-add").should("be.visible");
                cy.insertFromAddDrawer("plasmic-antd5-form");
                cy.wait(300);

                // #form-items-add - 19 / 40
                cy.get("#tour-popup-form-items-add").should("be.visible");
                cy.get(
                  '[data-test-id="prop-editor-row-formItems"] .list-box__add-placeholder'
                ).click();
                cy.wait(300);

                // #form-items-label - 20 / 40
                cy.get("#tour-popup-form-items-label").should("be.visible");

                cy.get(
                  '#object-prop-editor-modal [data-test-id="prop-editor-row-label"]'
                ).click();
                cy.justType("Contact Name{enter}");
                cy.wait(300);

                // #form-items-type - 21 / 40
                cy.get("#tour-popup-form-items-type").should("be.visible");
                cy.get("#tour-primary-btn").click();
                cy.wait(300);

                // #form-items-name - 22 / 40
                cy.get("#tour-popup-form-items-name").should("be.visible");

                cy.get(
                  '#object-prop-editor-modal [data-test-id="prop-editor-row-name"]'
                ).click();
                cy.justType("contact_name{enter}");
                cy.wait(300);

                // #form-items-save - 23 / 40
                cy.get("#tour-popup-form-items-save").should("be.visible");
                cy.get(
                  '#sidebar-modal [data-test-id="close-sidebar-modal"]'
                ).click();
                cy.wait(700);

                // #form-items-auto-add - 24 / 40
                cy.get("#tour-popup-form-items-auto-add").should("be.visible");
                cy.get("#tour-primary-btn").click();
                cy.wait(300);

                // #form-initial-values-dynamic-value - 25 / 40
                cy.get("#tour-popup-form-initial-values-dynamic-value").should(
                  "be.visible"
                );

                cy.get(
                  '[data-test-id="prop-editor-row-initialValues"]'
                ).rightclick();
                cy.get("#use-dynamic-value-btn").click();
                cy.wait(300);

                // #form-initial-value-data-picker - 26 / 40
                cy.get("#tour-popup-form-initial-value-data-picker").should(
                  "be.visible"
                );

                cy.get(
                  '[data-test-id="data-picker"] [data-test-id="0-table → selectedRow"]'
                ).click();
                cy.get("#data-picker-save-btn").click();
                cy.wait(300);

                // #part2-turn-on-interactive-mode - 27 / 40
                cy.get("#tour-popup-part2-turn-on-interactive-mode").should(
                  "be.visible"
                );
                cy.get("#interactive-canvas-switch").click();
                cy.wait(300);

                // #part2-turn-off-interactive-mode - 28 / 40
                cy.get("#tour-popup-part2-turn-off-interactive-mode").should(
                  "be.visible"
                );
                cy.get("#interactive-canvas-switch").click();
                cy.wait(300);

                // #part3-intro - 29 / 40
                cy.get("#tour-popup-part3-intro").should("be.visible");
                cy.get("#tour-primary-btn").click();
                cy.wait(300);

                // #form-interaction-add - 30 / 40
                cy.get("#tour-popup-form-interaction-add").should("be.visible");
                cy.get('[data-test-id="add-interaction"]').click();
                cy.wait(300);

                // #form-interaction-on-submit - 31 / 40
                cy.get("#tour-popup-form-interaction-on-submit").should(
                  "be.visible"
                );
                cy.get("#interactions-select-opt-onFinish").click();
                cy.wait(300);

                // #form-interaction-use-integration - 32 / 40
                cy.get("#tour-popup-form-interaction-use-integration").should(
                  "be.visible"
                );

                cy.get('[data-plasmic-prop="action-name"]').click();
                cy.get('[data-key="dataSourceOp"]').click();
                cy.wait(2500);

                // #form-interaction-configure-operation - 33 / 40
                cy.get(
                  "#tour-popup-form-interaction-configure-operation"
                ).should("be.visible");
                cy.get("#configure-operation-btn").click();
                cy.wait(300);

                // #form-interaction-modal-draft - 34 / 40
                cy.get("#tour-popup-form-interaction-modal-draft").should(
                  "be.visible"
                );
                cy.get("#tour-primary-btn").click();
                cy.wait(300);

                // #interaction-modal-field-filters - 35 / 40
                cy.get("#tour-popup-interaction-modal-field-filters").should(
                  "be.visible"
                );
                cy.get("#tour-primary-btn").click();
                cy.wait(300);

                // #form-interaction-modal-field-updates - 36 / 40
                cy.get(
                  "#tour-popup-form-interaction-modal-field-updates"
                ).should("be.visible");
                cy.get("#tour-primary-btn").click();
                cy.wait(300);

                // #interaction-modal-save-btn - 37 / 40
                cy.get("#tour-popup-interaction-modal-save-btn").should(
                  "be.visible"
                );
                cy.get("#data-source-modal-save-btn").click();
                cy.wait(700);

                // #part3-turn-on-interactive-mode - 38 / 40
                cy.get("#tour-popup-part3-turn-on-interactive-mode").should(
                  "be.visible"
                );
                cy.get("#interactive-canvas-switch").click();
                cy.wait(300);

                // #part3-turn-off-interactive-mode - 39 / 40
                cy.get("#tour-popup-part3-turn-off-interactive-mode").should(
                  "be.visible"
                );
                cy.get("#interactive-canvas-switch").click();
                cy.wait(300);

                // #open-publish-modal - 40 / 40
                cy.get("#tour-popup-open-publish-modal").should("be.visible");
                pressPublishButton();
                cy.wait(300);
              });
            }
          );
        });
      });
    });
  });
});
