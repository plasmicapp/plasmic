import { kebabCase, startCase } from "lodash";
import { Framed, removeCurrentProject, setupNewProject } from "../support/util";

export const PLEXUS_INSERTABLES = [
  { name: "button", dependencies: [] },
  { name: "checkbox", dependencies: [] },
  {
    name: "checkboxGroup",
    dependencies: ["Label", "Checkbox", "Description"],
  },
  {
    name: "combobox",
    dependencies: [
      "Label",
      "Description",
      "Menu Popover",
      "Menu Item",
      "Menu Section",
    ],
  },
  { name: "drawer", dependencies: ["Button"] },
  { name: "modal", dependencies: ["Button"] },
  { name: "popover", dependencies: ["Button", "Overlay Arrow"] },
  {
    name: "rangeSlider",
    dependencies: ["Label", "Description", "Slider Thumb"],
  },
  // Radio before radio group to simplify assertions (radio is a child of radio group)
  { name: "radio", dependencies: [] },
  {
    name: "radioGroup",
    dependencies: ["Label", "Description", "Radio"],
  },
  {
    name: "select",
    dependencies: [
      "Label",
      "Description",
      "Menu Popover",
      "Menu Item",
      "Menu Section",
    ],
  },
  { name: "slider", dependencies: ["Label", "Slider Thumb"] },
  { name: "switch", dependencies: ["Description"] },
  {
    name: "textInput",
    dependencies: [],
  },
  {
    name: "textField",
    dependencies: ["Label", "Description", "Text Input", "TextArea Input"],
  },
  { name: "tooltip", dependencies: ["Overlay Arrow"] },
];

describe("Plexus Installation", function () {
  beforeEach(() => {
    setupNewProject({
      name: "Plexus Installation Test",
    });
  });

  afterEach(() => {
    removeCurrentProject();
  });

  function getFilteredComponentsInProjectPanel(filterQuery: string) {
    return cy
      .getProjectPanelContents()
      .find("input")
      .clear()
      .type(filterQuery)
      .then(() => cy.getProjectPanelContents().contains(filterQuery));
  }

  function verifyInitialState() {
    verifyProjectPanelState({ arenaCount: 1, componentCount: 0 });
    cy.curWindow().then((win) => {
      expect(win.dbg.studioCtx.site.defaultComponents).deep.equal({});
      expect(win.dbg.studioCtx.site.projectDependencies).to.have.length(0);
    });
  }

  function verifyProjectPanelState({ arenaCount = 2, componentCount = 24 }) {
    cy.openProjectPanel();
    cy.getComponentsCount().then((count) => {
      expect(+count).to.equal(componentCount);
    });
    cy.getArenasCount().then((count) => {
      expect(+count).to.equal(arenaCount);
    });
  }

  function verifyPostInstallableState() {
    verifyProjectPanelState({ arenaCount: 2, componentCount: 24 });
    cy.justLog("Check focused arena");
    cy.get("#proj-nav-button").contains("Components");
  }

  describe("Standalone installations", function () {
    it("can install standalone Plexus components ", function () {
      cy.withinStudioIframe(() => {
        cy.createNewPage("New page").then(() => {
          verifyInitialState();
          PLEXUS_INSERTABLES.forEach((item) => {
            getFilteredComponentsInProjectPanel(startCase(item.name)).should(
              "not.exist"
            );
            cy.insertFromAddDrawer(startCase(item.name));
            cy.openProjectPanel();
            getFilteredComponentsInProjectPanel(startCase(item.name)).should(
              "have.length",
              1
            );
            item.dependencies.forEach((constituent) => {
              getFilteredComponentsInProjectPanel(constituent).should(
                "have.length",
                1
              );
            });
          });
          cy.getComponentsCount().then((count) => {
            const expectedCount = PLEXUS_INSERTABLES.reduce((acc, item) => {
              acc.add(startCase(item.name));
              item.dependencies.forEach((constituent) => acc.add(constituent));
              return acc;
            }, new Set()).size;
            expect(+count).to.equal(expectedCount);
          });
          cy.curWindow().then((win) => {
            cy.justLog("Checking that the default components are set");
            expect(win.dbg.studioCtx.site.defaultComponents).deep.equal(
              PLEXUS_INSERTABLES.reduce((acc: Record<string, string>, item) => {
                acc[kebabCase(item.name)] =
                  win.dbg.studioCtx.site.components.filter(
                    (c: any) => c.name === startCase(item.name)
                  )[0];
                return acc;
              }, {})
            );
            cy.justLog(
              "Checking that only the necessary project dependencies are added"
            );
            expect(win.dbg.studioCtx.site.projectDependencies).to.have.length(
              1
            );
            expect(
              win.dbg.studioCtx.site.projectDependencies[0].projectId
            ).to.equal("gmeH6XgPaBtkt51HunAo4g");
          });
        });
      });
    });

    it("can install standalone Plexus component via drag and drop", function () {
      cy.withinStudioIframe(() => {
        cy.createNewPage("New page").then((framed: Framed) => {
          verifyInitialState();

          // Find the combobox component in the insertables
          const comboboxItem = PLEXUS_INSERTABLES.find(
            (item) => item.name === "combobox"
          )!;
          cy.dragGalleryItemRelativeToElt(
            startCase(comboboxItem.name),
            framed.getFrame(),
            100,
            100
          );

          // Verify the component was added to the project panel
          cy.openProjectPanel();

          // Verify the total component count
          cy.getComponentsCount().then((count) => {
            const expectedCount = 1 + comboboxItem.dependencies.length; // Combobox + its dependencies
            expect(+count).to.equal(expectedCount);
          });

          getFilteredComponentsInProjectPanel(
            startCase(comboboxItem.name)
          ).should("have.length", 1);

          // Verify all dependencies were also added
          comboboxItem.dependencies.forEach((constituent) => {
            getFilteredComponentsInProjectPanel(constituent).should(
              "have.length",
              1
            );
          });

          cy.justType("{selectall}{backspace}");
          cy.justType("{esc}"); // exit project panel

          // Verify default components are set correctly
          cy.curWindow().then((win) => {
            cy.justLog("Checking that the default component is set");
            expect(win.dbg.studioCtx.site.defaultComponents).to.have.property(
              kebabCase(comboboxItem.name)
            );

            // Verify only necessary project dependencies are added
            cy.justLog(
              "Checking that only the necessary project dependencies are added"
            );
            expect(win.dbg.studioCtx.site.projectDependencies).to.have.length(
              1
            );
            expect(
              win.dbg.studioCtx.site.projectDependencies[0].projectId
            ).to.equal("gmeH6XgPaBtkt51HunAo4g");
          });

          // Test undo functionality
          // cy.undoTimes(1); // TODO: Currently, a single undo causes the below next assertion to fail, because dependencies are not removed. So a single undo does not return the project back to its initial state.
          cy.undoTimes(2);

          // Verify component is removed after undo
          verifyInitialState();
        });
      });
    });

    it(`"Create a new copy of this component" option works`, function () {
      cy.withinStudioIframe(() => {
        cy.createNewPage("New Page").then(() => {
          const testItem = PLEXUS_INSERTABLES.find(
            (item) => item.name === "combobox"
          )!;
          const newComponentsLength = testItem.dependencies.length + 1; // +1 for the component itself
          function addNewCopy() {
            cy.openAddDrawer();
            cy.addDrawerItem(startCase(testItem.name)).wait(200).rightclick();
            cy.contains("Create a new copy of this component").click();
          }

          verifyInitialState();

          getFilteredComponentsInProjectPanel(startCase(testItem.name)).should(
            "not.exist"
          );
          testItem.dependencies.forEach((constituent) => {
            getFilteredComponentsInProjectPanel(constituent).should(
              "have.length",
              0
            );
          });

          addNewCopy();

          cy.openProjectPanel();
          getFilteredComponentsInProjectPanel(startCase(testItem.name)).should(
            "have.length",
            1
          );
          testItem.dependencies.forEach((constituent) => {
            getFilteredComponentsInProjectPanel(constituent).should(
              "have.length",
              1
            );
          });
          cy.getComponentsCount().then((count) => {
            expect(+count).to.equal(newComponentsLength);
          });

          getFilteredComponentsInProjectPanel(
            `${startCase(testItem.name)}2`
          ).should("not.exist");
          testItem.dependencies.forEach((constituent) => {
            getFilteredComponentsInProjectPanel(`${constituent}2`).should(
              "not.exist"
            );
          });
          addNewCopy();
          let defaultComponents: Record<string, any>;
          cy.curWindow().then((win) => {
            cy.justLog("Checking that the default components are set");
            defaultComponents = {
              [kebabCase(testItem.name)]:
                win.dbg.studioCtx.site.components.filter(
                  (c: any) => c.name === startCase(testItem.name)
                )[0],
            };
            expect(win.dbg.studioCtx.site.defaultComponents).deep.equal(
              defaultComponents
            );
          });

          cy.openProjectPanel();
          getFilteredComponentsInProjectPanel(
            `${startCase(testItem.name)}2`
          ).should("have.length", 1);
          testItem.dependencies.forEach((constituent) => {
            getFilteredComponentsInProjectPanel(`${constituent}2`).should(
              "have.length",
              1
            );
          });
          cy.curWindow().then((win) => {
            cy.justLog(
              "Checking that the default components are not overwritten"
            );
            expect(win.dbg.studioCtx.site.defaultComponents).deep.equal(
              defaultComponents
            ); // still the same
            cy.justLog(
              "Checking that only the necessary project dependencies are added"
            );
            expect(win.dbg.studioCtx.site.projectDependencies).to.have.length(
              1
            );
            expect(
              win.dbg.studioCtx.site.projectDependencies[0].projectId
            ).to.equal("gmeH6XgPaBtkt51HunAo4g");
          });
          cy.getComponentsCount().then((count) => {
            expect(+count).to.equal(newComponentsLength * 2);
          });
        });
      });
    });
  });
  describe("Installable installations", function () {
    function verifyInstallationDialog() {
      cy.get("[role=dialog] form")
        .find("input[type=checkbox]")
        .should("have.length", 4);
      cy.get("[role=dialog] form")
        .find("label")
        .eq(0)
        .contains("react-aria")
        .should("exist");
      cy.get("[role=dialog] form")
        .find("label")
        .eq(0)
        .find("input[type=checkbox][disabled]")
        .should("exist");
      cy.get("[role=dialog] form")
        .find("label")
        .find("input[type=checkbox]:not([disabled])")
        .should("have.length", 3);
    }

    function verifyPostInstallableDefaultComponents() {
      cy.curWindow().then((win) => {
        cy.justLog("Checking that the default components are set");
        expect(win.dbg.studioCtx.site.defaultComponents).deep.equal(
          PLEXUS_INSERTABLES.reduce((acc: Record<string, string>, item) => {
            acc[kebabCase(item.name)] =
              win.dbg.studioCtx.site.components.filter(
                (c: any) => c.name === startCase(item.name)
              )[0];
            return acc;
          }, {})
        );
      });
    }

    function unflattenInstallation() {
      cy.get("[role=dialog] form").find("label").eq(2).click(); // use colors library for color tokens
    }

    function beginInstallation() {
      cy.get("[role=dialog] form").find("button[type=submit]").click();
      cy.waitLoadingComplete();
    }

    it("can install installable components (flattened)", function () {
      cy.withinStudioIframe(() => {
        verifyInitialState();
        cy.insertFromAddDrawer("Plasmic Design System");
        verifyInstallationDialog();
        beginInstallation();

        verifyPostInstallableState();

        verifyPostInstallableDefaultComponents();
        cy.curWindow().then((win) => {
          cy.justLog(
            "Checking that only the necessary project dependencies are added"
          );
          expect(win.dbg.studioCtx.site.projectDependencies).to.have.length(1);
          expect(
            win.dbg.studioCtx.site.projectDependencies[0].projectId
          ).to.equal("gmeH6XgPaBtkt51HunAo4g");
          expect(
            win.dbg.studioCtx.site.styleTokens.find(
              (t: any) => t.name === "Brand/Brand-Border"
            ).value
          ).not.to.match(/^var\(/); // ie. not referencing another var (i.e. flattened)
        });
        cy.justType("{esc}"); // exit project panel
        cy.undoTimes(2);
        verifyInitialState();

        cy.justLog(
          "Assert that this operation can be performed multiple times without error"
        );
        cy.insertFromAddDrawer("Plasmic Design System");
        beginInstallation();
        verifyPostInstallableState();
        cy.insertFromAddDrawer("Plasmic Design System");
        beginInstallation();

        verifyProjectPanelState({ arenaCount: 2 + 1, componentCount: 24 });
      });
    });

    it("can install installable (un-flattened)", function () {
      cy.withinStudioIframe(() => {
        verifyInitialState();
        cy.insertFromAddDrawer("Plasmic Design System");

        unflattenInstallation();
        beginInstallation();

        verifyPostInstallableState();

        cy.curWindow().then((win) => {
          expect(win.dbg.studioCtx.site.projectDependencies).to.have.length(2);
          expect(
            win.dbg.studioCtx.site.projectDependencies[0].projectId
          ).to.equal("gmeH6XgPaBtkt51HunAo4g");
          expect(
            win.dbg.studioCtx.site.projectDependencies[1].projectId
          ).to.equal("5ZtnypMovRHeeP3YTdPCYL");
          // Assert that new tokens are un-flattened
          expect(
            win.dbg.studioCtx.site.styleTokens.find(
              (t: any) => t.name === "Brand/Brand-Border"
            ).value
          ).to.match(/^var\(/); // ie. references another var (means it's un-flattened) });
        });

        cy.justType("{esc}"); // exit project panel
        cy.undoTimes(2);

        // Verify stuff is removed
        cy.curWindow().then((win) => {
          expect(win.dbg.studioCtx.site.projectDependencies).to.have.length(2);
          // Assert that tokens are also removed
          expect(
            win.dbg.studioCtx.site.styleTokens.find(
              (t: any) => t.name === "Brand/Brand-Border"
            )
          ).to.be.undefined;
        });

        verifyProjectPanelState({ componentCount: 0, arenaCount: 1 });

        // TODO: A separate undo is needed for each dependency removal
        cy.justType("{esc}"); // exit project panel
        cy.undoTimes(1); // removes the first dependency

        // Verify dependencies are removed
        cy.curWindow().then((win) => {
          expect(win.dbg.studioCtx.site.projectDependencies).to.have.length(1);
        });

        cy.justType("{esc}"); // exit project panel
        cy.undoTimes(1); // removes the second dependency

        // Verify dependencies are removed
        cy.curWindow().then((win) => {
          expect(win.dbg.studioCtx.site.projectDependencies).to.have.length(0);
        });

        verifyInitialState();
      });
    });

    it("can install installable (un-flattened) after standalone installation", function () {
      cy.withinStudioIframe(() => {
        cy.createNewPage("New Page").then(() => {
          verifyInitialState();
          const testItem = PLEXUS_INSERTABLES[0];
          cy.insertFromAddDrawer(startCase(testItem.name));
          verifyProjectPanelState({ arenaCount: 1, componentCount: 1 });

          cy.curWindow().then((win) => {
            expect(
              win.dbg.studioCtx.site.styleTokens.find(
                (t: any) => t.name === "Basic/Border"
              )
            ).to.be.undefined; // later, we will test that this token (added by Design System) is flatteend, but Brand/Brand-Border isn't becuase it's not new
            expect(
              win.dbg.studioCtx.site.styleTokens.find(
                (t: any) => t.name === "Brand/Brand-Border"
              ).value
            ).not.to.match(/^var\(/); // ie. not references another var (i.e. flattened)
          });
          cy.insertFromAddDrawer("Plasmic Design System");

          unflattenInstallation();
          beginInstallation();

          verifyPostInstallableState();
          // Assert that there's only one clone of the testItem
          getFilteredComponentsInProjectPanel(startCase(testItem.name)).should(
            "have.length",
            1
          );
          cy.justType("{selectall}{backspace}");
          cy.justType("{esc}"); // exit project panel

          cy.curWindow().then((win) => {
            expect(win.dbg.studioCtx.site.projectDependencies).to.have.length(
              2
            );
            expect(
              win.dbg.studioCtx.site.projectDependencies[0].projectId
            ).to.equal("gmeH6XgPaBtkt51HunAo4g");
            expect(
              win.dbg.studioCtx.site.projectDependencies[1].projectId
            ).to.equal("5ZtnypMovRHeeP3YTdPCYL");
            // Assert that new tokens are un-flattened
            expect(
              win.dbg.studioCtx.site.styleTokens.find(
                (t: any) => t.name === "Basic/Border"
              ).value
            ).to.match(/^var\(/); // ie. references another var (means it's un-flattened)
            // Assert that existing tokens remain flattened after design system installation
            expect(
              win.dbg.studioCtx.site.styleTokens.find(
                (t: any) => t.name === "Brand/Brand-Border"
              ).value
            ).not.to.match(/^var\(/);
          });

          cy.undoTimes(2);

          verifyProjectPanelState({ arenaCount: 1, componentCount: 1 });

          // Verify the original component is still there
          getFilteredComponentsInProjectPanel(startCase(testItem.name)).should(
            "have.length",
            1
          );

          cy.justType("{selectall}{backspace}");
          cy.justType("{esc}"); // exit project panel
          cy.undoTimes(1); // TODO: Currently, an undo is needed to remove each dependency
          // Verify dependencies are removed
          cy.curWindow().then((win) => {
            // Only the react-aria dependency should remain for the standalone component
            expect(win.dbg.studioCtx.site.projectDependencies).to.have.length(
              1
            );
            expect(
              win.dbg.studioCtx.site.projectDependencies[0].projectId
            ).to.equal("gmeH6XgPaBtkt51HunAo4g");
            expect(
              win.dbg.studioCtx.site.styleTokens.find(
                (t: any) => t.name === "Basic/Border"
              )
            ).to.be.undefined;
            expect(
              win.dbg.studioCtx.site.styleTokens.find(
                (t: any) => t.name === "Brand/Brand-Border"
              ).value
            ).not.to.match(/^var\(/);
          });
        });
      });
    });

    it("can install installable via the Install All button", function () {
      cy.withinStudioIframe(() => {
        verifyInitialState();

        cy.openAddDrawer();
        cy.get(`[data-test-id="add-drawer"]`).contains("Install all").click();

        verifyInstallationDialog();

        beginInstallation();

        verifyPostInstallableState();
        verifyPostInstallableDefaultComponents();

        cy.curWindow().then((win) => {
          cy.justLog(
            "Checking that only the necessary project dependencies are added"
          );
          expect(win.dbg.studioCtx.site.projectDependencies).to.have.length(1);
          expect(
            win.dbg.studioCtx.site.projectDependencies[0].projectId
          ).to.equal("gmeH6XgPaBtkt51HunAo4g");

          // Verify tokens are flattened by default
          expect(
            win.dbg.studioCtx.site.styleTokens.find(
              (t: any) => t.name === "Brand/Brand-Border"
            ).value
          ).not.to.match(/^var\(/);
        });

        // Test undo functionality
        cy.justType("{esc}"); // exit project panel
        cy.undoTimes(2);

        // Verify components and arenas are removed after undo
        verifyInitialState();
      });
    });
  });
});
