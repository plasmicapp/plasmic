import type { NextRouter } from "next/router";
import * as React from "react";

function tryRequire(module: string) {
  try {
    return require(module);
  } catch {
    return undefined;
  }
}

const RouterImport: any =
  tryRequire("next/dist/shared/lib/router-context.shared-runtime") ??
  tryRequire("next/dist/shared/lib/router-context");

const fakeRouter: NextRouter = {
  push: async () => {
    return true;
  },
  replace: async () => {
    return true;
  },
  reload: () => {},
  back: () => {},
  forward: () => {},
  prefetch: async () => {
    return;
  },
  beforePopState: () => {},
  events: {
    on: () => {},
    off: () => {},
    emit: () => {},
  },
  route: "/",
  asPath: "/",
  basePath: "/",
  pathname: "/",
  query: {},
  isFallback: false,
  isLocaleDomain: false,
  isReady: true,
  isPreview: false,
};

export function wrapRouterContext(element: React.ReactElement) {
  return !!RouterImport.RouterContext?.Provider ? (
    <RouterImport.RouterContext.Provider value={fakeRouter}>
      {element}
    </RouterImport.RouterContext.Provider>
  ) : (
    element
  );
}
