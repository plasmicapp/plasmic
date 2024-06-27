import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { ensure } from "@/wab/shared/common";
import {
  withConsumer,
  withProvider,
} from "@/wab/commons/components/ContextUtil";
import * as React from "react";
import { useContext } from "react";

export const ViewCtxContext = React.createContext<ViewCtx | undefined>(
  undefined
);
export const withViewCtx = withConsumer(ViewCtxContext.Consumer, "viewCtx");
export const providesViewCtx = withProvider(ViewCtxContext.Provider);
export const useViewCtx = () =>
  ensure(useContext(ViewCtxContext), "Must have a view context");
export const useViewCtxMaybe = () => useContext(ViewCtxContext);
