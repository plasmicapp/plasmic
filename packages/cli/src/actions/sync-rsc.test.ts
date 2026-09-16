import fs from "fs";
import path from "path";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  MockComponent,
  addMockProject,
  stringToMockComponent,
} from "../__mocks__/api";
import { getChecksums } from "../utils/checksum";
import { ComponentConfig } from "../utils/config-utils";
import { getContext } from "../utils/get-context";
import { ensure } from "../utils/lang-utils";
import {
  defaultPlasmicJson,
  opts,
  standardTestSetup,
  standardTestTeardown,
  tmpRepo,
} from "./__testonly__/fixtures";
import { sync } from "./sync";

vi.mock("../api");

const SRC_DIR = "src";

const aboutPage: MockComponent = {
  id: "aboutId",
  name: "About",
  path: "/about",
  rsc: true,
};

function setupRscProject(
  lang: "ts" | "js",
  { pagesDir = "../app", extraPages = [] as MockComponent[] } = {},
) {
  setMockPages("/", extraPages);
  tmpRepo.writePlasmicJson({
    ...defaultPlasmicJson,
    platform: "nextjs",
    nextjsConfig: { pagesDir },
    code: { ...defaultPlasmicJson.code, lang },
  });
  opts.projects = ["projectId1"];
}

function setMockPages(homepagePath: string, extraPages: MockComponent[] = []) {
  const homepage: MockComponent = {
    id: "homepageId",
    name: "Homepage",
    path: homepagePath,
    rsc: true,
  };
  addMockProject({
    projectId: "projectId1",
    branchName: "main",
    projectApiToken: "abc",
    version: "1.2.3",
    projectName: "project1",
    components: [homepage, ...extraPages],
    dependencies: {},
  });
}

function componentConfig(id: string): ComponentConfig {
  const components = tmpRepo
    .readPlasmicJson()
    .projects.flatMap((p) => p.components);
  return ensure(components.find((c) => c.id === id));
}

function homepageConfig(): ComponentConfig {
  return componentConfig("homepageId");
}

/** Path relative to the repo root, from a path relative to srcDir. */
function repoPath(srcDirPath: string) {
  return path.join(SRC_DIR, srcDirPath);
}

function readSrc(srcDirPath: string) {
  return tmpRepo.readFile(repoPath(srcDirPath));
}

function existsSrc(srcDirPath: string) {
  return tmpRepo.checkFile(repoPath(srcDirPath));
}

function writeSrc(srcDirPath: string, content: string) {
  // tmpRepo.writeFile does not create parent directories.
  fs.mkdirSync(path.dirname(tmpRepo.resolveFile(repoPath(srcDirPath))), {
    recursive: true,
  });
  tmpRepo.writeFile(repoPath(srcDirPath), content);
}

function moveSrc(from: string, to: string) {
  writeSrc(to, readSrc(from));
  tmpRepo.deleteFile(repoPath(from));
}

beforeEach(() => {
  standardTestSetup(false);
});

afterEach(() => {
  standardTestTeardown();
});

describe("RSC page sync", () => {
  test.each(["ts", "js"] as const)(
    "writes all four page files (%s)",
    async (lang) => {
      const ext = lang === "js" ? "jsx" : "tsx";
      setupRscProject(lang, {
        extraPages: [{ id: "buttonId", name: "Button" }],
      });
      await sync(opts);

      const button = componentConfig("buttonId");
      expect(button.importSpec.modulePath).toBe(`Button.${ext}`);
      expect(path.basename(button.renderModuleFilePath)).toBe(
        `PlasmicButton.${ext}`,
      );
      expect(existsSrc(button.importSpec.modulePath)).toBe(true);
      expect(existsSrc(button.renderModuleFilePath)).toBe(true);
      expect(button.rsc).toBeUndefined();

      const config = homepageConfig();
      expect(config.importSpec.modulePath).toBe(`../app/page.${ext}`);
      expect(config.rsc?.clientModulePath).toBe(`../app/page-client.${ext}`);
      expect(path.basename(ensure(config.rsc?.serverModulePath))).toBe(
        `PlasmicHomepageServer.${ext}`,
      );
      for (const p of [
        config.importSpec.modulePath,
        config.renderModuleFilePath,
        ensure(config.rsc?.serverModulePath),
        ensure(config.rsc?.clientModulePath),
      ]) {
        expect(existsSrc(p)).toBe(true);
      }
    },
  );

  test.each(["ts", "js"] as const)(
    "moves both skeletons when the page path changes, keeping user edits (%s)",
    async (lang) => {
      const ext = lang === "js" ? "jsx" : "tsx";
      setupRscProject(lang);
      await sync(opts);

      writeSrc(`../app/page.${ext}`, "// user page edits");
      writeSrc(`../app/page-client.${ext}`, "// user client edits");

      setMockPages("/about");
      await sync(opts);

      const config = homepageConfig();
      expect(config.importSpec.modulePath).toBe(`../app/about/page.${ext}`);
      expect(config.rsc?.clientModulePath).toBe(
        `../app/about/page-client.${ext}`,
      );
      expect(readSrc(`../app/about/page.${ext}`)).toContain("user page edits");
      expect(readSrc(`../app/about/page-client.${ext}`)).toContain(
        "user client edits",
      );
      expect(existsSrc(`../app/page.${ext}`)).toBe(false);
      expect(existsSrc(`../app/page-client.${ext}`)).toBe(false);
    },
  );

  test("recreates a deleted client skeleton", async () => {
    setupRscProject("ts");
    await sync(opts);
    const clientModulePath = ensure(homepageConfig().rsc?.clientModulePath);
    tmpRepo.deleteFile(repoPath(clientModulePath));

    await sync(opts);

    expect(homepageConfig().rsc?.clientModulePath).toBe(clientModulePath);
    expect(stringToMockComponent(readSrc(clientModulePath))?.name).toBe(
      "Homepage",
    );
  });

  test("keeps a moved server render module where the user put it", async () => {
    setupRscProject("ts");
    await sync(opts);
    const defaultPath = ensure(homepageConfig().rsc?.serverModulePath);
    const movedPath = path.join("moved", path.basename(defaultPath));
    moveSrc(defaultPath, movedPath);

    await sync(opts);

    expect(homepageConfig().rsc?.serverModulePath).toBe(movedPath);
    expect(existsSrc(movedPath)).toBe(true);
    expect(existsSrc(defaultPath)).toBe(false);
  });

  test("keeps a client skeleton path the user set in plasmic.json", async () => {
    setupRscProject("ts");
    await sync(opts);
    const defaultPath = ensure(homepageConfig().rsc?.clientModulePath);
    const movedPath = path.join("moved", path.basename(defaultPath));
    moveSrc(defaultPath, movedPath);
    writeSrc(movedPath, "// user client edits");
    const config = tmpRepo.readPlasmicJson();
    ensure(config.projects[0].components[0].rsc).clientModulePath = movedPath;
    tmpRepo.writePlasmicJson(config);

    await sync(opts);

    expect(homepageConfig().rsc?.clientModulePath).toBe(movedPath);
    expect(readSrc(movedPath)).toContain("user client edits");
    expect(existsSrc(defaultPath)).toBe(false);
  });

  test.each(["ts", "js"] as const)(
    "recreates a missing custom client skeleton at its recorded path (%s)",
    async (lang) => {
      setupRscProject(lang);
      await sync(opts);
      const defaultPath = ensure(homepageConfig().rsc?.clientModulePath);
      const customPath = `../custom/home-client.${
        lang === "js" ? "jsx" : "tsx"
      }`;
      moveSrc(defaultPath, customPath);
      const config = tmpRepo.readPlasmicJson();
      ensure(config.projects[0].components[0].rsc).clientModulePath =
        customPath;
      tmpRepo.writePlasmicJson(config);
      tmpRepo.deleteFile(repoPath(customPath));
      const pagePath = homepageConfig().importSpec.modulePath;
      writeSrc(
        pagePath,
        'import Client from "../custom/home-client"; // plasmic-import: homepageId/rscClient\n',
      );

      await sync(opts);

      expect(homepageConfig().rsc?.clientModulePath).toBe(customPath);
      expect(stringToMockComponent(readSrc(customPath))?.name).toBe("Homepage");
      expect(existsSrc(defaultPath)).toBe(false);
      expect(readSrc(pagePath)).toContain('from "../custom/home-client"');

      writeSrc(customPath, "// user client edits after recovery");
      await sync(opts);

      expect(homepageConfig().rsc?.clientModulePath).toBe(customPath);
      expect(readSrc(customPath)).toContain("user client edits after recovery");
      expect(existsSrc(defaultPath)).toBe(false);
      expect(readSrc(pagePath)).toContain('from "../custom/home-client"');
    },
  );

  test("does not adopt another page's client skeleton", async () => {
    // With the app dir inside srcDir, every client skeleton is visible to the
    // moved-file search, and they all share one base name.
    setupRscProject("ts", { pagesDir: "app", extraPages: [aboutPage] });
    await sync(opts);
    const homeClientPath = ensure(homepageConfig().rsc?.clientModulePath);
    const aboutClientPath = ensure(
      componentConfig("aboutId").rsc?.clientModulePath,
    );
    expect(homeClientPath).toBe("app/page-client.tsx");
    expect(aboutClientPath).toBe("app/about/page-client.tsx");
    writeSrc(aboutClientPath, "// about client edits");
    tmpRepo.deleteFile(repoPath(homeClientPath));

    await sync(opts);

    expect(homepageConfig().rsc?.clientModulePath).toBe(homeClientPath);
    expect(componentConfig("aboutId").rsc?.clientModulePath).toBe(
      aboutClientPath,
    );
    expect(stringToMockComponent(readSrc(homeClientPath))?.name).toBe(
      "Homepage",
    );
    expect(readSrc(aboutClientPath)).toContain("about client edits");
  });

  test("does not adopt another project's server render module", async () => {
    setupRscProject("ts");
    addMockProject({
      projectId: "projectId2",
      branchName: "main",
      projectApiToken: "def",
      version: "1.2.3",
      projectName: "project2",
      components: [
        { id: "otherHomepageId", name: "Homepage", path: "/other", rsc: true },
      ],
      dependencies: {},
    });
    opts.projects = ["projectId1", "projectId2"];
    await sync(opts);
    const serverPath = ensure(homepageConfig().rsc?.serverModulePath);
    const otherServerPath = ensure(
      componentConfig("otherHomepageId").rsc?.serverModulePath,
    );
    expect(path.basename(serverPath)).toBe(path.basename(otherServerPath));
    tmpRepo.deleteFile(repoPath(serverPath));

    await sync(opts);

    expect(homepageConfig().rsc?.serverModulePath).toBe(serverPath);
    expect(stringToMockComponent(readSrc(serverPath))?.id).toBe("homepageId");
  });

  test.each(["serverModulePath", "clientModulePath"] as const)(
    "does not send a render checksum when rsc.%s is missing",
    async (key) => {
      setupRscProject("ts");
      await sync(opts);

      const checksumsFor = async () => {
        const context = await getContext(opts);
        return getChecksums(context, opts, "projectId1", ["homepageId"])
          .renderModuleChecksums;
      };
      expect((await checksumsFor()).map(([id]) => id)).toEqual(["homepageId"]);

      tmpRepo.deleteFile(repoPath(ensure(homepageConfig().rsc?.[key])));
      expect(await checksumsFor()).toEqual([]);
    },
  );
});
