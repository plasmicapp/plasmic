import { ADD_FORM_STEPS } from "@/wab/client/tours/tutorials/frags/add-form-steps";
import { ADD_QUERY_STEPS } from "@/wab/client/tours/tutorials/frags/add-query-steps";
import { ADD_RICH_TABLE_STEPS } from "@/wab/client/tours/tutorials/frags/add-rich-table-steps";
import {
  ADD_TEXT_STEP,
  ADMIN_PANEL_WELCOME_TUTORIAL_STEP,
  CANVAS_ARTBOARDS_STEP,
  PORTFOLIO_WELCOME_TUTORIAL_STEP,
} from "@/wab/client/tours/tutorials/frags/basic-steps";
import { CONFIGURE_TABLE_STEPS } from "@/wab/client/tours/tutorials/frags/configure-table-steps";
import { FORM_INITIAL_VALUES_STEPS } from "@/wab/client/tours/tutorials/frags/form-initial-values-steps";
import { FORM_INTERACTION_STEPS } from "@/wab/client/tours/tutorials/frags/form-interaction-steps";
import { FORM_ITEMS_STEPS } from "@/wab/client/tours/tutorials/frags/form-items-steps";
import {
  LEFT_TAB_STRIP_STEP,
  PORTFOLIO_EDITOR_TABS_STEP,
  PORTFOLIO_INSERT_PANEL_STEP,
  PORTFOLIO_OPEN_ADD_DRAWER_STEP,
  PORTFOLIO_OUTLINE_TREE_STEP,
  PORTFOLIO_PAGE_SETTINGS_STEP,
  PORTFOLIO_STYLE_TAB_STEP,
} from "@/wab/client/tours/tutorials/frags/portfolio-steps";
import {
  ADMIN_PANEL_PUBLISH_STEPS,
  ADMIN_PANEL_PUBLISH_TRIGGER,
  PORTFOLIO_PUBLISH_STEPS,
  PORTFOLIO_PUBLISH_TRIGGER,
  TopFramePublishTours,
} from "@/wab/client/tours/tutorials/frags/publish-steps";
import {
  StudioTutorialStep,
  TopFrameTutorialStep,
} from "@/wab/client/tours/tutorials/tutorials-types";

const ADMIN_PANEL_TOUR = [
  ADMIN_PANEL_WELCOME_TUTORIAL_STEP,
  ...ADD_RICH_TABLE_STEPS,
  ...ADD_QUERY_STEPS,
  ...CONFIGURE_TABLE_STEPS,
  ...ADD_FORM_STEPS,
  ...FORM_ITEMS_STEPS,
  ...FORM_INITIAL_VALUES_STEPS,
  ...FORM_INTERACTION_STEPS,
  ADMIN_PANEL_PUBLISH_TRIGGER,
];

const PORTFOLIO_TOUR: StudioTutorialStep[] = [
  PORTFOLIO_WELCOME_TUTORIAL_STEP,
  CANVAS_ARTBOARDS_STEP,
  LEFT_TAB_STRIP_STEP,
  PORTFOLIO_OPEN_ADD_DRAWER_STEP,
  PORTFOLIO_INSERT_PANEL_STEP,
  ADD_TEXT_STEP,
  PORTFOLIO_OUTLINE_TREE_STEP,
  PORTFOLIO_EDITOR_TABS_STEP,
  PORTFOLIO_STYLE_TAB_STEP,
  PORTFOLIO_PAGE_SETTINGS_STEP,
  PORTFOLIO_PUBLISH_TRIGGER,
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
    triggerPublish: [ADMIN_PANEL_PUBLISH_TRIGGER],
  };

export const STUDIO_ONBOARDING_TUTORIALS_LIST = Object.keys(
  STUDIO_ONBOARDING_TUTORIALS
);

export const TOPFRAME_ONBOARDING_TUTORIALS: Record<
  TopFramePublishTours,
  TopFrameTutorialStep[]
> = {
  [TopFramePublishTours.AdminPanelPublish]: ADMIN_PANEL_PUBLISH_STEPS,
  [TopFramePublishTours.PortfolioPublish]: PORTFOLIO_PUBLISH_STEPS,
};
