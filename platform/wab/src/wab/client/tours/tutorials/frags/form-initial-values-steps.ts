import {
  TURN_OFF_INTERACTIVE_MODE_STEP_FUNC,
  TURN_ON_INTERACTIVE_MODE_STEP_FUNC,
} from "@/wab/client/tours/tutorials/frags/basic-steps";
import {
  isFormInitialValuesDynamic,
  isFormInitialValuesProperlyLinked,
  sleep,
} from "@/wab/client/tours/tutorials/tutorials-helpers";
import { STUDIO_ELEMENTS_TARGETS } from "@/wab/client/tours/tutorials/tutorials-targets";
import {
  OnNextCtx,
  StudioTutorialStep,
} from "@/wab/client/tours/tutorials/tutorials-types";

export const FORM_INITIAL_VALUES_STEPS: StudioTutorialStep[] = [
  {
    name: "form-initial-values-dynamic-value",
    content: `
With our form fields ready, we can now connect it to our customer data.

Remember when we made the table's rows selectable?
We want the form's _initial field values_ to be pre-filled with the selected row.

We do this by using a _dynamic value_.
Dynamic values let you make parts of your page reactive to other parts.

**Hover over the "Initial Field Values" setting, and click the green lightning icon.**

![Dynamic value hover](https://static1.plasmic.app/tutorial/dynvalue.png)

Or, right-click and select "Use dynamic value".`,
    target: STUDIO_ELEMENTS_TARGETS.componentPropsSection,
    placement: "left",
    highlightTarget: STUDIO_ELEMENTS_TARGETS.componentPropsInitialValues,
    advanceOnUserChanges: async (ctx: OnNextCtx) => {
      return isFormInitialValuesDynamic(ctx.studioCtx);
    },
    postStepFlags: {
      keepDataPickerOpen: true,
    },
    onNext: () => sleep(500), // cool down for animation
  },
  {
    name: "form-initial-value-data-picker",
    content: `
This is the _data picker_.

It lists data queries, but it also lists state from other components on the page.

For instance, you can access a Text Input component's current text, a Switch component's current on/off state, and a Table component's current selected row.

We want to set the form's initial values to the table's selected row.

**Click "table -> selectedRow" and click "Save".**
`,
    target: STUDIO_ELEMENTS_TARGETS.dataPickerFirstColumn,
    placement: "right",
    highlightTarget: STUDIO_ELEMENTS_TARGETS.dataPickerTableSelectedRow,
    advanceOnUserChanges: async (ctx: OnNextCtx) => {
      return isFormInitialValuesProperlyLinked(ctx.studioCtx);
    },
  },
  {
    name: "part2-turn-on-interactive-mode",
    content: `
This is a good stopping point for a round of testing.

**Turn on interactive mode**.
`,
    ...TURN_ON_INTERACTIVE_MODE_STEP_FUNC,
  },
  {
    name: "part2-turn-off-interactive-mode",
    content: `
Testing checklist: click different rows, edit some data, click "Submit".

Does the data actually update like you'd expect? 🤔

Whenever you're ready, **turn off interactive mode** to continue.`,
    ...TURN_OFF_INTERACTIVE_MODE_STEP_FUNC,
  },
];
