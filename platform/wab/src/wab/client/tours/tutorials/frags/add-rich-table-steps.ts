import {
  addElementStepFunc,
  OPEN_ADD_DRAWER_STEP_FUNC,
} from "@/wab/client/tours/tutorials/frags/basic-steps";
import { addRichTable } from "@/wab/client/tours/tutorials/tutorials-helpers";
import { STUDIO_ELEMENTS_TARGETS } from "@/wab/client/tours/tutorials/tutorials-targets";
import {
  OnNextCtx,
  StudioTutorialStep,
} from "@/wab/client/tours/tutorials/tutorials-types";

export const ADD_RICH_TABLE_STEPS: StudioTutorialStep[] = [
  {
    name: "part1-intro",
    content: `
## Part 1: Displaying data

Data is at the center of every app.

Your customer data is currently locked away in a database.
Let's add some UI that can display data.

**Open the insert menu.**`,
    ...OPEN_ADD_DRAWER_STEP_FUNC,
  },
  {
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
  },
  {
    name: "rich-table-add",
    content: `
Tables and Lists are great ways to display a collection of data.

**Insert a Table.**`,
    ...addElementStepFunc({
      highlightTarget: STUDIO_ELEMENTS_TARGETS.addDrawerTableBlock,
      componentName: "hostless-rich-table",
      onNext: async (ctx: OnNextCtx) => {
        ctx.studioCtx.mergeOnboardingTourStateResults({
          richTable: await addRichTable(ctx.studioCtx),
        });
      },
    }),
  },
];
