import { BottomPanelState } from "@/wab/client/components/BottomPanelState";
import { StudioCtx, StudioCtxContext } from "@/wab/client/studio-ctx/StudioCtx";
import { useConstant } from "@/wab/commons/components/ReactUtil";
import React from "react";

/** Gives the enclosing StudioCtx stub, if any, a real bottom panel. */
export function BottomPanelTestProvider(props: {
  state?: BottomPanelState;
  children?: React.ReactNode;
}) {
  const parent = React.useContext(StudioCtxContext);
  const studioCtx = useConstant((): StudioCtx =>
    Object.assign(Object.create(parent ?? null), {
      change: parent?.change ?? (async (fn: () => unknown) => fn()),
      focusedViewCtx: parent?.focusedViewCtx ?? (() => undefined),
      bottomPanel: props.state ?? new BottomPanelState(),
    }),
  );
  return (
    <StudioCtxContext.Provider value={studioCtx}>
      {props.children}
    </StudioCtxContext.Provider>
  );
}
