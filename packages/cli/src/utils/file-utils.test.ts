import { describe, expect, it } from "vitest";
import {
  defaultPlasmicJson,
  project1Config,
} from "../actions/__testonly__/fixtures";
import { ComponentConfig, PlasmicContext } from "./config-utils";
import { assertAllPathsInRootDir, defaultPagePath } from "./file-utils";

describe("defaultPagePath", () => {
  it("does nothing for react", () => {
    expect(
      defaultPagePath({ config: { platform: "react" } }, "/index.tsx")
    ).toBe("/index.tsx");
    expect(
      defaultPagePath({ config: { platform: "react" } }, "/nested/index.tsx")
    ).toBe("/nested/index.tsx");
  });
  it("handles gatsby pagesDir", () => {
    expect(
      defaultPagePath(
        {
          config: {
            platform: "gatsby",
            gatsbyConfig: { pagesDir: "../pages" },
          },
        },
        "/index.tsx"
      )
    ).toBe("../pages/index.tsx");
    expect(
      defaultPagePath(
        {
          config: {
            platform: "gatsby",
            gatsbyConfig: { pagesDir: "../pages" },
          },
        },
        "/nested/index.tsx"
      )
    ).toBe("../pages/nested/index.tsx");
  });
  it("handles nextjs pagesDir", () => {
    expect(
      defaultPagePath(
        {
          config: {
            platform: "nextjs",
            nextjsConfig: { pagesDir: "../pages" },
          },
        },
        "/index.jsx"
      )
    ).toBe("../pages/index.jsx");
    expect(
      defaultPagePath(
        {
          config: {
            platform: "nextjs",
            nextjsConfig: { pagesDir: "../pages" },
          },
        },
        "/index.tsx"
      )
    ).toBe("../pages/index.tsx");
    expect(
      defaultPagePath(
        {
          config: {
            platform: "nextjs",
            nextjsConfig: { pagesDir: "../pages" },
          },
        },
        "/nested/index.tsx"
      )
    ).toBe("../pages/nested/index.tsx");
  });
  it("handles nextjs pagesDir using app/ directory ", () => {
    expect(
      defaultPagePath(
        {
          config: { platform: "nextjs", nextjsConfig: { pagesDir: "../app" } },
        },
        "/index.jsx"
      )
    ).toBe("../app/page.jsx");
    expect(
      defaultPagePath(
        {
          config: { platform: "nextjs", nextjsConfig: { pagesDir: "../app" } },
        },
        "/index.tsx"
      )
    ).toBe("../app/page.tsx");
    expect(
      defaultPagePath(
        {
          config: { platform: "nextjs", nextjsConfig: { pagesDir: "../app" } },
        },
        "/nested/index.tsx"
      )
    ).toBe("../app/nested/page.tsx");
    expect(
      defaultPagePath(
        {
          config: { platform: "nextjs", nextjsConfig: { pagesDir: "../app" } },
        },
        "/not-index.tsx"
      )
    ).toBe("../app/not-index/page.tsx");
  });
  it("handles tanstack pagesDir", () => {
    expect(
      defaultPagePath(
        {
          config: {
            platform: "tanstack",
            tanstackConfig: { pagesDir: "../routes" },
          },
        },
        "/index.tsx"
      )
    ).toBe("../routes/index.tsx");
    expect(
      defaultPagePath(
        {
          config: {
            platform: "tanstack",
            tanstackConfig: { pagesDir: "../routes" },
          },
        },
        "/nested/index.tsx"
      )
    ).toBe("../routes/nested/index.tsx");

    expect(
      defaultPagePath(
        {
          config: {
            platform: "tanstack",
            tanstackConfig: { pagesDir: "../routes" },
          },
        },
        "/post.tsx"
      )
    ).toBe("../routes/post/index.tsx");
    expect(
      defaultPagePath(
        {
          config: {
            platform: "tanstack",
            tanstackConfig: { pagesDir: "../routes" },
          },
        },
        "/post/[postId].tsx"
      )
    ).toBe("../routes/post/$postId/index.tsx");
  });
});

describe("assertAllPathsInRootDir", () => {
  const insideRsc = {
    serverModulePath: "plasmic/PlasmicHomepageServer.tsx",
    clientModulePath: "../app/page-client.tsx",
  };
  const makeContext = (rsc: ComponentConfig["rsc"]) =>
    ({
      rootDir: "/repo",
      absoluteSrcDir: "/repo/src",
      config: {
        ...defaultPlasmicJson,
        projects: [
          {
            ...project1Config,
            components: [{ ...project1Config.components[0], rsc }],
          },
        ],
      },
    } as unknown as PlasmicContext);

  it("accepts RSC paths inside the root dir", () => {
    expect(() => assertAllPathsInRootDir(makeContext(insideRsc))).not.toThrow();
  });

  it.each(["serverModulePath", "clientModulePath"] as const)(
    "rejects rsc.%s outside the root dir",
    (key) => {
      const rsc = { ...insideRsc, [key]: "../../outside/file.tsx" };
      expect(() => assertAllPathsInRootDir(makeContext(rsc))).toThrow(
        /outside\/file\.tsx.*outside of \/repo/
      );
    }
  );
});
