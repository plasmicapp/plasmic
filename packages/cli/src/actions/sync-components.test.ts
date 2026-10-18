import fs from "fs";
import path from "upath";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { addMockProject, getMockProject } from "../__mocks__/api";
import { logger } from "../deps";
import { mkFixImportContext, replaceImports } from "../utils/code-utils";
import { getContext } from "../utils/get-context";
import { ensure } from "../utils/lang-utils";
import {
  opts,
  standardTestSetup,
  standardTestTeardown,
  tmpRepo,
} from "./__testonly__/fixtures";
import { sync } from "./sync";

vi.mock("../api");

beforeEach(() => standardTestSetup(false));
afterEach(() => {
  vi.restoreAllMocks();
  standardTestTeardown();
});

test.each(["Button.tsx", "custom/MyButton.tsx"])(
  "keeps plain imports working when a component at %s is renamed",
  async (wrapperPath) => {
    const warn = vi.spyOn(logger, "warn");
    opts.projects = ["projectId1"];
    await sync(opts);
    const config = tmpRepo.readPlasmicJson();
    const button = ensure(
      config.projects[0].components.find((c) => c.id === "buttonId"),
      "Button was synced",
    );
    tmpRepo.deleteFile(path.join("src", button.importSpec.modulePath));
    button.importSpec.modulePath = wrapperPath;
    tmpRepo.writePlasmicJson(config);
    fs.mkdirSync(
      tmpRepo.resolveFile(path.join("src", path.dirname(wrapperPath))),
      {
        recursive: true,
      },
    );
    const renderImport = path.relative(
      path.dirname(wrapperPath),
      button.renderModuleFilePath.replace(/\.tsx$/, ""),
    );
    tmpRepo.writeFile(
      path.join("src", wrapperPath),
      `import { PlasmicButton, DefaultButtonProps } from "${renderImport.startsWith(".") ? renderImport : `./${renderImport}`}";
export const clicks = 1;
export default function Button(props: DefaultButtonProps) {
  return <PlasmicButton {...props} />;
}`,
    );
    const consumer = `import Button from "./${wrapperPath.replace(/\.tsx$/, "")}";
export default function Consumer() { return <Button />; }
`;
    // Cover both another user-owned wrapper and ordinary application code.
    for (const file of ["src/Container.tsx", "src/App.tsx"]) {
      tmpRepo.writeFile(file, consumer);
    }

    const project = ensure(getMockProject("projectId1", "main", "1.2.3"));
    ensure(project.components.find((c) => c.id === "buttonId")).name =
      "NewButton";
    project.version = "2.0.0";
    addMockProject(project);
    await sync(opts);

    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining(
        `Component "Button" was renamed to "NewButton", but its wrapper is still at "${wrapperPath}"`,
      ),
    );
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining(
        "update this component's importSpec.modulePath in plasmic.json",
      ),
    );
    const renamed = ensure(
      tmpRepo
        .readPlasmicJson()
        .projects[0].components.find((c) => c.id === "buttonId"),
    );
    expect(renamed.importSpec.modulePath).toBe(wrapperPath);
    const wrapper = tmpRepo.readFile(path.join("src", wrapperPath));
    expect(wrapper).toContain(
      renderImport.replace("PlasmicButton", "PlasmicNewButton"),
    );
    expect(wrapper).toContain(
      "export default function Button(props: DefaultButtonProps)",
    );
    expect(wrapper).toContain("<PlasmicButton {...props} />");
    expect(wrapper).toContain("export const clicks = 1;");
    expect(
      tmpRepo.checkFile(path.join("src", renamed.renderModuleFilePath)),
    ).toBe(true);
    expect(
      tmpRepo.checkFile(
        path.join("src", path.dirname(wrapperPath), "NewButton.tsx"),
      ),
    ).toBe(false);
    for (const file of ["src/Container.tsx", "src/App.tsx"]) {
      expect(tmpRepo.readFile(file)).toBe(consumer);
    }
  },
);

test("updates a relocated stylesheet import when a component is renamed", async () => {
  opts.projects = ["projectId1"];
  await sync(opts);
  const config = tmpRepo.readPlasmicJson();
  const button = ensure(
    config.projects[0].components.find((c) => c.id === "buttonId"),
    "Button was synced",
  );
  const css = tmpRepo.readFile(path.join("src", button.cssFilePath));
  tmpRepo.deleteFile(path.join("src", button.cssFilePath));
  button.cssFilePath = "styles/PlasmicButton.css";
  tmpRepo.writePlasmicJson(config);
  fs.mkdirSync(tmpRepo.resolveFile("src/styles"), { recursive: true });
  tmpRepo.writeFile("src/styles/PlasmicButton.css", css);
  tmpRepo.writeFile(
    path.join("src", button.importSpec.modulePath),
    `import "./styles/PlasmicButton.css";
export default function Button() { return null; }`,
  );

  const project = ensure(getMockProject("projectId1", "main", "1.2.3"));
  ensure(project.components.find((c) => c.id === "buttonId")).name =
    "NewButton";
  project.version = "2.0.0";
  addMockProject(project);
  await sync(opts);

  const renamed = ensure(
    tmpRepo
      .readPlasmicJson()
      .projects[0].components.find((c) => c.id === "buttonId"),
  );
  expect(renamed.cssFilePath).toBe("styles/PlasmicNewButton.css");
  expect(tmpRepo.checkFile("src/styles/PlasmicButton.css")).toBe(false);
  expect(
    tmpRepo.readFile(path.join("src", renamed.importSpec.modulePath)),
  ).toContain(`import "./styles/PlasmicNewButton.css";`);
});

test.each([
  ["Button", "Button"],
  ["CustomButton", "CustomButton"],
  ["ClientButton", "ClientButton"],
  ["PlasmicButton__Wrapper", "PlasmicButton__Wrapper"],
  [undefined, undefined],
])(
  "preserves the carried wrapper's export contract: %s",
  async (exportName, expectedExportName) => {
    opts.projects = ["projectId1"];
    await sync(opts);

    const config = tmpRepo.readPlasmicJson();
    const button = ensure(
      config.projects[0].components.find((c) => c.id === "buttonId"),
      "Button was synced",
    );
    button.importSpec.exportName = exportName;
    tmpRepo.writePlasmicJson(config);
    tmpRepo.writeFile(
      path.join("src", button.importSpec.modulePath),
      `export ${exportName ? "" : "default "}function ${exportName ?? "Button"}() { return null; }`,
    );

    const project = ensure(
      getMockProject("projectId1", "main", "1.2.3"),
      "Project exists on the mock server",
    );
    ensure(
      project.components.find((c) => c.id === "buttonId"),
      "Button exists on the mock server",
    ).name = "NewButton";
    project.version = "2.0.0";
    addMockProject(project);
    await sync(opts);

    const context = await getContext(opts);
    const renamed = ensure(
      context.config.projects[0].components.find((c) => c.id === "buttonId"),
      "Renamed Button was synced",
    );
    expect(renamed.importSpec.exportName).toBe(expectedExportName);
    expect(
      tmpRepo.readFile(path.join("src", renamed.importSpec.modulePath)),
    ).toContain(
      `export ${expectedExportName ? "" : "default "}function ${expectedExportName ?? "Button"}(`,
    );

    const consumer = await replaceImports(
      context,
      'import NewButton from "./Button"; // plasmic-import: buttonId/component',
      "Consumer.tsx",
      mkFixImportContext(context.config),
      false,
    );
    expect(consumer).toContain(
      expectedExportName
        ? `import { ${expectedExportName} as NewButton } from "./Button"`
        : 'import NewButton from "./Button"',
    );
  },
);

test.each([true, false])(
  "rejects a new component at a renamed wrapper's path (same sync: %s)",
  async (sameSync) => {
    opts.projects = ["projectId1"];
    await sync(opts);
    const project = ensure(getMockProject("projectId1", "main", "1.2.3"));
    ensure(project.components.find((c) => c.id === "buttonId")).name =
      "NewButton";
    project.version = "2.0.0";
    if (!sameSync) {
      addMockProject(project);
      await sync(opts);
      project.version = "3.0.0";
    }
    project.components.push({ id: "newButtonId", name: "Button" });
    addMockProject(project);
    tmpRepo.writeFile("src/Button.tsx", "export const edited = 1;");
    const config = tmpRepo.readPlasmicJson();

    await expect(sync(opts)).rejects.toThrow(
      "Cannot sync Button: its wrapper Button.tsx already belongs to NewButton.",
    );
    expect(tmpRepo.readFile("src/Button.tsx")).toBe("export const edited = 1;");
    expect(tmpRepo.readPlasmicJson()).toEqual(config);
  },
);

test("updates other wrappers that import a renamed component's modules", async () => {
  opts.projects = ["projectId1"];
  await sync(opts);
  const button = ensure(
    tmpRepo
      .readPlasmicJson()
      .projects[0].components.find((c) => c.id === "buttonId"),
  );
  const renderImport = `./${button.renderModuleFilePath.replace(/\.tsx$/, "")}`;
  tmpRepo.writeFile(
    "src/Container.tsx",
    `import { DefaultButtonProps } from "${renderImport}";
import { PlasmicButtonGroup } from "./plasmic/PlasmicButtonGroup";
export default function Container(props: DefaultButtonProps) {
  return <PlasmicButtonGroup {...props} />;
}
`,
  );

  const project = ensure(getMockProject("projectId1", "main", "1.2.3"));
  ensure(project.components.find((c) => c.id === "buttonId")).name =
    "NewButton";
  project.version = "2.0.0";
  addMockProject(project);
  await sync(opts);

  const container = tmpRepo.readFile("src/Container.tsx");
  expect(container).toContain(
    `import { DefaultNewButtonProps as DefaultButtonProps } from "${renderImport.replace("PlasmicButton", "PlasmicNewButton")}";`,
  );
  expect(container).toContain(
    "export default function Container(props: DefaultButtonProps)",
  );
  expect(container).toContain('from "./plasmic/PlasmicButtonGroup"');
});

test("keeps another project's same-named component imports", async () => {
  opts.projects = ["projectId1"];
  await sync(opts);
  const config = tmpRepo.readPlasmicJson();
  const button = ensure(
    config.projects[0].components.find((c) => c.id === "buttonId"),
  );
  const wrapper = path.join("src", button.importSpec.modulePath);
  tmpRepo.writeFile("src/Button1.tsx", tmpRepo.readFile(wrapper));
  tmpRepo.deleteFile(wrapper);
  button.importSpec.modulePath = "Button1.tsx";
  tmpRepo.writePlasmicJson(config);
  addMockProject({
    projectId: "projectId2",
    branchName: "main",
    projectApiToken: "ghi",
    version: "1.0.0",
    projectName: "project2",
    components: [{ id: "button2Id", name: "Button" }],
    dependencies: {},
  });
  opts.projects = ["projectId2"];
  await sync(opts);
  const button2 = ensure(
    tmpRepo
      .readPlasmicJson()
      .projects.find((p) => p.projectId === "projectId2")
      ?.components.find((c) => c.id === "button2Id"),
  );
  const otherButton = `import { DefaultButtonProps, PlasmicButton } from "./${button2.renderModuleFilePath.replace(/\.tsx$/, "")}";
export default function Button(props: DefaultButtonProps) {
  return <PlasmicButton {...props} />;
}
`;
  tmpRepo.writeFile("src/Button.tsx", otherButton);
  const mixedWrapper = `import { PlasmicButton as First } from "./${button.renderModuleFilePath.replace(/\.tsx$/, "")}";
import * as Render from "./${button.renderModuleFilePath.replace(/\.tsx$/, "")}";
import { PlasmicButton, DefaultButtonProps } from "./${button2.renderModuleFilePath.replace(/\.tsx$/, "")}";
export default function Container(props: DefaultButtonProps) {
  return <First><Render.PlasmicButton /><PlasmicButton {...props} /></First>;
}
`;
  tmpRepo.writeFile("src/Container.tsx", mixedWrapper);
  tmpRepo.writeFile("src/Button1.tsx", mixedWrapper);

  const project = ensure(getMockProject("projectId1", "main", "1.2.3"));
  ensure(project.components.find((c) => c.id === "buttonId")).name =
    "NewButton";
  project.version = "2.0.0";
  addMockProject(project);
  opts.projects = ["projectId1"];
  await sync(opts);

  expect(tmpRepo.readFile("src/Button.tsx")).toBe(otherButton);
  for (const file of ["src/Container.tsx", "src/Button1.tsx"]) {
    const result = tmpRepo.readFile(file);
    expect(result).toContain("PlasmicNewButton as First");
    expect(result).toContain("<Render.PlasmicNewButton />");
    expect(result).toContain("<PlasmicButton {...props} />");
    expect(result).toContain("props: DefaultButtonProps");
    expect(result).toContain(
      `from "./${button2.renderModuleFilePath.replace(/\.tsx$/, "")}"`,
    );
  }
});

test("rejects another project's new component at a retained wrapper path", async () => {
  opts.projects = ["projectId1"];
  await sync(opts);
  const project = ensure(getMockProject("projectId1", "main", "1.2.3"));
  ensure(project.components.find((c) => c.id === "buttonId")).name =
    "NewButton";
  project.version = "2.0.0";
  addMockProject(project);
  await sync(opts);
  const config = tmpRepo.readPlasmicJson();
  const wrapper = tmpRepo.readFile("src/Button.tsx");
  addMockProject({
    projectId: "projectId2",
    branchName: "main",
    projectApiToken: "ghi",
    version: "1.0.0",
    projectName: "project2",
    components: [{ id: "button2Id", name: "Button" }],
    dependencies: {},
  });
  opts.projects = ["projectId2"];
  await expect(sync(opts)).rejects.toThrow("already belongs to NewButton");
  expect(tmpRepo.readFile("src/Button.tsx")).toBe(wrapper);
  expect(tmpRepo.readPlasmicJson()).toEqual(config);
});
