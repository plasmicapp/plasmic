import { turnOffDesignMode } from "../support/util";

/**
 * Adds a calendar and sets its default value.
 * NOTE: Setting a default value is important, because we are dealing with dates!
 * The calendar looks different depending on when the test runs
 * (e.g. Next year, the calendar will show year 2024 by default).
 * We don't want to break the test due to this variation, so we set a default value.
 * Now it will always show the same data no matter when.
 *
 * Also, the year and month dropdowns use virtual list, so the items in the list will vary depending on what month/year the test runs.
 * So it's also not recommended to get cypress to click on the items in virtual list and reach the desired date in the calendar.
 * @param defaultValue
 */
function addCalendar(defaultValue?: string) {
  cy.insertFromAddDrawer("hostless-rich-calendar");
  if (!defaultValue) {
    return;
  }
  cy.get(`[data-test-id="prop-editor-row-value"] label`)
    .contains("Value")
    .rightclick();
  cy.get("#use-dynamic-value-btn").click(); // NOTE: This is not selectable by .contains("Use dynamic value"), which is strange!
  cy.contains("Switch to Code").click();
  cy.resetMonacoEditorToCode(`"${defaultValue}"`);
}

describe("hostless-rich-calendar", () => {
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

  it("calendar states work", () => {
    // Create a project to use it
    cy.withinStudioIframe(() => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      cy.createNewPageInOwnArena("Homepage").then((framed) => {
        turnOffDesignMode();

        addCalendar("2022-08-01");

        cy.insertFromAddDrawer("Text");
        cy.renameTreeNode("text-calendar-mode");
        cy.get(`[data-test-id="text-content"] label`).rightclick();
        cy.contains("Use dynamic value").click();
        cy.get(`[data-test-id="data-picker"]`).contains("mode").click();
        cy.get(`[data-test-id="data-picker"]`)
          .contains("button", "Save")
          .click();
        cy.insertFromAddDrawer("Text");
        cy.renameTreeNode("text-calendar-selected-date");
        cy.get(`[data-test-id="text-content"] label`).rightclick();
        cy.contains("Use dynamic value").click();
        cy.get(`[data-test-id="data-picker"]`).contains("selectedDate").click();
        cy.get(`[data-test-id="data-picker"]`)
          .contains("button", "Save")
          .click();

        // Check live mode.

        cy.withinLiveMode(() => {
          // checks "selectedDate" state
          // NOTE: [456] indicates that the date could be 24 or 25 or 26 depending on the timezone
          cy.contains(/2022-08-2[456]T\d{2}:\d{2}:\d{2}\.\d{3}Z/).should(
            "not.exist"
          );
          cy.get(".ant-picker-content").contains("25").click();
          cy.contains(/2022-08-2[456]T\d{2}:\d{2}:\d{2}\.\d{3}Z/).should(
            "exist"
          );

          // checks "mode" state
          cy.contains("month").should("not.exist");
          cy.contains("year").should("not.exist");
          cy.get(".ant-radio-button-wrapper").eq(1).click();
          cy.contains("month").should("not.exist");
          cy.contains("year").should("exist");
          cy.get(".ant-radio-button-wrapper").eq(0).click();
          cy.contains("month").should("exist");
          cy.contains("year").should("not.exist");
        });
      });
    });
  });

  it("calendar valid range works", () => {
    // Create a project to use it
    cy.withinStudioIframe(() => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      cy.createNewPageInOwnArena("Homepage").then((framed) => {
        turnOffDesignMode();

        addCalendar();
        cy.get(
          `#component-props-section [data-test-id="show-extra-content"]`
        ).click();
        cy.get(`[data-test-id="prop-editor-row-validRange"] label`)
          .contains("Valid range")
          .rightclick();
        cy.get("#use-dynamic-value-btn").click(); // NOTE: This is not selectable by .contains("Use dynamic value"), which is strange!
        cy.contains("Switch to Code").click();
        cy.resetMonacoEditorToCode('["2022-09-06", "2022-11-26"]');

        // Check live mode.

        cy.withinLiveMode(() => {
          cy.get(".ant-radio-button-wrapper").eq(1).click(); // change mode to year
          cy.get(".ant-select-selector").first().click();
          cy.get(".ant-select-dropdown .rc-virtual-list-holder-inner")
            .contains("2023")
            .should("not.exist");
          cy.get(".ant-select-dropdown .rc-virtual-list-holder-inner")
            .contains("2022")
            .should("exist")
            .click();
          cy.get(".ant-picker-cell-disabled").should("have.length", 9);
        });
      });
    });
  });

  it("calendar events are rendered", () => {
    // Create a project to use it
    cy.withinStudioIframe(() => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      cy.createNewPageInOwnArena("Homepage").then((framed) => {
        turnOffDesignMode();

        addCalendar(`2023`);
        cy.get(`[data-test-id="prop-editor-row-data"] label`)
          .contains("Events")
          .rightclick();
        cy.get("#use-dynamic-value-btn").click(); // NOTE: This is not selectable by .contains("Use dynamic value"), which is strange!
        cy.contains("Switch to Code").click();
        cy.resetMonacoEditorToCode(
          `[
              {
                  "date": "2023-05-10 09:24:15",
                  "name": "Mustafa Birthday",
                  "color": "gold",
                  "image": "https://www.one-stop-party-ideas.com/images/First-Outfit-Boy.jpg"
              },
              {
                  "date": "2023-05-15 09:24:15",
                  "name": "Affan Birthday",
                  "color": "red",
                  "image": "https://aspenjay.com/wp-content/uploads/2021/08/baby-1st-birthday-photos.jpg"
              },
              {
                  "date": "2023-01-02T22:30:00.000+00:00",
                  "name": "Usman Birthday",
                  "color": "blue",
                  "image": "https://www.bakingo.com/blog/wp-content/uploads/2023/02/vanilla.jpg"
              },
              {
                  "date": "Sun, 25 Apr 2021 13:23:12 +0630",
                  "name": "Sarah Birthday",
                  "color": "purple",
                  "image": "https://www.bakingo.com/blog/wp-content/uploads/2023/02/vanilla.jpg"
              },
              {
                  "date": "2023-01-13T22:30:00.000+00:00",
                  "name": "Jaweria Birthday",
                  "color": "pink",
                  "image": "https://www.bakingo.com/blog/wp-content/uploads/2023/02/vanilla.jpg"
              },
              {
                  "date": "2023-11-26T22:30:00.000+00:00",
                  "name": "Safi Birthday",
                  "color": "silver",
                  "image": "https://www.bakingo.com/blog/wp-content/uploads/2023/02/vanilla.jpg"
              }
          ]`
        );

        // Check live mode.

        cy.withinLiveMode(() => {
          cy.get(".ant-radio-button-wrapper").eq(1).click(); // change mode to year

          cy.get(`.ant-picker-month-panel table td[title="2023-05"] li`).should(
            "have.length",
            2
          );
          cy.get(`.ant-picker-month-panel table td[title="2023-05"] li`)
            .first()
            .get(".ant-badge-color-gold")
            .should("exist");
          cy.get(`.ant-picker-month-panel table td[title="2023-05"] li`)
            .first()
            .contains("Mustafa Birthday")
            .should("exist");
          cy.get(`.ant-picker-month-panel table td[title="2023-05"] li`)
            .eq(1)
            .get(".ant-badge-color-red")
            .should("exist");
          cy.get(`.ant-picker-month-panel table td[title="2023-05"] li`)
            .eq(1)
            .contains("Affan Birthday")
            .should("exist");

          cy.get(`.ant-picker-month-panel table td[title="2023-01"] li`).should(
            "have.length",
            2
          );
          cy.get(`.ant-picker-month-panel table td[title="2023-10"] li`).should(
            "have.length",
            0
          );
          cy.get(`.ant-picker-month-panel table td[title="2023-11"] li`).should(
            "have.length",
            1
          );
          cy.get(`.ant-picker-month-panel table td[title="2023-12"] li`).should(
            "have.length",
            0
          );
        });
      });
    });
  });
});
