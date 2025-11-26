import { RightTabKey } from "@/wab/client/studio-ctx/StudioCtx";
import {
  changeRightTabKeyStepFunc,
  TURN_OFF_INTERACTIVE_MODE_STEP_FUNC,
  TURN_ON_INTERACTIVE_MODE_STEP_FUNC,
} from "@/wab/client/tours/tutorials/frags/basic-steps";
import {
  ensureFocusedTpl,
  isTableLinkedToRightQuery,
  isTableSelectRowsBy,
  ONBOARDING_TUTORIALS_META,
} from "@/wab/client/tours/tutorials/tutorials-helpers";
import { STUDIO_ELEMENTS_TARGETS } from "@/wab/client/tours/tutorials/tutorials-targets";
import {
  OnNextCtx,
  StudioTutorialStep,
  TutorialStepFunctionality,
} from "@/wab/client/tours/tutorials/tutorials-types";
import { ensure } from "@/wab/shared/common";

const CONFIGURE_TABLE_STEP_FUNC: TutorialStepFunctionality<OnNextCtx> = {
  target: STUDIO_ELEMENTS_TARGETS.componentPropsData,
  placement: "left",
  highlightTarget: STUDIO_ELEMENTS_TARGETS.componentPropsData,
  waitFor: async (ctx: OnNextCtx) => {
    ctx.studioCtx.switchRightTab(RightTabKey.settings);
  },
  advanceOnUserChanges: async (ctx: OnNextCtx) => {
    return isTableLinkedToRightQuery(
      ctx.studioCtx,
      ctx.studioCtx.onboardingTourState.results.richTable,
      ONBOARDING_TUTORIALS_META.northwind.customersQueryName
    );
  },
};

export const CONFIGURE_TABLE_STEPS: StudioTutorialStep[] = [
  {
    name: `configure-table-settings-tab`,
    content: `
The "Settings" tab shows settings for the selected element.

**Switch to the "Settings" tab.**`,
    ...changeRightTabKeyStepFunc(RightTabKey.settings),
    waitFor: async (ctx) => {
      await ensureFocusedTpl(
        ctx.studioCtx,
        ensure(
          ctx.studioCtx.onboardingTourState.results.richTable,
          "missing rich table UUID"
        )
      );
    },
  },
  {
    name: "configure-table",
    content: `
Change the "Data" setting to configure what the table is showing.

**Select the "customers" data query we just created.**`,
    ...CONFIGURE_TABLE_STEP_FUNC,
  },
  {
    name: "part1-turn-on-interactive-mode",
    content: `
Nice! The table You now have a table with all your customer data, live from a database.

Let's test it out.

**Turn on interactive mode**.
`,
    ...TURN_ON_INTERACTIVE_MODE_STEP_FUNC,
  },
  {
    name: "part1-turn-off-interactive-mode",
    content: `
In interactive mode, you can click around to test your app.

Go ahead, click through the pages of customers, search for a customer, or anything you want!

Whenever you're ready, **turn off interactive mode** to continue.`,
    ...TURN_OFF_INTERACTIVE_MODE_STEP_FUNC,
  },
  {
    name: "part2-intro",
    content: `
## Part 2: Using forms 📝

The Customer Operations team still needs a way to update customer data.
When they click a row, they want to be able to edit the data.
`,
    nextButtonText: "Next",
    overlay: true,
    target: "body",
    placement: "center",
  },
  {
    name: "configure-table-select-rows",
    content: `
First, let's make the table clickable.

**Find the "Select Rows" setting** (you might need to scroll down) and **change it to "by clicking a row"**.`,
    target: STUDIO_ELEMENTS_TARGETS.studioRightPane,
    placement: "left",
    highlightTarget: STUDIO_ELEMENTS_TARGETS.componentPropsSelectRows,
    waitFor: async (ctx) => {
      await ensureFocusedTpl(
        ctx.studioCtx,
        ensure(
          ctx.studioCtx.onboardingTourState.results.richTable,
          "missing rich table"
        )
      );
      ctx.studioCtx.switchRightTab(RightTabKey.settings);
    },
    advanceOnUserChanges: async (ctx: OnNextCtx) => {
      return isTableSelectRowsBy(
        ctx.studioCtx,
        ctx.studioCtx.onboardingTourState.results.richTable
      );
    },
  },
];
