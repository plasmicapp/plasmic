import { RightTabKey } from "@/wab/client/studio-ctx/StudioCtx";
import { OPEN_ADD_DRAWER_STEP_FUNC } from "@/wab/client/tours/tutorials/frags/basic-steps";
import { STUDIO_ELEMENTS_TARGETS } from "@/wab/client/tours/tutorials/tutorials-targets";
import { StudioTutorialStep } from "@/wab/client/tours/tutorials/tutorials-types";

export const LEFT_TAB_STRIP_STEP: StudioTutorialStep = {
  name: "left-tab-strip",
  content: `
## Project management

This is the left pane. You can control multiple aspects of your project from here.

You are able to:
- Add components
- Check the structure of your page
- Inspect issues and warnings
- Manage assets and styles
- Enable **A/B testing**
- Control the **version history** of your project
- And more!
  `,
  nextButtonText: "Next",
  placement: "right",
  target: STUDIO_ELEMENTS_TARGETS.canvasLeftPane,
  highlightTarget: STUDIO_ELEMENTS_TARGETS.leftTabStrip,
};

export const PORTFOLIO_OPEN_ADD_DRAWER_STEP: StudioTutorialStep = {
  name: "open-add-drawer",
  content: `
Let's look into what can be added to your page.

**Open the insert menu.**
`,
  ...OPEN_ADD_DRAWER_STEP_FUNC,
};

export const PORTFOLIO_INSERT_PANEL_STEP: StudioTutorialStep = {
  name: "insert-panel",
  content: `
These are _components_, UI building blocks that you can add to your page.

You can also create completely custom components in Plasmic.

And you can even add your own _React code components_ if you have a codebase!
  `,
  target: STUDIO_ELEMENTS_TARGETS.studioAddDrawer,
  placement: "right-start",
  nextButtonText: "Next",
  postStepFlags: {
    forceAddDrawerOpen: true,
  },
};

export const PORTFOLIO_OUTLINE_TREE_STEP: StudioTutorialStep = {
  name: "outline-tree",
  content: `
It's possible to see the structure of your page here.

You can also navigate through the outline to select and edit elements.

The newly added text element is now visible both in the canvas and in this outline.
    `,
  target: STUDIO_ELEMENTS_TARGETS.tplTreeRoot,
  highlightTarget: STUDIO_ELEMENTS_TARGETS.outlineTabKey,
  placement: "right-start",
  nextButtonText: "Next",
  onNext: async (ctx) => {
    ctx.studioCtx.switchRightTab(RightTabKey.settings);
  },
};

export const PORTFOLIO_EDITOR_TABS_STEP: StudioTutorialStep = {
  name: "editor-tabs",
  content: `
Once you have an element selected, you can edit its properties here. The available properties depend on the type of the element.

In the _Settings_ tab, you can set attributes of the element:
- Visibility
- Repeatition
- Sizing
- And more!

Change the Content of the text element to something else. (You can also change directly in the canvas).

![Change text content](https://static1.plasmic.app/tutorial/change_text_content.png)

Once you're done with the text changes, hit ESC to exit the text editing mode.

    `,
  target: STUDIO_ELEMENTS_TARGETS.editorTabs,
  highlightTarget: STUDIO_ELEMENTS_TARGETS.editorTabs,
  placement: "left",
  nextButtonText: "Next",
  onNext: async (ctx) => {
    ctx.studioCtx.switchRightTab(RightTabKey.style);
    ctx.studioCtx.focusedOrFirstViewCtx()?.setEditingTextContext(null);
  },
};

export const PORTFOLIO_STYLE_TAB_STEP: StudioTutorialStep = {
  name: "style",
  content: `
The _Design_ tab contains settings for the style of the element.

You can set the color, font, size, spacing, position and more.
    `,
  target: STUDIO_ELEMENTS_TARGETS.editorTabs,
  placement: "left",
  nextButtonText: "Next",
  onNext: async (ctx) => {
    ctx.studioCtx.switchRightTab(RightTabKey.component);
  },
};

export const PORTFOLIO_PAGE_SETTINGS_STEP: StudioTutorialStep = {
  name: "page-settings",
  content: `
The _Page Data_ tab contains settings for the page, such as the URL and SEO metadata.

It's also where you can manage _data queries_, which let you fetch data from databases and APIs.

For a full list of SEO settings, you can use the gear icon to access the _Advanced_ settings.
    `,
  target: STUDIO_ELEMENTS_TARGETS.editorTabs,
  placement: "left",
  nextButtonText: "Next",
};

export const PERSONAL_TOUCH_STEP: StudioTutorialStep = {
  name: "free-edit",
  content: `
Now it's your turn, play around with the editor and add some personal touch to your page!

Then click in Publish to learn how to deploy your changes to the web.`,
  target: STUDIO_ELEMENTS_TARGETS.topBarPublishBtn,
  nextButtonText: "Add your personal touch",
  placement: "top",
};
