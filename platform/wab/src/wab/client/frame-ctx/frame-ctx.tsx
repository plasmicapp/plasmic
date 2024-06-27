import type { HostFrameCtx } from "@/wab/client/frame-ctx/host-frame-ctx";
import type { TopFrameCtx } from "@/wab/client/frame-ctx/top-frame-ctx";
import { ensure, ensureTruthy, hackyCast } from "@/wab/shared/common";
import React from "react";

type FrameCtx = TopFrameCtx | HostFrameCtx | undefined;

const FrameCtxContext = React.createContext<FrameCtx>(undefined);

export function providesFrameCtx(value: FrameCtx, key?: string) {
  return function (children: React.ReactNode) {
    const existingFrameCtx = React.useContext(FrameCtxContext);
    ensureTruthy(!existingFrameCtx, "FrameCtx already provided");
    return (
      <FrameCtxContext.Provider value={value} key={key}>
        {children}
      </FrameCtxContext.Provider>
    );
  };
}

export function useFrameCtx<TFrameCtx extends FrameCtx>(): TFrameCtx {
  const frameCtx = React.useContext(FrameCtxContext);
  return hackyCast(ensure(frameCtx, "FrameCtx not provided"));
}

export function useFrameCtxMaybe<TFrameCtx extends FrameCtx>():
  | TFrameCtx
  | undefined {
  return hackyCast(React.useContext(FrameCtxContext));
}
