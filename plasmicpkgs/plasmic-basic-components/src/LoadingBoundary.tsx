import { DataProvider, useDataEnv } from "@plasmicapp/host";
import registerComponent, {
  ComponentMeta,
} from "@plasmicapp/host/registerComponent";
import * as plasmicQuery from "@plasmicapp/query";
import React, { Suspense, useState } from "react";
import { useIsomorphicLayoutEffect } from "./common";

interface LoadingBoundaryProps {
  loadingState?: React.ReactNode;
  children?: React.ReactNode;
  forceLoading?: boolean;
}

const reactMajorVersion = +React.version.split(".")[0];

if (reactMajorVersion < 18) {
  console.warn("The LoadingBoundary component only works with React 18+");
}

const enableLoadingBoundaryKey = "plasmicInternalEnableLoadingBoundary";
const hasLoadingBoundaryKey = "plasmicInternalHasLoadingBoundary";

function useIsClient() {
  const [loaded, setLoaded] = useState(false);
  useIsomorphicLayoutEffect(() => {
    setLoaded(true);
  }, []);
  return loaded;
}

let hasWarnedDisabledLoadingBoundary = false;

function warnDisabledLoadingBoundary() {
  if (!hasWarnedDisabledLoadingBoundary) {
    hasWarnedDisabledLoadingBoundary = true;
    console.warn(
      `LoadingBoundary feature is not enabled. To use the LoadingBoundary component make sure to upgrade your @plasmicapp/* dependencies to the latest version and to wrap you App inside <PlasmicRootProvider />`
    );
  }
}

export default function LoadingBoundary({
  children,
  forceLoading,
  loadingState,
}: LoadingBoundaryProps) {
  const isClient = useIsClient();
  const enableLoadingBoundary = !!useDataEnv()?.[enableLoadingBoundaryKey];

  if (!isClient && !plasmicQuery.isPlasmicPrepass?.()) {
    return null;
  }

  if (forceLoading) {
    return <>{loadingState ?? null}</>;
  }

  if (reactMajorVersion < 18) {
    return <>{children ?? null}</>;
  }

  if (!enableLoadingBoundary) {
    warnDisabledLoadingBoundary();
    return <>{children ?? null}</>;
  }

  return (
    <Suspense fallback={<>{loadingState ?? null}</>}>
      <DataProvider hidden name={hasLoadingBoundaryKey} data={true}>
        {children ?? null}
      </DataProvider>
    </Suspense>
  );
}

export const loadingBoundaryMeta: ComponentMeta<LoadingBoundaryProps> = {
  name: "hostless-loading-boundary",
  displayName: "Loading Boundary",
  importName: "LoadingBoundary",
  importPath: "@plasmicpkgs/plasmic-basic-components",
  props: {
    children: "slot",
    loadingState: {
      type: "slot",
      displayName: "Loading state",
      defaultValue: {
        type: "text",
        value: "Loading...",
      },
    },
    forceLoading: {
      type: "boolean",
      editOnly: true,
      displayName: "Preview loading",
      description:
        "Force preview the 'Loading' state - impacts only editor, and not published page behavior",
    },
  },
  providesData: true,
  styleSections: false,
  description: "Handle the loading state of queries and integrations",
};

export function registerLoadingBoundary(
  loader?: { registerComponent: typeof registerComponent },
  customLoadingBoundaryMeta?: ComponentMeta<LoadingBoundaryProps>
) {
  if (loader) {
    loader.registerComponent(
      LoadingBoundary,
      customLoadingBoundaryMeta ?? loadingBoundaryMeta
    );
  } else {
    registerComponent(
      LoadingBoundary,
      customLoadingBoundaryMeta ?? loadingBoundaryMeta
    );
  }
}
