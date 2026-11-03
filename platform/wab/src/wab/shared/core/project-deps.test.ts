import { mkTokenRef } from "@/wab/commons/StyleToken";
import { getArenaFrames, setFocusedFrame } from "@/wab/shared/Arenas";
import { RSH } from "@/wab/shared/RuleSetHelpers";
import { TplMgr } from "@/wab/shared/TplMgr";
import { $$$ } from "@/wab/shared/TplQuery";
import {
  VariantGroupType,
  ensureVariantSetting,
  getBaseVariant,
  mkGlobalVariantGroup,
  mkVariant,
} from "@/wab/shared/Variants";
import { Bundler } from "@/wab/shared/bundler";
import { allCustomFunctions } from "@/wab/shared/cached-selectors";
import {
  CodeComponentsRegistry,
  _testonly,
  rebindRestoredFunctions,
} from "@/wab/shared/code-components/code-components";
import { mkServerQuery } from "@/wab/shared/codegen/react-p/server-queries/__testonly__/test-utils";
import { ensure, jsonClone, mkShortId } from "@/wab/shared/common";
import { mkComponentArena } from "@/wab/shared/component-arenas";
import { ComponentType, mkComponent } from "@/wab/shared/core/components";
import { getCustomFunctionParams } from "@/wab/shared/core/custom-functions";
import { codeLit, customCode } from "@/wab/shared/core/exprs";
import { mkParam } from "@/wab/shared/core/lang";
import {
  getDependenciesWithReferencedCss,
  upgradeProjectDeps,
  walkDependencyTree,
} from "@/wab/shared/core/project-deps";
import { customFunctionId } from "@/wab/shared/core/query-ids";
import { createSite } from "@/wab/shared/core/sites";
import {
  TplTagType,
  findExprsInNode,
  flattenTpls,
  mkTplComponentX,
  mkTplTagX,
  trackComponentRoot,
  trackComponentSite,
} from "@/wab/shared/core/tpls";
import { DEVFLAGS } from "@/wab/shared/devflags";
import {
  Arg,
  ColumnsSetting,
  CustomFunction,
  CustomFunctionExpr,
  EventHandler,
  FunctionArg,
  Interaction,
  NameArg,
  ProjectDependency,
  Site,
  StyleToken,
  StyleTokenOverride,
  VariantedValue,
  ensureKnownProjectDependency,
  isKnownCustomFunctionExpr,
} from "@/wab/shared/model/classes";
import { typeFactory } from "@/wab/shared/model/model-util";
import { ok } from "neverthrow";
import React from "react";

describe("walkDependencyTree", () => {
  test("scope: direct", () => {
    const core = new ProjectDependency({
      name: "Core",
      pkgId: "core-pkg-id",
      projectId: "core-project-id",
      version: "0.0.1",
      uuid: "core-uuid",
      site: createSite(),
    });
    const theme = new ProjectDependency({
      name: "Theme",
      pkgId: "theme-pkg-id",
      projectId: "theme-project-id",
      version: "0.0.1",
      uuid: "theme-uuid",
      site: createSite(),
    });
    const semantic = new ProjectDependency({
      name: "Semantic",
      pkgId: "semantic-pkg-id",
      projectId: "semantic-project-id",
      version: "0.0.1",
      uuid: "semantic-uuid",
      site: createSite({
        projectDependencies: [theme],
      }),
    });
    const icons = new ProjectDependency({
      name: "Icons",
      pkgId: "icons-pkg-id",
      projectId: "icons-project-id",
      version: "0.0.1",
      uuid: "icons-uuid",
      site: createSite({
        projectDependencies: [theme],
      }),
    });

    const site = createSite({
      projectDependencies: [core, semantic, icons],
    });

    const result = walkDependencyTree(site, "direct");
    expect(result.map((res) => res.name)).toEqual([
      "Core",
      "Semantic",
      "Icons",
    ]);
  });
  test("scope: all", () => {
    const core = new ProjectDependency({
      name: "Core",
      pkgId: "core-pkg-id",
      projectId: "core-project-id",
      version: "0.0.1",
      uuid: "core-uuid",
      site: createSite(),
    });
    const theme = new ProjectDependency({
      name: "Theme",
      pkgId: "theme-pkg-id",
      projectId: "theme-project-id",
      version: "0.0.1",
      uuid: "theme-uuid",
      site: createSite(),
    });
    const semantic = new ProjectDependency({
      name: "Semantic",
      pkgId: "semantic-pkg-id",
      projectId: "semantic-project-id",
      version: "0.0.1",
      uuid: "semantic-uuid",
      site: createSite({
        projectDependencies: [theme],
      }),
    });
    const icons = new ProjectDependency({
      name: "Icons",
      pkgId: "icons-pkg-id",
      projectId: "icons-project-id",
      version: "0.0.1",
      uuid: "icons-uuid",
      site: createSite({
        projectDependencies: [theme],
      }),
    });

    const site = createSite({
      projectDependencies: [core, semantic, icons],
    });

    const result = walkDependencyTree(site, "all");
    expect(result.map((res) => res.name)).toEqual([
      "Core",
      "Semantic",
      "Icons",
      "Theme",
    ]);
  });
  test("circular dependency", () => {
    const core = new ProjectDependency({
      name: "Core",
      pkgId: "core-pkg-id",
      projectId: "core-project-id",
      version: "0.0.1",
      uuid: "core-uuid",
      site: createSite(),
    });
    const theme = new ProjectDependency({
      name: "Theme",
      pkgId: "theme-pkg-id",
      projectId: "theme-project-id",
      version: "0.0.1",
      uuid: "theme-uuid",
      site: createSite({
        projectDependencies: [core],
      }),
    });

    //   add circular dependency
    core.site.projectDependencies = [theme];

    const site = createSite({
      projectDependencies: [core],
    });

    const result = walkDependencyTree(site, "all");
    expect(result.map((res) => res.name)).toEqual(["Core", "Theme"]);
  });
  test("Use Case: PLA-10577 (linear dependency)", () => {
    const core = new ProjectDependency({
      name: "Core",
      pkgId: "core-pkg-id",
      projectId: "core-project-id",
      version: "0.0.1",
      uuid: "core-uuid",
      site: createSite(),
    });
    const theme = new ProjectDependency({
      name: "Theme",
      pkgId: "theme-pkg-id",
      projectId: "theme-project-id",
      version: "0.0.1",
      uuid: "theme-uuid",
      site: createSite({
        projectDependencies: [core],
      }),
    });
    const semantic = new ProjectDependency({
      name: "Semantic",
      pkgId: "semantic-pkg-id",
      projectId: "semantic-project-id",
      version: "0.0.1",
      uuid: "semantic-uuid",
      site: createSite({
        projectDependencies: [core, theme],
      }),
    });
    const icons = new ProjectDependency({
      name: "Icons",
      pkgId: "icons-pkg-id",
      projectId: "icons-project-id",
      version: "0.0.1",
      uuid: "icons-uuid",
      site: createSite({
        projectDependencies: [core, theme, semantic],
      }),
    });
    const components = new ProjectDependency({
      name: "Components",
      pkgId: "components-pkg-id",
      projectId: "components-project-id",
      version: "0.0.1",
      uuid: "components-uuid",
      site: createSite({
        projectDependencies: [core, theme, semantic, icons],
      }),
    });
    const patterns = new ProjectDependency({
      name: "Patterns",
      pkgId: "patterns-pkg-id",
      projectId: "patterns-project-id",
      version: "0.0.1",
      uuid: "patterns-uuid",
      site: createSite({
        projectDependencies: [core, theme, semantic, icons, components],
      }),
    });
    const combo = new ProjectDependency({
      name: "Combo",
      pkgId: "combo-pkg-id",
      projectId: "combo-project-id",
      version: "0.0.1",
      uuid: "combo-uuid",
      site: createSite({
        projectDependencies: [
          core,
          theme,
          semantic,
          icons,
          components,
          patterns,
        ],
      }),
    });
    const segments = new ProjectDependency({
      name: "Segments",
      pkgId: "segments-pkg-id",
      projectId: "segments-project-id",
      version: "0.0.1",
      uuid: "segments-uuid",
      site: createSite({
        projectDependencies: [
          core,
          theme,
          semantic,
          icons,
          components,
          patterns,
          combo,
        ],
      }),
    });
    const sections = new ProjectDependency({
      name: "Sections",
      pkgId: "sections-pkg-id",
      projectId: "sections-project-id",
      version: "0.0.1",
      uuid: "sections-uuid",
      site: createSite({
        projectDependencies: [
          core,
          theme,
          semantic,
          icons,
          components,
          patterns,
          combo,
          segments,
        ],
      }),
    });

    const site = createSite({
      projectDependencies: [
        core,
        theme,
        semantic,
        icons,
        components,
        patterns,
        combo,
        segments,
        sections,
      ],
    });
    const result = walkDependencyTree(site, "all");
    expect(result.map((res) => res.name)).toEqual([
      "Core",
      "Theme",
      "Semantic",
      "Icons",
      "Components",
      "Patterns",
      "Combo",
      "Segments",
      "Sections",
    ]);
  });
});

describe("upgradeProjectDeps", () => {
  test("fixes global variant refs in styleTokenOverrides for both dep and local tokens", () => {
    const depTokenUuid = "gray-2-token-uuid";
    const variantUuid = "mobile-variant-uuid";

    // Create OLD variant for the old dependency
    const oldVariant = mkVariant({
      name: "Mobile",
      mediaQuery: "(min-width:0px) and (max-width:1000px)",
    });
    (oldVariant as any).uuid = variantUuid;

    // Create OLD token for the old dependency
    const oldDepToken = new StyleToken({
      name: "Gray 2",
      type: "Color",
      uuid: depTokenUuid,
      value: "#848C8F",
      variantedValues: [],
      isRegistered: false,
      regKey: "gray-2",
    });

    // Create OLD dependency site with the token and variant
    const oldDepSite = createSite({
      styleTokens: [oldDepToken],
    });
    oldVariant.parent = oldDepSite.activeScreenVariantGroup!;
    oldDepSite.activeScreenVariantGroup!.variants = [
      ...oldDepSite.activeScreenVariantGroup!.variants,
      oldVariant,
    ];

    const oldDep = new ProjectDependency({
      name: "DesignSystem",
      pkgId: "design-system-pkg-id",
      projectId: "design-system-project-id",
      version: "1.0.0",
      uuid: "design-system-dep-uuid",
      site: oldDepSite,
    });

    // Create NEW variant for the new dependency
    const newVariant = mkVariant({
      name: "Mobile",
      mediaQuery: "(min-width:0px) and (max-width:1000px)",
    });
    (newVariant as any).uuid = variantUuid;

    // Create NEW token for the new dependency
    const newDepToken = new StyleToken({
      name: "Gray 2",
      type: "Color",
      uuid: depTokenUuid,
      value: "#848C8F",
      variantedValues: [],
      isRegistered: false,
      regKey: "gray-2",
    });

    // Create NEW dependency site with the token and variant
    const newDepSite = createSite({
      styleTokens: [newDepToken],
    });
    newVariant.parent = newDepSite.activeScreenVariantGroup!;
    newDepSite.activeScreenVariantGroup!.variants = [
      ...newDepSite.activeScreenVariantGroup!.variants,
      newVariant,
    ];

    const newDep = new ProjectDependency({
      name: "DesignSystem",
      pkgId: "design-system-pkg-id",
      projectId: "design-system-project-id",
      version: "2.0.0",
      uuid: "design-system-dep-uuid-v2",
      site: newDepSite,
    });

    // Create LOCAL registered token in the main site
    const localToken = new StyleToken({
      name: "Primary Color",
      type: "Color",
      uuid: "local-primary-token-uuid",
      value: "#0000FF",
      variantedValues: [],
      isRegistered: true,
      regKey: "primary-color",
    });

    // Create StyleTokenOverride for DEP token with OLD variant
    const depTokenOverride = new StyleTokenOverride({
      token: oldDepToken,
      value: null,
      variantedValues: [
        new VariantedValue({
          variants: [oldVariant],
          value: "#848C8F40",
        }),
      ],
    });

    // Create StyleTokenOverride for LOCAL token with OLD variant from dep
    const localTokenOverride = new StyleTokenOverride({
      token: localToken,
      value: null,
      variantedValues: [
        new VariantedValue({
          variants: [oldVariant],
          value: "#FF0000",
        }),
      ],
    });

    // Create main site with both overrides and old dependency
    const mainSite = createSite({
      projectDependencies: [oldDep],
      styleTokens: [localToken],
      styleTokenOverrides: [depTokenOverride, localTokenOverride],
    });

    // Verify initial state: both overrides reference OLD variant
    expect(mainSite.styleTokenOverrides).toMatchObject([
      { token: oldDepToken, variantedValues: [{ variants: [oldVariant] }] },
      { token: localToken, variantedValues: [{ variants: [oldVariant] }] },
    ]);

    // Upgrade the dependency
    upgradeProjectDeps(mainSite, [{ oldDep, newDep }]);

    // Verify after upgrade:
    // - Dep token override: both token and variant updated to NEW
    // - Local token override: token unchanged, variant updated to NEW
    expect(mainSite.styleTokenOverrides).toMatchObject([
      { token: newDepToken, variantedValues: [{ variants: [newVariant] }] },
      { token: localToken, variantedValues: [{ variants: [newVariant] }] },
    ]);

    // Verify the dependency was updated
    expect(mainSite.projectDependencies).toEqual([newDep]);
  });

  test("fixes global variant refs in matrix frames of an arena in focused mode", () => {
    const groupUuid = "theme-group-uuid";
    const variantUuid = "dark-variant-uuid";

    // Create a dependency with a "Theme" group holding a "Dark" variant
    const mkDep = (version: string, depUuid: string) => {
      const variant = mkVariant({ name: "Dark" });
      (variant as any).uuid = variantUuid;
      const group = mkGlobalVariantGroup({
        param: mkParam({
          name: "Theme",
          paramType: "globalVariantGroup",
          type: typeFactory.text(),
        }),
        variants: [variant],
        type: VariantGroupType.GlobalUserDefined,
        multi: false,
      });
      (group as any).uuid = groupUuid;

      const depSite = createSite();
      depSite.globalVariantGroups = [...depSite.globalVariantGroups, group];

      return {
        variant,
        dep: new ProjectDependency({
          name: "DesignSystem",
          pkgId: "design-system-pkg-id",
          projectId: "design-system-project-id",
          version,
          uuid: depUuid,
          site: depSite,
        }),
      };
    };

    const { dep: oldDep, variant: oldVariant } = mkDep(
      "1.0.0",
      "design-system-dep-uuid",
    );
    const { dep: newDep, variant: newVariant } = mkDep(
      "2.0.0",
      "design-system-dep-uuid-v2",
    );

    // Create main site with the OLD dependency and a local component
    const mainSite = createSite({ projectDependencies: [oldDep] });
    const component = mkComponent({
      name: "Local",
      tplTree: mkTplTagX("div"),
      type: ComponentType.Plain,
    });
    mainSite.components = [...mainSite.components, component];
    trackComponentSite(component, mainSite);
    trackComponentRoot(component);

    // Style the component under the dep's variant, so the arena gets a row for
    // the dep's variant group
    const vs = ensureVariantSetting(component.tplTree, [oldVariant]);
    RSH(vs.rs, component.tplTree).set("color", "red");

    const arena = mkComponentArena({ site: mainSite, component });
    mainSite.componentArenas = [...mainSite.componentArenas, arena];

    // Verify initial state: a matrix frame targets the OLD variant
    const depFrames = getArenaFrames(arena).filter((f) =>
      f.targetGlobalVariants.includes(oldVariant),
    );
    expect(depFrames.length).toBeGreaterThan(0);

    // Turn off design mode, which hides the matrix frames from getArenaFrames
    const focusedFrame = setFocusedFrame(mainSite, arena);
    expect(getArenaFrames(arena)).toEqual([focusedFrame]);

    // Upgrade the dependency
    upgradeProjectDeps(mainSite, [{ oldDep, newDep }]);

    // Verify after upgrade: matrix frames point at the NEW variant. Identity,
    // not structural equality - the bundler xrefs deps by object identity
    for (const frame of depFrames) {
      expect(frame.targetGlobalVariants).toHaveLength(1);
      expect(frame.targetGlobalVariants[0]).toBe(newVariant);
    }
  });

  test("drops references to a global variant deleted while its group remains", () => {
    const groupUuid = "screen-group-uuid";
    const variantUuid = "mobile-variant-uuid";

    const mkDep = (
      version: string,
      depUuid: string,
      opts: { withVariant: boolean },
    ) => {
      const variant = mkVariant({
        name: "Mobile",
        mediaQuery: "(min-width:0px) and (max-width:1000px)",
      });
      (variant as any).uuid = variantUuid;

      const depSite = createSite();
      const group = depSite.activeScreenVariantGroup!;
      (group as any).uuid = groupUuid;
      if (opts.withVariant) {
        variant.parent = group;
        group.variants = [...group.variants, variant];
      }

      return {
        variant,
        dep: new ProjectDependency({
          name: "DesignSystem",
          pkgId: "design-system-pkg-id",
          projectId: "design-system-project-id",
          version,
          uuid: depUuid,
          site: depSite,
        }),
      };
    };

    const { dep: oldDep, variant: oldVariant } = mkDep(
      "1.0.0",
      "design-system-dep-uuid",
      { withVariant: true },
    );
    const { dep: newDep } = mkDep("2.0.0", "design-system-dep-uuid-v2", {
      withVariant: false,
    });

    const mainSite = createSite({ projectDependencies: [oldDep] });
    const columns = mkTplTagX("div");
    columns.type = TplTagType.Columns;
    columns.columnsSetting = new ColumnsSetting({
      screenBreakpoint: oldVariant,
    });

    const component = mkComponent({
      name: "Local",
      tplTree: columns,
      type: ComponentType.Plain,
    });
    mainSite.components = [...mainSite.components, component];
    trackComponentSite(component, mainSite);
    trackComponentRoot(component);

    ensureVariantSetting(columns, [mainSite.globalVariant]);
    const vs = ensureVariantSetting(columns, [oldVariant]);
    RSH(vs.rs, columns).set("color", "red");

    expect(columns.vsettings.some((s) => s.variants.includes(oldVariant))).toBe(
      true,
    );
    expect(columns.columnsSetting?.screenBreakpoint).toBe(oldVariant);

    upgradeProjectDeps(mainSite, [{ oldDep, newDep }]);

    expect(columns.vsettings.some((s) => s.variants.includes(oldVariant))).toBe(
      false,
    );
    expect(columns.columnsSetting?.screenBreakpoint).toBeNull();
  });

  // Three versions of a kit whose Intro gets an `align` prop in 3.0.0, and a
  // page with an Intro instance on 1.0.0.
  function setupIntroUpgrades() {
    const bundler = new Bundler();
    const kitSite = createSite();
    new TplMgr({ site: kitSite }).addComponent({
      name: "Intro",
      type: ComponentType.Plain,
    });
    const kit1Dep = new ProjectDependency({
      name: "Kit",
      pkgId: "kit-pkg-id",
      projectId: "kit-project-id",
      version: "1.0.0",
      uuid: "kit-dep-uuid",
      site: kitSite,
    });
    // Like a real publish, keeps the uuids of unchanged objects.
    const release = (dep: ProjectDependency, version: string) => {
      const next = ensureKnownProjectDependency(
        bundler.unbundle(
          jsonClone(bundler.bundle(dep, `kit-${dep.version}`, "")),
          `kit-${version}`,
        ),
      );
      next.version = version;
      return next;
    };
    const kit2Dep = release(kit1Dep, "2.0.0");
    const kit3Dep = release(kit2Dep, "3.0.0");
    const [kit1, kit2, kit3] = [kit1Dep, kit2Dep, kit3Dep].map((dep) => ({
      dep,
      intro: ensure(
        dep.site.components.find((c) => c.name === "Intro"),
        "Missing Intro",
      ),
    }));
    const align = mkParam({
      name: "align",
      type: typeFactory.text(),
      paramType: "prop",
    });
    kit3.intro.params = [...kit3.intro.params, align];

    const site = createSite({ projectDependencies: [kit1.dep] });
    const page = new TplMgr({ site }).addComponent({
      name: "Page",
      type: ComponentType.Page,
    });
    const intro = mkTplComponentX({
      name: "intro",
      component: kit1.intro,
      baseVariant: getBaseVariant(page),
    });
    $$$(page.tplTree).append(intro);
    site.components.forEach((c) => {
      trackComponentRoot(c);
      trackComponentSite(c, site);
    });
    return { site, intro, kit1, kit2, kit3, align };
  }

  test("keeps an arg on a future version's param until the upgrade to that version", () => {
    const { site, intro, kit1, kit2, kit3, align } = setupIntroUpgrades();
    intro.vsettings[0].args = [
      ...intro.vsettings[0].args,
      new Arg({ param: align, expr: codeLit("center") }),
    ];

    upgradeProjectDeps(site, [
      { oldDep: kit1.dep, newDep: kit2.dep, futureDeps: [kit3.dep] },
    ]);
    expect(intro.component).toBe(kit2.intro);
    expect(intro.vsettings[0].args.map((arg) => arg.param)).toEqual([align]);

    upgradeProjectDeps(site, [{ oldDep: kit2.dep, newDep: kit3.dep }]);
    expect(intro.component).toBe(kit3.intro);
    expect(intro.vsettings[0].args.map((arg) => arg.param)).toEqual([align]);
  });

  test("removes an arg whose param no future version has", () => {
    const { site, intro, kit1, kit2, kit3 } = setupIntroUpgrades();
    const orphan = mkParam({
      name: "orphan",
      type: typeFactory.text(),
      paramType: "prop",
    });
    intro.vsettings[0].args = [
      ...intro.vsettings[0].args,
      new Arg({ param: orphan, expr: codeLit("lost") }),
    ];

    upgradeProjectDeps(site, [
      { oldDep: kit1.dep, newDep: kit2.dep, futureDeps: [kit3.dep] },
    ]);
    expect(intro.vsettings[0].args).toEqual([]);
  });
});

describe("upgradeProjectDeps with removed custom functions", () => {
  const mkFunc = (importName: string) =>
    new CustomFunction({
      importName,
      importPath: "@plasmicpkgs/fetch",
      defaultExport: false,
      namespace: null,
      displayName: null,
      params: [typeFactory.arg("url", typeFactory.text())],
      isQuery: true,
      isMutation: false,
    });
  const mkDep = (version: string, customFunctions: CustomFunction[]) =>
    new ProjectDependency({
      name: "Lib",
      pkgId: "lib-pkg-id",
      projectId: "lib-project-id",
      version,
      uuid: mkShortId(),
      site: createSite({ customFunctions }),
    });

  async function syncWithoutHostFunctions(site: Site) {
    const registry = new CodeComponentsRegistry(globalThis, {});
    vi.spyOn(registry, "getRegisteredFunctionsMap").mockReturnValue(new Map());
    const onUpdatedCustomFunctions = vi.fn();
    const result = await _testonly.upsertRegisteredFunctions(
      {
        site,
        codeComponentsRegistry: registry,
        change: async (f) => f(),
        getRootSubReact: () => React,
        tplMgr: () => new TplMgr({ site }),
        getPlumeSite: () => undefined,
      },
      {
        onMissingCodeComponents: async () => ok(),
        onInvalidReactVersion: async () => ok(),
        onInvalidComponentImportNames: vi.fn(),
        onStaleProps: async () => false,
        onNewDefaultComponents: vi.fn(),
        onSchemaToTplWarnings: vi.fn(),
        onSchemaToTplError: vi.fn(),
        onInvalidJsonForDefaultValue: vi.fn(),
        onUpdatedCustomFunctions,
      },
    );
    expect(result.isOk()).toBe(true);
    expect(onUpdatedCustomFunctions).not.toHaveBeenCalled();
  }

  function setup() {
    const queried = mkFunc("queried");
    const inCode = mkFunc("inCode");
    const unused = mkFunc("unused");
    const oldDep = mkDep("1.0.0", [queried, inCode, unused]);
    const op = new CustomFunctionExpr({
      func: queried,
      args: [
        new FunctionArg({
          uuid: mkShortId(),
          argType: queried.params[0],
          expr: customCode('"a"'),
        }),
      ],
    });
    const page = mkComponent({
      name: "Comp",
      type: ComponentType.Plain,
      tplTree: mkTplTagX("div"),
    });
    page.serverQueries = [
      mkServerQuery("fnQuery", op),
      mkServerQuery("codeQuery", customCode("($$.inCode())")),
    ];
    const site = createSite({ projectDependencies: [oldDep] });
    site.components = [page];
    return { site, oldDep, page, op };
  }

  it("keeps used functions as local copies and their queries pointing at them", () => {
    const { site, oldDep, page, op } = setup();
    upgradeProjectDeps(site, [{ oldDep, newDep: mkDep("2.0.0", []) }]);
    expect(site.customFunctions.map((f) => f.importName)).toEqual([
      "queried",
      "inCode",
    ]);
    const [localFunc] = site.customFunctions;
    expect(page.serverQueries[0].op).toBe(op);
    expect(op.func).toBe(localFunc);
    expect(op.args[0].argType).toBe(localFunc.params[0]);
  });

  it("reuses a local function with the same id", () => {
    const { site, oldDep, op } = setup();
    const existing = mkFunc("queried");
    site.customFunctions = [existing];
    upgradeProjectDeps(site, [{ oldDep, newDep: mkDep("2.0.0", []) }]);
    expect(op.func).toBe(existing);
    expect(site.customFunctions.map((f) => f.importName)).toEqual([
      "queried",
      "inCode",
    ]);
  });

  it("rebinds preserved functions during sync when restored with a changed signature", async () => {
    const { site, oldDep, page, op } = setup();
    const codeQuery = page.serverQueries[1].op;
    const removed = mkDep("2.0.0", []);
    const obsolete = typeFactory.arg("obsolete", typeFactory.text());
    const count = typeFactory.arg("count", typeFactory.num());
    op.func.params = [...op.func.params, obsolete, count];
    op.args = [
      ...op.args,
      new FunctionArg({
        uuid: mkShortId(),
        argType: obsolete,
        expr: codeLit("old"),
      }),
      new FunctionArg({
        uuid: mkShortId(),
        argType: count,
        expr: codeLit(7),
      }),
    ];
    upgradeProjectDeps(site, [{ oldDep, newDep: removed }]);
    const stillRemoved = mkDep("3.0.0", []);
    upgradeProjectDeps(site, [{ oldDep: removed, newDep: stillRemoved }]);

    const restored = mkFunc("queried");
    restored.params = [
      typeFactory.arg("count", typeFactory.num()),
      restored.params[0],
      typeFactory.arg("added", typeFactory.text()),
    ];
    const restoredCode = mkFunc("inCode");
    const newDep = mkDep("4.0.0", [restored, restoredCode]);
    const preserved = op.func;
    upgradeProjectDeps(site, [{ oldDep: stillRemoved, newDep }]);
    expect(op.func).toBe(preserved);
    expect(op.args).toHaveLength(3);
    await syncWithoutHostFunctions(site);

    expect(site.customFunctions).toEqual([]);
    expect(
      allCustomFunctions(site).map(({ customFunction }) => customFunction),
    ).toEqual([restored, restoredCode]);
    expect(op.func).toBe(restored);
    expect(op.args).toHaveLength(2);
    expect(op.args[0].argType).toBe(restored.params[1]);
    expect(op.args[1].argType).toBe(restored.params[0]);
    expect(
      getCustomFunctionParams(
        op,
        {},
        { projectFlags: DEVFLAGS, component: page, inStudio: true },
      ),
    ).toEqual([7, "a", undefined]);
    expect(page.serverQueries[1].op).toBe(codeQuery);

    const removedAgain = mkDep("5.0.0", []);
    upgradeProjectDeps(site, [{ oldDep: newDep, newDep: removedAgain }]);
    expect(op.func).toBe(site.customFunctions[0]);
    expect(op.args[0].argType).toBe(op.func.params[1]);
  });

  it.each(["matching import", "importPath", "defaultExport"] as const)(
    "preserves a same-id local function (%s)",
    (field) => {
      const { site, oldDep, page } = setup();
      const local = mkFunc("queried");
      if (field === "importPath") {
        local.importPath = "./my-functions";
      } else if (field === "defaultExport") {
        local.defaultExport = true;
      }
      local.params = [typeFactory.arg("token", typeFactory.text())];
      const op = new CustomFunctionExpr({
        func: local,
        args: [
          new FunctionArg({
            uuid: mkShortId(),
            argType: local.params[0],
            expr: codeLit("secret"),
          }),
        ],
      });
      site.customFunctions = [local];
      page.serverQueries = [mkServerQuery("localQuery", op)];
      const arg = op.args[0];
      upgradeProjectDeps(site, [
        {
          oldDep,
          newDep: mkDep("1.0.1", [mkFunc("queried"), mkFunc("inCode")]),
        },
      ]);
      expect(site.customFunctions).toEqual([local]);
      expect(op.func).toBe(local);
      expect(op.args).toEqual([arg]);
      expect(arg.argType).toBe(local.params[0]);
    },
  );

  it.each(["tag", "local component", "removed component"])(
    "rebinds handlers on a %s through upgrade, removal, and restoration",
    async (kind) => {
      const { site, oldDep, page, op } = setup();
      page.serverQueries = [];
      const handler = new EventHandler({ interactions: [] });
      handler.interactions = [
        new Interaction({
          uuid: mkShortId(),
          interactionName: "Call function",
          actionName: "customFunctionOp",
          conditionalMode: "always",
          condExpr: null,
          parent: handler,
          args: [new NameArg({ name: "customFunctionOp", expr: op })],
        }),
      ];
      const button = mkComponent({
        name: "Button",
        type: ComponentType.Plain,
        tplTree: (baseVariant) =>
          mkTplTagX("button", {
            baseVariant,
            attrs: { onClick: handler },
          }),
      });
      if (kind === "tag") {
        site.components = [button];
      } else if (kind === "local component") {
        const param = mkParam({
          name: "onClick",
          type: typeFactory.func(),
          paramType: "prop",
        });
        button.params = [param];
        button.tplTree.vsettings[0].attrs = {};
        page.tplTree = mkTplComponentX({
          component: button,
          baseVariant: getBaseVariant(page),
          args: [new Arg({ param, expr: handler })],
        });
        site.components = [page, button];
      } else {
        oldDep.site.components = [button];
        page.tplTree = mkTplComponentX({
          component: button,
          baseVariant: getBaseVariant(page),
        });
      }
      const kept = mkFunc("queried");
      kept.params = [
        typeFactory.arg("added", typeFactory.text()),
        kept.params[0],
      ];
      const next = mkDep("1.1.0", [kept]);
      upgradeProjectDeps(site, [{ oldDep, newDep: next }]);
      // A removed dependency component is cloned, including its handler.
      const calls = site.components
        .flatMap((c) =>
          flattenTpls(c.tplTree).flatMap((tpl) => findExprsInNode(tpl)),
        )
        .map(({ expr }) => expr)
        .filter(isKnownCustomFunctionExpr);
      expect(calls).toHaveLength(1);
      const call = calls[0];
      expect(call.func).toBe(kept);
      expect(call.args[0].argType).toBe(kept.params[1]);
      expect(
        getCustomFunctionParams(
          call,
          {},
          {
            projectFlags: DEVFLAGS,
            component: page,
            inStudio: true,
          },
        ),
      ).toEqual([undefined, "a"]);
      const removed = mkDep("2.0.0", []);
      upgradeProjectDeps(site, [{ oldDep: next, newDep: removed }]);
      expect(call.func).toBe(site.customFunctions[0]);
      expect(call.args[0].argType).toBe(call.func.params[1]);
      const restored = mkFunc("queried");
      upgradeProjectDeps(site, [
        { oldDep: removed, newDep: mkDep("3.0.0", [restored]) },
      ]);
      await syncWithoutHostFunctions(site);
      expect(site.customFunctions).toEqual([]);
      expect(call.func).toBe(restored);
      expect(call.args[0].argType).toBe(restored.params[0]);
    },
  );

  it("rebinds restored functions without a sync, keeping registered ones", () => {
    const { site, oldDep, page, op } = setup();
    op.func.params = [
      ...op.func.params,
      typeFactory.arg("count", typeFactory.num()),
    ];
    op.args = [
      ...op.args,
      new FunctionArg({
        uuid: mkShortId(),
        argType: op.func.params[1],
        expr: codeLit(7),
      }),
    ];
    const removed = mkDep("2.0.0", []);
    upgradeProjectDeps(site, [{ oldDep, newDep: removed }]);
    const restored = mkFunc("queried");
    restored.params = [
      typeFactory.arg("count", typeFactory.num()),
      restored.params[0],
    ];
    upgradeProjectDeps(site, [
      {
        oldDep: removed,
        newDep: mkDep("3.0.0", [restored, mkFunc("inCode")]),
      },
    ]);
    const params = () =>
      getCustomFunctionParams(
        op,
        {},
        { projectFlags: DEVFLAGS, component: page, inStudio: true },
      );
    expect(params()).toEqual(["a", 7]);

    const local = op.func;
    const registration = {
      function: () => {},
      meta: { name: "queried", importPath: local.importPath },
    };
    rebindRestoredFunctions(
      site,
      new Map([[customFunctionId(local), registration]]),
    );
    expect(op.func).toBe(local);

    rebindRestoredFunctions(site, new Map());
    expect(op.func).toBe(restored);
    expect(params()).toEqual([7, "a"]);
    expect(site.customFunctions).toEqual([]);
  });

  function setupRemovedComponents() {
    const func = mkFunc("queried");
    const mkPlain = (name: string) =>
      mkComponent({
        name,
        type: ComponentType.Plain,
        tplTree: mkTplTagX("div"),
      });
    const inner = mkPlain("Inner");
    const op = new CustomFunctionExpr({ func, args: [] });
    inner.serverQueries = [mkServerQuery("fnQuery", op)];
    const outer = mkPlain("Outer");
    outer.tplTree = mkTplComponentX({
      component: inner,
      baseVariant: getBaseVariant(outer),
    });
    const oldDep = mkDep("1.0.0", [func]);
    oldDep.site.components = [outer, inner];
    oldDep.site.components.forEach((c) => {
      trackComponentRoot(c);
      trackComponentSite(c, oldDep.site);
    });
    const page = mkPlain("Page");
    const site = createSite({ projectDependencies: [oldDep] });
    site.components = [page];
    return { site, oldDep, page, outer };
  }

  it("does not copy functions used only by components the site doesn't clone", () => {
    const { site, oldDep } = setupRemovedComponents();
    upgradeProjectDeps(site, [{ oldDep, newDep: mkDep("2.0.0", []) }]);
    expect(site.customFunctions).toEqual([]);
    expect(site.components.map((c) => c.name)).toEqual(["Page"]);
  });

  it("copies functions used by transitively cloned components", () => {
    const { site, oldDep, page, outer } = setupRemovedComponents();
    page.tplTree = mkTplComponentX({
      component: outer,
      baseVariant: getBaseVariant(page),
    });
    trackComponentRoot(page);
    trackComponentSite(page, site);
    upgradeProjectDeps(site, [{ oldDep, newDep: mkDep("2.0.0", []) }]);
    expect(site.customFunctions.map((f) => f.importName)).toEqual(["queried"]);
    const inner = ensure(
      site.components.find((c) => c.name === "Inner"),
      "Inner should be cloned",
    );
    const op = inner.serverQueries[0].op as CustomFunctionExpr;
    expect(op.func).toBe(site.customFunctions[0]);
  });

  it.each(["another dependency", "the new version's dependency"])(
    "binds to a removed function still provided by %s",
    (provider) => {
      const { site, oldDep, op } = setup();
      const moved = mkFunc("queried");
      const lib = new ProjectDependency({
        name: "Other",
        pkgId: "other-pkg-id",
        projectId: "other-project-id",
        version: "1.0.0",
        uuid: mkShortId(),
        site: createSite({ customFunctions: [moved, mkFunc("inCode")] }),
      });
      const newDep = mkDep("2.0.0", []);
      if (provider === "another dependency") {
        site.projectDependencies = [...site.projectDependencies, lib];
      } else {
        newDep.site.projectDependencies = [lib];
      }
      upgradeProjectDeps(site, [{ oldDep, newDep }]);
      expect(site.customFunctions).toEqual([]);
      expect(op.func).toBe(moved);
    },
  );

  it("rebinds handlers in param defaults", () => {
    const { site, oldDep, page, op } = setup();
    page.serverQueries = [];
    const handler = new EventHandler({ interactions: [] });
    handler.interactions = [
      new Interaction({
        uuid: mkShortId(),
        interactionName: "Call function",
        actionName: "customFunctionOp",
        conditionalMode: "always",
        condExpr: null,
        parent: handler,
        args: [new NameArg({ name: "customFunctionOp", expr: op })],
      }),
    ];
    page.params = [
      mkParam({
        name: "onAction",
        type: typeFactory.func(),
        paramType: "prop",
        defaultExpr: handler,
      }),
    ];
    upgradeProjectDeps(site, [{ oldDep, newDep: mkDep("2.0.0", []) }]);
    expect(op.func).toBe(site.customFunctions[0]);
  });

  it("does not copy functions the new version still has", () => {
    const { site, oldDep, op } = setup();
    const kept = mkFunc("queried");
    const newDep = mkDep("2.0.0", [kept, mkFunc("inCode")]);
    upgradeProjectDeps(site, [{ oldDep, newDep }]);
    expect(op.func).toBe(kept);
    expect(site.customFunctions).toEqual([]);
  });
});

describe("getDependenciesWithReferencedCss", () => {
  const mkDep = (name: string, site: Site): ProjectDependency =>
    new ProjectDependency({
      name,
      pkgId: `${name}-pkg`,
      projectId: `${name}-project`,
      version: "0.0.1",
      uuid: `${name}-uuid`,
      site,
    });

  const mkToken = (name: string, uuid: string, value: string): StyleToken =>
    new StyleToken({
      name,
      type: "Color",
      uuid,
      value,
      variantedValues: [],
      isRegistered: false,
      regKey: null,
    });

  test("includes deps whose tokens the project CSS references, excludes the rest", () => {
    const depToken = mkToken("DepColor", "dep-color", "#fff");
    const usedDep = mkDep("UsedDep", createSite({ styleTokens: [depToken] }));
    const unusedDep = mkDep(
      "UnusedDep",
      createSite({ styleTokens: [mkToken("Other", "other", "#000")] }),
    );

    // A local token references the used dep's token.
    const localToken = mkToken("Local", "local", mkTokenRef(depToken));

    const site = createSite({
      projectDependencies: [usedDep, unusedDep],
      styleTokens: [localToken],
    });

    expect(
      getDependenciesWithReferencedCss(site, []).map((d) => d.name),
    ).toEqual(["UsedDep"]);
  });

  test("returns no deps when nothing references them", () => {
    const dep = mkDep(
      "Dep",
      createSite({ styleTokens: [mkToken("DepColor", "dep-color", "#fff")] }),
    );
    const site = createSite({
      projectDependencies: [dep],
      styleTokens: [mkToken("Local", "local", "#000")],
    });

    expect(getDependenciesWithReferencedCss(site, [])).toEqual([]);
  });

  test("includes deps referenced by the site's token overrides", () => {
    const depToken = mkToken("DepColor", "dep-color", "#fff");
    const dep = mkDep("Dep", createSite({ styleTokens: [depToken] }));

    const localToken = mkToken("Local", "local", "#000");
    const site = createSite({
      projectDependencies: [dep],
      styleTokens: [localToken],
      styleTokenOverrides: [
        new StyleTokenOverride({
          token: localToken,
          value: mkTokenRef(depToken),
          variantedValues: [],
        }),
      ],
    });

    expect(
      getDependenciesWithReferencedCss(site, []).map((d) => d.name),
    ).toEqual(["Dep"]);
  });

  test("follows transitive references through a reachable dependency's own CSS", () => {
    const depBToken = mkToken("BColor", "b-color", "#abc");
    const depB = mkDep("DepB", createSite({ styleTokens: [depBToken] }));

    // depA depends on depB; one of depA's own tokens references depB's token.
    const depAUsedToken = mkToken("AColor", "a-color", "#def");
    const depAChainToken = mkToken("AChain", "a-chain", mkTokenRef(depBToken));
    const depA = mkDep(
      "DepA",
      createSite({
        projectDependencies: [depB],
        styleTokens: [depAUsedToken, depAChainToken],
      }),
    );

    // The site references only depA's non-chain token; depB is reachable only
    // through depA's own CSS.
    const localToken = mkToken("Local", "local", mkTokenRef(depAUsedToken));
    const site = createSite({
      projectDependencies: [depA],
      styleTokens: [localToken],
    });

    expect(
      getDependenciesWithReferencedCss(site, [])
        .map((d) => d.name)
        .sort(),
    ).toEqual(["DepA", "DepB"]);
  });
});
