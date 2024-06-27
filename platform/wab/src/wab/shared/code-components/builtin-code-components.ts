import { isCodeComponent } from "@/wab/shared/core/components";
import { Component, TplNode } from "@/wab/shared/model/classes";
import { TplCodeComponent, isTplComponent } from "@/wab/shared/core/tpls";
import type * as PlasmicDataSourcesContext from "@plasmicapp/data-sources-context";
import type { ComponentRegistration } from "@plasmicapp/host";
import type * as ReactWeb from "@plasmicapp/react-web";
import { PlasmicHead, plasmicHeadMeta } from "@plasmicapp/react-web";
import type * as PlasmicDataSources from "@plasmicapp/react-web/lib/data-sources";
import { Fetcher, FetcherMeta } from "@plasmicapp/react-web/lib/data-sources";
import { memoize } from "lodash";
import type React from "react";
import type ReactDOM from "react-dom";

interface Sub {
  React: typeof React;
  ReactDOM: typeof ReactDOM;
  reactWeb: typeof ReactWeb;
  dataSources?: typeof PlasmicDataSources;
  dataSourcesContext: typeof PlasmicDataSourcesContext;
}

export const getBuiltinComponentRegistrations = memoize(
  function getBuiltinComponentRegistrations(sub?: Sub) {
    return {
      PlasmicHead: {
        component: sub?.reactWeb.PlasmicHead ?? PlasmicHead,
        meta: sub?.reactWeb.plasmicHeadMeta ?? plasmicHeadMeta,
      } as ComponentRegistration,
      PlasmicFetcher: {
        component: sub?.dataSources?.Fetcher ?? Fetcher,
        // If we remove `as any` from the line below, TypeScript becomes
        // super slow and VSCode becomes barely usable. There is something
        // funky going on; while we don't find the root cause please keep
        // `as any`. Slack thread:
        // https://plasmic.slack.com/archives/CS173V5ND/p1670439564756629
        meta: (sub?.dataSources?.FetcherMeta ?? FetcherMeta) as any,
      } as ComponentRegistration,
    };
  }
);

const getBuiltinImportPaths = memoize(function getBuiltinImportPaths() {
  return Object.values(getBuiltinComponentRegistrations()).map(
    (c) => c.meta.importPath
  );
});

const getBuiltinComponentNames = memoize(function getBuiltinComponentNames() {
  return Object.values(getBuiltinComponentRegistrations()).map(
    (c) => c.meta.name
  );
});

export function isBuiltinCodeComponentImportPath(importPath: string) {
  return getBuiltinImportPaths().includes(importPath);
}

export function isBuiltinCodeComponent(c: Component) {
  return (
    isCodeComponent(c) &&
    isBuiltinCodeComponentImportPath(c.codeComponentMeta.importPath)
  );
}

export function isBuiltinCodeComponentName(name: string) {
  return getBuiltinComponentNames().includes(name);
}

export function isTplDataFetcher(tpl: TplNode): tpl is TplCodeComponent {
  return (
    isTplComponent(tpl) &&
    tpl.component.name ===
      getBuiltinComponentRegistrations().PlasmicFetcher.meta.name
  );
}
