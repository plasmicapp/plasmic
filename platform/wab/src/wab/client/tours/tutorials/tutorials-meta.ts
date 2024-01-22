import { RightTabKey } from "@/wab/client/studio-ctx/StudioCtx";
import { STUDIO_ELEMENTS_TARGETS } from "@/wab/client/tours/tutorials/tutorials-targets";
import { ADD_FORM_STEPS } from "./frags/add-form-steps";
import { ADD_QUERY_STEPS } from "./frags/add-query-steps";
import { ADD_RICH_TABLE_STEPS } from "./frags/add-rich-table-steps";
import {
  ADD_TEXT_STEP,
  ADMIN_PANEL_WELCOME_TUTORIAL_STEP,
  CANVAS_ARTBOARDS_STEP,
  changeRightTabKeyStepFunc,
  OPEN_ADD_DRAWER_STEP_FUNC,
  PORTFOLIO_WELCOME_TUTORIAL_STEP,
} from "./frags/basic-steps";
import { CONFIGURE_TABLE_STEPS } from "./frags/configure-table-steps";
import { FORM_INITIAL_VALUES_STEPS } from "./frags/form-initial-values-steps";
import { FORM_INTERACTION_STEPS } from "./frags/form-interaction-steps";
import { FORM_ITEMS_STEPS } from "./frags/form-items-steps";
import {
  TOPFRAME_PUBLISH_STEPS,
  TRIGGER_PUBLISH_MODAL_STEP,
} from "./frags/publish-steps";
import { StudioTutorialStep, TopFrameTutorialStep } from "./tutorials-types";

const ADMIN_PANEL_TOUR = [
  ADMIN_PANEL_WELCOME_TUTORIAL_STEP,
  ...ADD_RICH_TABLE_STEPS,
  ...ADD_QUERY_STEPS,
  ...CONFIGURE_TABLE_STEPS,
  ...ADD_FORM_STEPS,
  ...FORM_ITEMS_STEPS,
  ...FORM_INITIAL_VALUES_STEPS,
  ...FORM_INTERACTION_STEPS,
  TRIGGER_PUBLISH_MODAL_STEP,
];

const PORTFOLIO_TOUR: StudioTutorialStep[] = [
  PORTFOLIO_WELCOME_TUTORIAL_STEP,
  CANVAS_ARTBOARDS_STEP,
  {
    name: "left-tab-strip",
    content: `This is the left tab strip. You can switch between different tabs here`,
    nextButtonText: "Next",
    placement: "right",
    target: STUDIO_ELEMENTS_TARGETS.leftTabStrip,
  },
  {
    name: "open-add-drawer",
    content: `Let's add a new element`,
    ...OPEN_ADD_DRAWER_STEP_FUNC,
  },
  {
    name: "insert-panel",
    content: `This is the insert panel. You can insert components here`,
    target: STUDIO_ELEMENTS_TARGETS.studioAddDrawer,
    placement: "right-start",
    nextButtonText: "Next",
    postStepFlags: {
      forceAddDrawerOpen: true,
    },
  },
  ADD_TEXT_STEP,
  {
    name: "outline-tree",
    content: `This is the outline tree. You can see the structure of your page here`,
    target: STUDIO_ELEMENTS_TARGETS.tplTreeRoot,
    placement: "right-start",
    nextButtonText: "Next",
  },
  {
    name: "settings",
    content: `This is the settings tab. You can configure the settings of your page here`,
    ...changeRightTabKeyStepFunc(RightTabKey.settings),
  },
  {
    name: "design",
    content: `This is the design tab. You can configure the design of your page here`,
    ...changeRightTabKeyStepFunc(RightTabKey.style),
  },
  {
    name: "data",
    content: `This is the data tab. You can configure the data of your page here`,
    ...changeRightTabKeyStepFunc(RightTabKey.component),
  },
  {
    name: "free-edit",
    content: `Now it's your turn, play around with the editor and add some personal touch to your page! Then click Next to continue into publishing your page to the web`,
    target: STUDIO_ELEMENTS_TARGETS.topBarPublishBtn,
    nextButtonText: "Next",
    placement: "top",
  },
  TRIGGER_PUBLISH_MODAL_STEP,
];

export const STUDIO_ONBOARDING_TUTORIALS: Record<string, StudioTutorialStep[]> =
  {
    complete: ADMIN_PANEL_TOUR,
    "admin-panel": ADMIN_PANEL_TOUR,
    portfolio: PORTFOLIO_TOUR,
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
