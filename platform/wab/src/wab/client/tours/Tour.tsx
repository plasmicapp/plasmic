import Button from "@/wab/client/components/widgets/Button";
import { useApi } from "@/wab/client/contexts/AppContexts";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { zIndex } from "@/wab/client/z-index";
import { spawn } from "@/wab/common";
import { observer } from "mobx-react";
import moment from "moment/moment";
import React from "react";
import { StoreHelpers } from "react-joyride";
import { useMountedState } from "react-use";
import { Signal } from "signals";

const LazyJoyRide = React.lazy(() => import("react-joyride"));

interface TourProps<T> {
  seenStateKey: string;
  onlyUsersCreatedBefore: string;
  didActionSignal?: Signal<T>;
  targetSelector: string;
  content: JSX.Element;
}

export const Tour = observer(function Tour<T>({
  seenStateKey,
  onlyUsersCreatedBefore,
  didActionSignal,
  targetSelector,
  content,
}: TourProps<T>) {
  const studioCtx = useStudioCtx();
  const api = useApi();
  const helpersRef = React.useRef<StoreHelpers | null>(null);

  const [tourState, setTourState] = React.useState({
    run: false,
    stepIndex: 0,
  });

  const isMounted = useMountedState();

  React.useEffect(() => {
    spawn(
      (async () => {
        const seen = await api.getStorageItem(seenStateKey);
        const shouldRender =
          !seen &&
          !!studioCtx.appCtx.selfInfo &&
          moment(studioCtx.appCtx.selfInfo.createdAt).isBefore(
            moment(onlyUsersCreatedBefore)
          );
        if (shouldRender && isMounted()) {
          setTourState((x) => ({ ...x, run: true }));
        }
      })()
    );
  }, [studioCtx, isMounted]);

  React.useEffect(() => {
    if (tourState.run && didActionSignal) {
      const listener = () => {
        // We use a showProjectPanelRequested listener in case the user opened
        // the panel via "p" or clicking the button
        if (helpersRef.current?.info().status === "running") {
          spawn(closeTour());
        }
      };
      didActionSignal.add(listener);
      return () => {
        didActionSignal.remove(listener);
      };
    } else {
      return undefined;
    }
  }, [studioCtx, tourState.run, didActionSignal]);

  const closeTour = async () => {
    setTourState({ ...tourState, run: false });
    await api.addStorageItem(seenStateKey, "true");
  };

  if (!tourState.run) {
    return null;
  }

  return (
    <LazyJoyRide
      continuous
      hideCloseButton
      hideBackButton
      disableOverlayClose
      {...tourState}
      styles={{
        options: {
          zIndex: zIndex.tour,
        },
        tooltip: {
          color: undefined,
          fontSize: undefined,
        },
        tooltipContent: {
          padding: 0,
        },
      }}
      steps={[
        {
          target: targetSelector,
          content: (
            <>
              <div className="text-align-left">
                {content}
                <p className="text-align-right" style={{ marginBottom: 0 }}>
                  <Button
                    type="secondary"
                    onClick={async () => {
                      studioCtx.showProjectPanel();
                      await closeTour();
                    }}
                  >
                    Got it
                  </Button>
                </p>
              </div>
            </>
          ),
          spotlightClicks: true,
          disableBeacon: true,
          hideFooter: true,
        },
      ]}
      callback={async (data) => {
        if (data.action === "close") {
          await closeTour();
        }
      }}
      getHelpers={(helpers) => (helpersRef.current = helpers)}
    />
  );
});
