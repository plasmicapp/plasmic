import {
  ADD_TEXT_STEP,
  CANVAS_ARTBOARDS_STEP,
  PORTFOLIO_WELCOME_TUTORIAL_STEP,
} from "@/wab/client/tours/tutorials/frags/basic-steps";
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
  PORTFOLIO_PUBLISH_STEPS,
  PORTFOLIO_PUBLISH_TRIGGER,
  TopFramePublishTours,
} from "@/wab/client/tours/tutorials/frags/publish-steps";
import {
  StudioTutorialStep,
  TopFrameTutorialStep,
} from "@/wab/client/tours/tutorials/tutorials-types";

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
    portfolio: PORTFOLIO_TOUR,
  };

export const STUDIO_ONBOARDING_TUTORIALS_LIST = Object.keys(
  STUDIO_ONBOARDING_TUTORIALS
);

export const TOPFRAME_ONBOARDING_TUTORIALS: Record<
  TopFramePublishTours,
  TopFrameTutorialStep[]
> = {
  [TopFramePublishTours.PortfolioPublish]: PORTFOLIO_PUBLISH_STEPS,
};
