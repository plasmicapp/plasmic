import { expect } from "@playwright/test";
import { uniq } from "lodash";
import { test } from "../fixtures/test";

test.describe("Style sections", () => {
  let projectId: string;

  test.beforeEach(async ({ apiClient, page, models }) => {
    projectId = await apiClient.setupNewProject({ name: "host-app" });
    await page.goto(`/projects/${projectId}`);
    await models.studio.rightPanel.configureProjectAppHost(
      "plasmic-host-style-sections"
    );
  });

  test.afterEach(async ({ apiClient }) => {
    await apiClient.removeProjectAfterTest(
      projectId,
      "user2@example.com",
      "!53kr3tz!"
    );
  });

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

  test("Should work", async ({ models }) => {
    await models.studio.createNewPageInOwnArena("NewPage");

    const sections = models.studio.rightPanel.frame.locator(
      ".tab-content .SidebarSection__Container"
    );
    const sideBarSectionsContainer =
      models.studio.rightPanel.frame.locator(".tab-content");

    await models.studio.leftPanel.insertNode("NoStyleSections");
    await models.studio.rightPanel.switchToDesignTab();
    await expect(sections).toHaveCount(1);
    await expect(sideBarSectionsContainer).not.toContainText(
      "Not able to style code component"
    );

    await models.studio.extractComponentNamed("CompNoStyleSections");
    await models.studio.clearNotifications();
    await models.studio.rightPanel.switchToDesignTab();
    await expect(sections).toHaveCount(1);
    await expect(sideBarSectionsContainer).not.toContainText(
      "Not able to style code component"
    );

    await models.studio.extractComponentNamed("CompCompNoStyleSections");
    await models.studio.clearNotifications();
    await models.studio.rightPanel.switchToDesignTab();
    await expect(sections).toHaveCount(1);
    await expect(sideBarSectionsContainer).not.toContainText(
      "Not able to style code component"
    );

    await models.studio.leftPanel.insertNode("StyleSectionsNoClassName");
    await models.studio.rightPanel.switchToDesignTab();
    await expect(sections).toHaveCount(2);
    await expect(sideBarSectionsContainer).toContainText(
      "Not able to style code component"
    );
    await expect(sideBarSectionsContainer).toContainText(
      "Component StyleSectionsNoClassName does not support styling"
    );
    await expect(sideBarSectionsContainer).toContainText(
      'It looks like the code component StyleSectionsNoClassName does not make use of a "className" prop'
    );

    await models.studio.extractComponentNamed("CompStyleSectionsNoClassName");
    await models.studio.clearNotifications();
    await models.studio.rightPanel.switchToDesignTab();
    await expect(sections).toHaveCount(2);
    await expect(sideBarSectionsContainer).toContainText(
      "Not able to style code component"
    );
    await expect(sideBarSectionsContainer).toContainText(
      "Component CompStyleSectionsNoClassName does not support styling"
    );
    await expect(sideBarSectionsContainer).toContainText(
      'It looks like the root code component StyleSectionsNoClassName does not make use of a "className" prop'
    );

    await models.studio.extractComponentNamed(
      "CompCompStyleSectionsNoClassName"
    );
    await models.studio.clearNotifications();
    await models.studio.rightPanel.switchToDesignTab();
    await expect(sections).toHaveCount(2);
    await expect(sideBarSectionsContainer).toContainText(
      "Not able to style code component"
    );
    await expect(sideBarSectionsContainer).toContainText(
      "Component CompCompStyleSectionsNoClassName does not support styling"
    );
    await expect(sideBarSectionsContainer).toContainText(
      'It looks like the root code component StyleSectionsNoClassName does not make use of a "className" prop'
    );

    await models.studio.leftPanel.insertNode("StyleSectionsWithClassName");
    await models.studio.rightPanel.switchToDesignTab();
    await expect(sideBarSectionsContainer).not.toContainText(
      "Not able to style code component"
    );

    await models.studio.extractComponentNamed("CompStyleSectionsWithClassName");
    await models.studio.clearNotifications();
    await models.studio.rightPanel.switchToDesignTab();
    await expect(sideBarSectionsContainer).not.toContainText(
      "Not able to style code component"
    );

    await models.studio.extractComponentNamed(
      "CompCompStyleSectionsWithClassName"
    );
    await models.studio.clearNotifications();
    await models.studio.rightPanel.switchToDesignTab();
    await expect(sideBarSectionsContainer).not.toContainText(
      "Not able to style code component"
    );

    for (let i = 0; i < styleSections.length; i++) {
      const singleSection = styleSections[i];
      await models.studio.leftPanel.insertNode(`S_${singleSection}`);

      const baseCount =
        styleSectionsThatAlwaysOccurInStyleableTpl.length + 1 + 1;
      const sectionsThatTranslateTo2 = [singleSection].filter((s) =>
        styleSectionsThatTranslateTo2Sections.includes(s)
      ).length;
      const otherCount = [singleSection]
        .filter((s) => !styleSectionsThatAlwaysOccurInStyleableTpl.includes(s))
        .filter(
          (s) => !styleSectionsThatTranslateTo2Sections.includes(s)
        ).length;

      await models.studio.rightPanel.switchToDesignTab();
      await expect(sections).toHaveCount(
        baseCount + otherCount + sectionsThatTranslateTo2 * 2
      );

      await models.studio.extractComponentNamed(`CompS_${singleSection}`);
      await models.studio.clearNotifications();

      const sectionsThatTranslateTo2Comp = [singleSection]
        .filter((s) => styleSectionsThatTranslateTo2Sections.includes(s))
        .filter((s) => !styleSectionsThatNeverOccurInComp.includes(s)).length;
      const otherCountComp = [singleSection]
        .filter((s) => !styleSectionsThatNeverOccurInComp.includes(s))
        .filter((s) => !styleSectionsThatAlwaysOccurInStyleableTpl.includes(s))
        .filter(
          (s) => !styleSectionsThatTranslateTo2Sections.includes(s)
        ).length;

      await models.studio.rightPanel.switchToDesignTab();
      await expect(sections).toHaveCount(
        baseCount + otherCountComp + sectionsThatTranslateTo2Comp * 2
      );

      await models.studio.extractComponentNamed(`CompCompS_${singleSection}`);
      await models.studio.clearNotifications();
      await models.studio.rightPanel.switchToDesignTab();
      await expect(sections).toHaveCount(
        baseCount + otherCountComp + sectionsThatTranslateTo2Comp * 2
      );

      for (let j = i + 1; j < styleSections.length; j += 3) {
        const section1 = styleSections[i];
        const section2 = styleSections[j];
        await models.studio.leftPanel.insertNode(`D_${section1}_${section2}`);

        const dualSections = [section1, section2];
        const sectionsThatTranslateTo2Dual = dualSections.filter((s) =>
          styleSectionsThatTranslateTo2Sections.includes(s)
        ).length;
        const otherCountDual = dualSections
          .filter(
            (s) => !styleSectionsThatAlwaysOccurInStyleableTpl.includes(s)
          )
          .filter(
            (s) => !styleSectionsThatTranslateTo2Sections.includes(s)
          ).length;

        await models.studio.rightPanel.switchToDesignTab();
        await expect(sections).toHaveCount(
          baseCount + otherCountDual + sectionsThatTranslateTo2Dual * 2
        );

        await models.studio.extractComponentNamed(
          `CompD_${section1}_${section2}`
        );
        await models.studio.clearNotifications();

        const sectionsThatTranslateTo2DualComp = dualSections
          .filter((s) => styleSectionsThatTranslateTo2Sections.includes(s))
          .filter((s) => !styleSectionsThatNeverOccurInComp.includes(s)).length;
        const otherCountDualComp = dualSections
          .filter((s) => !styleSectionsThatNeverOccurInComp.includes(s))
          .filter(
            (s) => !styleSectionsThatAlwaysOccurInStyleableTpl.includes(s)
          )
          .filter(
            (s) => !styleSectionsThatTranslateTo2Sections.includes(s)
          ).length;

        await models.studio.rightPanel.switchToDesignTab();
        await expect(sections).toHaveCount(
          baseCount + otherCountDualComp + sectionsThatTranslateTo2DualComp * 2
        );

        await models.studio.extractComponentNamed(
          `CompCompD_${section1}_${section2}`
        );
        await models.studio.clearNotifications();
        await models.studio.rightPanel.switchToDesignTab();
        await expect(sections).toHaveCount(
          baseCount + otherCountDualComp + sectionsThatTranslateTo2DualComp * 2
        );
      }
    }

    await models.studio.leftPanel.insertNode(`All`);

    const baseCount = styleSectionsThatAlwaysOccurInStyleableTpl.length + 1 + 1;
    const sectionsThatTranslateTo2All = styleSections.filter((s) =>
      styleSectionsThatTranslateTo2Sections.includes(s)
    ).length;
    const otherCountAll = styleSections
      .filter((s) => !styleSectionsThatAlwaysOccurInStyleableTpl.includes(s))
      .filter((s) => !styleSectionsThatTranslateTo2Sections.includes(s)).length;

    await models.studio.rightPanel.switchToDesignTab();
    await expect(sections).toHaveCount(
      baseCount + otherCountAll + sectionsThatTranslateTo2All * 2
    );

    await models.studio.extractComponentNamed(`CompAll`);
    await models.studio.clearNotifications();

    const sectionsThatTranslateTo2AllComp = styleSections
      .filter((s) => styleSectionsThatTranslateTo2Sections.includes(s))
      .filter((s) => !styleSectionsThatNeverOccurInComp.includes(s)).length;
    const otherCountAllComp = styleSections
      .filter((s) => !styleSectionsThatNeverOccurInComp.includes(s))
      .filter((s) => !styleSectionsThatAlwaysOccurInStyleableTpl.includes(s))
      .filter((s) => !styleSectionsThatTranslateTo2Sections.includes(s)).length;

    await models.studio.rightPanel.switchToDesignTab();
    await expect(sections).toHaveCount(
      baseCount + otherCountAllComp + sectionsThatTranslateTo2AllComp * 2
    );

    await models.studio.extractComponentNamed(`CompCompAll`);
    await models.studio.clearNotifications();
    await models.studio.rightPanel.switchToDesignTab();
    await expect(sections).toHaveCount(
      baseCount + otherCountAllComp + sectionsThatTranslateTo2AllComp * 2
    );
  });

  test("Should not have visibility toggle if visibility style section is not enabled", async ({
    models,
  }) => {
    await models.studio.createNewPageInOwnArena("NewPage");

    const componentVisibilityConfig = [
      {
        ccName: "NoStyleSections",
        shouldHaveToggle: false,
      },
      {
        ccName: "S_visibility",
        shouldHaveToggle: true,
      },
      {
        ccName: "S_background",
        shouldHaveToggle: false,
      },
      {
        ccName: "All",
        shouldHaveToggle: true,
      },
    ];

    for (const { ccName, shouldHaveToggle } of componentVisibilityConfig) {
      await models.studio.leftPanel.insertNode(ccName);
      await models.studio.renameTreeNode(ccName);

      const isLeftPanelVisible = await models.studio.leftPanel.frame
        .locator(".tpltree__root")
        .isVisible();

      if (!isLeftPanelVisible) {
        await models.studio.leftPanel.switchToTreeTab();
      }

      const treeNode = await models.studio.leftPanel.selectTreeNode([ccName]);
      await treeNode.hover();
      const visibilityToggle = treeNode.locator(
        '[class*="tpltree__label__visibility"]'
      );

      if (shouldHaveToggle) {
        await expect(visibilityToggle).toBeVisible();
      } else {
        await expect(visibilityToggle).not.toBeVisible();
      }

      await models.studio.extractComponentNamed(`Comp${ccName}`);
      await models.studio.clearNotifications();

      const compTreeNode = await models.studio.leftPanel.selectTreeNode([
        `Comp${ccName}`,
      ]);
      await compTreeNode.hover();
      const compVisibilityToggle = compTreeNode.locator(
        '[class*="tpltree__label__visibility"]'
      );

      if (shouldHaveToggle) {
        await expect(compVisibilityToggle).toBeVisible();
      } else {
        await expect(compVisibilityToggle).not.toBeVisible();
      }

      await models.studio.extractComponentNamed(`CompComp${ccName}`);
      await models.studio.clearNotifications();

      const compCompTreeNode = await models.studio.leftPanel.selectTreeNode([
        `CompComp${ccName}`,
      ]);
      await compCompTreeNode.hover();
      const compCompVisibilityToggle = compCompTreeNode.locator(
        '[class*="tpltree__label__visibility"]'
      );

      if (shouldHaveToggle) {
        await expect(compCompVisibilityToggle).toBeVisible();
      } else {
        await expect(compCompVisibilityToggle).not.toBeVisible();
      }
    }
  });
});
