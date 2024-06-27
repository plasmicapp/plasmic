import { walkDependencyTree } from "@/wab/shared/core/project-deps";
import { mkScreenVariantGroup } from "@/wab/shared/SpecialVariants";
import { mkBaseVariant } from "@/wab/shared/Variants";
import {
  ProjectDependency,
  Site,
  SiteParams,
} from "@/wab/shared/model/classes";
import { createDefaultTheme } from "@/wab/shared/core/sites";

describe("walkDependencyTree", () => {
  function createSite(params: Partial<SiteParams> = {}) {
    const defaultTheme = createDefaultTheme();
    const screenGroup = mkScreenVariantGroup();

    // These params don't matter in the below test
    const defaultSiteParams = {
      projectDependencies: [],
      componentArenas: [],
      pageArenas: [],
      components: [],
      arenas: [],
      globalVariant: mkBaseVariant(),
      styleTokens: [],
      mixins: [],
      themes: [defaultTheme],
      activeTheme: defaultTheme,
      globalVariantGroups: [screenGroup],
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
