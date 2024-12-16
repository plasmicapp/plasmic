import {
  addElementStepFunc,
  OPEN_ADD_DRAWER_STEP_FUNC,
} from "@/wab/client/tours/tutorials/frags/basic-steps";
import { addForm, sleep } from "@/wab/client/tours/tutorials/tutorials-helpers";
import { STUDIO_ELEMENTS_TARGETS } from "@/wab/client/tours/tutorials/tutorials-targets";
import {
  OnNextCtx,
  StudioTutorialStep,
} from "@/wab/client/tours/tutorials/tutorials-types";

export const ADD_FORM_STEPS: StudioTutorialStep[] = [
  {
    name: "form-open-add-drawer",
    content: `
Now let's add some UI for editing data.

**Click the plus button.**`,
    ...OPEN_ADD_DRAWER_STEP_FUNC,
  },
  {
    name: "form-add",
    content: `
This time, we'll use a **Form** component.

**Find and select Form.** You can scroll or type to filter.`,
    ...addElementStepFunc({
      highlightTarget: STUDIO_ELEMENTS_TARGETS.addDrawerFormBlock,
      componentName: "plasmic-antd5-form",
      onNext: async (ctx: OnNextCtx) => {
        ctx.studioCtx.mergeOnboardingTourStateResults({
          form: await addForm(ctx.studioCtx),
        });
        // Make sure the form is centered
        await sleep(500);
        ctx.studioCtx.tryZoomToFitArena();
        await sleep(250);
      },
    }),
  },
];
