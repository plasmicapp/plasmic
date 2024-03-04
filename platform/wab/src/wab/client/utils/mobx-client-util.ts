import { dependOnGlobalObservable } from "@/wab/shared/mobx-util";
import type { IObserverOptions } from "mobx-react-lite";
import { observer as mobxObserver } from "mobx-react-lite";
import React from "react";

export function observer<P extends object, TRef = {}>(
  baseComponent:
    | React.FunctionComponent<P>
    | React.ForwardRefRenderFunction<TRef, P>
    | React.ForwardRefExoticComponent<
        React.PropsWithoutRef<P> & React.RefAttributes<TRef>
      >,
  options?: IObserverOptions | undefined
) {
  const wrappedComponent = (props: any, ref?: React.Ref<TRef>) => {
    dependOnGlobalObservable();
    return baseComponent(props, ref);
  };
  return mobxObserver(wrappedComponent, options);
}
