import {
  createFakeHostLessComponent,
  shouldShowHostLessPackage,
} from "@/wab/client/components/studio/add-drawer/AddDrawer";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { allCustomFunctions } from "@/wab/shared/cached-selectors";
import { ensureArray } from "@/wab/shared/common";
import { isHostlessPackageInstalled } from "@/wab/shared/core/project-deps";
import { DEVFLAGS, HostLessComponentInfo } from "@/wab/shared/devflags";
import { CustomFunction } from "@/wab/shared/model/classes";

export interface InstallableCustomFunction {
  item: HostLessComponentInfo;
  projectIds: string[];
}

/**
 * Custom functions from hostless packages that are available but not installed.
 *
 * TODO: move this to a neutral location that copilot and sidebar-tabs can import from.
 */
export function getInstallableCustomFunctions(
  studioCtx: StudioCtx
): InstallableCustomFunction[] {
  const hostLessPackages =
    studioCtx.appCtx.appConfig.hostLessComponents ??
    DEVFLAGS.hostLessComponents ??
    [];
  const items: InstallableCustomFunction[] = [];
  for (const pkg of hostLessPackages) {
    if (
      isHostlessPackageInstalled(pkg, studioCtx.site.projectDependencies) ||
      !shouldShowHostLessPackage(studioCtx, pkg)
    ) {
      continue;
    }
    for (const item of pkg.items) {
      if (!item.isCustomFunction || item.hidden || item.hiddenOnStore) {
        continue;
      }
      items.push({ item, projectIds: ensureArray(pkg.projectId) });
    }
  }
  return items;
}

/**
 * Installs the hostless package for `installable` (via `runFakeItem`) and
 * returns the custom functions it newly registered.
 */
export async function installCustomFunctionsPackage(
  studioCtx: StudioCtx,
  installable: InstallableCustomFunction
): Promise<CustomFunction[]> {
  const beforeUids = new Set(
    allCustomFunctions(studioCtx.site).map(
      ({ customFunction }) => customFunction.uid
    )
  );
  const newlyAdded = () =>
    allCustomFunctions(studioCtx.site)
      .map(({ customFunction }) => customFunction)
      .filter((fn) => !beforeUids.has(fn.uid));
  try {
    await studioCtx.runFakeItem(
      createFakeHostLessComponent(installable.item, installable.projectIds)
    );
  } catch (err) {
    // post-install can fail after package function are registered. If so the
    // install worked and failing here would leave the caller in a bad state.
    const added = newlyAdded();
    if (added.length > 0) {
      console.warn(
        `Installing "${installable.item.componentName}" reported an error after ` +
          `registering its functions; continuing with the installed functions.`,
        err
      );
      return added;
    }
    throw new Error(
      `Installing "${installable.item.componentName}" failed: ${
        (err as Error)?.message ?? err
      }`
    );
  }
  return newlyAdded();
}
