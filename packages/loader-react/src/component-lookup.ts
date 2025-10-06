import {
  AssetModule,
  ComponentMeta,
  FontMeta,
  GlobalGroupMeta,
  LoaderBundleOutput,
  Registry,
} from "@plasmicapp/loader-core";
import * as React from "react";
import { ComponentLookupSpec, getCompMetas } from "./utils";

function getFirstCompMeta(metas: ComponentMeta[], lookup: ComponentLookupSpec) {
  const filtered = getCompMetas(metas, lookup);
  return filtered.length === 0 ? undefined : filtered[0];
}

export class ComponentLookup {
  constructor(private bundle: LoaderBundleOutput, private registry: Registry) {}

  getComponentMeta(spec: ComponentLookupSpec): ComponentMeta | undefined {
    const compMeta = getFirstCompMeta(this.bundle.components, spec);
    return compMeta;
  }

  getComponent<P extends React.ComponentType = any>(
    spec: ComponentLookupSpec,
    opts: { forceOriginal?: boolean } = {}
  ) {
    const compMeta = getFirstCompMeta(this.bundle.components, spec);
    if (!compMeta) {
      throw new Error(`Component not found: ${spec}`);
    }
    const moduleName = compMeta.entry;
    if (!this.registry.hasModule(moduleName, opts)) {
      throw new Error(`Component not yet fetched: ${compMeta.name}`);
    }
    const entry = this.registry.load(moduleName, {
      forceOriginal: opts.forceOriginal,
    });
    return !opts.forceOriginal &&
      typeof entry?.getPlasmicComponent === "function"
      ? entry.getPlasmicComponent()
      : (entry.default as P);
  }

  hasComponent(spec: ComponentLookupSpec) {
    const compMeta = getFirstCompMeta(this.bundle.components, spec);
    if (compMeta) {
      return this.registry.hasModule(compMeta.entry);
    }
    return false;
  }

  getGlobalContexts(): { meta: GlobalGroupMeta; context: any }[] {
    const customGlobalMetas = this.bundle.globalGroups.filter(
      (m) => m.type === "global-user-defined"
    );
    return customGlobalMetas.map((meta) => ({
      meta,
      context: this.registry.load(meta.contextFile).default,
    }));
  }

  /** Returns StyleTokensProvider if the project has style token overrides. */
  maybeGetStyleTokensProvider(
    spec: ComponentLookupSpec,
    styleTokenOverridesProjectId?: string
  ) {
    const compMeta = getFirstCompMeta(this.bundle.components, spec);

    let projectMeta;
    if (styleTokenOverridesProjectId) {
      projectMeta = this.bundle.projects.find(
        (x) => x.id === styleTokenOverridesProjectId
      );
      if (!projectMeta) {
        console.warn(
          `styleTokenOverridesProjectId "${styleTokenOverridesProjectId}" not found. Defaulting to root component's project.`
        );
      }
    }

    if (!projectMeta && compMeta?.projectId) {
      projectMeta = this.bundle.projects.find(
        (x) => x.id === compMeta.projectId
      );
    }

    if (
      !projectMeta ||
      !projectMeta.styleTokensProviderFileName ||
      !this.registry.hasModule(projectMeta.styleTokensProviderFileName) ||
      !projectMeta.hasStyleTokenOverrides
    ) {
      return undefined;
    }
    const entry = this.registry.load(projectMeta.styleTokensProviderFileName);
    return entry.StyleTokensProvider;
  }

  getGlobalContextsProvider(spec: ComponentLookupSpec) {
    const compMeta = getFirstCompMeta(this.bundle.components, spec);
    const projectMeta = compMeta
      ? this.bundle.projects.find((x) => x.id === compMeta.projectId)
      : undefined;

    if (
      !projectMeta ||
      !projectMeta.globalContextsProviderFileName ||
      !this.registry.hasModule(projectMeta.globalContextsProviderFileName)
    ) {
      return undefined;
    }
    const entry = this.registry.load(
      projectMeta.globalContextsProviderFileName
    );

    return typeof entry?.getPlasmicComponent === "function"
      ? entry.getPlasmicComponent()
      : entry.default;
  }

  getRootProvider() {
    const entry = this.registry.load("root-provider.js");
    return entry.default;
  }

  getCss(): AssetModule[] {
    // We can probably always get the modules from the browser build
    return this.bundle.modules.browser.filter(
      (mod) => mod.type === "asset" && mod.fileName.endsWith("css")
    ) as AssetModule[];
  }

  getRemoteFonts(): FontMeta[] {
    return this.bundle.projects.flatMap((p) => p.remoteFonts);
  }
}
