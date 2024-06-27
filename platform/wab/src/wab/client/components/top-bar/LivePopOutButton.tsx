import {
  getUrlsForLiveMode,
  isLiveMode,
  usePreviewCtx,
} from "@/wab/client/components/live/PreviewCtx";
import {
  useFrameBgColor,
  useLivePreview,
} from "@/wab/client/components/live/PreviewFrame";
import { untilClosed } from "@/wab/client/dom-utils";
import {
  DefaultLivePopOutButtonProps,
  PlasmicLivePopOutButton,
} from "@/wab/client/plasmic/plasmic_kit_top_bar/PlasmicLivePopOutButton";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { useForceUpdate } from "@/wab/client/useForceUpdate";
import { spawn } from "@/wab/shared/common";
import { getFrameHeight } from "@/wab/shared/Arenas";
import { getPublicUrl } from "@/wab/shared/urls";
import { observer } from "mobx-react";
import * as React from "react";
import { useHistory } from "react-router";

type LivePopOutButtonProps = DefaultLivePopOutButtonProps;

const LivePopOutButton = observer(function LivePopOutButton(
  props: LivePopOutButtonProps
) {
  const history = useHistory();
  const studioCtx = useStudioCtx();
  const previewCtx = usePreviewCtx();
  const curPopup = previewCtx.popup;
  const forceUpdate = useForceUpdate();
  const { frameRef, onLoad, reset } = useLivePreview(previewCtx);

  React.useEffect(() => {
    const listener = (event: MessageEvent) => {
      if (event.data.source !== "plasmic-popup" || !previewCtx.popup) {
        return;
      }

      switch (event.data.type) {
        case "load":
          spawn(
            (async () => {
              const location = await getUrlsForLiveMode(studioCtx, true);

              previewCtx.popup?.postMessage(
                {
                  source: "plasmic-studio",
                  type: "replaceHistory",
                  url:
                    (location.pathname ?? "") +
                    (location.search ?? "") +
                    (location.hash ?? ""),
                },
                "*"
              );

              reset();
              const frame = previewCtx.popup?.frames[0];
              frameRef.current = frame || null;
              await onLoad();
            })()
          );
          break;
        case "popstate":
          spawn(previewCtx.parseRoute());
          break;
        case "unload":
          previewCtx.popup = undefined;
          break;
      }
    };

    window.addEventListener("message", listener);
    return () => {
      window.removeEventListener("message", listener);
    };
  }, [curPopup]);

  const openLivePopup = () => {
    if (curPopup) {
      curPopup.focus();
      return;
    }

    let windowOptions = "resizable";
    const vc = studioCtx.focusedViewCtx();
    if (vc && !isLiveMode(history.location.pathname)) {
      windowOptions += `,width=${vc.arenaFrame().width},height=${getFrameHeight(
        vc.arenaFrame()
      )}`;
    }

    const hostUrl =
      studioCtx.getHostUrl() +
      "#live=true" +
      `&origin=${encodeURIComponent(getPublicUrl())}`;

    spawn(
      (async () => {
        const studioUrl = await studioCtx.appCtx.api.getStudioUrl();
        const popup = window.open(
          `${studioUrl}/static/popup.html#${hostUrl}`,
          "_blank",
          windowOptions
        );
        if (popup) {
          await previewCtx.setPopup(popup);
          await untilClosed(popup);
          await previewCtx.setPopup(undefined);
          reset();
          // lots of variables here read off on non-responsive state...
          // Instead of making them responsive, just going to rerender
          // the component for now 😐
          forceUpdate();
        }
      })()
    );
  };

  React.useEffect(() => {
    return () => {
      if (curPopup) {
        curPopup.close();
      }
    };
  }, [curPopup]);

  const setFrameColor = React.useCallback(
    (
      frame: React.MutableRefObject<Window | null>,
      color: string | null | undefined
    ) => {
      if (frame?.current?.document?.body?.style) {
        frame.current.document.body.style.backgroundColor = color ?? "";
      }
    },
    []
  );

  useFrameBgColor(frameRef, previewCtx, setFrameColor);

  return (
    <PlasmicLivePopOutButton
      {...props}
      tooltip={`Preview the artboard in new window`}
      disabled={studioCtx.currentArenaEmpty && !previewCtx}
      onClick={() => openLivePopup()}
    />
  );
});

export default LivePopOutButton;
