import { LoaderBundleOutput } from '@plasmicapp/loader-fetcher';

export class DepsGraph {
  private dependsOn: Record<string, string[]> = {};
  private dependedBy: Record<string, string[]> = {};
  constructor(private bundle: LoaderBundleOutput, private browserBuild = true) {
    this.rebuildGraph();
  }

  getTransitiveDependers(name: string) {
    return this.transitiveCrawl(name, this.dependedBy);
  }

  getTransitiveDeps(name: string) {
    if (!(name in this.dependsOn)) {
      return [];
    }

    return this.transitiveCrawl(name, this.dependsOn);
  }

  private transitiveCrawl(name: string, edges: Record<string, string[]>) {
    const deps = new Set<string>();

    const crawl = (dep: string) => {
      if (deps.has(dep)) {
        return;
      }
      deps.add(dep);
      for (const subdep of edges[dep] ?? []) {
        crawl(subdep);
      }
    };

    for (const dep of edges[name]) {
      crawl(dep);
    }
    return Array.from(deps);
  }

  private rebuildGraph() {
    this.dependedBy = {};
    this.dependsOn = {};
    for (const mod of this.browserBuild
      ? this.bundle.modules.browser
      : this.bundle.modules.server) {
      if (mod.type === 'code') {
        for (const imported of mod.imports) {
          if (!(mod.fileName in this.dependsOn)) {
            this.dependsOn[mod.fileName] = [imported];
          } else {
            this.dependsOn[mod.fileName].push(imported);
          }

          if (!(imported in this.dependedBy)) {
            this.dependedBy[imported] = [mod.fileName];
          } else {
            this.dependedBy[imported].push(mod.fileName);
          }
        }
      }
    }
  }
}
