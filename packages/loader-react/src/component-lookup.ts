import {
  AssetModule,
  FontMeta,
  GlobalGroupMeta,
  LoaderBundleOutput,
  Registry,
} from '@plasmicapp/loader-core';
import * as React from 'react';
import { ComponentLookupSpec, getCompMeta } from './loader';

export class ComponentLookup {
  constructor(private bundle: LoaderBundleOutput, private registry: Registry) {}

  getComponent<P extends React.ComponentType = any>(
    spec: ComponentLookupSpec,
    opts: { forceOriginal?: boolean } = {}
  ) {
    const compMeta = getCompMeta(this.bundle.components, spec);
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
    return entry.default as P;
  }

  hasComponent(spec: ComponentLookupSpec) {
    const compMeta = getCompMeta(this.bundle.components, spec);
    if (compMeta) {
      return this.registry.hasModule(compMeta.entry);
    }
    return false;
  }

  getGlobalContexts(): { meta: GlobalGroupMeta; context: any }[] {
    const customGlobalMetas = this.bundle.globalGroups.filter(
      (m) => m.type === 'global-user-defined'
    );
    return customGlobalMetas.map((meta) => ({
      meta,
      context: this.registry.load(meta.contextFile).default,
    }));
  }

  getRootProvider() {
    const entry = this.registry.load('root-provider.js');
    return entry.default;
  }

  getCss(): AssetModule[] {
    return this.bundle.modules.filter(
      (mod) => mod.type === 'asset' && mod.fileName.endsWith('css')
    ) as AssetModule[];
  }

  getRemoteFonts(): FontMeta[] {
    return this.bundle.projects.flatMap((p) => p.remoteFonts);
  }
}
