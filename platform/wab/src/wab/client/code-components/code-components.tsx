import { reportError } from "@/wab/client/ErrorNotifications";
import {
  confirmRemovedCodeComponentVariants,
  confirmRemovedTokens,
  duplicateCodeComponentErrorDescription,
  fixInvalidReactVersion,
  fixMissingCodeComponents,
  notifyInvalidImportName,
  promptHostLessPackageInfo,
  showModalToRefreshCodeComponentProps,
  unknownCodeComponentErrorDescription,
} from "@/wab/client/components/modals/codeComponentModals";
import { reactConfirm } from "@/wab/client/components/quick-modals";
import { getComponentPropTypes } from "@/wab/client/components/sidebar-tabs/ComponentPropsSection";
import {
  getHostLessPkg,
  getSortedHostLessPkgs,
  getVersionForCanvasPackages,
} from "@/wab/client/components/studio/studio-bundles";
import { scriptExec } from "@/wab/client/dom-utils";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { trackEvent } from "@/wab/client/tracking";
import { isBuiltinCodeComponent } from "@/wab/shared/code-components/builtin-code-components";
import {
  BadElementSchemaError,
  BadPresetSchemaError,
  CodeComponentRegistrationTypeError,
  CodeComponentSyncCallbackFns,
  CyclicComponentReferencesError,
  DuplicateCodeComponentError,
  DuplicatedComponentParamError,
  InvalidCodeLibraryError,
  InvalidCustomFunctionError,
  InvalidTokenError,
  SelfReferencingComponent,
  UnknownComponentError,
  UnknownComponentPropError,
  appendCodeComponentMetaToModel,
  customFunctionId,
  elementSchemaToTpl,
  getPropTypeType,
  syncCodeComponents,
} from "@/wab/shared/code-components/code-components";
import {
  WritablePart,
  assert,
  assignReadonly,
  ensure,
  ensureInstance,
  removeWhere,
  safeCast,
  switchType,
  unexpected,
  xDifference,
} from "@/wab/shared/common";
import {
  CodeComponent,
  ComponentType,
  isCodeComponent,
  isDefaultComponent,
} from "@/wab/shared/core/components";
import { isHostLessPackage } from "@/wab/shared/core/sites";
import { TplCodeComponent } from "@/wab/shared/core/tpls";
import { isAdminTeamEmail } from "@/wab/shared/devflag-utils";
import {
  Component,
  HostLessPackageInfo,
  Site,
  TplNode,
} from "@/wab/shared/model/classes";
import {
  ComponentMeta,
  GlobalContextMeta,
  PlasmicElement,
} from "@plasmicapp/host";
import { notification } from "antd";
import React from "react";
import { failable } from "ts-failable";

function onCreateCodeComponent(
  name: string,
  meta: ComponentMeta<any> | GlobalContextMeta<any>
) {
  // Segment track
  trackEvent("Create code component", {
    componentName: name,
    type: ComponentType.Code,
    importPath: meta.importPath,
    isLocalComponent: meta.importPath.startsWith("./"),
    locationHref: location.href,
  });
}

export const ccClientCallbackFns: CodeComponentSyncCallbackFns = {
  onMissingCodeComponents: (ctx, missingComponents, missingContexts) =>
    fixMissingCodeComponents(
      ensureInstance(ctx, StudioCtx),
      missingComponents,
      missingContexts
    ),
  onInvalidReactVersion: (ctx, hostLessPackageInfo) =>
    fixInvalidReactVersion(ensureInstance(ctx, StudioCtx), hostLessPackageInfo),
  onCreateCodeComponent,
  onInvalidComponentImportNames: notifyInvalidImportName,
  onAddedNewProps: () => {
    notification.info({
      message: "New props have been registered for some code components",
    });
  },
  onStaleProps: async (ctx, userStaleDiffs, _opts) => {
    return await showModalToRefreshCodeComponentProps(userStaleDiffs, _opts);
  },
  onNewDefaultComponents: (message) => {
    notification.warn({
      message,
      duration: 5,
    });
  },
  onSchemaToTplWarnings: (warnings) => {
    warnings.forEach((err) => {
      notification.error({
        message: err.message,
        description: err.description,
        duration: 0,
      });
      if (err.shouldLogError) {
        reportError(new Error(err.message));
      }
    });
  },
  onSchemaToTplError: (err) => {
    notification.error({
      message: err.message,
      duration: 15,
    });
  },
  onElementStyleWarnings: (warnings) => {
    warnings.forEach((err) => {
      notification.error({
        message: err.message,
        description: err.description,
        duration: 0,
      });
      if (err.shouldLogError) {
        reportError(new Error(err.message));
      }
    });
  },
  onInvalidJsonForDefaultValue: (message) => {
    notification.warn({
      message,
    });
  },
  onUpdatedTokens(opts) {
    const { newTokens, updatedTokens, removedTokens } = opts;
    notification.info({
      message: "Registered tokens updated",
      description: (
        <>
          {newTokens.length > 0 && (
            <p>
              <strong>New tokens: </strong>{" "}
              {newTokens.map((t) => `"${t.name}"`)}
            </p>
          )}
          {updatedTokens.length > 0 && (
            <p>
              <strong>Updated tokens: </strong>
              {updatedTokens.map((t) => `"${t.name}"`)}
            </p>
          )}
          {removedTokens.length > 0 && (
            <p>
              <strong>Removed tokens: </strong>{" "}
              {removedTokens.map((t) => `"${t.name}"`)}
            </p>
          )}
        </>
      ),
    });
  },
  onUpdatedCustomFunctions(opts) {
    const { newFunctions, removedFunctions, updatedFunctions } = opts;
    notification.info({
      message: "Registered functions updated",
      description: (
        <>
          {newFunctions.length > 0 && (
            <p>
              <strong>New functions: </strong>{" "}
              {newFunctions.map((f) => `"${customFunctionId(f)}"`).join(", ")}
            </p>
          )}
          {updatedFunctions.length > 0 && (
            <p>
              <strong>Updated functions: </strong>
              {updatedFunctions
                .map((f) => `"${customFunctionId(f)}"`)
                .join(", ")}
            </p>
          )}
          {removedFunctions.length > 0 && (
            <p>
              <strong>Removed functions: </strong>{" "}
              {removedFunctions
                .map((f) => `"${customFunctionId(f)}"`)
                .join(", ")}
            </p>
          )}
        </>
      ),
    });
  },
  onUpdatedCodeLibraries(opts) {
    const { newLibraries, updatedLibraries, removedLibraries } = opts;
    notification.info({
      message: "Registered libraries updated",
      description: (
        <>
          {newLibraries.length > 0 && (
            <p>
              <strong>New libraries: </strong>{" "}
              {newLibraries.map((l) => `"${l.name}"`).join(", ")}
            </p>
          )}
          {removedLibraries.length > 0 && (
            <p>
              <strong>Updated libraries: </strong>
              {removedLibraries.map((l) => `"${l.name}"`).join(", ")}
            </p>
          )}
          {updatedLibraries.length > 0 && (
            <p>
              <strong>Removed libraries: </strong>{" "}
              {updatedLibraries.map((l) => `"${l.name}"`).join(", ")}
            </p>
          )}
        </>
      ),
    });
  },
  confirmRemovedCodeComponentVariants: (removedSelectorsByComponent) =>
    confirmRemovedCodeComponentVariants(removedSelectorsByComponent),
  confirmRemovedTokens: (removedTokens) => confirmRemovedTokens(removedTokens),
};

export async function syncCodeComponentsAndHandleErrors(
  studioCtx: StudioCtx,
  opts?: { force?: boolean }
) {
  const maybeError = await syncCodeComponents(
    studioCtx,
    ccClientCallbackFns,
    opts
  );

  if (!maybeError.result.isError) {
    appendCodeComponentMetaToModel(
      studioCtx.site,
      studioCtx.getCodeComponentsAndContextsRegistration()
    );
  }

  // Handle errors
  return maybeError.match({
    success: () => {},
    failure: safeCast<(err: Error) => void>((err) => {
      switchType(err)
        .when(DuplicateCodeComponentError, (duplicatedCompErr) => {
          notification.error({
            message: duplicatedCompErr.message,
            description: duplicateCodeComponentErrorDescription,
            duration: 0,
          });
        })
        .when(UnknownComponentError, (unknownCompErr) => {
          notification.error({
            message: unknownCompErr.message,
            description: unknownCodeComponentErrorDescription(unknownCompErr),
            duration: 0,
          });
        })
        .when(CodeComponentRegistrationTypeError, (typeErr) => {
          notification.error({
            message: "Type error while registering code components",
            description: typeErr.message,
            duration: 0,
          });
        })
        .when(CyclicComponentReferencesError, (cyclicRefsErr) => {
          notification.error({
            message: cyclicRefsErr.message,
            description: `Some registered components reference each other in
              the default slot values in a cycle. Please make sure this chain
              of references doesn't contain any cycles.`,
            duration: 0,
          });
        })
        .when(SelfReferencingComponent, (refError) => {
          notification.error({
            message: refError.message,
            description: `Some registered components reference itself in the slot default value, resulting in a cycle.`,
            duration: 0,
          });
        })
        .when(UnknownComponentPropError, (propErr) => {
          notification.error({
            message: propErr.message,
            description: `When registering ${propErr.componentName}, expected to find prop ${propErr.propName}`,
            duration: 0,
          });
        })
        .when(InvalidTokenError, (err2) => {
          notification.error({
            message: err2.message,
          });
        })
        .when(DuplicatedComponentParamError, (paramErr) => {
          notification.error({
            message: "Duplicated prop and state name",
            description: paramErr.message,
            duration: 0,
          });
        })
        .when([InvalidCustomFunctionError, InvalidCodeLibraryError], (err2) => {
          notification.error({
            message: err2.message,
            duration: 0,
          });
        })
        .when(BadElementSchemaError, (err2) => {
          notification.error({
            message: err2.message,
            duration: 0,
          });
        })
        .elseUnsafe(() => unexpected());
      // Never resolve since Studio can have components in invalid states
      return new Promise((_resolve) => {});
    }),
  });
}

export async function maybeConvertToHostLessProject(studioCtx: StudioCtx) {
  if (
    (studioCtx.appCtx.appConfig.setHostLessProject ||
      isHostLessPackage(studioCtx.site)) &&
    isAdminTeamEmail(
      studioCtx.appCtx.selfInfo?.email,
      studioCtx.appCtx.appConfig
    )
  ) {
    const pkg = await promptHostLessPackageInfo(
      studioCtx.site.hostLessPackageInfo
        ? { ...studioCtx.site.hostLessPackageInfo }
        : undefined
    );

    if (pkg) {
      // Get the original list of components
      const existingComps = [
        ...studioCtx.site.components.filter(
          (c) => isCodeComponent(c) && !isBuiltinCodeComponent(c)
        ),
      ];
      const existingGlobalContexts = [...studioCtx.site.globalContexts];
      const existingTokens = studioCtx.site.styleTokens.filter(
        (s) => s.isRegistered
      );
      const existingFunctions = [...studioCtx.site.customFunctions];
      const existingLibs = [...studioCtx.site.codeLibraries];

      const clearSite = async () => {
        await studioCtx.change(({ success }) => {
          const emptySite: Omit<WritablePart<Site>, "uid" | "typeTag"> = {
            components: [],
            arenas: [],
            pageArenas: [],
            componentArenas: [],
            globalVariantGroups: [],
            userManagedFonts: [],
            styleTokens: [],
            mixins: [],
            activeTheme: null,
            imageAssets: [],
            projectDependencies: [],
            activeScreenVariantGroup: null,
            flags: {},
            globalContexts: [],
            splits: [],
            defaultComponents: {},
            defaultPageRoleId: null,
            pageWrapper: null,
            customFunctions: [],
            codeLibraries: [],
          };
          Object.assign(studioCtx.site, emptySite);
          studioCtx.site.themes.forEach((theme) => {
            // Clear site default styles
            theme.styles = [];
            theme.defaultStyle.rs.values = {};
          });
          return success();
        });
      };

      await clearSite();

      // First, install the deps
      for (const [_depName, depModule] of await getSortedHostLessPkgs(
        pkg.deps,
        getVersionForCanvasPackages(window.parent)
      )) {
        scriptExec(window.parent, depModule);
      }
      studioCtx.codeComponentsRegistry.clear();
      await syncCodeComponentsAndHandleErrors(studioCtx, { force: true });

      // Take a snapshot of components and tokens from deps, so we know they
      // are not from this pkg
      const depComps = new Set(
        studioCtx.site.components.filter(
          (c) => isCodeComponent(c) || isDefaultComponent(studioCtx.site, c)
        )
      );

      const depTokens = new Set(
        studioCtx.site.styleTokens.filter((s) => s.isRegistered)
      );

      const depFunctions = new Set(studioCtx.site.customFunctions);

      const depLibs = new Set(studioCtx.site.codeLibraries);

      // Now install the actual package
      scriptExec(
        window.parent,
        await getHostLessPkg(
          pkg.name,
          getVersionForCanvasPackages(window.parent)
        )
      );
      studioCtx.codeComponentsRegistry.clear();
      await syncCodeComponentsAndHandleErrors(studioCtx, { force: true });
      assert(
        studioCtx.site.components.some(isCodeComponent),
        "No code components found"
      );

      // Filter the components that don't come from the deps, and get their
      // registered names
      const nonDepCompNames = new Set(
        studioCtx.site.components
          .filter(
            (c) =>
              (isCodeComponent(c) || isDefaultComponent(studioCtx.site, c)) &&
              !depComps.has(c)
          )
          .map((c) => c.name)
      );

      const nonDepTokenNames = new Set(
        studioCtx.site.styleTokens
          .filter((s) => s.isRegistered && !depTokens.has(s))
          .map((c) => c.name)
      );

      const nonDepFunctions = new Set(
        studioCtx.site.customFunctions
          .filter((f) => !depFunctions.has(f))
          .map((f) => customFunctionId(f))
      );

      const nonDepLibs = new Set(
        studioCtx.site.codeLibraries
          .filter((l) => !depLibs.has(l))
          .map((l) => l.name)
      );

      // Now we clear the site again to match the components with the existing
      // instances
      await clearSite();

      // Reset the existing components
      await studioCtx.change(({ success }) => {
        studioCtx.site.components = [...existingComps];
        studioCtx.site.globalContexts = [...existingGlobalContexts];
        studioCtx.site.styleTokens = [...existingTokens];
        studioCtx.site.customFunctions = [...existingFunctions];
        studioCtx.site.codeLibraries = [...existingLibs];
        return success();
      });

      await syncCodeComponentsAndHandleErrors(studioCtx, { force: true });

      await studioCtx.change(
        ({ success }) => {
          const deletedComponents = new Set(studioCtx.site.components);
          studioCtx.site.components = studioCtx.site.components.filter(
            (c) =>
              (isCodeComponent(c) || isDefaultComponent(studioCtx.site, c)) &&
              nonDepCompNames.has(c.name)
          );
          studioCtx.site.styleTokens = studioCtx.site.styleTokens.filter(
            (s) => s.isRegistered && nonDepTokenNames.has(s.name)
          );
          studioCtx.site.customFunctions =
            studioCtx.site.customFunctions.filter((f) =>
              nonDepFunctions.has(customFunctionId(f))
            );
          studioCtx.site.codeLibraries = studioCtx.site.codeLibraries.filter(
            (l) => nonDepLibs.has(l.name)
          );
          assignReadonly(studioCtx.site, {
            hostLessPackageInfo: new HostLessPackageInfo({
              name: pkg.name,
              cssImport: pkg.cssImport,
              npmPkg: pkg.npmPkg,
              deps: pkg.deps,
              registerCalls: [],
              minimumReactVersion: pkg.minimumReactVersion ?? null,
            }),
          });
          studioCtx.site.components
            .filter(isCodeComponent)
            .forEach((c) => (c.codeComponentMeta.isHostLess = true));
          studioCtx.site.components.forEach((c) => deletedComponents.delete(c));
          removeWhere(studioCtx.site.globalContexts, (tpl) =>
            deletedComponents.has(tpl.component)
          );
          return success();
        },
        { noUndoRecord: true }
      );

      const deletedComps = xDifference(
        existingComps,
        studioCtx.site.components
      );

      if (deletedComps.size > 0) {
        const proceed = await reactConfirm({
          message:
            "The following components have been deleted, would you like to proceed? " +
            [...deletedComps.keys()].map((c) => c.name),
        });
        if (!proceed) {
          const latestVersion = ensure(
            (await studioCtx.getProjectReleases())[0],
            "No latest version found"
          );
          await studioCtx.revertToVersion(latestVersion);
          return;
        }
      }

      await studioCtx.save();
      await studioCtx.publish(undefined, undefined, undefined, {
        hostLessPackage: true,
      });
    }
  }
}

export function elementSchemaToTplAndLogErrors(
  site: Site,
  component: CodeComponent | undefined,
  rootSchema: PlasmicElement
) {
  return failable<
    TplNode,
    | BadPresetSchemaError
    | UnknownComponentError
    | SelfReferencingComponent
    | UnknownComponentPropError
  >(({ success, run }) => {
    const { tpl, warnings } = run(
      elementSchemaToTpl(site, component, rootSchema, {
        codeComponentsOnly: true,
      })
    );

    warnings.forEach((err) => {
      notification.error({
        message: err.message,
        description: err.description,
        duration: 0,
      });
      if (err.shouldLogError) {
        reportError(new Error(err.message));
      }
    });
    return success(tpl);
  });
}

export function isTplCodeComponentStyleable(
  viewCtx: ViewCtx,
  tpl: TplCodeComponent
) {
  if (viewCtx.getTplCodeComponentMeta(tpl)?.styleSections === false) {
    // Not styleable if explicitly opted out of styling
    return false;
  }
  return true;
}

export function getControlModePropType(viewCtx, component: Component) {
  const propTypes = getComponentPropTypes(viewCtx, component);
  const maybeModeProp = Object.entries(propTypes).find(
    ([_name, propType]) => getPropTypeType(propType) === "controlMode"
  );
  return maybeModeProp
    ? { propName: maybeModeProp[0], propType: maybeModeProp[1] }
    : undefined;
}

export function hasSimplifiedMode(viewCtx: ViewCtx, component: Component) {
  return !!getControlModePropType(viewCtx, component);
}
