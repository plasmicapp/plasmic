import type * as RouterContextType from "next/dist/shared/lib/router-context.shared-runtime";
import type { NextRouter } from "next/router";
import * as React from "react";
import { tryServerRequires } from "./server-require";

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

export async function wrapRouterContext(element: React.ReactElement) {
  const RouterContext = (
    await tryServerRequires<typeof RouterContextType>([
      "next/dist/shared/lib/router-context.shared-runtime",
      "next/dist/shared/lib/router-context",
    ])
  )?.RouterContext;
  return !!RouterContext?.Provider ? (
    <RouterContext.Provider value={fakeRouter}>
      {element}
    </RouterContext.Provider>
  ) : (
    element
  );
}
