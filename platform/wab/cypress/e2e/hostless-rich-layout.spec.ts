import {
  chooseDataPlasmicProp,
  clickDataPlasmicProp,
  closeSidebarModal,
  justType,
  propAddItem,
  setDataPlasmicProp,
  showMoreInSidebarModal,
  turnOffDesignMode,
} from "../support/util";

let isWithinLiveFrame = false;
const maybeSelectedElt = () =>
  isWithinLiveFrame ? cy.get("#plasmic-app") : cy.getSelectedElt();

function checkLightFgColors() {
  maybeSelectedElt()
    .find(".ant-menu-item a")
    .first()
    .should(($elt) => {
      const color = getComputedStyle($elt[0]).color;
      expect(color).to.be.oneOf([
        "rgba(255, 255, 255, 0.65)",
        "rgba(255, 255, 255, 0.75)",
      ]);
    });
}

function checkDarkFgColors() {
  maybeSelectedElt()
    .find(".ant-menu-item a")
    .first()
    .should("have.css", "color", "rgba(83, 83, 83, 0.65)");
}

function checkActiveNavDarkBgPrimary() {
  maybeSelectedElt()
    .find(".ant-menu-item")
    .last()
    .should(($elt) => {
      const fill = getComputedStyle($elt[0]).backgroundColor;
      expect(fill).to.be.oneOf(["rgb(22, 104, 220)", "rgba(0, 0, 0, 0.15)"]);
    });
}

function checkSubmenus() {
  maybeSelectedElt()
    .find(".ant-menu-submenu-open")
    .contains("Should be expanded")
    .should("exist");
  maybeSelectedElt()
    .find(".ant-menu-submenu-open")
    .contains("Nested")
    .should("be.visible");
}

function checkSiderStyles() {
  maybeSelectedElt()
    .find(".ant-layout-sider")
    .should("have.css", "background-color", "rgb(22, 119, 255)");
  checkLightFgColors();
  // Check also that the active menu item background is darker.
  checkActiveNavDarkBgPrimary();
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

  it("RichLayout works", () => {
    // Create a project to use it
    cy.withinStudioIframe(() => {
      cy.createNewPageInOwnArena("About").then(() => {
        turnOffDesignMode();

        cy.insertFromAddDrawer("hostless-rich-layout");

        // Check white bg by default
        maybeSelectedElt()
          .find(".ant-layout-header")
          .should("have.css", "background-color", "rgb(255, 255, 255)");
        checkDarkFgColors();

        // Check that the current route should be styled differently.
        // Add route for /about (the location.path of About).
        // And add a link to /about.
        propAddItem("Nav menu items");
        setDataPlasmicProp("path", "/about");
        setDataPlasmicProp("name", "About");
        closeSidebarModal();
        maybeSelectedElt()
          .find(".ant-layout-header li a")
          .last()
          .should("have.css", "color", "rgba(83, 83, 83, 0.95)");

        // Check that changing color scheme works.
        // Check that foreground colors adapt.
        clickDataPlasmicProp("simpleNavTheme");

        chooseDataPlasmicProp("scheme", "dark");
        maybeSelectedElt()
          .find(".ant-layout-header")
          .should("have.css", "background-color", "rgb(1, 21, 40)");
        checkLightFgColors();

        chooseDataPlasmicProp("scheme", "custom");
        clickDataPlasmicProp("customBgColor");
        justType("#E6EEF4{enter}");
        maybeSelectedElt()
          .find(".ant-layout-header")
          .should("have.css", "background-color", "rgb(230, 238, 244)");
        checkDarkFgColors();
        cy.get("[data-test-id='back-sidebar-modal']").click();

        // TODO try custom token color too

        chooseDataPlasmicProp("scheme", "primary");
        maybeSelectedElt()
          .find(".ant-layout-header")
          .should("have.css", "background-color", "rgb(22, 119, 255)");
        checkLightFgColors();
        // Check also that the active menu item background is darker.
        checkActiveNavDarkBgPrimary();

        closeSidebarModal();

        // Check side menu mode.
        chooseDataPlasmicProp("layout", "side");
        checkSiderStyles();

        // Check nested nav.
        // Matching subroute should be expanded.
        propAddItem("Nav menu items");
        setDataPlasmicProp("path", "/");
        setDataPlasmicProp("name", "Should be closed");
        showMoreInSidebarModal();
        propAddItem("Nested items");
        setDataPlasmicProp("path", "/mismatch");
        setDataPlasmicProp("name", "Mismatch");
        closeSidebarModal();

        propAddItem("Nav menu items");
        setDataPlasmicProp("path", "/");
        setDataPlasmicProp("name", "Should be expanded");
        showMoreInSidebarModal();
        propAddItem("Nested items");
        setDataPlasmicProp("path", "/about");
        setDataPlasmicProp("name", "Nested");
        closeSidebarModal();

        // checkSubmenus();

        // Check live mode.

        cy.withinLiveMode(() => {
          isWithinLiveFrame = true;

          // Check styles
          checkSiderStyles();

          // Check nested nav.
          checkSubmenus();

          // Check sidebar expand/collapse works
          cy.get(".ant-pro-sider-collapsed-button").click();
          cy.get(".ant-layout-sider").should(($elt) => {
            expect($elt.width()).to.be.lt(100);
          });
          cy.get(".ant-pro-sider-collapsed-button").click();
          cy.get(".ant-layout-sider").should(($elt) => {
            expect($elt.width()).to.be.gt(100);
          });
        });
      });
    });
  });
});
