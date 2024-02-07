import query from "../../fixtures/northwind-orders-query.json";
import { turnOffDesignMode } from "../../support/util";

describe("Antd5 pagination", () => {
  beforeEach(() => {
    cy.setupProjectWithHostlessPackages({
      hostLessPackagesInfo: [
        {
          name: "antd5",
          npmPkg: ["@plasmicpkgs/antd5"],
        },
      ],
    });
  });

  it("works", () => {
    // Create a project to use it
    cy.withinStudioIframe(() => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      cy.createNewPageInOwnArena("Homepage").then((framed) => {
        turnOffDesignMode();
        cy.insertFromAddDrawer("plasmic-antd5-pagination");
        cy.get(`[data-test-id="prop-editor-row-total"] label`).rightclick();
        cy.contains("Use dynamic value").click();
        cy.contains("Switch to Code").click();
        cy.resetMonacoEditorToCode(`${query.data.length}`);

        cy.get(
          `#component-props-section [data-test-id="show-extra-content"]`
        ).click();

        cy.get(`[data-test-id="prop-editor-row-showQuickJumper"] label`)
          .eq(0)
          .rightclick();
        cy.contains("Use dynamic value").click();
        cy.contains("Switch to Code").click();
        cy.resetMonacoEditorToCode("true");

        cy.get(
          `[data-test-id="prop-editor-row-paginatedUrl"] label`
        ).rightclick();
        cy.contains("Use dynamic value").click();
        cy.contains("Switch to Code").click();
        cy.resetMonacoEditorToCode(
          "`https://test.com?_page=${pageNo}&_limit=${pageSize}`"
        );

        cy.get(`[data-test-id="prop-editor-row-showTotal"] label`).rightclick();
        cy.contains("Use dynamic value").click();
        cy.contains("Switch to Code").click();
        cy.resetMonacoEditorToCode("`${range} / ${total}`");

        cy.insertFromAddDrawer("Text");
        cy.addHtmlAttribute("id", "pagination-state-current-page");
        cy.get(`[data-test-id="text-content"] label`).rightclick();
        cy.contains("Use dynamic value").click();
        cy.get(`[data-test-id="data-picker"]`).contains("currentPage").click();
        cy.get(`[data-test-id="data-picker"]`)
          .contains("button", "Save")
          .click();

        cy.insertFromAddDrawer("Text");
        cy.addHtmlAttribute("id", "pagination-state-page-size");
        cy.get(`[data-test-id="text-content"] label`).rightclick();
        cy.contains("Use dynamic value").click();
        cy.get(`[data-test-id="data-picker"]`).contains("pageSize").click();
        cy.get(`[data-test-id="data-picker"]`)
          .contains("button", "Save")
          .click();

        cy.insertFromAddDrawer("Text");
        cy.addHtmlAttribute("id", "pagination-state-start-index");
        cy.get(`[data-test-id="text-content"] label`).rightclick();
        cy.contains("Use dynamic value").click();
        cy.get(`[data-test-id="data-picker"]`).contains("startIndex").click();
        cy.get(`[data-test-id="data-picker"]`)
          .contains("button", "Save")
          .click();

        cy.insertFromAddDrawer("Text");
        cy.addHtmlAttribute("id", "pagination-state-end-index");
        cy.get(`[data-test-id="text-content"] label`).rightclick();
        cy.contains("Use dynamic value").click();
        cy.get(`[data-test-id="data-picker"]`).contains("endIndex").click();
        cy.get(`[data-test-id="data-picker"]`)
          .contains("button", "Save")
          .click();

        cy.insertFromAddDrawer("Vertical stack");
        cy.addHtmlAttribute("id", "northwind-orders");

        cy.insertFromAddDrawer("Text");
        cy.repeatOnCustomCode(`
          const query = ${JSON.stringify(query.data)};
            query.slice(
                $state.pagination.startIndex,
                $state.pagination.endIndex + 1
            )
          `);
        cy.get(`[data-test-id="text-content"] label`).rightclick();
        cy.contains("Use dynamic value").click();
        cy.contains("Switch to Code").click();
        cy.resetMonacoEditorToCode(
          "`${currentItem.order_id}. ${currentItem.ship_name}`"
        );

        // Check live mode.
        cy.withinLiveMode(() => {
          cy.get("#pagination-state-current-page").should("have.text", "1");
          cy.get("#pagination-state-page-size").should("have.text", "10");
          cy.get("#pagination-state-start-index").should("have.text", "0");
          cy.get("#pagination-state-end-index").should("have.text", "9");
          cy.get(".ant-pagination-total-text").should(
            "have.text",
            "1,10 / 830"
          );
          cy.get("#northwind-orders").children().should("have.length", 10);
          cy.get("#northwind-orders")
            .children()
            .eq(0)
            .should("have.text", "10248. Vins et alcools Chevalier");

          cy.get(".ant-pagination-options-quick-jumper input").type("4");
          cy.get(".ant-pagination-options-quick-jumper input").type("{enter}");

          cy.get("#pagination-state-current-page").should("have.text", "4");
          cy.get("#pagination-state-page-size").should("have.text", "10");
          cy.get("#pagination-state-start-index").should("have.text", "30");
          cy.get("#pagination-state-end-index").should("have.text", "39");
          cy.get(".ant-pagination-total-text").should(
            "have.text",
            "31,40 / 830"
          );
          cy.get("#northwind-orders").children().should("have.length", 10);
          cy.get("#northwind-orders")
            .children()
            .eq(0)
            .should("have.text", "10278. Berglunds snabbköp");

          cy.get(".ant-select-selector").click();
          cy.contains("20 / page").click();

          cy.get("#pagination-state-current-page").should("have.text", "4");
          cy.get("#pagination-state-page-size").should("have.text", "20");
          cy.get("#pagination-state-start-index").should("have.text", "60");
          cy.get("#pagination-state-end-index").should("have.text", "79");
          cy.get(".ant-pagination-total-text").should(
            "have.text",
            "61,80 / 830"
          );
          cy.get("#northwind-orders").children().should("have.length", 20);
          cy.get("#northwind-orders")
            .children()
            .eq(0)
            .should("have.text", "10308. Ana Trujillo Emparedados y helados");

          cy.get(
            ".ant-pagination-item[title='3'] a[href='https://test.com?_page=3&_limit=20'][rel='prev']"
          ).should("exist");
          cy.get(".ant-pagination-item[title='3']").click();

          cy.get("#pagination-state-current-page").should("have.text", "3");
          cy.get("#pagination-state-page-size").should("have.text", "20");
          cy.get("#pagination-state-start-index").should("have.text", "40");
          cy.get("#pagination-state-end-index").should("have.text", "59");
          cy.get(".ant-pagination-total-text").should(
            "have.text",
            "41,60 / 830"
          );
          cy.get("#northwind-orders").children().should("have.length", 20);
          cy.get("#northwind-orders")
            .children()
            .eq(0)
            .should("have.text", "10288. Reggiani Caseifici");
        });
      });
    });
  });
});
