import { RightTabKey } from "@/wab/client/studio-ctx/StudioCtx";
import {
  TURN_OFF_INTERACTIVE_MODE_STEP_FUNC,
  TURN_ON_INTERACTIVE_MODE_STEP_FUNC,
} from "@/wab/client/tours/tutorials/frags/basic-steps";
import {
  TutorialEvent,
  TutorialEventsType,
} from "@/wab/client/tours/tutorials/tutorials-events";
import {
  ensureFocusedTpl,
  prepareFormOnSubmit,
  scrollIntoView,
  sleep,
} from "@/wab/client/tours/tutorials/tutorials-helpers";
import { STUDIO_ELEMENTS_TARGETS } from "@/wab/client/tours/tutorials/tutorials-targets";
import {
  OnNextCtx,
  StudioTutorialStep,
  TutorialStateFlags,
} from "@/wab/client/tours/tutorials/tutorials-types";
import { zIndex } from "@/wab/client/z-index";
import { ensure } from "@/wab/common";

const OPEN_INTERACTION_MODAL_FLAGS: Partial<TutorialStateFlags> = {
  keepActionBuilderUncollapsed: true,
  keepInteractionModalOpen: true,
};

export const FORM_INTERACTION_STEPS: StudioTutorialStep[] = [
  {
    name: "part3-intro",
    content: `
## Part 3: Submitting data 📝

Did you find the bug? 🐞

Submitting the form doesn't actually update the data!

We need to tell the form what to do when the user submits the form.

**Click "Next" to continue.**
`,
    nextButtonText: "Next",
    overlay: true,
    target: "body",
    placement: "center",
  },
  {
    name: "form-interaction-add",
    content: `
_Interactions_ let you trigger actions when the user does something.

We want an interaction to be triggered when the form is submitted.

**Add an interaction.**`,
    target: STUDIO_ELEMENTS_TARGETS.interactionsSection,
    placement: "left",
    highlightTarget: STUDIO_ELEMENTS_TARGETS.interactionsAddBtn,
    waitFor: async (ctx: OnNextCtx) => {
      await ensureFocusedTpl(
        ctx.studioCtx,
        ensure(ctx.studioCtx.onboardingTourState.results.form, "missing form")
      );
      ctx.studioCtx.rightTabKey = RightTabKey.settings;
      scrollIntoView(STUDIO_ELEMENTS_TARGETS.interactionsSection);
      await sleep(1700);
    },
    shouldAdvance: (event: TutorialEvent) => {
      return event.type === TutorialEventsType.AddedInteraction;
    },
    postStepFlags: {
      keepHandlerFunctionOptionsVisible: true,
    },
  },
  {
    name: "form-interaction-on-submit",
    content: `
Every component has different interaction triggers available.

In our case, we want to update the database when the user submits the form.

**Select "on submit".**
`,
    target: STUDIO_ELEMENTS_TARGETS.interactionsSelectOptSubmit,
    placement: "left",
    highlightTarget: STUDIO_ELEMENTS_TARGETS.interactionsSelectOptSubmit,
    highlightZIndex: zIndex.tourHighlightAboveMenus,
    triggers: [TutorialEventsType.SelectedHandler],
    shouldAdvance: (event: TutorialEvent) => {
      return event.type === TutorialEventsType.SelectedHandler;
    },
    onNext: () => sleep(500),
    postStepFlags: OPEN_INTERACTION_MODAL_FLAGS,
  },
  {
    name: "form-interaction-use-integration",
    content: `
_Actions_ are run when an interaction is triggered.

To send data to our customer database, we'll use an _integration_.

**Select "use integration".**
`,
    target: STUDIO_ELEMENTS_TARGETS.actionBuilderName,
    placement: "left",
    highlightTarget: STUDIO_ELEMENTS_TARGETS.actionBuilderName,
    shouldAdvance: (event: TutorialEvent) => {
      return event.type === TutorialEventsType.PickedDataSourceOption;
    },
    onNext: async (ctx: OnNextCtx) => {
      await prepareFormOnSubmit(
        ctx.studioCtx,
        ctx.studioCtx.onboardingTourState.results.form
      );
    },
    postStepFlags: OPEN_INTERACTION_MODAL_FLAGS,
  },
  {
    name: "form-interaction-configure-operation",
    content: "**Click to configure the operation.**",
    target: STUDIO_ELEMENTS_TARGETS.configureOperationBtn,
    placement: "left",
    highlightTarget: STUDIO_ELEMENTS_TARGETS.configureOperationBtn,
    shouldAdvance: (event: TutorialEvent) => {
      return event.type === TutorialEventsType.ConfigureDataOperation;
    },
    postStepFlags: OPEN_INTERACTION_MODAL_FLAGS,
  },
  {
    name: "form-interaction-modal-draft",
    content: `Similar to the data query, we've already set up this operation for you.

This operation is pre-configured to **update rows** in the **customers** table.

Let's walk through some of the more complex bits.

**Click "Next" to continue.**`,
    nextButtonText: "Next",
    target: STUDIO_ELEMENTS_TARGETS.dataSourceModalDraftSection,
    placement: "right",
    highlightTarget: STUDIO_ELEMENTS_TARGETS.dataSourceModalDraftSection,
    waitFor: async () => {
      await sleep(2500); // Higher wait time to compensate not waiting for mount state
      // await waitElementToBeVisible(
      //   STUDIO_ELEMENTS_TARGETS.dataSourceModalAnimatedMountState
      // );
    },
    postStepFlags: OPEN_INTERACTION_MODAL_FLAGS,
  },
  {
    name: "interaction-modal-field-filters",
    content: `
_Filters_ dictate which rows get updated.

We need to make sure only the selected row is updated, so we've set up a filter to match the selected row's customer ID.

**Click "Next" to continue.**
`,
    nextButtonText: "Next",
    target: STUDIO_ELEMENTS_TARGETS.dataSourceModalFilters,
    placement: "right",
    highlightTarget: STUDIO_ELEMENTS_TARGETS.dataSourceModalFilters,
    postStepFlags: OPEN_INTERACTION_MODAL_FLAGS,
  },
  {
    name: "form-interaction-modal-field-updates",
    content: `
_Field updates_ should contain the updated data.

Since our form's field names match the table's columns, we can send the form's value directly to the database.

**Click "Next" to continue.**`,
    nextButtonText: "Next",
    target: STUDIO_ELEMENTS_TARGETS.dataSourceModalFieldUpdates,
    placement: "right",
    highlightTarget: STUDIO_ELEMENTS_TARGETS.dataSourceModalFieldUpdates,
    postStepFlags: OPEN_INTERACTION_MODAL_FLAGS,
  },
  {
    name: "interaction-modal-save-btn",
    content: `**Save the operation to continue.**`,
    target: STUDIO_ELEMENTS_TARGETS.dataSourceModalSaveBtn,
    placement: "top",
    highlightTarget: STUDIO_ELEMENTS_TARGETS.dataSourceModalSaveBtn,
    shouldAdvance: (event: TutorialEvent) => {
      return event.type === TutorialEventsType.SaveDataSourceQuery;
    },
    postStepFlags: OPEN_INTERACTION_MODAL_FLAGS,
  },
  {
    name: "part3-turn-on-interactive-mode",
    content: `
Let's see if that fixed the bug!

**Turn on interactive mode**.
`,
    ...TURN_ON_INTERACTIVE_MODE_STEP_FUNC,
  },
  {
    name: "part3-turn-off-interactive-mode",
    content: `
Try updating submitting some edited data now.
Hope the bug is fixed! 🤞

Whenever you're ready, **turn off interactive mode** to continue.`,
    ...TURN_OFF_INTERACTIVE_MODE_STEP_FUNC,
  },
];
