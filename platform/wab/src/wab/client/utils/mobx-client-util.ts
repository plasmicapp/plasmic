import { dependOnGlobalObservable } from "@/wab/shared/mobx-util";
import { observer as mobxObserver } from "mobx-react";
import React from "react";

type IReactComponent<P = any> =
  | React.FunctionComponent<P>
  | React.ForwardRefExoticComponent<P>;

export function observer<T extends IReactComponent<P>, P = any>(
  baseComponent: T
) {
  const wrappedComponent = (props: P, ref?: React.Ref<T>) => {
    dependOnGlobalObservable();
    return baseComponent(props, ref);
  };
  return mobxObserver(wrappedComponent) as T;
}
