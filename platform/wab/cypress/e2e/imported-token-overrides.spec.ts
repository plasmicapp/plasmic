import { DevFlagsType } from "../../src/wab/shared/devflags";
import { Framed } from "../support/util";

describe("Imported token overrides", function () {
  // Define test values as variables
  const TEST_COLORS = {
    PRIMARY: "#ff0000",
    PRIMARY_DARK: "#aa0000",
    PRIMARY_OVERRIDE_BASE: "#0000ff",
    PRIMARY_OVERRIDE_VARIANT: "#0000aa",
    SECONDARY: "#00ff00",
    SECONDARY_OVERRIDE: "#00aa00",
    SECONDARY_NEW: "#00aaaa",
    ANTD: "#ff4d4f",
    ANTD_OVERRIDE: "#0000ff",
  };

  const TEST_FONT_SIZES = {
    B_DEFAULT: "16px",
    LARGE: "16px",
    LARGE_OVERRIDE_BASE: "24px",
    LARGE_OVERRIDE_VARIANT: "32px",
  };

  const TEST_TEXTS = {
    FROM_DEP_COMP: "From Dep Comp",
    FROM_DEP_COMP_PARENT: "From Dep Comp Parent",
    FROM_MAIN_PROJECT_TEXT_1: "Text 1 From Main Project",
    FROM_MAIN_PROJECT_TEXT_2: "Text 2 From Main Project",
    FROM_B_COMP: "From Comp B",
    SLOT_FROM_B_COMP: "Slot from Comp B",
    PRIMARY_TEXT: "Primary Text",
    SECONDARY_TEXT: "Secondary Text",
  };

  const TOKEN_NAMES = {
    PRIMARY: "primary",
    LARGE: "large",
    SECONDARY: "secondary",
    ANTD: "System: Error",
  };

  let origDevFlags: DevFlagsType;

  beforeEach(() => {
    cy.getDevFlags().then((devFlags) => {
      origDevFlags = devFlags;
      cy.upsertDevFlags({
        ...origDevFlags,
        importedTokenOverrides: true,
      });
    });
  });

  afterEach(() => {
    if (origDevFlags) {
      cy.upsertDevFlags(origDevFlags);
    }
  });

  it("Should work (A <- B, A <- C)", function () {
    cy.setupNewProject({ name: "Dep Project" })
      .then((dep1ProjectId) => {
        cy.withinStudioIframe(() => {
          cy.createNewComponent("Dep Comp").then(() => {
            cy.createComponentProp({
              propName: "Text",
              propType: "text",
              defaultValue: TEST_TEXTS.FROM_DEP_COMP,
            });
            cy.createGlobalVariantGroup("Theme", "Dark");
            cy.createToken("Color", TOKEN_NAMES.PRIMARY, TEST_COLORS.PRIMARY);
            cy.createToken(
              "FontSize",
              TOKEN_NAMES.LARGE,
              TEST_FONT_SIZES.LARGE
            );
            cy.updateToken(
              "Color",
              TOKEN_NAMES.PRIMARY,
              TEST_COLORS.PRIMARY_DARK,
              {
                globalVariant: "Dark",
              }
            );
            cy.assertTokenIndicator(
              TOKEN_NAMES.PRIMARY,
              "local-varianted",
              "Base",
              "Dark"
            );
            cy.assertTokenIndicator(TOKEN_NAMES.LARGE, "local", "Base", "Dark");
            cy.insertTextWithDynamic("$props.text");
            cy.chooseColor({ tokenName: TOKEN_NAMES.PRIMARY });
            cy.chooseFontSize(TOKEN_NAMES.LARGE);
          });
          cy.createNewPage("Dep Page").then(() => {
            cy.switchToTreeTab();
            cy.insertFromAddDrawer("Dep Comp");
            cy.switchToSettingsTab();
            cy.setDataPlasmicProp("Text", TEST_TEXTS.FROM_DEP_COMP_PARENT, {
              reset: true,
            });
            cy.selectTreeNode(["Dep Comp"]);
            cy.extractComponentNamed("Dep Comp Parent");
          });
          cy.publishVersion("New tokens");
        });
        cy.setupNewProject({ name: "Dep Project 2" })
          .then((dep2ProjectId) => {
            cy.withinStudioIframe(() => {
              cy.createToken(
                "Color",
                TOKEN_NAMES.SECONDARY,
                TEST_COLORS.SECONDARY
              );
              cy.publishVersion("New tokens");
            });
            cy.setupNewProject({ name: "Main Project" })
              .then((mainProjectId) => {
                // Helper function to assert text styling in both normal and live mode
                const assertTextStylingInBothModes = (
                  color: string,
                  fontSizes: string | Record<string, string>,
                  frame: Framed
                ) => {
                  assertTextStyling(
                    TEST_TEXTS.FROM_MAIN_PROJECT_TEXT_1,
                    color,
                    typeof fontSizes === "string"
                      ? fontSizes
                      : fontSizes[TEST_TEXTS.FROM_MAIN_PROJECT_TEXT_1],
                    frame
                  );
                  assertTextStyling(
                    TEST_TEXTS.FROM_DEP_COMP,
                    color,
                    typeof fontSizes === "string"
                      ? fontSizes
                      : fontSizes[TEST_TEXTS.FROM_DEP_COMP],
                    frame
                  );
                  assertTextStyling(
                    TEST_TEXTS.FROM_DEP_COMP_PARENT,
                    color,
                    typeof fontSizes === "string"
                      ? fontSizes
                      : fontSizes[TEST_TEXTS.FROM_DEP_COMP_PARENT],
                    frame
                  );
                  cy.withinLiveMode(() => {
                    assertTextStyling(
                      TEST_TEXTS.FROM_MAIN_PROJECT_TEXT_1,
                      color,
                      typeof fontSizes === "string"
                        ? fontSizes
                        : fontSizes[TEST_TEXTS.FROM_MAIN_PROJECT_TEXT_1]
                    );
                    assertTextStyling(
                      TEST_TEXTS.FROM_DEP_COMP,
                      color,
                      typeof fontSizes === "string"
                        ? fontSizes
                        : fontSizes[TEST_TEXTS.FROM_DEP_COMP]
                    );
                    assertTextStyling(
                      TEST_TEXTS.FROM_DEP_COMP_PARENT,
                      color,
                      typeof fontSizes === "string"
                        ? fontSizes
                        : fontSizes[TEST_TEXTS.FROM_DEP_COMP_PARENT]
                    );
                  });
                };

                const assertSecondaryTextStyling = (
                  color: string,
                  frame: Framed
                ) => {
                  frame
                    .base()
                    .contains(TEST_TEXTS.FROM_MAIN_PROJECT_TEXT_2)
                    .should("have.css", "color", hexToRgbString(color));
                };

                cy.withinStudioIframe(() => {
                  cy.importProject(dep1ProjectId);
                  cy.importProject(dep2ProjectId);
                  cy.wait(500);
                  cy.createNewPage("New Page").then((frame) => {
                    cy.createGlobalVariantGroup("Platform", "Website");
                    cy.resetVariants();
                    cy.insertFromAddDrawer("Dep Comp Parent");
                    cy.insertFromAddDrawer("Dep Comp");
                    cy.insertFromAddDrawer("Text");
                    cy.getSelectedElt().dblclick({ force: true });
                    frame.enterIntoTplTextBlock(
                      TEST_TEXTS.FROM_MAIN_PROJECT_TEXT_1
                    );
                    cy.chooseColor({ tokenName: TOKEN_NAMES.PRIMARY });
                    cy.chooseFontSize(TOKEN_NAMES.LARGE);

                    cy.insertFromAddDrawer("Text");
                    cy.getSelectedElt().dblclick({ force: true });
                    frame.enterIntoTplTextBlock(
                      TEST_TEXTS.FROM_MAIN_PROJECT_TEXT_2
                    );
                    cy.chooseColor({ tokenName: TOKEN_NAMES.SECONDARY });

                    assertTextStylingInBothModes(
                      TEST_COLORS.PRIMARY,
                      TEST_FONT_SIZES.LARGE,
                      frame
                    );

                    cy.switchToStyleTokensTab();
                    cy.expandAllTokensPanel();

                    cy.assertTokenIndicator(
                      TOKEN_NAMES.PRIMARY,
                      "override-none",
                      "Base",
                      "Website"
                    );
                    cy.assertTokenIndicator(
                      TOKEN_NAMES.LARGE,
                      "override-none",
                      "Base",
                      "Website"
                    );
                    // Test that we can override a base token
                    cy.updateToken(
                      "Color",
                      TOKEN_NAMES.PRIMARY,
                      TEST_COLORS.PRIMARY_OVERRIDE_BASE,
                      {
                        override: true,
                      }
                    );
                    cy.updateToken(
                      "Color",
                      TOKEN_NAMES.SECONDARY,
                      TEST_COLORS.SECONDARY_OVERRIDE,
                      {
                        override: true,
                      }
                    );

                    cy.assertTokenIndicator(
                      TOKEN_NAMES.PRIMARY,
                      "override-base",
                      "Base",
                      "Website"
                    );

                    cy.updateToken(
                      "Color",
                      TOKEN_NAMES.PRIMARY,
                      TEST_COLORS.PRIMARY_OVERRIDE_VARIANT,
                      {
                        globalVariant: "Website",
                        override: true,
                      }
                    );
                    cy.assertTokenIndicator(
                      TOKEN_NAMES.PRIMARY,
                      "override-both",
                      "Base",
                      "Website"
                    );

                    cy.justLog(
                      "Test that we can override a varianted value without overriding the base"
                    );

                    cy.updateToken(
                      "FontSize",
                      TOKEN_NAMES.LARGE,
                      TEST_FONT_SIZES.LARGE_OVERRIDE_VARIANT,
                      {
                        globalVariant: "Website",
                        override: true,
                      }
                    );
                    cy.assertTokenIndicator(
                      TOKEN_NAMES.LARGE,
                      "override-varianted",
                      "Base",
                      "Website"
                    );

                    cy.updateToken(
                      "FontSize",
                      TOKEN_NAMES.LARGE,
                      TEST_FONT_SIZES.LARGE_OVERRIDE_BASE,
                      { override: true }
                    );

                    cy.assertTokenIndicator(
                      TOKEN_NAMES.LARGE,
                      "override-both",
                      "Base",
                      "Website"
                    );

                    assertTextStylingInBothModes(
                      TEST_COLORS.PRIMARY_OVERRIDE_BASE,
                      TEST_FONT_SIZES.LARGE_OVERRIDE_BASE,
                      frame
                    );

                    cy.selectVariant("Theme", "Dark", true);
                    assertTextStylingInBothModes(
                      TEST_COLORS.PRIMARY_DARK,
                      TEST_FONT_SIZES.LARGE_OVERRIDE_BASE,
                      frame
                    );

                    cy.selectVariant("Platform", "Website", true);
                    assertTextStylingInBothModes(
                      TEST_COLORS.PRIMARY_OVERRIDE_VARIANT,
                      TEST_FONT_SIZES.LARGE_OVERRIDE_VARIANT,
                      frame
                    );
                    cy.resetVariants();

                    cy.removeTokenOverride(TOKEN_NAMES.PRIMARY);
                    cy.assertTokenIndicator(
                      TOKEN_NAMES.PRIMARY,
                      "override-varianted",
                      "Base",
                      "Website"
                    );
                    assertTextStylingInBothModes(
                      TEST_COLORS.PRIMARY,
                      TEST_FONT_SIZES.LARGE_OVERRIDE_BASE,
                      frame
                    );
                    cy.selectVariant("Platform", "Website", true);
                    assertTextStylingInBothModes(
                      TEST_COLORS.PRIMARY_OVERRIDE_VARIANT,
                      TEST_FONT_SIZES.LARGE_OVERRIDE_VARIANT,
                      frame
                    );
                    cy.removeTokenOverride(TOKEN_NAMES.PRIMARY, {
                      globalVariant: "Website",
                    });

                    function checkEndState() {
                      cy.assertTokenIndicator(
                        TOKEN_NAMES.LARGE,
                        "override-both",
                        "Base",
                        "Website"
                      );
                      cy.assertTokenIndicator(
                        TOKEN_NAMES.PRIMARY,
                        "override-none",
                        "Base",
                        "Website"
                      );
                      cy.assertTokenIndicator(
                        TOKEN_NAMES.SECONDARY,
                        "override-base",
                        "Base",
                        "Website"
                      );
                      assertTextStylingInBothModes(
                        TEST_COLORS.PRIMARY,
                        TEST_FONT_SIZES.LARGE_OVERRIDE_VARIANT,
                        frame
                      );
                      assertSecondaryTextStyling(
                        TEST_COLORS.SECONDARY_OVERRIDE,
                        frame
                      );
                    }
                    checkEndState();
                    cy.undoAndRedo();
                    // After undo/redo, the frame gets deleted and recreated, so we need to rebind
                    frame.rebind();
                    checkEndState();
                  });
                });
                cy.openProject({ projectId: dep1ProjectId });
                cy.withinStudioIframe(() => {
                  cy.deleteToken(TOKEN_NAMES.LARGE);
                  cy.wait(1000);
                  cy.publishVersion("Delete large token");
                });
                cy.openProject({ projectId: dep2ProjectId });
                cy.withinStudioIframe(() => {
                  cy.updateToken(
                    "Color",
                    TOKEN_NAMES.SECONDARY,
                    TEST_COLORS.SECONDARY_NEW
                  );
                  cy.wait(1500);
                  cy.publishVersion("Update secondary token");
                });
                cy.openProject({ projectId: mainProjectId });
                cy.withinStudioIframe(() => {
                  cy.switchArena("New Page").then((frame) => {
                    cy.switchToImportsTab();
                    cy.updateAllImports();
                    assertTextStylingInBothModes(
                      TEST_COLORS.PRIMARY,
                      {
                        [TEST_TEXTS.FROM_MAIN_PROJECT_TEXT_1]:
                          TEST_FONT_SIZES.LARGE_OVERRIDE_VARIANT,
                        [TEST_TEXTS.FROM_DEP_COMP]: TEST_FONT_SIZES.LARGE,
                        [TEST_TEXTS.FROM_DEP_COMP_PARENT]:
                          TEST_FONT_SIZES.LARGE,
                      },
                      frame
                    );
                    assertSecondaryTextStyling(
                      TEST_COLORS.SECONDARY_OVERRIDE,
                      frame
                    );
                    cy.assertTokenIndicator(
                      TOKEN_NAMES.LARGE,
                      "local-varianted", // this changed to local, because the token was deleted in the dependency project
                      "Base",
                      "Website"
                    );
                    cy.assertTokenIndicator(
                      TOKEN_NAMES.PRIMARY,
                      "override-none",
                      "Base",
                      "Website"
                    );
                    cy.assertTokenIndicator(
                      TOKEN_NAMES.SECONDARY,
                      "override-base",
                      "Base",
                      "Website"
                    );
                    cy.removeAllDependencies();
                  });
                });
              })
              .then(() => {
                cy.removeCurrentProject();
              });
          })
          .then(() => {
            cy.removeCurrentProject();
          });
      })
      .then(() => {
        cy.removeCurrentProject();
      });
  });

  it("Should work when a direct dep is also an indirect dep (A <- B, A <- C, B <- C)", function () {
    cy.setupNewProject({ name: "C Dep" })
      .then((cDepProjectId) => {
        cy.withinStudioIframe(() => {
          cy.createToken("Color", TOKEN_NAMES.SECONDARY, TEST_COLORS.SECONDARY);
          cy.publishVersion("New tokens");
        });
        cy.setupNewProject({ name: "B Dep" })
          .then((bDepProjectId) => {
            cy.withinStudioIframe(() => {
              cy.importProject(cDepProjectId);
              cy.assertTokenIndicator(
                TOKEN_NAMES.SECONDARY,
                "override-none",
                "Base"
              );
              cy.updateToken(
                "Color",
                TOKEN_NAMES.SECONDARY,
                TEST_COLORS.SECONDARY_OVERRIDE,
                { override: true }
              );
              cy.assertTokenIndicator(
                TOKEN_NAMES.SECONDARY,
                "override-base",
                "Base"
              );
              cy.createNewComponent("Comp B").then((frame) => {
                cy.insertFromAddDrawer("Text");
                cy.getSelectedElt().dblclick({ force: true });
                frame.enterIntoTplTextBlock(TEST_TEXTS.FROM_B_COMP);
                cy.chooseColor({ tokenName: TOKEN_NAMES.SECONDARY });
                cy.insertFromAddDrawer("Text");
                cy.getSelectedElt().dblclick({ force: true });
                frame.enterIntoTplTextBlock(TEST_TEXTS.SLOT_FROM_B_COMP);
                cy.chooseColor({ tokenName: TOKEN_NAMES.SECONDARY });
                cy.convertToSlot();
                cy.publishVersion("New components using imported tokens");
              });
            });
            cy.setupNewProject({ name: "A Project" })
              .then(() => {
                // Helper function to assert text styling in both normal and live mode
                const assertTextStylingInBothModes = (
                  color: string,
                  frame: Framed
                ) => {
                  assertTextStyling(
                    TEST_TEXTS.FROM_B_COMP,
                    color,
                    TEST_FONT_SIZES.B_DEFAULT,
                    frame
                  );
                  assertTextStyling(
                    TEST_TEXTS.SLOT_FROM_B_COMP,
                    color,
                    TEST_FONT_SIZES.B_DEFAULT,
                    frame
                  );
                  cy.withinLiveMode(() => {
                    assertTextStyling(
                      TEST_TEXTS.FROM_B_COMP,
                      color,
                      TEST_FONT_SIZES.B_DEFAULT
                    );
                    assertTextStyling(
                      TEST_TEXTS.SLOT_FROM_B_COMP,
                      color,
                      TEST_FONT_SIZES.B_DEFAULT
                    );
                  });
                };
                cy.withinStudioIframe(() => {
                  cy.importProject(bDepProjectId);
                  cy.importProject(cDepProjectId);
                  cy.createNewPage("A Page").then((frame) => {
                    cy.createGlobalVariantGroup("Platform", "Website");
                    cy.insertFromAddDrawer("Comp B");
                    assertTextStylingInBothModes(TEST_COLORS.SECONDARY, frame);
                    cy.assertTokenIndicator(
                      TOKEN_NAMES.SECONDARY,
                      "override-none",
                      "Base",
                      "Website"
                    );
                    cy.updateToken(
                      "Color",
                      TOKEN_NAMES.SECONDARY,
                      TEST_COLORS.SECONDARY_NEW,
                      { override: true }
                    );
                    assertTextStylingInBothModes(
                      TEST_COLORS.SECONDARY_NEW,
                      frame
                    );
                    cy.assertTokenIndicator(
                      TOKEN_NAMES.SECONDARY,
                      "override-base",
                      "Base",
                      "Website"
                    );
                  });
                });
              })
              .then(() => {
                cy.removeCurrentProject();
              });
          })
          .then(() => {
            cy.removeCurrentProject();
          });
      })
      .then(() => {
        cy.removeCurrentProject();
      });
  });

  it("Should work (A <- B <- C) - only root project (A) overrides are used", function () {
    // Helper function to assert text styling
    const assertTextStylingInBothModes = (
      primaryColor: string,
      secondaryColor: string,
      frame: Framed
    ) => {
      // Assert primary text color
      assertTextStyling(
        TEST_TEXTS.PRIMARY_TEXT,
        primaryColor,
        undefined,
        frame
      );
      // Assert secondary text color
      assertTextStyling(
        TEST_TEXTS.SECONDARY_TEXT,
        secondaryColor,
        undefined,
        frame
      );

      cy.withinLiveMode(() => {
        assertTextStyling(TEST_TEXTS.PRIMARY_TEXT, primaryColor, undefined);
        assertTextStyling(TEST_TEXTS.SECONDARY_TEXT, secondaryColor, undefined);
      });
    };

    cy.setupNewProject({ name: "C Dep" })
      .then((cDepProjectId) => {
        cy.withinStudioIframe(() => {
          // Create C project with secondary token
          cy.createToken("Color", TOKEN_NAMES.SECONDARY, TEST_COLORS.SECONDARY);
          cy.publishVersion("New tokens");
        });
        cy.setupNewProject({ name: "B Dep" })
          .then((bDepProjectId) => {
            cy.withinStudioIframe(() => {
              // Create B project with primary token and import C
              cy.createToken("Color", TOKEN_NAMES.PRIMARY, TEST_COLORS.PRIMARY);
              cy.importProject(cDepProjectId);

              // Override secondary token from C
              cy.updateToken(
                "Color",
                TOKEN_NAMES.SECONDARY,
                TEST_COLORS.SECONDARY_OVERRIDE,
                { override: true }
              );

              // Create component with both primary and secondary tokens
              cy.createNewComponent("Dep Comp").then((frame) => {
                // Text with primary token
                cy.insertFromAddDrawer("Text");
                cy.getSelectedElt().dblclick({ force: true });
                frame.enterIntoTplTextBlock("Primary Text");
                cy.chooseColor({ tokenName: TOKEN_NAMES.PRIMARY });

                // Text with secondary token
                cy.insertFromAddDrawer("Text");
                cy.getSelectedElt().dblclick({ force: true });
                frame.enterIntoTplTextBlock("Secondary Text");
                cy.chooseColor({ tokenName: TOKEN_NAMES.SECONDARY });
                // Assert that secondary uses override from B
                assertTextStylingInBothModes(
                  TEST_COLORS.PRIMARY,
                  TEST_COLORS.SECONDARY_OVERRIDE,
                  frame
                );
              });
              cy.publishVersion("New components with tokens");
            });
            cy.setupNewProject({ name: "A Project" })
              .then(() => {
                cy.withinStudioIframe(() => {
                  cy.importProject(bDepProjectId);

                  cy.createNewPage("A Page").then((frame) => {
                    cy.insertFromAddDrawer("Dep Comp");

                    assertTextStylingInBothModes(
                      TEST_COLORS.PRIMARY,
                      TEST_COLORS.SECONDARY,
                      frame
                    );

                    // Override primary token from B
                    cy.updateToken(
                      "Color",
                      TOKEN_NAMES.PRIMARY,
                      TEST_COLORS.PRIMARY_OVERRIDE_BASE,
                      { override: true }
                    );
                    // Assert that primary text uses A's override, secondary uses original from C
                    assertTextStylingInBothModes(
                      TEST_COLORS.PRIMARY_OVERRIDE_BASE, // A's override for primary
                      TEST_COLORS.SECONDARY, // Original from C (not B's override)
                      frame
                    );
                  });
                });
              })
              .then(() => {
                cy.removeCurrentProject();
              });
          })
          .then(() => {
            cy.removeCurrentProject();
          });
      })
      .then(() => {
        cy.removeCurrentProject();
      });
  });

  it("Should override registered imported tokens", function () {
    cy.setupProjectWithHostlessPackages({
      hostLessPackagesInfo: [
        {
          name: "antd5",
          npmPkg: ["@plasmicpkgs/antd5"],
        },
      ],
    }).then((projectId) => {
      cy.withinStudioIframe(() => {
        cy.publishVersion("New tokens");
      });

      cy.setupNewProject({ name: "Main Project" })
        .then(() => {
          const assertTextStylingInBothModes = (
            color: string,
            frame: Framed
          ) => {
            assertTextStyling(
              TEST_TEXTS.FROM_MAIN_PROJECT_TEXT_1,
              color,
              undefined,
              frame
            );
            cy.withinLiveMode(() => {
              assertTextStyling(
                TEST_TEXTS.FROM_MAIN_PROJECT_TEXT_1,
                color,
                undefined,
                frame
              );
            });
          };
          cy.withinStudioIframe(() => {
            cy.importProject(projectId);
            cy.createNewPage("Main Page").then((frame) => {
              cy.insertFromAddDrawer("Text");
              cy.getSelectedElt().dblclick({ force: true });
              frame.enterIntoTplTextBlock(TEST_TEXTS.FROM_MAIN_PROJECT_TEXT_1);
              cy.chooseColor({ tokenName: TOKEN_NAMES.ANTD });
              assertTextStylingInBothModes(TEST_COLORS.ANTD, frame);
              cy.updateToken(
                "Color",
                TOKEN_NAMES.ANTD,
                TEST_COLORS.ANTD_OVERRIDE,
                { override: true }
              );
              assertTextStylingInBothModes(TEST_COLORS.ANTD_OVERRIDE, frame);
            });
          });
        })
        .then(() => {
          cy.removeCurrentProject();
        });
    });
  });
});

function hexToRgbString(hex: string) {
  // Remove "#" if present
  hex = hex.replace(/^#/, "");

  // Expand shorthand form (#03F → #0033FF)
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((c) => c + c)
      .join("");
  }

  const num = parseInt(hex, 16);
  const { r, g, b } = {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
  return `rgb(${r}, ${g}, ${b})`;
}

// Helper function to assert text styling
const assertTextStyling = (
  text: string,
  color: string,
  fontSize?: string,
  canvasFrame?: Framed
) => {
  // If canvas frame is not provided, we're in live mode
  const element = (canvasFrame ? canvasFrame.base() : cy).contains(text);
  element.should("have.css", "color", hexToRgbString(color));

  if (fontSize) {
    element.should("have.css", "font-size", fontSize);
  }
};
