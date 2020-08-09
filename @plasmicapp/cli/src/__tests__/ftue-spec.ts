jest.mock("../api");
const mockApi = require("../api");
import { sync, SyncArgs } from "../actions/sync";
import { MockComponent } from "../__mocks__/api";
import { TempRepo } from "../utils/test-utils";

let opts: SyncArgs; // Options to pass to sync
let tmpRepo: TempRepo;

// Reset the test project directory
beforeEach(() => {
  // Setup server-side mock data
  const button = {
    id: "buttonId",
    name: "Button",
    projectId: "projectId1",
    version: "1.2.3",
    children: [],
  };
  const container = {
    id: "containerId",
    name: "Container",
    projectId: "projectId1",
    version: "1.2.3",
    children: [button],
  };
  const components: MockComponent[] = [button, container];
  components.forEach((c) => mockApi.setMockComponent(c.id, c));

  // Setup client-side directory
  tmpRepo = new TempRepo();
  tmpRepo.writePlasmicAuth({
    host: "http://localhost:3003",
    user: "yang@plasmic.app",
    token: "faketoken",
  });
  tmpRepo.writePlasmicJson({
    platform: "react",
    code: {
      lang: "ts",
      scheme: "blackbox",
    },
    style: {
      scheme: "css",
      defaultStyleCssFilePath: "",
    },
    tokens: {
      scheme: "theo",
      tokensFilePath: "plasmic-tokens.theo.json",
    },
    srcDir: "src/",
    defaultPlasmicDir: "./plasmic",
    projects: [],
    globalVariants: {
      variantGroups: [],
    },
    cliVersion: "0.1.44",
  });

  // Default opts and config
  opts = {
    projects: [],
    components: [],
    onlyExisting: false,
    forceOverwrite: false,
    appendJsxOnMissingBase: false,
    newComponentScheme: "blackbox",
    nonInteractive: true,
    recursive: false,
    includeDependencies: false,
    config: tmpRepo.plasmicJsonPath(),
    auth: tmpRepo.plasmicAuthPath(),
  };
});

afterEach(() => {
  tmpRepo.destroy();
});

describe("first-time-user-experience", () => {
  test("missing auth", async () => {
    // Trying to sync is going to fail without a valid auth file
    tmpRepo.deletePlasmicAuth();
    await expect(sync(opts)).rejects.toThrow();
  });

  test("no args", async () => {
    // No projects or components specified
    await expect(sync(opts)).rejects.toThrow();
  });

  test("specify project", async () => {
    opts.projects = ["projectId1"];
    await expect(sync(opts)).resolves.toBeUndefined();
    const button = mockApi.stringToMockComponent(
      tmpRepo.getComponentFileContents("projectId1", "buttonId")
    );
    const container = mockApi.stringToMockComponent(
      tmpRepo.getComponentFileContents("projectId1", "containerId")
    );
    // Check correct files exist
    expect(button).toBeTruthy();
    expect(container).toBeTruthy();
    expect(button?.name).toEqual("Button");
    expect(button?.version).toEqual("1.2.3");
    expect(container?.name).toEqual("Container");
    expect(container?.version).toEqual("1.2.3");
    expect(tmpRepo.checkFile("./src/DepComponent.tsx")).toBeFalsy();

    // Check plasmic.json
    const plasmicJson = tmpRepo.readPlasmicJson();
    expect(plasmicJson.projects.length).toEqual(1);
    const projectConfig = plasmicJson.projects[0];
    expect(projectConfig.components.length).toEqual(2);
    const componentNames = projectConfig.components.map((c) => c.name);
    expect(componentNames).toContain("Button");
    expect(componentNames).toContain("Container");
  });

  test("invalid components", async () => {
    opts.projects = ["projectId1"];
    opts.components = ["notRealComponent"];
    await expect(sync(opts)).rejects.toThrow();
  });
});
