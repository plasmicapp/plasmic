import query from "../fixtures/northwind-orders-query.json";
import {
  chooseDataPlasmicProp,
  chooseDataPlasmicPropByLabel,
  clickDataPlasmicProp,
  closeSidebarModal,
  enterCustomCodeInDataPicker,
  expandSection,
  getDataPlasmicProp,
  getSelectedElt,
  propAddItem,
  setDataPlasmicProp,
  switchToDataTab,
  switchToSettingsTab,
  turnOffDesignMode,
} from "../support/util";

let isWithinLiveFrame = false;
const maybeSelectedElt = () =>
  isWithinLiveFrame ? cy.get("#plasmic-app") : cy.getSelectedElt();

function maskTimestampHours(x: string) {
  return x.replace(/(, )\d+(:\d+)/, "$1XX$2");
}

describe("hostless-rich-components", () => {
  beforeEach(() => {
    cy.setupProjectWithHostlessPackages({
      hostLessPackagesInfo: [
        {
          name: "antd5",
          npmPkg: ["@plasmicpkgs/antd5"],
        },
        {
          name: "plasmic-rich-components",
          npmPkg: [
            "@plasmicpkgs/plasmic-rich-components",
            "@ant-design/icons",
            "@ant-design/pro-components",
          ],
          deps: ["antd5"],
        },
      ],
    });
  });

  it("RichTable works", () => {
    // Create a project to use it
    cy.withinStudioIframe(() => {
      cy.createNewPageInOwnArena("Homepage").then(() => {
        turnOffDesignMode();

        cy.insertFromAddDrawer("hostless-rich-table");

        chooseDataPlasmicProp("data", "[[dynamic value]]");
        cy.ensureDataPickerInCustomCodeMode();
        cy.resetMonacoEditorToCode(JSON.stringify(query));

        chooseDataPlasmicPropByLabel("canSelectRows", "By clicking a row");

        cy.get("#interactive-canvas-switch").click();

        function checkAndInteract() {
          maybeSelectedElt().should(($elt) => {
            // Columns are all there
            const headers = $elt.find("thead th");
            expect([...headers].map((x) => x.innerText)).to.deep.equal([
              "order_id",
              "customer_id",
              "employee_id",
              "order_date",
              "required_date",
              "shipped_date",
              "ship_via",
              "freight",
              "ship_name",
              "ship_address",
              "ship_city",
              "ship_region",
              "ship_postal_code",
              "ship_country",
            ]);
          });

          // Pagination
          maybeSelectedElt().within(() => {
            cy.contains("1-10 of 830 items").should("exist");
            cy.get(".ant-pagination-item:contains(83)").should("exist");
          });

          // Filtering works
          // Default date, number formatting
          maybeSelectedElt().within(() => {
            cy.get('input[placeholder="Search"]').type("10248");
            cy.get("tbody tr").should("have.length", 1);
          });
          // Needs to be agnostic to timezone, since everyone is different.
          // Replace hour with XX.
          maybeSelectedElt().should(($elt) => {
            const firstRow = $elt.find("tbody tr td");
            expect(
              [...firstRow].map((x) => maskTimestampHours(x.innerText)).sort()
            ).to.deep.equal(
              [
                "",
                "", // First column is the hidden selection column
                "10,248",
                "3",
                "32.38",
                "5",
                "51,100",
                "59 rue de l'Abbaye",
                "7/16/96, 12:00 AM",
                "7/4/96, 12:00 AM",
                "8/1/96, 12:00 AM",
                "France",
                "Reims",
                "VINET",
                "Vins et alcools Chevalier",
              ]
                .map(maskTimestampHours)
                .sort()
            );
          });
          maybeSelectedElt().find('input[placeholder="Search"]').clear();

          // Selection works
          maybeSelectedElt()
            .find("tbody tr")
            .eq(2)
            .find("td")
            .eq(2)
            .click()
            .should("have.css", "background-color", "rgb(186, 224, 255)");
        }

        checkAndInteract();

        // Inspect state
        switchToDataTab();
        expandSection("variables-section");
        cy.get('[data-test-id="table.selectedRowKey"]').should(
          "include.text",
          "3"
        );
        switchToSettingsTab();

        cy.get("#interactive-canvas-switch").click();

        // Check live mode.
        cy.withinLiveMode(() => {
          isWithinLiveFrame = true;
          checkAndInteract();
          isWithinLiveFrame = false;
        });

        // Hide a field
        cy.get("button:contains(order_id)").click();
        clickDataPlasmicProp("isHidden");
        closeSidebarModal();

        // Configure a field
        cy.get("button:contains(customer_id)").click();
        setDataPlasmicProp("title", "Customer");
        clickDataPlasmicProp("expr");
        // Expr has both currentValue and currentItem
        // Also exercise syntax handling of custom code
        enterCustomCodeInDataPicker(`
        const xs = [0,1].map(x => currentValue.toLowerCase() + currentItem.order_id).join(' ');
        xs
        `);
        closeSidebarModal();

        // Configure formatting
        cy.get("button:contains(order_date)").click();
        // For some reason, this is yielding > 1
        getDataPlasmicProp("dataType").should("have.length", 1);
        chooseDataPlasmicProp("dataType", "datetime");
        clickDataPlasmicProp("hour12");
        closeSidebarModal();

        // Add custom field
        propAddItem("Fields");
        setDataPlasmicProp("title", "Orig customer ID");
        clickDataPlasmicProp("expr");
        enterCustomCodeInDataPicker("currentItem.customer_id");
        closeSidebarModal();

        // Check new columns
        maybeSelectedElt().then(($elt) => {
          const headers = $elt.find("tbody tr:nth-child(1) td");
          cy.log(JSON.stringify([...headers].map((x) => x.innerText).sort()));
        });
        getSelectedElt().should(($elt) => {
          // Columns are all there
          const headers = $elt.find("thead th");
          expect([...headers].map((x) => x.innerText).sort()).to.deep.equal([
            "Customer",
            "Orig customer ID",
            "employee_id",
            "freight",
            "order_date",
            "required_date",
            "ship_address",
            "ship_city",
            "ship_country",
            "ship_name",
            "ship_postal_code",
            "ship_region",
            "ship_via",
            "shipped_date",
          ]);
        });
        getSelectedElt().should(($elt) => {
          const firstRow = $elt.find("tbody tr:nth-child(1) td");
          expect(
            [...firstRow].map((x) => maskTimestampHours(x.innerText)).sort()
          ).to.deep.equal(
            [
              "",
              "",
              "3",
              "32.38",
              "5",
              "51,100",
              "59 rue de l'Abbaye",
              "7/16/96, 12:00 AM",
              "7/4/96, 24:00",
              "8/1/96, 12:00 AM",
              "France",
              "Reims",
              "VINET",
              "Vins et alcools Chevalier",
              "vinet10248 vinet10248",
            ]
              .map(maskTimestampHours)
              .sort()
          );
        });
      });
    });
  });
});
