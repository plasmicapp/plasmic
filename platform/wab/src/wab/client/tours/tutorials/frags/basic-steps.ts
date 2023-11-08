import { notification } from "antd";
import { $$$ } from "../../../../shared/TplQuery";
import { RightTabKey } from "../../../studio-ctx/StudioCtx";
import { TutorialEvent, TutorialEventsType } from "../tutorials-events";
import { getFirstChildIfRichLayout, sleep } from "../tutorials-helpers";
import { STUDIO_ELEMENTS_TARGETS } from "../tutorials-targets";
import {
  OnNextCtx,
  StudioTutorialStep,
  TutorialStepFunctionality,
} from "../tutorials-types";

/**
 * While preparing the studio for the tour we clean the current page and
 * remove all queries. So that it would be recreated from scratch.
 */
async function prepareStudioToTour(ctx: OnNextCtx) {
  const vc = ctx.studioCtx.focusedOrFirstViewCtx();
  if (vc) {
    await ctx.studioCtx.change(({ success }) => {
      const component = vc.arenaFrame().container.component;

      const root = component.tplTree;
      const pageLayout = getFirstChildIfRichLayout(root);
      if (pageLayout) {
        $$$(pageLayout).clear();
      } else {
        $$$(root).clear();
      }

      // We expect that no references to the queries are left
      ctx.studioCtx
        .tplMgr()
        .clearReferencesToRemovedQueries(
          component.dataQueries.map((q) => q.uuid)
        );
      component.dataQueries = [];
      return success();
    });
  }
  // Remove all antd message notifications
  notification.destroy();
}

export const WELCOME_TUTORIAL_STEP: StudioTutorialStep = {
  name: "welcome",
  content: `
## Welcome, {FIRST_NAME}!

The Customer Operations team needs your help! 🚨🚨🚨

They need a way to find and update contact info in the customer database.

Your mission: **Build an app to manage customer data, in 5 minutes.**

And learn the basics of building apps in Plasmic along the way!

Ready?
`,
  nextButtonText: "Let's go!",
  target: "body",
  placement: "center",
  overlay: true,
  onNext: async (ctx: OnNextCtx) => {
    await ctx.studioCtx.change(({ success }) => {
      ctx.studioCtx.turnFocusedModeOn();
      return success();
    });
    await sleep(750);
    await prepareStudioToTour(ctx);
  },
};

export function addElementStepFunc({
  highlightTarget,
  componentName,
  onNext,
}: {
  highlightTarget: string;
  componentName: string;
  onNext: TutorialStepFunctionality<OnNextCtx>["onNext"];
}): TutorialStepFunctionality<OnNextCtx> {
  return {
    target: STUDIO_ELEMENTS_TARGETS.studioAddDrawer,
    placement: "right-start",
    highlightTarget,
    shouldAdvance: (event: TutorialEvent) => {
      if (event.type !== TutorialEventsType.TplInserted) {
        return false;
      }
      if (event.params.itemKey !== componentName) {
        notification.warn({
          message: "Wrong component inserted",
        });
        return false;
      }
      return true;
    },
    triggers: [TutorialEventsType.TplInserted],
    onNext,
  };
}

export function changeRightTabKeyStepFunc(
  tab: RightTabKey
): TutorialStepFunctionality<OnNextCtx> {
  return {
    target: STUDIO_ELEMENTS_TARGETS.editorTabs,
    triggers: [TutorialEventsType.RightTabSwitched],
    shouldAdvance: (event: TutorialEvent) => {
      return (
        event.type === TutorialEventsType.RightTabSwitched &&
        event.params.tabKey === tab
      );
    },
    placement: "left",
    highlightTarget:
      tab === "settings"
        ? STUDIO_ELEMENTS_TARGETS.editorTabsSettings
        : tab === "component"
        ? STUDIO_ELEMENTS_TARGETS.editorTabsComponents
        : STUDIO_ELEMENTS_TARGETS.editorTabsStyle,
  };
}

export const OPEN_ADD_DRAWER_STEP_FUNC: TutorialStepFunctionality<OnNextCtx> = {
  target: STUDIO_ELEMENTS_TARGETS.studioAddElement,
  placement: "right",
  highlightTarget: STUDIO_ELEMENTS_TARGETS.studioAddElement,
  triggers: [TutorialEventsType.AddButtonClicked],
  shouldAdvance: (event: TutorialEvent) => {
    return event.type === TutorialEventsType.AddButtonClicked;
  },
  waitFor: async (ctx: OnNextCtx) => {
    // Wait a bit for any layout shift to happen
    await sleep(300);
  },
  postStepFlags: {
    forceAddDrawerOpen: true,
  },
};

export const TURN_ON_INTERACTIVE_MODE_STEP_FUNC: TutorialStepFunctionality<OnNextCtx> =
  {
    target: STUDIO_ELEMENTS_TARGETS.interactiveCanvasSwitch,
    placement: "right-start",
    highlightTarget: STUDIO_ELEMENTS_TARGETS.interactiveCanvasSwitch,
    advanceOnUserChanges: async (ctx: OnNextCtx) => {
      return ctx.studioCtx.isInteractiveMode;
    },
  };

export const TURN_OFF_INTERACTIVE_MODE_STEP_FUNC: TutorialStepFunctionality<OnNextCtx> =
  {
    target: STUDIO_ELEMENTS_TARGETS.interactiveCanvasSwitch,
    placement: "right-start",
    // highlightTarget: STUDIO_ELEMENTS_TARGETS.interactiveCanvasSwitch,
    advanceOnUserChanges: async (ctx: OnNextCtx) => {
      return !ctx.studioCtx.isInteractiveMode;
    },
  };
