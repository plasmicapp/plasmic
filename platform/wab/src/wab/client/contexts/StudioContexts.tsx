import * as React from "react";
import { useContext } from "react";
import { ensure } from "../../common";
import {
  withConsumer,
  withProvider,
} from "../../commons/components/ContextUtil";
import { ViewCtx } from "../studio-ctx/view-ctx";

export const ViewCtxContext =
  React.createContext<ViewCtx | undefined>(undefined);
export const withViewCtx = withConsumer(ViewCtxContext.Consumer, "viewCtx");
export const providesViewCtx = withProvider(ViewCtxContext.Provider);
export const useViewCtx = () =>
  ensure(useContext(ViewCtxContext), "Must have a view context");
export const useViewCtxMaybe = () => useContext(ViewCtxContext);
