import { shouldShowHostLessPackage } from "@/wab/client/components/studio/add-drawer/AddDrawer";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ensureArray } from "@/wab/shared/common";
import { isHostlessPackageInstalled } from "@/wab/shared/core/project-deps";
import { DEVFLAGS, HostLessComponentInfo } from "@/wab/shared/devflags";

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
