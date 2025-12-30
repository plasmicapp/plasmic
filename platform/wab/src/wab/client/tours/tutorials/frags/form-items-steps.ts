import {
  TutorialEvent,
  TutorialEventsType,
} from "@/wab/client/tours/tutorials/tutorials-events";
import {
  getFormItems,
  sleep,
  updateFormWithFormItems,
} from "@/wab/client/tours/tutorials/tutorials-helpers";
import { STUDIO_ELEMENTS_TARGETS } from "@/wab/client/tours/tutorials/tutorials-targets";
import {
  OnNextCtx,
  StudioTutorialStep,
} from "@/wab/client/tours/tutorials/tutorials-types";
import { tryExtractString } from "@/wab/shared/core/exprs";
import { notification } from "antd";

export const FORM_ITEMS_STEPS: StudioTutorialStep[] = [
  {
    name: "form-items-add",
    content: `
Our form's fields should match our data.

Looking at the table columns, we'll need to add fields for contact name and title.

Let's start by adding a "Contact Name" field.

**Add a new field.**
`,
    target: STUDIO_ELEMENTS_TARGETS.componentPropsFormItems,
    placement: "left",
    highlightTarget: STUDIO_ELEMENTS_TARGETS.formItemsAdd,
    waitFor: async (ctx) => {
      notification.destroy();
      // cool down after the animation
      await sleep(150);
      // Let's try to zoom to fit the selection so that all the element is visible
      await ctx.studioCtx.tryZoomToFitSelection();
      // cool down after the animation
      await sleep(750);
    },
    triggers: [TutorialEventsType.ArrayPropEditorAddItem],
    shouldAdvance: (event: TutorialEvent) => {
      return event.type === TutorialEventsType.ArrayPropEditorAddItem;
    },
    postStepFlags: {
      keepInspectObjectPropEditorOpen: true,
    },
  },
  {
    name: "form-items-label",
    content: `
We need to configure the new field.

The **Label** is shown above the input so the user knows what to type.

**Type in "Contact Name" and press Enter.**`,
    target: STUDIO_ELEMENTS_TARGETS.formItemSidebarControlLabel,
    placement: "left",
    highlightTarget: STUDIO_ELEMENTS_TARGETS.formItemSidebarControlLabel,
    advanceOnUserChanges: async (ctx: OnNextCtx) => {
      const formItems = getFormItems(
        ctx.studioCtx,
        ctx.studioCtx.onboardingTourState.results.form
      );
      if (formItems.length === 0) {
        return false;
      }
      return (
        tryExtractString(formItems[formItems.length - 1].label)
          ?.trim()
          .toLowerCase() === "contact name"
      );
    },
    postStepFlags: {
      keepInspectObjectPropEditorOpen: true,
    },
  },
  {
    name: "form-items-type",
    content: `
The **Input type** dictates what type of input controls the user gets.

The default is "Text", which lets the user type any text they want.

Let's keep it as-is. **Click "Next" to continue.**`,
    nextButtonText: "Next",
    target: STUDIO_ELEMENTS_TARGETS.formItemSidebarControlType,
    placement: "left",
    highlightTarget: STUDIO_ELEMENTS_TARGETS.formItemSidebarControlType,
    postStepFlags: {
      keepInspectObjectPropEditorOpen: true,
    },
  },
  {
    name: "form-items-name",
    content: `
**Field key** identifies what field to update in the database, so we need to make sure it matches our database column name exactly.

**Type in "contact_name" and press Enter.**
`,
    target: STUDIO_ELEMENTS_TARGETS.formItemSidebarControlName,
    placement: "left",
    highlightTarget: STUDIO_ELEMENTS_TARGETS.formItemSidebarControlName,
    advanceOnUserChanges: async (ctx: OnNextCtx) => {
      const formItems = getFormItems(
        ctx.studioCtx,
        ctx.studioCtx.onboardingTourState.results.form
      );
      if (formItems.length === 0) {
        return false;
      }
      return (
        tryExtractString(formItems[formItems.length - 1].name) ===
        "contact_name"
      );
    },
  },
  {
    name: "form-items-save",
    content: `
That's it for this field.

**Click the × to close the dialog and continue.**
`,
    target: STUDIO_ELEMENTS_TARGETS.sidebarModal,
    placement: "left",
    highlightTarget: STUDIO_ELEMENTS_TARGETS.sidebarModalClose,
    waitFor: async (ctx: OnNextCtx) => {
      await sleep(500);
    },
    shouldAdvance: (event: TutorialEvent) => {
      return event.type === TutorialEventsType.ClosedPropEditor;
    },
  },
  {
    name: "form-items-auto-add",
    content: `
Let's save you some clicking.

We're going to automatically add the rest of the fields for you.

**Click "Next" to continue.**`,
    nextButtonText: "Next",
    target: STUDIO_ELEMENTS_TARGETS.componentPropsFormItems,
    placement: "left",
    onNext: async (ctx: OnNextCtx) => {
      await updateFormWithFormItems(
        ctx.studioCtx,
        ctx.studioCtx.onboardingTourState.results.form
      );
    },
  },
];
