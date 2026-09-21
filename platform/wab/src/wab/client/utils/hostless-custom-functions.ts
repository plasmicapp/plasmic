import {
  createFakeHostLessComponent,
  shouldShowHostLessPackage,
} from "@/wab/client/components/studio/add-drawer/AddDrawer";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ensureArray } from "@/wab/shared/common";
import { isHostlessPackageInstalled } from "@/wab/shared/core/project-deps";
import { customFunctionId } from "@/wab/shared/core/query-ids";
import {
  DEVFLAGS,
  HostLessComponentInfo,
  HostLessPackageInfo,
} from "@/wab/shared/devflags";
import { CustomFunction } from "@/wab/shared/model/classes";

export interface HostLessCustomFunction {
  /** The `customFunctionId` its package declares. */
  id: string;
  displayName: string;
  description?: string;
  isMutation?: boolean;
  /** The insert-panel item that installs the package. */
  item: HostLessComponentInfo;
  pkg: HostLessPackageInfo;
}

const warnedPackages = new Set<string>();

/** Custom functions hostless packages declare that the project hasn't installed. */
export function getInstallableCustomFunctions(
  studioCtx: StudioCtx,
): HostLessCustomFunction[] {
  const packages =
    studioCtx.appCtx.appConfig.hostLessComponents ??
    DEVFLAGS.hostLessComponents ??
    [];
  return packages
    .filter(
      (pkg) =>
        !isHostlessPackageInstalled(pkg, studioCtx.site.projectDependencies) &&
        shouldShowHostLessPackage(studioCtx, pkg),
    )
    .flatMap((pkg) => {
      // `functions` describes the package, so any of its items installs them all.
      const item = pkg.items.find(
        (i) => i.isCustomFunction && !i.hidden && !i.hiddenOnStore,
      );
      if (!item) {
        return [];
      }
      if (!pkg.functions?.length) {
        if (!warnedPackages.has(pkg.name)) {
          warnedPackages.add(pkg.name);
          console.warn(
            `"${pkg.name}" has undeclared custom functions, so they cannot be installed.`,
          );
        }
        return [];
      }
      return pkg.functions.map(
        ({ functionId, displayName, description, isMutation }) => ({
          id: functionId,
          displayName,
          description,
          isMutation,
          item,
          pkg,
        }),
      );
    });
}

/** Installs the package declaring `installable` and returns the function itself. */
export async function installCustomFunction(
  studioCtx: StudioCtx,
  installable: HostLessCustomFunction,
): Promise<CustomFunction> {
  const { id, displayName, item, pkg } = installable;
  const projectIds = ensureArray(pkg.projectId);
  const registered = () =>
    studioCtx.site.projectDependencies
      .filter((dep) => projectIds.includes(dep.projectId))
      .flatMap((dep) => dep.site.customFunctions);
  try {
    await studioCtx.runFakeItem(createFakeHostLessComponent(item, projectIds));
  } catch (err) {
    // Post-install steps can fail once the functions are already registered, and
    // failing here would leave the caller unable to use them.
    if (registered().length === 0) {
      throw new Error(
        `Installing "${displayName}" failed: ${(err as Error)?.message ?? err}`,
      );
    }
    console.warn(
      `Installing "${displayName}" reported an error after registering its functions.`,
      err,
    );
  }
  const fn = registered().find((f) => customFunctionId(f) === id);
  if (!fn) {
    throw new Error(
      `Installing "${displayName}" registered no function "${id}". Check the package's devflag \`functions\`.`,
    );
  }
  return fn;
}
