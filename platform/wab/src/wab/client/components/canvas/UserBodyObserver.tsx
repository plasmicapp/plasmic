import {
  clearIdleCallback,
  requestIdleCallback,
} from "@/wab/client/requestidlecallback";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import * as React from "react";

export function useRerenderOnUserBodyChange(
  studioCtx: StudioCtx,
  viewCtx: ViewCtx | undefined,
  skip = false
) {
  const [forceRecomputeKey, setForceRecomputeKey] = React.useState(0);
  const [needsRecompute, setNeedsRecompute] = React.useState(false);

  React.useEffect(() => {
    const id = requestIdleCallback(() => {
      if (needsRecompute) {
        setNeedsRecompute(false);
        setForceRecomputeKey(forceRecomputeKey + 1);
      }
    });
    return () => clearIdleCallback(id);
  }, [forceRecomputeKey, needsRecompute]);

  const userBody = viewCtx?.canvasCtx.$userBody()?.[0];
  React.useEffect(() => {
    if (!userBody || !viewCtx || skip) {
      return;
    }
    const userBodyObserver = new MutationObserver(() => {
      setNeedsRecompute(true);
    });
    userBodyObserver.observe(userBody, {
      subtree: true,
      childList: true,
    });
    return () => userBodyObserver.disconnect();
  }, [userBody, viewCtx, skip]);

  React.useEffect(() => {
    const stylesListener = studioCtx.styleChanged.add(() =>
      setNeedsRecompute(true)
    );
    const framesListener = studioCtx.framesChanged.add(() =>
      setNeedsRecompute(true)
    );

    return () => {
      stylesListener.detach();
      framesListener.detach();
    };
  }, [studioCtx]);

  return needsRecompute;
}
