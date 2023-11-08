import { ADD_FORM_STEPS } from "./frags/add-form-steps";
import { ADD_QUERY_STEPS } from "./frags/add-query-steps";
import { ADD_RICH_TABLE_STEPS } from "./frags/add-rich-table-steps";
import { WELCOME_TUTORIAL_STEP } from "./frags/basic-steps";
import { CONFIGURE_TABLE_STEPS } from "./frags/configure-table-steps";
import { FORM_INITIAL_VALUES_STEPS } from "./frags/form-initial-values-steps";
import { FORM_INTERACTION_STEPS } from "./frags/form-interaction-steps";
import { FORM_ITEMS_STEPS } from "./frags/form-items-steps";
import {
  TOPFRAME_PUBLISH_STEPS,
  TRIGGER_PUBLISH_MODAL_STEP,
} from "./frags/publish-steps";
import { StudioTutorialStep, TopFrameTutorialStep } from "./tutorials-types";

export const STUDIO_ONBOARDING_TUTORIALS: Record<string, StudioTutorialStep[]> =
  {
    complete: [
      WELCOME_TUTORIAL_STEP,
      ...ADD_RICH_TABLE_STEPS,
      ...ADD_QUERY_STEPS,
      ...CONFIGURE_TABLE_STEPS,
      ...ADD_FORM_STEPS,
      ...FORM_ITEMS_STEPS,
      ...FORM_INITIAL_VALUES_STEPS,
      ...FORM_INTERACTION_STEPS,
      TRIGGER_PUBLISH_MODAL_STEP,
    ],
    addForm: [
      ...ADD_FORM_STEPS,
      ...FORM_ITEMS_STEPS,
      ...FORM_INITIAL_VALUES_STEPS,
      ...FORM_INTERACTION_STEPS,
    ],
    configureTable: CONFIGURE_TABLE_STEPS,
    formItems: FORM_ITEMS_STEPS,
    formInitialValues: FORM_INITIAL_VALUES_STEPS,
    formInteraction: FORM_INTERACTION_STEPS,
    triggerPublish: [TRIGGER_PUBLISH_MODAL_STEP],
  };

export const STUDIO_ONBOARDING_TUTORIALS_LIST = Object.keys(
  STUDIO_ONBOARDING_TUTORIALS
);

export const TOPFRAME_ONBOARDING_TUTORIALS: Record<
  string,
  TopFrameTutorialStep[]
> = {
  publish: TOPFRAME_PUBLISH_STEPS,
};
