import { observer } from "mobx-react-lite";
import React from "react";
import { AppCtx } from "../../app-ctx";
import { isTopFrame } from "../../cli-routes";
import { useHostFrameCtx } from "../../frame-ctx/host-frame-ctx";
import importAndRetry from "../dynamic-import";
import { ObserverLoadable } from "../widgets";
import { StudioFrame } from "./studio-frame";

type ViewInitializerProps = {
  projectId: string;
  appCtx: AppCtx;
  onRefreshUi: () => void;
};

/**
 * Entry point for Studio-related UI, rendering differently depending on which window this is.
 * - In the top frame, we render StudioFrame, which includes the iframe for the host window.
 * - In the host frame, we render StudioInitializer, which includes the actual Studio UI code.
 */
export const ViewInitializer = observer(function ViewInitializer(
  props: ViewInitializerProps
) {
  if (isTopFrame()) {
    return <TopFrameViewInitializer {...props} />;
  } else {
    return <HostFrameViewInitializer {...props} />;
  }
});

function TopFrameViewInitializer({ projectId }: ViewInitializerProps) {
  const [studioFrameKey, setStudioFrameKey] = React.useState(0);
  const refreshStudio = React.useCallback(
    async () => setStudioFrameKey(studioFrameKey + 1),
    [studioFrameKey]
  );

  return (
    <StudioFrame
      projectId={projectId}
      refreshStudio={refreshStudio}
      key={studioFrameKey}
    />
  );
}

function HostFrameViewInitializer({
  appCtx,
  onRefreshUi,
  projectId,
}: ViewInitializerProps) {
  const hostFrameCtx = useHostFrameCtx();
  const loader = () =>
    importAndRetry(() => import("./studio-initializer")).then(
      ({ StudioInitializer }) => (
        <StudioInitializer
          hostFrameCtx={hostFrameCtx}
          appCtx={appCtx}
          onRefreshUi={onRefreshUi}
          projectId={projectId}
        />
      )
    );
  const contents = (studioInitializer: React.ReactElement) => studioInitializer;
  return <ObserverLoadable loader={loader} contents={contents} />;
}

export default ViewInitializer;
