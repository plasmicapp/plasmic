import { mkTokenRef } from "@/wab/commons/StyleToken";
import { mkVariant } from "@/wab/shared/Variants";
import {
  getDependenciesWithReferencedCss,
  upgradeProjectDeps,
  walkDependencyTree,
} from "@/wab/shared/core/project-deps";
import { createSite } from "@/wab/shared/core/sites";
import {
  ProjectDependency,
  Site,
  StyleToken,
  StyleTokenOverride,
  VariantedValue,
} from "@/wab/shared/model/classes";

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
    oldDepSite.activeScreenVariantGroup!.variants.push(oldVariant);

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
    newDepSite.activeScreenVariantGroup!.variants.push(newVariant);

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
      createSite({ styleTokens: [mkToken("Other", "other", "#000")] })
    );

    // A local token references the used dep's token.
    const localToken = mkToken("Local", "local", mkTokenRef(depToken));

    const site = createSite({
      projectDependencies: [usedDep, unusedDep],
      styleTokens: [localToken],
    });

    expect(
      getDependenciesWithReferencedCss(site, []).map((d) => d.name)
    ).toEqual(["UsedDep"]);
  });

  test("returns no deps when nothing references them", () => {
    const dep = mkDep(
      "Dep",
      createSite({ styleTokens: [mkToken("DepColor", "dep-color", "#fff")] })
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
      getDependenciesWithReferencedCss(site, []).map((d) => d.name)
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
      })
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
        .sort()
    ).toEqual(["DepA", "DepB"]);
  });
});
