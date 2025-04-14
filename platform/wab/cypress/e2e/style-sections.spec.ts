// This test depends on the host-test package running.

import { uniq } from "lodash";
import {
  configureProjectAppHost,
  removeCurrentProject,
  setupNewProject,
} from "../support/util";

describe("Style sections", function () {
  beforeEach(() => {
    setupNewProject({
      name: "host-app",
    }).then(() => {
      cy.withinStudioIframe(() => {
        configureProjectAppHost("plasmic-host-style-sections");
      });
    });
  });

  afterEach(() => {
    removeCurrentProject();
  });

  function assertSectionsCount(count: number) {
    cy.get(".tab-content .SidebarSection__Container").should(
      "have.length",
      count
    );
  }

  function assertMissingClassWarning({
    componentName,
    codeComponentName,
    exists,
  }: {
    componentName?: string;
    codeComponentName?: string;
    exists: boolean;
  }) {
    const clause = exists ? "include.text" : "not.include.text";
    const sideBarSectionsContainer = cy.get(
      ".tab-content .SidebarSection__Container"
    );
    sideBarSectionsContainer.should(clause, "Not able to style code component");
    sideBarSectionsContainer.should(
      clause,
      `Component ${componentName ?? codeComponentName} does not support styling`
    );
    if (
      codeComponentName &&
      componentName &&
      codeComponentName !== componentName
    ) {
      sideBarSectionsContainer.should(
        clause,
        `It looks like the root code component ${codeComponentName} does not make use of a "className" prop, so you cannot set styles on the component.`
      );
    } else {
      sideBarSectionsContainer
        .debug()
        .should(
          clause,
          `It looks like the code component ${
            codeComponentName ?? componentName
          } does not make use of a "className" prop, so you cannot set styles on the component.`
        );
    }
  }

  function assertNoStyleSections() {
    assertSectionsCount(1);
    assertMissingClassWarning({ exists: false });
  }

  function assertMissingClassNameSection({
    componentName,
    codeComponentName,
  }: {
    componentName?: string;
    codeComponentName?: string;
  }) {
    assertSectionsCount(2);
    assertMissingClassWarning({
      componentName,
      codeComponentName,
      exists: true,
    });
  }

  function testNoStyleSections(insertComponentName?: string) {
    if (insertComponentName) {
      cy.insertFromAddDrawer(insertComponentName);
    }
    cy.switchToDesignTab();
    assertNoStyleSections();
  }

  function testStyleSectionsNoClassName({
    componentName,
    codeComponentName,
  }: {
    componentName?: string;
    codeComponentName?: string;
  }) {
    cy.switchToDesignTab();
    assertMissingClassNameSection({
      componentName,
      codeComponentName,
    });
  }

  function testStyleSectionsWithClassName(insertComponentName?: string) {
    if (insertComponentName) {
      cy.insertFromAddDrawer(insertComponentName);
    }
    cy.switchToDesignTab();
    assertMissingClassWarning({ exists: false });
  }

  function extractComponent(extractedName: string) {
    cy.extractComponentNamed(extractedName);
    cy.clearNotifications();
  }

  function testSections(sections: string[], isComp: boolean) {
    const baseCount = styleSectionsThatAlwaysOccurInStyleableTpl.length + 1 + 1; // +1 for name section and another +1 for positioning section

    // Count sections that translate to 2 sections (only if they're not in NeverOccurInComp when isComp is true)
    const sectionsThatTranslateTo2 = sections
      .filter((s) => styleSectionsThatTranslateTo2Sections.includes(s))
      .filter((s) =>
        !isComp ? true : !styleSectionsThatNeverOccurInComp.includes(s)
      ).length;

    // Count other sections (excluding those that translate to 2 and those that always occur)
    const otherCount = sections
      .filter((s) =>
        !isComp ? true : !styleSectionsThatNeverOccurInComp.includes(s)
      )
      .filter((s) => !styleSectionsThatAlwaysOccurInStyleableTpl.includes(s))
      .filter((s) => !styleSectionsThatTranslateTo2Sections.includes(s)).length;

    cy.switchToDesignTab();
    // We expect:
    // - Name section (always present)
    // - Spacing section (always present when styleSections is true)
    // - Positioning section (always present when styleSections is true)
    // - The specific section (e.g., visibility, transform, etc.)
    // - For sections that translate to 2 sections, count them as 2 (but only if they're not in NeverOccurInComp when isComp is true)
    assertSectionsCount(baseCount + otherCount + sectionsThatTranslateTo2 * 2);
  }

  const styleSectionsThatTranslateTo2Sections = ["border"];

  const styleSectionsThatNeverOccurInComp = [
    "typography",
    "shadows",
    "border",
    "effects",
    "background",
    "overflow",
    "layout",
  ];

  const styleSectionsThatMayOccurInComp = [
    "visibility",
    "transform",
    "transitions",
    "sizing",
  ];

  const styleSectionsThatAlwaysOccurInStyleableTpl = ["spacing"];

  const styleSections: string[] = uniq([
    ...styleSectionsThatTranslateTo2Sections,
    ...styleSectionsThatNeverOccurInComp,
    ...styleSectionsThatMayOccurInComp,
    ...styleSectionsThatAlwaysOccurInStyleableTpl,
  ]).sort();

  it("Should work", function () {
    cy.withinStudioIframe(() => {
      cy.createNewPageInOwnArena("NewPage").then(() => {
        testNoStyleSections("NoStyleSections");
        extractComponent("CompNoStyleSections");
        testNoStyleSections();
        extractComponent("CompCompNoStyleSections");
        testNoStyleSections();

        cy.insertFromAddDrawer("StyleSectionsNoClassName");
        testStyleSectionsNoClassName({
          componentName: "StyleSectionsNoClassName",
        });
        extractComponent("CompStyleSectionsNoClassName");
        testStyleSectionsNoClassName({
          componentName: "CompStyleSectionsNoClassName",
          codeComponentName: "StyleSectionsNoClassName",
        });
        extractComponent("CompCompStyleSectionsNoClassName");
        testStyleSectionsNoClassName({
          componentName: "CompCompStyleSectionsNoClassName",
          codeComponentName: "StyleSectionsNoClassName",
        });

        testStyleSectionsWithClassName("StyleSectionsWithClassName");
        extractComponent("CompStyleSectionsWithClassName");
        testStyleSectionsWithClassName();
        extractComponent("CompCompStyleSectionsWithClassName");
        testStyleSectionsWithClassName();

        for (let i = 0; i < styleSections.length; i++) {
          const singleSection = styleSections[i];
          cy.insertFromAddDrawer(`S_${singleSection}`);
          testSections([singleSection], false);
          extractComponent(`CompS_${singleSection}`);
          testSections([singleSection], true);
          extractComponent(`CompCompS_${singleSection}`);
          testSections([singleSection], true);

          // for dual, only test every 3rd section to reduce test time
          for (let j = i + 1; j < styleSections.length; j += 3) {
            const section1 = styleSections[i];
            const section2 = styleSections[j];
            cy.insertFromAddDrawer(`D_${section1}_${section2}`);
            testSections([section1, section2], false);
            extractComponent(`CompD_${section1}_${section2}`);
            testSections([section1, section2], true);
            extractComponent(`CompCompD_${section1}_${section2}`);
            testSections([section1, section2], true);
          }
        }

        cy.insertFromAddDrawer(`All`);
        testSections(styleSections, false);
        extractComponent(`CompAll`);
        testSections(styleSections, true);
        extractComponent(`CompCompAll`);
        testSections(styleSections, true);
      });
    });
  });
});
