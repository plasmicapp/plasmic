import { checkDepPkgHosts } from "@/wab/client/init-ctx";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { FastBundler } from "@/wab/shared/bundler";
import { getUsedDataSourcesFromDep } from "@/wab/shared/cached-selectors";
import { Dict } from "@/wab/shared/collections";
import {
  assert,
  ensure,
  ensureClientMemoizedFunction,
  spawn,
} from "@/wab/shared/common";
import {
  isFrameComponent,
  isReusableComponent,
} from "@/wab/shared/core/components";
import { isIcon } from "@/wab/shared/core/image-assets";
import {
  extractTransitiveDepsFromComponentDefaultSlots,
  extractTransitiveHostLessPackages,
  genImportableObjs,
  ImportableObject,
  syncGlobalContexts,
  walkDependencyTree,
} from "@/wab/shared/core/project-deps";
import {
  allStyleTokens,
  getNonTransitiveDepDefaultComponents,
} from "@/wab/shared/core/sites";
import { unbundleProjectDependency } from "@/wab/shared/core/tagged-unbundle";
import { trackComponentRoot, trackComponentSite } from "@/wab/shared/core/tpls";
import { InsertableIconsGroup } from "@/wab/shared/devflags";
import {
  inlineMixins,
  inlineTokens,
} from "@/wab/shared/insertable-templates/inliners";
import {
  Component,
  ImageAsset,
  isKnownProjectDependency,
  isKnownSite,
  ProjectDependency,
  Site,
  Variant,
} from "@/wab/shared/model/classes";
import { PkgInfo, PkgVersionInfoMeta } from "@/wab/shared/SharedApi";
import L, { last } from "lodash";
import { computed, observable } from "mobx";

export interface ProjectDependencyData {
  // `model` is the object stored in the Site
  model: ProjectDependency;
  // These are populated asynchronously from asking the server
  latestPkgVersionMeta?: PkgVersionInfoMeta;
}

export class ProjectDependencyManager {
  // Stores only direct dependencies of the project
  // These are reactive so that ProjectDependenciesPanel can be reactive.
  // { pkgId => ProjectDependencyData }
  private _dependencyMap = observable.object<Dict<ProjectDependencyData>>({});

  // Stores the Sites of "Insertable Templates" projects, keyed by projectId
  insertableSites: Record<string, Site> = {};
  insertableVersions: Record<string, string> = {};

  // Which local screen variant will we use to map to the insertable template's screen variant?
  insertableSiteScreenVariant: Variant | undefined;

  // Stores the Site of the Plume project
  plumeSite: Site | undefined;

  // Tracks Component, Mixin, StyleToken, Theme, ImageAsset and global VariantGroup to
  // the ProjectDependency it was imported from
  // This will include all assets across the ENTIRE dependency tree
  private _objToDep = new WeakMap<ImportableObject, ProjectDependency>();
  private _sc: StudioCtx;

  constructor(sc: StudioCtx) {
    this._sc = sc;

    // Pre-populate from the saved Site model
    sc.site.projectDependencies.forEach((d) => {
      this._trackDep(d);
    });
  }

  /**
   * Fetch any missing data from the server
   * TODO: this currently only fetches data once on load and caches it
   * - It does not know when to refresh the data if it has changed
   *  (i.e. if new version published while editing)
   * - We could add some logic to know when to refresh
   **/
  private async _fetchData(force?: boolean) {
    // Get PkgVersionMeta of all project dependencies
    const data = await Promise.all(
      L.map(L.values(this._dependencyMap), async (dep) => {
        return {
          pkgId: dep.model.pkgId,
          latestPkgVersionMeta:
            dep.latestPkgVersionMeta && !force
              ? dep.latestPkgVersionMeta
              : (await this._sc.appCtx.api.getPkgVersionMeta(dep.model.pkgId))
                  .pkg,
        };
      })
    );
    await this._sc.changeUnsafe(() => {
      data.forEach((d) => {
        this._dependencyMap[d.pkgId].latestPkgVersionMeta =
          d.latestPkgVersionMeta;
      });
    });

    // We no longer plan to make any updates to plume site. So its unnecessary to re-fetch it if it has already been fetched.
    if (!this.plumeSite) {
      const bundler = new FastBundler();
      // Get Plume site
      const plumePkg = await this._sc.appCtx.api.getPlumePkg();
      const plumeSite = unbundleProjectDependency(
        bundler,
        plumePkg.pkg,
        plumePkg.depPkgs
      ).projectDependency.site;
      this.plumeSite = this.inlineAssets(plumeSite);
    }
  }

  /**
   * Mutates every component in the site, doing:
   * - Deref all token references
   * - Apply mixin styles directly
   * @param site
   * @returns
   */
  inlineAssets(site: Site) {
    const allTokens = allStyleTokens(site, {
      includeDeps: "all",
    });
    site.components.forEach((c) => {
      inlineMixins(c.tplTree);
      inlineTokens(c.tplTree, allTokens);
    });
    return site;
  }

  /**
   * Helper function to add a dependency to the class's private members
   * @param dep
   */
  private _trackDep(
    dep: ProjectDependency,
    latestPkgVersionMeta?: PkgVersionInfoMeta
  ) {
    this._dependencyMap[dep.pkgId] = { model: dep, latestPkgVersionMeta };
    this._trackDepObjs(dep);
  }

  /**
   * Helper function to remove a dependency by PkgId
   * @param pkgId
   */
  private _untrackDep(dep: ProjectDependency) {
    delete this._dependencyMap[dep.pkgId];
  }

  /**
   * Crawls the dependency tree and builds a Dictionary of
   * pkgId => ProjectDependency
   * - We use this to check whether new imports are valid
   * Precondition: there must be only 1 version of any Pkg in our dependency tree
   */
  private _buildDependencyMap(
    input: Site | ProjectDependency
  ): Dict<ProjectDependency> {
    // pkgId => version
    const result: Dict<ProjectDependency> = {};
    const queue = isKnownSite(input) ? [...input.projectDependencies] : [input];
    while (queue.length > 0) {
      const dep = ensure(queue.shift(), "Queue should not be empty");
      // If we've already seen this pkgId, make sure its the right version
      if (result[dep.pkgId]) {
        assert(
          result[dep.pkgId].version === dep.version,
          `See pkgId=${dep.pkgId} name=${
            dep.name
          } with 2 conflicting versions:[${dep.version}, ${
            result[dep.pkgId].version
          }]`
        );
        continue;
      }
      result[dep.pkgId] = dep;
      queue.push(...dep.site.projectDependencies);
    }
    return result;
  }

  /**
   * Checks if a pkgId is currently a dependency
   * @param pkgId
   **/
  public containsPkgId(pkgId: string): boolean {
    const pkgIds = this._sc.site.projectDependencies.map((d) => d.pkgId);
    return pkgIds.includes(pkgId);
  }

  /**
   * Look for the package in the full dependency tree and return
   * the version we're currently using.
   * @param pkgId
   */
  public getVersionByPkgId(pkgId: string): string | undefined {
    const depMap = this._buildDependencyMap(this._sc.site);
    return depMap[pkgId] ? depMap[pkgId].version : undefined;
  }

  // mobx computed value of direct dependencies
  private directDeps = computed(() => {
    const result: ProjectDependencyData[] = [];
    this._sc.site.projectDependencies.forEach((dep) => {
      result.push(this._dependencyMap[dep.pkgId]);
    });
    return result;
  });

  /**
   * Returns a list of dependencies sorted by name
   **/
  getDependencies = (): ProjectDependencyData[] => {
    const unsorted = this.directDeps.get();
    if (unsorted.some((v) => v == null)) {
      // _dependencyMap is missing some entries - needs to refresh
      spawn(this._fetchData());
    }
    return L.sortBy(
      unsorted.filter((v) => v != null),
      (o) => o.model.name
    );
  };

  /**
   * Fetch a single dependency
   * @param pkgId
   */
  getDependencyData(pkgId: string): ProjectDependencyData | undefined {
    return this._dependencyMap[pkgId];
  }

  canAddDependency(dep: ProjectDependency, maybeMyPkg?: PkgInfo) {
    const { projectId } = dep;
    // Check for conflicting versions in the dependency tree
    const localDepMap = this._buildDependencyMap(this._sc.site);
    const importedDepMap = this._buildDependencyMap(dep);
    for (const pkgId in importedDepMap) {
      // Check for circular dependencies
      assert(
        pkgId !== maybeMyPkg?.id,
        `Importing ${projectId} failed because of a circular dependency with this project. Please remove any circular dependencies and try again.`
      );

      // Check for conflicts
      if (
        localDepMap[pkgId] &&
        localDepMap[pkgId].version !== importedDepMap[pkgId].version
      ) {
        throw new Error(
          `Importing ${projectId} failed due to conflicting dependencies. The imported project depends on '${importedDepMap[pkgId].name}'(pkgId=${pkgId}) version ${importedDepMap[pkgId].version}, when this project uses version ${localDepMap[pkgId].version}. Please reconcile these versions before trying again.`
        );
      }
    }
  }

  async addDependency(projectDependency: ProjectDependency) {
    // Create the Site model
    await this._sc.changeUnsafe(() => {
      // Add it to the Site
      this._sc.site.projectDependencies.push(projectDependency);

      // If project A imports B, B imports C, B.X is a component with default slot
      // contents using C.Y, then from project A, if I instantiate a B.X, I will have
      // some instances of C.Y in the B.X's slot.  I can then manipulate these
      // instances like usual (copying them, moving them out of the component, etc),
      // so I effectively can use C.Y as any normal component instance, so I should
      // have a direct dep on C as well.
      L.uniq([
        ...extractTransitiveDepsFromComponentDefaultSlots(
          this._sc.site,
          projectDependency.site.components.filter((c) =>
            isReusableComponent(c)
          )
        ),
        ...extractTransitiveHostLessPackages(this._sc.site),
      ]).forEach((dep) => {
        this._sc.site.projectDependencies.push(dep);
      });

      // Copy the Global Contexts from the imported project only if the current project
      // does not have the same global context
      syncGlobalContexts(projectDependency, this._sc.site);

      // Copy the default components from the imported project only if the current project
      // does not have the a default component for the same kind.
      this._sc.site.defaultComponents = {
        // Exclude transitive deps from being added as default components, this is to ensure that we don't
        // a case where a transitive dep adds some component to the project directly through defaults.
        // Having default components from transitive also blocks the removal of the dependency.
        ...getNonTransitiveDepDefaultComponents(projectDependency.site),
        ...this._sc.site.defaultComponents,
      };
    });

    return projectDependency;
  }

  /**
   * Adds a dependency
   * - This will update the StudioCtx Site model to be saved on next trySave
   * - it will also initiate a call to fetch additional data about the project.
   **/
  async addByProjectId(projectId: string) {
    if (projectId === this._sc.siteInfo.id) {
      // Check importing self
      throw new Error("You cannot import the current project.");
    }

    // Get the latest version
    const { pkg: maybePkg } = await this._sc.appCtx.api.getPkgByProjectId(
      projectId
    );
    if (!maybePkg) {
      throw new Error(`${projectId} has no published versions.`);
    }

    const pkg = maybePkg;
    if (this.containsPkgId(pkg.id)) {
      throw new Error(`${projectId} has already been imported.`);
    }

    const { isAuthEnabled: dependencyHasAppAuth } =
      await this._sc.appCtx.api.getAppAuthPubConfig(projectId);
    if (dependencyHasAppAuth) {
      throw new Error(
        `You cannot import ${projectId} because it has auth enabled.`
      );
    }

    // Download this local project's Pkg, to be used later to check for circular dependencies
    const { pkg: maybeMyPkg } = await this._sc.appCtx.api.getPkgByProjectId(
      this._sc.siteInfo.id
    );

    // Download the PkgVersion, which stores a Site pkgVersion.model
    const { pkg: latest, depPkgs } = await this._sc.appCtx.api.getPkgVersion(
      pkg.id
    );

    const { projectDependency, depPkgs: depPkgVersions } =
      unbundleProjectDependency(this._sc.bundler(), latest, depPkgs);

    spawn(
      checkDepPkgHosts(this._sc.appCtx, this._sc.siteInfo, [
        projectDependency,
        ...depPkgVersions.filter((dep): dep is ProjectDependency =>
          isKnownProjectDependency(dep)
        ),
      ])
    );

    this.canAddDependency(projectDependency, maybeMyPkg);
    await this.addDependency(projectDependency);

    // Get any missing data
    spawn(this._fetchData());

    return projectDependency;
  }

  async maybeAddDependency(dep: ProjectDependency) {
    this.canAddDependency(dep);
    return await this.addDependency(dep);
  }

  addTransitiveDepAsDirectDep(dep: ProjectDependency) {
    assert(
      !this._dependencyMap[dep.pkgId],
      "Must not be an existing direct dep"
    );
    this._sc.site.projectDependencies.push(dep);
    this._trackDep(dep);
    this._sc.styleMgrBcast.installDepStyles(dep);
  }

  getHostLessPackageDependents(pkgId: string) {
    const dep = this._dependencyMap[pkgId];
    const hostLessPackageInfo = dep.model.site.hostLessPackageInfo;
    if (hostLessPackageInfo) {
      const pkgDependents = Object.values(this._dependencyMap)
        .filter((pkgDependency) =>
          (pkgDependency.model.site.hostLessPackageInfo?.deps ?? []).includes(
            hostLessPackageInfo.name
          )
        )
        .map(
          (pkgDependency) => pkgDependency.model.site.hostLessPackageInfo!.name
        );
      return pkgDependents;
    } else {
      return [];
    }
  }

  /**
   * Removes the dependency
   **/
  async removeByPkgId(pkgId: string) {
    const hostLessPackageDependents = this.getHostLessPackageDependents(pkgId);
    if (hostLessPackageDependents.length > 0) {
      throw new Error(
        `Cannot remove ${pkgId} because it is a hostless package dependency for ${hostLessPackageDependents.join(
          ", "
        )}`
      );
    }
    const dep = this._dependencyMap[pkgId];
    await this._sc.siteOps().removeProjectDependency(dep.model);
  }

  /**
   * Retrieve a dependency from a foreign asset, which can be a Component,
   * Theme, Mixin, StyleToken, ImageAsset or global VariantGroup.
   */
  getOwnerDep(thing: ImportableObject) {
    return this._objToDep.get(thing);
  }

  ensureCanUpgradeDeps(targetDeps: ProjectDependency[]) {
    const result: Dict<ProjectDependency> = {};
    const queue = this.directDeps.get().map((d) => {
      const newDep = targetDeps.find((t) => t.pkgId === d.model.pkgId);
      return newDep ?? d.model;
    });
    while (queue.length > 0) {
      const dep = ensure(queue.shift(), "Queue should not be empty");
      // If we've already seen this pkgId, make sure its the right version
      if (result[dep.pkgId]) {
        if (result[dep.pkgId].version !== dep.version) {
          throw new Error(
            `Upgrading '${dep.name}' (${
              dep.projectId
            }) failed due to conflicting dependencies. ${
              dep.name
            } has two conflicting versions: ${dep.version} and ${
              result[dep.pkgId].version
            }. Please reconcile these versions before trying again.`
          );
        }
        continue;
      }
      result[dep.pkgId] = dep;
      queue.push(...dep.site.projectDependencies);
    }
  }

  async upgradeProjectDeps(
    targetDeps: ProjectDependency[],
    opts?: { noUndoRecord?: boolean }
  ) {
    this.ensureCanUpgradeDeps(targetDeps);
    await this._sc.siteOps().upgradeProjectDeps(targetDeps, opts);
    await this._fetchData();
    // invalidate cache after upgrading dep
    for (const dep of targetDeps) {
      ensureClientMemoizedFunction(getUsedDataSourcesFromDep).cache.delete(
        dep.site
      );
    }
  }

  async refreshDeps() {
    return this._fetchData(true);
  }

  private _trackDepObjs(dep: ProjectDependency) {
    // walkDependencyTree doesn't include target
    for (const d of [dep].concat(walkDependencyTree(dep.site, "all"))) {
      for (const obj of genImportableObjs(d.site)) {
        this._objToDep.set(obj, d);
      }
      for (const comp of d.site.components) {
        trackComponentSite(comp, d.site);
        trackComponentRoot(comp);
      }
    }
  }

  /**
   * Makes sure there's an entry in this._dependencyMap for every dep
   * in site.projectDependencies
   */
  syncDirectDeps() {
    const updatedDeps: ProjectDependency[] = [];
    const deletedDeps: ProjectDependency[] = [];
    for (const dep of this._sc.site.projectDependencies) {
      if (!L.has(this._dependencyMap, dep.pkgId)) {
        updatedDeps.push(dep);
        this._trackDep(dep);
      } else {
        const prevDep = this._dependencyMap[dep.pkgId].model;
        if (prevDep !== dep) {
          this._untrackDep(prevDep);
          this._trackDep(dep);
        }
      }
    }

    for (const key of L.keys(this._dependencyMap)) {
      if (!this._sc.site.projectDependencies.find((d) => d.pkgId === key)) {
        const dep = this._dependencyMap[key].model;
        this._untrackDep(dep);
        deletedDeps.push(dep);
      }
    }

    return {
      updatedDeps,
      deletedDeps,
    };
  }

  async fetchInsertableTemplate(projectId: string) {
    const bundler = new FastBundler();
    const { pkg } = await this._sc.appCtx.api.getPkgByProjectId(projectId);
    const latestPkgVersion = pkg
      ? await this._sc.appCtx.api.getPkgVersion(pkg.id)
      : undefined;
    if (
      !pkg ||
      !latestPkgVersion ||
      !latestPkgVersion.pkg ||
      !latestPkgVersion.depPkgs
    ) {
      console.warn(`Unable to load insertable templates project ${projectId}`);
      return;
    }

    if (this.insertableVersions[projectId] === latestPkgVersion.etag) {
      return;
    }

    const insertableSite = unbundleProjectDependency(
      bundler,
      latestPkgVersion.pkg,
      latestPkgVersion.depPkgs
    ).projectDependency.site;
    this.insertableSites[projectId] = insertableSite;
    this.insertableVersions[projectId] = latestPkgVersion.etag;
  }

  /**
   * Fetch an insertable template, which is embodied by a component
   * We also return the tokens so that we can inline the tokens later
   * @param meta
   * @returns
   */
  getInsertableTemplate(meta: {
    projectId: string;
    componentName?: string;
    componentId?: string;
  }): { component: Component; site: Site } | undefined {
    const projectId = meta.projectId;
    if (!this.insertableSites[projectId]) {
      return;
    }

    const site = this.insertableSites[projectId];
    const components = site.components.filter((c) => !isFrameComponent(c));
    const component = components.find(
      (c) => c.name === meta.componentName || c.uuid === meta.componentId
    );
    return !component
      ? undefined
      : {
          component,
          site,
        };
  }

  /**
   * Fetch all icons from the project
   * @param meta
   * @returns
   */
  getInsertableIcons(meta: InsertableIconsGroup): ImageAsset[] {
    const projectId = meta.projectId;
    if (!this.insertableSites[projectId]) {
      return [];
    }

    const site = this.insertableSites[projectId];
    const icons = site.imageAssets.filter((i) => isIcon(i));
    return icons;
  }

  getNiceDepName(dep: ProjectDependency) {
    const maybeHostlessPkg = this._sc.appCtx.appConfig.hostLessComponents?.find(
      (pkg) =>
        typeof pkg.projectId === "string"
          ? dep.projectId === pkg.projectId
          : dep.projectId === last(pkg.projectId)
    );

    if (maybeHostlessPkg) {
      return maybeHostlessPkg.name;
    }

    return dep.name;
  }
}
