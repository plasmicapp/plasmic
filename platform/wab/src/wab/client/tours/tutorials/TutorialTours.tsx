import { AppCtx } from "@/wab/client/app-ctx";
import { reactConfirm } from "@/wab/client/components/quick-modals";
import { topFrameTourSignals } from "@/wab/client/components/TopFrame/TopFrameChrome";
import Button from "@/wab/client/components/widgets/Button";
import IconButton from "@/wab/client/components/widgets/IconButton";
import { useApi, useTopFrameApi } from "@/wab/client/contexts/AppContexts";
import { reportError } from "@/wab/client/ErrorNotifications";
import { TopFrameApi } from "@/wab/client/frame-ctx/top-frame-api";
import CloseIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Close";
import HelpIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Help";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { TopFramePublishTours } from "@/wab/client/tours/tutorials/frags/publish-steps";
import { TutorialHighlightEffect } from "@/wab/client/tours/tutorials/TutorialHighlightEffect";
import { TutorialEvent } from "@/wab/client/tours/tutorials/tutorials-events";
import { waitElementToBeVisible } from "@/wab/client/tours/tutorials/tutorials-helpers";
import {
  STUDIO_ONBOARDING_TUTORIALS,
  TOPFRAME_ONBOARDING_TUTORIALS,
} from "@/wab/client/tours/tutorials/tutorials-meta";
import { TutorialStateFlags } from "@/wab/client/tours/tutorials/tutorials-types";
import { trackEvent } from "@/wab/client/tracking";
import { StandardMarkdown } from "@/wab/client/utils/StandardMarkdown";
import { zIndex } from "@/wab/client/z-index";
import { mkShortId, spawn, waitUntil } from "@/wab/common";
import { useSignalListener } from "@/wab/commons/components/use-signal-listener";
import { ProjectId } from "@/wab/shared/ApiSchema";
import * as Sentry from "@sentry/browser";
import { notification } from "antd";
import { observer } from "mobx-react";
import React from "react";
import { ErrorBoundary } from "react-error-boundary";
import type { Step } from "react-joyride";
import { useMountedState } from "react-use";

const LazyJoyRide = React.lazy(() => import("react-joyride"));

interface StepContentPopupProps {
  /** Identifier of current step */
  name: string;
  content: string;
  /** Text of button to proceed to next step. If not set, no button is displayed. */
  nextButtonText?: string;

  /** Text of secondary button. */
  secondaryButtonText?: string;
  /** Called when the user clicks the next button. */
  onNext?: () => Promise<void>;
  /** Called when the user clicks the secondary button. */
  onSecondary?: () => Promise<void>;
  /** Called when the user wants to quit the tutorial. */
  onQuit: () => Promise<void>;
  tourInfo: {
    userFirstName: string;
    storeName: string;
    domain?: string;
  };
}

function StepContentPopup(props: StepContentPopupProps) {
  const {
    name,
    content,
    onNext,
    onQuit,
    tourInfo,
    nextButtonText,
    secondaryButtonText,
    onSecondary,
  } = props;

  return (
    <div id={`tour-popup-${name}`} className="flex-col pb-m gap-lg">
      <div className="flex fill-width flex-align-start">
        <div className="text-align-left fill-width pt-m tutorial-content">
          <StandardMarkdown>
            {content
              .replaceAll("{FIRST_NAME}", tourInfo.userFirstName)
              .replaceAll("{STORE_NAME}", tourInfo.storeName)
              .replaceAll("{APP_DOMAIN}", tourInfo.domain || "")
              .trim()}
          </StandardMarkdown>
        </div>
        <IconButton
          href="https://forum.plasmic.app/"
          target="_blank"
          hoverText="Visit our community forum for help"
          size="large"
        >
          <HelpIcon />
        </IconButton>
        <IconButton
          hoverText="Exit tutorial"
          size="large"
          onClick={async () => {
            if (
              await reactConfirm({
                title: "Exit tutorial?",
                message:
                  "If you want to start the tutorial again, you'll need to start over in a new project.",
                confirmLabel: "Exit",
                cancelLabel: "Back",
              })
            ) {
              await onQuit();
            }
          }}
        >
          <CloseIcon />
        </IconButton>
      </div>
      {(nextButtonText || secondaryButtonText) && (
        <div className="pt-sm flex-push-right flex gap-sm">
          {secondaryButtonText && (
            <Button id="tour-secondary-btn" onClick={onSecondary}>
              <span className="tutorial-content">{secondaryButtonText}</span>
            </Button>
          )}
          {nextButtonText && (
            <Button id="tour-primary-btn" type="primary" onClick={onNext}>
              <span className="tutorial-content">{nextButtonText}</span>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

const STEP_SETTINGS: Partial<Step> = {
  spotlightClicks: true,
  disableBeacon: true,
  hideFooter: true,
};

interface TourStepMeta {
  projectId: string;
  tour: string;
  stepIndex: number;
  stepName: string;
  prevStepName: string;
  status:
    | "completed"
    | "quit"
    | "inactivity"
    | "finish"
    | "started"
    | "error"
    | "paused";
}

function trackTourEvent(meta: TourStepMeta) {
  trackEvent("studio-tour", meta);
}

const tourStorageKey = (projectId: string) => `plasmic.tours.${projectId}`;

const TOUR_STEP_VISIBILITY_CHECK_INTERVAL = 1500; // 1.5 seconds
const USER_CHANGE_CHECK_INTERVAL = 250; // 0.25 seconds
const USER_CHANGE_MAX_WAIT = 1000 * 60 * 45; // 45 minutes

// This is hoook is intended to be used in a tour step to check if the target element is visible
// in case it's not visible we will hide the tour step, and show it again when it becomes visible.
// This is useful to avoid "isSameNode" errors triggered by joy-ride and to hide bad placements
// of elements in the screen.
const useTourStepTargetVisibility = (
  isTourRunning: boolean,
  target?: string,
  onVisibilityChange?: (isVisible: boolean) => void
) => {
  const [isTargetVisible, setIsTargetVisible] = React.useState(false);

  React.useEffect(() => {
    const interval = setInterval(() => {
      if (!isTourRunning || !target) {
        return;
      }

      const element = document.querySelector(target);

      const isVisible = !!element;

      if (isVisible !== isTargetVisible) {
        onVisibilityChange?.(isVisible);
        setIsTargetVisible(isVisible);
      }
    }, TOUR_STEP_VISIBILITY_CHECK_INTERVAL);

    return () => {
      clearInterval(interval);
    };
  }, [isTourRunning, target, onVisibilityChange, isTargetVisible]);

  return { isTargetVisible };
};

export const StudioTutorialTours = observer(function _StudioTutorialTours() {
  const studioCtx = useStudioCtx();
  const api = useApi();
  const topFrameApi = useTopFrameApi();

  const tourState = studioCtx.onboardingTourState;
  const currentTutorial = STUDIO_ONBOARDING_TUTORIALS[tourState.tour];
  const currentStep = currentTutorial?.[tourState.stepIndex];

  function trackCurrentStepTourEvent(status: TourStepMeta["status"]) {
    trackTourEvent({
      projectId: studioCtx.siteInfo.id,
      tour: tourState.tour,
      stepIndex: tourState.stepIndex,
      stepName: currentStep.name,
      prevStepName: currentTutorial[tourState.stepIndex - 1]?.name || "",
      status,
    });
  }

  const clearFlagsOnVisibilityChange = React.useCallback(
    (isVisible: boolean) => {
      // We only care about the visibility of the target when the tour is running
      // during `advanceToNextStep` we temporarily disable the tour to avoid the
      // user to interact with the tour while the next step is being prepared,
      // during this time the target may become invisible, but we don't want to
      // pause the tour in this case.
      const isRunning = tourState.run;
      if (!isVisible && isRunning) {
        // In case the visibility of the current target changes, we clear the flags
        // this is to avoid that flags that force components state to be active when
        // the user goes out of the tour route and somehow it becomes inconsistent.
        // As an example `keepDataPickerOpen` flag is used to keep the data picker open
        // but it also blocks the visibility change of the data picker to change, but
        // the data picker can be unmounted when the user unfocuses the component.
        //
        // If the user finds the path back to the tour step, the tour will resume.
        studioCtx.setOnboardingTourState({
          ...studioCtx.onboardingTourState,
          flags: {},
        });

        notification.warn({
          message:
            "Since you navigated away from the tour, it was paused. By navigating back to the previous state, you can resume the tour.",
        });

        trackCurrentStepTourEvent("paused");
      }
    },
    [tourState.run]
  );

  const { isTargetVisible } = useTourStepTargetVisibility(
    tourState.run,
    currentStep?.target,
    clearFlagsOnVisibilityChange
  );

  const closeTour = () => {
    studioCtx.setOnboardingTourState({
      run: false,
      stepIndex: 0,
      tour: "",
      flags: {},
      results: {},
      triggers: [],
    });
  };

  const markTourAsSeen = async () => {
    await api.addStorageItem(tourStorageKey(studioCtx.siteInfo.id), true);
  };

  const quitTour = async () => {
    trackCurrentStepTourEvent("quit");
    await markTourAsSeen();
    closeTour();
  };

  const finishTour = () => {
    trackCurrentStepTourEvent("finish");
    closeTour();
  };

  const endTourByInactivity = () => {
    trackCurrentStepTourEvent("inactivity");
    closeTour();
  };

  const captureTourError = (e: Error) => {
    Sentry.captureException(e, {
      extra: {
        projectId: studioCtx.siteInfo.id,
        tour: tourState.tour,
        stepIndex: tourState.stepIndex,
        stepName: currentStep.name,
        prevStepName: currentTutorial[tourState.stepIndex - 1]?.name || "",
      },
    });
  };

  const advanceToNextStep = async (
    flags: Partial<TutorialStateFlags> = {},
    results: Record<string, any> = {}
  ) => {
    studioCtx.setOnboardingTourState({
      ...studioCtx.onboardingTourState,
      run: false, // sneakily disable the tour so that the tutorial is hidden while waiting
    });

    if (currentStep?.onNext) {
      await currentStep.onNext(stepCtx);
    }

    trackCurrentStepTourEvent("completed");
    if (tourState.stepIndex + 1 === currentTutorial.length) {
      finishTour();
      return;
    }
    if (tourState.stepIndex === 0) {
      // After the user interacts with the first step, we mark the tour as seen
      // Either by the user advancing to the next step or by the user quitting the tour
      // this way if the user reloads the page the tour won't show up again if it had
      // some kind of interaction before
      await markTourAsSeen();
    }
    const nextStep = currentTutorial[tourState.stepIndex + 1];
    const currentFlags = {
      ...flags,
      ...(currentStep.postStepFlags || {}),
    };

    if (nextStep.waitFor) {
      try {
        await nextStep.waitFor(stepCtx);
      } catch (e) {
        // The nature of waitFor should be simple operation to wait for something to be visible
        // or wait for some animation to finish, small fixes at the studio zoom...
        //
        // It shouldn't be used to perform complex operations, we assume errors here are triggered
        // by timeouts in which case we gonna continue the tour, but the user will probably have
        // to manually go to the state of the next step. That would be through `useTourStepTargetVisibility`
        captureTourError(e);
      }
    }

    try {
      await waitElementToBeVisible(nextStep.target);
    } catch (e) {
      // We won't stop the tour here, we will attempt to continue and let `clearFlagsOnVisibilityChange`
      // to pause the tour if the target is not visible
      trackCurrentStepTourEvent("error");
      captureTourError(e);
    }

    studioCtx.setOnboardingTourState({
      run: true,
      stepIndex: tourState.stepIndex + 1,
      tour: tourState.tour,
      flags: currentFlags,
      results: {
        ...studioCtx.onboardingTourState.results,
        ...results,
      },
      triggers: nextStep.triggers || [],
    });
  };

  const stepCtx = {
    studioCtx,
    topFrameApi,
  };

  useSignalListener<TutorialEvent>(
    studioCtx.tourActionEvents,
    (event: TutorialEvent) => {
      if (!tourState.run) {
        return;
      }
      const advance = currentStep.shouldAdvance
        ? currentStep.shouldAdvance(event)
        : false;
      console.log(`Studio tour event (advance=${advance})`, event);
      if (advance) {
        spawn(advanceToNextStep());
      }
    },
    [tourState.tour, tourState.run, tourState.stepIndex]
  );

  React.useEffect(() => {
    if (!tourState.run) {
      return;
    }

    const advanceOnUserChanges = currentStep.advanceOnUserChanges;
    if (advanceOnUserChanges) {
      const nonNullAdvanceOnUserChanges = advanceOnUserChanges;
      async function advanceToNextStepAfterUserChanges() {
        try {
          await waitUntil(() => nonNullAdvanceOnUserChanges(stepCtx), {
            timeout: USER_CHANGE_CHECK_INTERVAL,
            maxTimeout: USER_CHANGE_MAX_WAIT,
          });
        } catch (e) {
          console.log("Studio tour timed out", e);
          endTourByInactivity();
          captureTourError(e);
          return;
        }

        await advanceToNextStep();
      }
      spawn(advanceToNextStepAfterUserChanges());
    }
  }, [tourState.run, tourState.stepIndex]);

  const isMounted = useMountedState();

  React.useEffect(() => {
    spawn(
      (async function checkIfShouldStartTour() {
        const templateTours = studioCtx.appCtx.appConfig.templateTours;
        const { clonedFromProjectId, id: projectId } = studioCtx.siteInfo;

        if (!clonedFromProjectId || !templateTours) {
          return;
        }

        const templateTour = templateTours[clonedFromProjectId];

        if (!templateTour) {
          return;
        }

        const hasSeenTour = await api.getStorageItem(tourStorageKey(projectId));

        if (!hasSeenTour && isMounted()) {
          trackTourEvent({
            projectId,
            tour: templateTour,
            stepIndex: 0,
            stepName: "",
            prevStepName: "",
            status: "started",
          });

          studioCtx.setOnboardingTourState({
            run: true,
            stepIndex: 0,
            tour: templateTour,
            flags: {},
            results: {},
            triggers: [],
          });
        }
      })()
    );
  }, [studioCtx, isMounted]);

  if (
    !tourState.run ||
    !currentTutorial ||
    !isTargetVisible ||
    studioCtx.isLiveMode
  ) {
    return null;
  }

  const steps: Step[] = currentTutorial.map((step) => {
    return {
      target: step.target,
      content: (
        <StepContentPopup
          name={step.name}
          content={step.content}
          nextButtonText={step.nextButtonText}
          onNext={advanceToNextStep}
          secondaryButtonText={step.secondaryButtonText}
          onSecondary={async () => step.onSecondary?.(stepCtx)}
          onQuit={quitTour}
          tourInfo={{
            userFirstName: studioCtx.appCtx.selfInfo?.firstName || "",
            storeName: "Your Store",
          }}
        />
      ),
      ...STEP_SETTINGS,
      placement: step.placement,
      disableOverlay: !step.overlay,
    };
  });

  return (
    <ErrorBoundary
      fallback={<UnexpectedTourError />}
      onError={(err, info) => {
        console.error(err, info);
        reportError(err, "studio-tour");
        trackTourEvent({
          projectId: studioCtx.siteInfo.id,
          tour: tourState.tour,
          stepIndex: tourState.stepIndex,
          stepName: currentStep.name,
          prevStepName: currentTutorial[tourState.stepIndex - 1]?.name || "",
          status: "error",
        });
        // Not necessary to close the tour, it may be a recoverable error
        // if not the tour will be closed by inactivity
      }}
    >
      {currentStep?.highlightTarget && (
        <TutorialHighlightEffect
          target={currentStep.highlightTarget}
          targetContainer={currentStep.target}
          zIndex={currentStep.highlightZIndex || zIndex.tourHighlight}
        />
      )}
      <React.Suspense fallback={null}>
        {!currentStep?.hidden && (
          <LazyJoyRide
            continuous
            hideCloseButton
            hideBackButton
            disableOverlayClose
            disableScrolling
            disableScrollParentFix
            {...tourState}
            styles={{
              options: {
                zIndex: zIndex.tour,
              },
              tooltip: {
                color: undefined,
                fontSize: undefined,
                padding: "20px",
                background: `
linear-gradient(rgba(255,255,255,0.5), rgba(255,255,255,0.5)), url(/static/img/grid-pattern-bg.png)

          `,
                backgroundPosition: "bottom left",
                // Scale tooltip a bit so that the arrow feels more seamless
                transform: "scale(1.01)",
              },
              tooltipContent: {
                padding: 0,
              },
            }}
            steps={steps}
          />
        )}
      </React.Suspense>
    </ErrorBoundary>
  );
});

function UnexpectedTourError() {
  React.useEffect(() => {
    notification.error({
      message: "Unexpected tour error",
    });
    // TODO: allow studio to recover from this error
  }, []);
  return null;
}

export interface TopFrameTourState {
  tour: string;
  run: boolean;
  stepIndex: number;
}

const PROJECT_TOUR_HOSTING_PREFIX = "tutorial-";

function generateCustomDomain(appCtx: AppCtx, tour: string) {
  const uniqueId = mkShortId().toLowerCase();
  const tourPrefix =
    tour === TopFramePublishTours.PortfolioPublish
      ? "portfolio-"
      : "admin-panel-";
  return `${tourPrefix}${uniqueId}.${appCtx.appConfig.plasmicHostingSubdomainSuffix}`;
}

export function TopFrameTours(props: {
  appCtx: AppCtx;
  tourState: TopFrameTourState;
  topFrameApi: TopFrameApi;
  changeTourState: (state: TopFrameTourState) => Promise<void>;
  projectId: ProjectId;
}) {
  const { appCtx, tourState, topFrameApi, changeTourState, projectId } = props;

  const currentTutorial = TOPFRAME_ONBOARDING_TUTORIALS[tourState.tour];
  const currentStep = currentTutorial?.[tourState.stepIndex];
  const { isTargetVisible } = useTourStepTargetVisibility(
    tourState.run,
    currentStep?.target
  );

  const domain = React.useMemo(
    () => generateCustomDomain(appCtx, tourState.tour),
    [appCtx, tourState.tour]
  );

  function trackCurrentStepTourEvent(status: TourStepMeta["status"]) {
    trackTourEvent({
      projectId,
      tour: tourState.tour,
      stepIndex: tourState.stepIndex,
      stepName: currentStep.name,
      prevStepName: currentTutorial[tourState.stepIndex - 1]?.name || "",
      status,
    });
  }

  const closeTour = async () => {
    await changeTourState({
      run: false,
      stepIndex: 0,
      tour: "",
    });
  };

  const quitTour = async () => {
    trackCurrentStepTourEvent("quit");
    await topFrameApi.setKeepPublishModalOpen(false);
    await closeTour();
  };

  const onNextCtx = {
    appCtx,
    topFrameApi,
    projectId,
    domain,
  };

  const advanceToNextStep = async () => {
    // If we have both onNext and onSecondary, we assume that we shouldn't trigger onNext/onSecondary
    // as it's expected that the user will trigger it manually.
    if (currentStep?.onNext && !currentStep?.onSecondary) {
      await currentStep.onNext(onNextCtx);
    }

    // Track user completing a step
    trackCurrentStepTourEvent("completed");
    if (tourState.stepIndex + 1 === currentTutorial.length) {
      trackCurrentStepTourEvent("finish");
      await closeTour();
      return;
    }
    const nextStep = currentTutorial[tourState.stepIndex + 1];

    await changeTourState({
      run: false, // sneakily disable the tour so that the tutorial is hidden while waiting
      stepIndex: tourState.stepIndex + 1,
      tour: tourState.tour,
    });

    if (nextStep.waitFor) {
      await nextStep.waitFor(onNextCtx);
    }
    await waitElementToBeVisible(nextStep.target);

    await changeTourState({
      run: true,
      stepIndex: tourState.stepIndex + 1,
      tour: tourState.tour,
    });
  };

  useSignalListener<TutorialEvent>(
    topFrameTourSignals,
    (event) => {
      if (!tourState.run) {
        return;
      }
      const advance = currentStep.shouldAdvance
        ? currentStep.shouldAdvance(event)
        : false;
      console.log(`TopFrame tour event (advance=${advance})`, event);
      if (advance) {
        spawn(advanceToNextStep());
      }
    },
    [tourState.tour, tourState.run, tourState.stepIndex]
  );

  if (!tourState.run || !currentTutorial || !isTargetVisible) {
    return null;
  }

  const steps: Step[] = currentTutorial.map((step) => {
    return {
      target: step.target,
      content: (
        <StepContentPopup
          name={step.name}
          content={step.content}
          nextButtonText={step.nextButtonText}
          onNext={advanceToNextStep}
          secondaryButtonText={step.secondaryButtonText}
          onSecondary={async () => step.onSecondary?.(onNextCtx)}
          onQuit={quitTour}
          tourInfo={{
            userFirstName: appCtx.selfInfo?.firstName || "",
            storeName: "Your Store",
            domain,
          }}
        />
      ),
      ...STEP_SETTINGS,
      placement: step.placement,
      disableOverlay: !step.overlay,
    };
  });

  return (
    <>
      {currentStep?.highlightTarget && (
        <TutorialHighlightEffect
          target={currentStep.highlightTarget}
          targetContainer={currentStep.target}
          zIndex={currentStep.highlightZIndex || zIndex.tourHighlight}
        />
      )}
      <LazyJoyRide
        continuous
        hideCloseButton
        hideBackButton
        disableOverlayClose
        disableScrolling
        disableScrollParentFix
        {...tourState}
        styles={{
          options: {
            zIndex: zIndex.tour,
          },
          tooltip: {
            color: undefined,
            fontSize: undefined,
            padding: "20px",
            background: `
          linear-gradient(rgba(255,255,255,0.5), rgba(255,255,255,0.5)), url(/static/img/grid-pattern-bg.png)

          `,
            backgroundPosition: "bottom left",
          },
          tooltipContent: {
            padding: 0,
          },
        }}
        steps={steps}
      />
    </>
  );
}
