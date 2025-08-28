import * as PlasmicDataSourcesContext from "@plasmicapp/data-sources-context";
// eslint-disable-next-line no-restricted-imports
import * as PlasmicHost from "@plasmicapp/host";
import {
  // eslint-disable-next-line no-restricted-imports
  registerComponent,
  registerFunction,
  registerGlobalContext,
  registerToken,
  registerTrait,
  stateHelpersKeys,
  TokenRegistration,
  TraitMeta,
} from "@plasmicapp/host";
import { PlasmicModulesFetcher } from "@plasmicapp/loader-core";
import * as PlasmicQuery from "@plasmicapp/query";
import React from "react";
import ReactDOM from "react-dom";
import * as jsxDevRuntime from "react/jsx-dev-runtime";
import * as jsxRuntime from "react/jsx-runtime";
import { createUseGlobalVariant } from "./global-variants";
import {
  BaseInternalPlasmicComponentLoader,
  CodeComponentMeta,
  CustomFunctionMeta,
  GlobalContextMeta,
  InitOptions,
  internalSetRegisteredFunction,
  PlasmicRootWatcher,
  REGISTERED_CODE_COMPONENT_HELPERS,
  REGISTERED_CUSTOM_FUNCTIONS,
  SUBSTITUTED_COMPONENTS,
  SUBSTITUTED_GLOBAL_VARIANT_HOOKS,
} from "./loader-shared";

export class InternalPlasmicComponentLoader extends BaseInternalPlasmicComponentLoader {
  private readonly roots: PlasmicRootWatcher[] = [];

  constructor(opts: InitOptions) {
    super({
      opts,
      fetcher: new PlasmicModulesFetcher(opts),
      onBundleMerged: () => {
        this.refreshRegistry();
      },
      onBundleFetched: () => {
        this.roots.forEach((watcher) => watcher.onDataFetched?.());
      },
      builtinModules: {
        react: React,
        "react-dom": ReactDOM,
        "react/jsx-runtime": jsxRuntime,
        "react/jsx-dev-runtime": jsxDevRuntime,

        // Also inject @plasmicapp/query and @plasmicapp/host to use the
        // same contexts here and in loader-downloaded code.
        "@plasmicapp/query": PlasmicQuery,
        "@plasmicapp/data-sources-context": PlasmicDataSourcesContext,
        "@plasmicapp/host": PlasmicHost,
        "@plasmicapp/loader-runtime-registry": {
          components: SUBSTITUTED_COMPONENTS,
          globalVariantHooks: SUBSTITUTED_GLOBAL_VARIANT_HOOKS,
          codeComponentHelpers: REGISTERED_CODE_COMPONENT_HELPERS,
          functions: REGISTERED_CUSTOM_FUNCTIONS,
        },
      },
    });
  }

  registerComponent<T extends React.ComponentType<any>>(
    component: T,
    meta: CodeComponentMeta<React.ComponentProps<T>>
  ) {
    // making the component meta consistent between codegen and loader
    const stateHelpers = Object.fromEntries(
      Object.entries(meta.states ?? {})
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        .filter(([_, stateSpec]) =>
          Object.keys(stateSpec).some((key) => stateHelpersKeys.includes(key))
        )
        .map(([stateName, stateSpec]) => [
          stateName,
          Object.fromEntries(
            stateHelpersKeys
              .filter((key) => key in stateSpec)
              .map((key) => [key, stateSpec[key]])
          ),
        ])
    );
    const helpers = { states: stateHelpers };
    this.internalSubstituteComponent(
      component,
      { name: meta.name, isCode: true },
      Object.keys(stateHelpers).length > 0 ? helpers : undefined
    );
    registerComponent(component, {
      ...meta,
      // Import path is not used as we will use component substitution
      importPath: meta.importPath ?? "",
      ...(Object.keys(stateHelpers).length > 0
        ? {
            componentHelpers: {
              helpers,
              importPath: "",
              importName: "",
            },
          }
        : {}),
    });
  }

  registerFunction<F extends (...args: any[]) => any>(
    fn: F,
    meta: CustomFunctionMeta<F>
  ) {
    registerFunction(fn, {
      ...meta,
      importPath: meta.importPath ?? "",
    });
    internalSetRegisteredFunction(fn, meta);
  }

  registerGlobalContext<T extends React.ComponentType<any>>(
    context: T,
    meta: GlobalContextMeta<React.ComponentProps<T>>
  ) {
    this.substituteComponent(context, { name: meta.name, isCode: true });
    // Import path is not used as we will use component substitution
    registerGlobalContext(context, {
      ...meta,
      importPath: meta.importPath ?? "",
    });
  }

  registerTrait(trait: string, meta: TraitMeta) {
    registerTrait(trait, meta);
  }

  registerToken(token: TokenRegistration) {
    registerToken(token);
  }

  subscribePlasmicRoot(watcher: PlasmicRootWatcher) {
    this.roots.push(watcher);
  }

  unsubscribePlasmicRoot(watcher: PlasmicRootWatcher) {
    const index = this.roots.indexOf(watcher);
    if (index >= 0) {
      this.roots.splice(index, 1);
    }
  }

  refreshRegistry() {
    // We swap global variants' useXXXGlobalVariant() hook with
    // a fake one that just reads from the PlasmicRootContext. Because
    // global variant values are not supplied by the generated global variant
    // context providers, but instead by <PlasmicRootProvider/> and by
    // PlasmicComponentLoader.setGlobalVariants(), we redirect these
    // hooks to read from them instead.
    for (const globalGroup of this.getBundle().globalGroups) {
      if (globalGroup.type !== "global-screen") {
        SUBSTITUTED_GLOBAL_VARIANT_HOOKS[globalGroup.id] =
          createUseGlobalVariant(globalGroup.name, globalGroup.projectId);
      }
    }
    super.refreshRegistry();
  }
}
