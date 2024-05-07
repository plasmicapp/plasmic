import { AppCtx } from "@/wab/client/app-ctx";
import { TopFrameApi } from "@/wab/client/frame-ctx/top-frame-api";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import {
  TutorialEvent,
  TutorialEventsType,
} from "@/wab/client/tours/tutorials/tutorials-events";
import { ProjectId } from "@/wab/shared/ApiSchema";
import { Step } from "react-joyride";

export interface TutorialStateFlags {
  keepInspectObjectPropEditorOpen: boolean;
  keepActionBuilderUncollapsed: boolean;
  keepHandlerFunctionOptionsVisible: boolean;
  forceAddDrawerOpen: boolean;
  keepDataPickerOpen: boolean;
  keepInteractionModalOpen: boolean;
}

export interface OnNextCtx {
  studioCtx: StudioCtx;
  topFrameApi: TopFrameApi;
}

/** Tutorial step props that affect the UI, like content. */
export interface TutorialStepUI {
  /** Content can be MDX, which will be processed with react-markdown. */
  content: string;
  /**
   * Text of button to proceed to the next step.
   *
   * If not set, no next button is shown, and the user must proceed based on shouldAdvance or advanceOnUserChanges.
   */
  nextButtonText?: string;
  /**
   * Text of secondary button.
   */
  secondaryButtonText?: string;
  /**
   * Whether the step popover should be hidden, so that the step wait for the user to interact without showing
   * any message
   */
  hidden?: boolean;
}

/** Tutorial step props that affect its functionality, like when to advance to the next step. */
export interface TutorialStepFunctionality<T> {
  /** CSS selector of element that the step will point to. */
  target: string;
  /** Placement of tooltip, relative to target. Defaults to "auto". */
  placement?: Step["placement"];
  /**
   * CSS selector to element to be highlighted.
   * The highlightTarget element MUST be a descendant of the target element.
   *
   * If not set, no element is highlighted.
   */
  highlightTarget?: string;
  /**
   * Z-index of highlight effect.
   *
   * This has a sane default, though you might want need to customize this in some cases...
   */
  highlightZIndex?: number;
  /** Dim the background with an overlay, defaults to no overlay. */
  overlay?: boolean;
  /**
   * Check if the tutorial should advance to the next step based on the event that was triggered
   */
  shouldAdvance?: (event: TutorialEvent) => boolean;
  /**
   * Triggers that should be listened to in order to advance to the next step
   * to be used in actions that are intercepted by the tour
   */
  triggers?: TutorialEventsType[];
  /**
   * Called before proceeding to the next step,
   * either when the next button is clicked or shouldAdvance or advanceOnUserChanges returns true.
   *
   * This should be used to automatically perform actions before proceeding to the next step.
   */
  onNext?: (ctx: T) => Promise<void>;
  /**
   * Called when pressing secondary action.
   */
  onSecondary?: (ctx: T) => Promise<void>;
  /**
   * Called before the step starts.
   *
   * Can be used to delay a step starting until an element appears or animation finishes.
   * Note that it is not necessary to wait for the target to be visible--this is automatically done for you.
   *
   * It should be possible to use ctx.studioCtx but the tour state shouldn't be updated here
   */
  waitFor?: (ctx: T) => Promise<void>;
  /** Overrides the default behavior of advancing to the next step, it should return a boolean indicating if the step should advance */
  advanceOnUserChanges?: (ctx: T) => Promise<boolean>;
  /** Applies the following flags before advancing to the next step. */
  postStepFlags?: Partial<TutorialStateFlags>;
}

export type TutorialStep<T> = {
  /** Unique name of the step, used for tracking the progress of the tutorial. */
  name: string;
} & TutorialStepUI &
  TutorialStepFunctionality<T>;

export interface TopFrameOnNextCtx {
  appCtx: AppCtx;
  topFrameApi: TopFrameApi;
  projectId: ProjectId;
  domain: string;
}

export type StudioTutorialStep = TutorialStep<OnNextCtx>;
export type TopFrameTutorialStep = TutorialStep<TopFrameOnNextCtx>;
