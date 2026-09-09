import { Bundler } from "@/wab/shared/bundler";
import { Bundle } from "@/wab/shared/bundles";
import { assert, ensure, mkShortId } from "@/wab/shared/common";
import { ComponentType, mkComponent } from "@/wab/shared/core/components";
import { mkParam } from "@/wab/shared/core/lang";
import {
  allGlobalVariantGroups,
  cloneSite,
  createDefaultTheme,
  createSite as createSiteWithDefaults,
} from "@/wab/shared/core/sites";
import { mkTplTagX } from "@/wab/shared/core/tpls";
import {
  ComponentServerQuery,
  CustomFunction,
  CustomFunctionExpr,
  ensureKnownSite,
  FunctionArg,
  GlobalVariantGroup,
  ImageAsset,
  ImageAssetRef,
  isKnownCustomFunctionExpr,
  isKnownImageAssetRef,
  ProjectDependency,
  Site,
  SiteParams,
} from "@/wab/shared/model/classes";
import { withoutUids } from "@/wab/shared/model/model-meta";
import {
  createNodeCtx,
  walkModelTree,
} from "@/wab/shared/model/model-tree-util";
import { typeFactory } from "@/wab/shared/model/model-util";
import { mkScreenVariantGroup } from "@/wab/shared/SpecialVariants";
import {
  mkBaseVariant,
  mkGlobalVariantGroup,
  mkVariant,
  VariantGroupType,
} from "@/wab/shared/Variants";
import { readFileSync } from "fs";
import { escapeRegExp } from "lodash";

describe("allGlobalVariantGroups", () => {
  function createScreenVariantGroup(
    name: string,
    variantNames: string[]
  ): GlobalVariantGroup {
    return mkGlobalVariantGroup({
      param: mkParam({
        name,
        paramType: "globalVariantGroup",
        type: typeFactory.text(),
      }),
      variants: variantNames.map((n) => mkVariant({ name: n })),
      type: VariantGroupType.GlobalScreen,
      multi: true,
    });
  }

  function createNonScreenVariantGroup(
    name: string,
    variantNames: string[]
  ): GlobalVariantGroup {
    return mkGlobalVariantGroup({
      param: mkParam({
        name,
        paramType: "globalVariantGroup",
        type: typeFactory.text(),
      }),
      variants: variantNames.map((n) => mkVariant({ name: n })),
      type: VariantGroupType.GlobalUserDefined,
      multi: false,
    });
  }

  function createSite(params: Partial<SiteParams> = {}): Site {
    const defaultTheme = createDefaultTheme();
    const screenGroup =
      params.activeScreenVariantGroup ?? mkScreenVariantGroup();

    const defaultSiteParams: SiteParams = {
      projectDependencies: [],
      componentArenas: [],
      pageArenas: [],
      components: [],
      arenas: [],
      globalVariant: mkBaseVariant(),
      styleTokens: [],
      styleTokenOverrides: [],
      dataTokens: [],
      mixins: [],
      animationSequences: [],
      themes: [defaultTheme],
      activeTheme: defaultTheme,
      globalVariantGroups: params.globalVariantGroups ?? [screenGroup],
      userManagedFonts: [],
      imageAssets: [],
      activeScreenVariantGroup: screenGroup,
      flags: {
        usePlasmicImg: true,
        useLoadingState: true,
      },
      hostLessPackageInfo: null,
      globalContexts: [],
      splits: [],
      defaultComponents: {},
      defaultPageRoleId: null,
      pageWrapper: null,
      customFunctions: [],
      codeLibraries: [],
    };

    return new Site({
      ...defaultSiteParams,
      ...params,
    });
  }

  function createProjectDependency(
    name: string,
    site: Site
  ): ProjectDependency {
    return new ProjectDependency({
      name,
      pkgId: `${name.toLowerCase()}-pkg-id`,
      projectId: `${name.toLowerCase()}-project-id`,
      version: "0.0.1",
      uuid: `${name.toLowerCase()}-uuid`,
      site,
    });
  }

  describe("includeActiveScreenVariantsFromDeps option", () => {
    // Variant groups
    let mainScreenGroup: GlobalVariantGroup;
    let depScreenGroup: GlobalVariantGroup;
    let depInactiveScreenGroup: GlobalVariantGroup;
    let depUserGroup: GlobalVariantGroup;
    let transitiveScreenGroup: GlobalVariantGroup;

    // Single comprehensive fixture: Main -> Dep -> Transitive
    let mainSite: Site;

    beforeAll(() => {
      // Create all variant groups
      mainScreenGroup = createScreenVariantGroup("MainScreen", [
        "small",
        "large",
      ]);
      depScreenGroup = createScreenVariantGroup("DepScreen", [
        "mobile",
        "tablet",
      ]);
      depInactiveScreenGroup = createScreenVariantGroup("DepInactiveScreen", [
        "old",
        "legacy",
      ]);
      depUserGroup = createNonScreenVariantGroup("Theme", ["dark", "light"]);
      transitiveScreenGroup = createScreenVariantGroup("TransitiveScreen", [
        "xs",
        "sm",
      ]);

      // Transitive dependency
      const transitiveSite = createSite({
        globalVariantGroups: [transitiveScreenGroup],
        activeScreenVariantGroup: transitiveScreenGroup,
      });
      const transitiveDep = createProjectDependency(
        "TransitiveProject",
        transitiveSite
      );

      // Direct dependency with active screen, inactive screen, and user group
      const depSite = createSite({
        globalVariantGroups: [
          depScreenGroup,
          depInactiveScreenGroup,
          depUserGroup,
        ],
        activeScreenVariantGroup: depScreenGroup,
        projectDependencies: [transitiveDep],
      });
      const dep = createProjectDependency("DepProject", depSite);

      // Main site
      mainSite = createSite({
        globalVariantGroups: [mainScreenGroup],
        activeScreenVariantGroup: mainScreenGroup,
        projectDependencies: [dep],
      });
    });

    test("with includeActiveScreenVariantsFromDeps: includes dep active screen groups", () => {
      const result = allGlobalVariantGroups(mainSite, {
        includeDeps: "all",
        excludeInactiveScreenVariants: true,
        includeActiveScreenVariantsFromDeps: true,
      });

      expect(result).toContain(mainScreenGroup);
      expect(result).toContain(depScreenGroup);
      expect(result).toContain(transitiveScreenGroup);
      expect(result).toContain(depUserGroup);
      expect(result).not.toContain(depInactiveScreenGroup);
    });

    test("without includeActiveScreenVariantsFromDeps: filters out all dep screen groups", () => {
      const result = allGlobalVariantGroups(mainSite, {
        includeDeps: "all",
        excludeInactiveScreenVariants: true,
        includeActiveScreenVariantsFromDeps: false,
      });

      expect(result).toContain(mainScreenGroup);
      expect(result).toContain(depUserGroup);
      expect(result).not.toContain(depScreenGroup);
      expect(result).not.toContain(depInactiveScreenGroup);
      expect(result).not.toContain(transitiveScreenGroup);
    });

    test("without includeDeps: only returns main site groups", () => {
      const result = allGlobalVariantGroups(mainSite, {
        excludeInactiveScreenVariants: true,
        includeActiveScreenVariantsFromDeps: true,
      });

      expect(result).toEqual([mainScreenGroup]);
    });

    test("includeDeps direct: only includes direct dependency, not transitive", () => {
      const result = allGlobalVariantGroups(mainSite, {
        includeDeps: "direct",
        excludeInactiveScreenVariants: true,
        includeActiveScreenVariantsFromDeps: true,
      });

      expect(result).toContain(mainScreenGroup);
      expect(result).toContain(depScreenGroup);
      expect(result).toContain(depUserGroup);
      expect(result).not.toContain(transitiveScreenGroup);
      expect(result).not.toContain(depInactiveScreenGroup);
    });
  });
});

describe("cloneSite", () => {
  test("preserves the full Plasmic website by value", () => {
    const bundles: [string, Bundle][] = JSON.parse(
      readFileSync("../loader-tests/data/plasmic-website-2023.json", "utf8")
    );
    const bundler = new Bundler();
    const sourceSite = ensureKnownSite(
      bundles.map(([id, bundle]) => bundler.unbundle(bundle, id)).pop()
    );

    function normalize(site: Site) {
      // Assign UUIDs by tree position, including references in CSS and map keys.
      const uuids = new Map<string, string>();
      for (const inst of walkModelTree(createNodeCtx(site))) {
        if (
          "uuid" in inst &&
          typeof inst.uuid === "string" &&
          !uuids.has(inst.uuid)
        ) {
          uuids.set(inst.uuid, `normalized-uuid-${uuids.size}`);
        }
      }
      const pattern = new RegExp(
        [...uuids.keys()].map(escapeRegExp).join("|"),
        "g"
      );
      // Cloning refreshes component timestamps and may swap null with undefined.
      return JSON.parse(
        JSON.stringify(withoutUids(site), function (key, value) {
          return key === "updatedAt" && "tplTree" in this ? 0 : value ?? null;
        }).replace(pattern, (id) =>
          ensure(uuids.get(id), "Expected a known model UUID")
        )
      );
    }

    const sourceBefore = withoutUids(sourceSite, { includeUids: true });
    const expected = normalize(sourceSite);
    const clonedSite = cloneSite(sourceSite);

    // The clone must not reference objects owned by the source project.
    const sourceBundle = ensure(
      bundles.at(-1),
      "Expected the website bundle"
    )[1];
    const clonedBundle = bundler.bundle(
      clonedSite,
      "cloned-project",
      sourceBundle.version
    );
    expect(clonedBundle.deps.sort()).toEqual([...sourceBundle.deps].sort());
    expect(normalize(clonedSite)).toEqual(expected);
    expect(withoutUids(sourceSite, { includeUids: true })).toEqual(
      sourceBefore
    );
  });

  test("does not retain source-project refs from custom-function server queries", () => {
    const functionParam = typeFactory.arg("image", typeFactory.img(), "Image");
    const customFunction = new CustomFunction({
      defaultExport: false,
      importName: "fetchData",
      importPath: "./custom-functions",
      displayName: "Fetch data",
      namespace: null,
      params: [functionParam],
      isQuery: true,
      isMutation: false,
    });
    const imageAsset = new ImageAsset({
      uuid: mkShortId(),
      name: "Image",
      type: "picture",
      dataUri: null,
      width: null,
      height: null,
      aspectRatio: null,
    });
    const component = mkComponent({
      name: "Page",
      type: ComponentType.Page,
      tplTree: mkTplTagX("div"),
    });
    component.serverQueries.push(
      new ComponentServerQuery({
        uuid: mkShortId(),
        name: "query",
        op: new CustomFunctionExpr({
          func: customFunction,
          args: [
            new FunctionArg({
              uuid: mkShortId(),
              argType: functionParam,
              expr: new ImageAssetRef({ asset: imageAsset }),
            }),
          ],
        }),
      })
    );
    const sourceSite = createSiteWithDefaults({
      components: [component],
      customFunctions: [customFunction],
      imageAssets: [imageAsset],
    });
    const bundler = new Bundler();
    bundler.bundle(sourceSite, "source-project", "1");

    const clonedSite = cloneSite(sourceSite);
    const clonedBundle = bundler.bundle(clonedSite, "", "1");

    expect(clonedBundle.deps).not.toContain("source-project");
    const clonedFunction = clonedSite.customFunctions[0];
    const clonedOp = clonedSite.components[0].serverQueries[0].op;
    assert(
      isKnownCustomFunctionExpr(clonedOp),
      "Expected the cloned server query to call a custom function"
    );
    expect(clonedOp.func).toBe(clonedFunction);
    expect(clonedOp.args[0].argType).toBe(clonedFunction.params[0]);
    expect(clonedFunction.params[0].displayName).toBe("Image");
    assert(
      isKnownImageAssetRef(clonedOp.args[0].expr),
      "Expected the cloned custom-function argument to reference an image asset"
    );
    expect(clonedOp.args[0].expr.asset).toBe(clonedSite.imageAssets[0]);
  });
});
