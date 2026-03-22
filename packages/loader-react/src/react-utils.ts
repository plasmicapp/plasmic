import * as React from "react";

export const REACT_MAJOR_VERSION = +React.version.split(".")[0];

// Types can be copied from here as needed:
// https://github.com/facebook/react/blob/main/packages/react-reconciler/src/ReactInternalTypes.js

type BasicStateAction<S> = ((previousState: S) => S) | S;
type Dispatch<A> = (action: A) => void;

interface Dispatcher {
  useState<S>(initialState: (() => S) | S): [S, Dispatch<BasicStateAction<S>>];
  useContext<T>(context: React.Context<T>): T;

  /** Set by @plasmicapp/react-ssr-prepass if in SSR prepass. */
  isPlasmicPrepass?: boolean;
}

export function reactCurrentDispatcher(): Dispatcher {
  // Use bracket notation with string literals to prevent static analysis
  // from flagging these as missing named exports.
  const r = React as any;
  if (REACT_MAJOR_VERSION <= 18) {
    return r["__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED"]
      ?.ReactCurrentDispatcher?.current;
  } else {
    return (
      r["__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE"]?.H ??
      r["__SERVER_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE"]?.H
    );
  }
}
