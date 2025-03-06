import type { SubDeps } from "@/wab/client/components/canvas/subdeps";
import { getCanvasPkgs } from "@/wab/client/components/studio/studio-bundles";
import { scriptExec } from "@/wab/client/dom-utils";
import { lt } from "@/wab/commons/semver";
import { assert, withTimeout } from "@/wab/shared/common";
import { requiredPackageVersions } from "@/wab/shared/required-versions";
import { notification } from "antd";
import React from "react";

/**
 * window.parent is the root window of the host app (either user's host app or our own),
 * where @plasmicapp/host is loaded.
 * We use this to get the SubDeps from the host app.
 */
let rootSub: SubDeps | undefined = undefined;
try {
  rootSub = (window.parent as any).__Sub;
} catch {}

export function getRootSub(): SubDeps {
  assert(rootSub, "Should only get rootSub from host iframe");
  return rootSub;
}

export function getRootSubHostVersion() {
  return getRootSub().hostVersion;
}

export function getRootSubReactVersion(): string {
  return getRootSub().React.version;
}

export function getRootSubReact(): typeof React {
  return getRootSub().React;
}

export function checkRootSubHostVersion() {
  const hostVersion = getRootSubHostVersion();
  if (
    !hostVersion ||
    lt(hostVersion, requiredPackageVersions["@plasmicapp/host"])
  ) {
    // TODO: Detect if the user is using loader-nextjs, loader-gatsby,
    // loader-react or codegen to display a more directed message.
    notification.warn({
      message: "Unsupported host app detected",
      description: (
        <>
          Please upgrade <code>@plasmicapp/*</code> packages in your host app to
          continue using Plasmic Studio's latest features.
        </>
      ),
      duration: 0,
    });
  }
}

export async function initRootCanvasPkgs() {
  scriptExec(
    window.parent,
    await withTimeout(
      getCanvasPkgs(),
      "Couldn't get canvasPkgs.",
      3 * 60 * 1000
    )
  );
  rootSub = {
    ...rootSub,
    ...(window.parent as any).__CanvasPkgs,
  };
}
