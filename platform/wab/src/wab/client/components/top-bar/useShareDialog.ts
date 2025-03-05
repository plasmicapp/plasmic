import { useAppCtx } from "@/wab/client/contexts/AppContexts";
import { plasmicIFrameMouseDownEvent } from "@/wab/client/definitions/events";
import { ensure, spawn } from "@/wab/shared/common";
import * as React from "react";

export function useShareDialog() {
  const appCtx = useAppCtx();
  const topFrameApi = ensure(appCtx.topFrameApi, "missing topFrameApi");
  React.useEffect(() => {
    const handler = () => {
      spawn(topFrameApi.setShowShareModal(false));
    };
    document.addEventListener(plasmicIFrameMouseDownEvent, handler);
    return () => {
      document.removeEventListener(plasmicIFrameMouseDownEvent, handler);
    };
  });

  function openShareDialog() {
    spawn(topFrameApi.setShowShareModal(true));
  }

  return {
    openShareDialog,
  };
}
