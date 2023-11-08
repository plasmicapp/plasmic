import cp from "child_process";
import cypress from "cypress";
import path from "path";
import * as next from "./codebases/next";
import * as utils from "./codebases/utils";

describe("Full sync", () => {
  let dir: utils.TmpDir;
  beforeEach(() => (dir = utils.getTempDir()));
  afterEach(() => dir.removeCallback());
  it("Successfully authenticate and sync a project", async () => {
    const appDir = path.join(dir.name, "myapp");
    const authPath = path.join(dir.name, ".plasmic.auth");
    console.log("Codebase directory:", dir.name);

    await new Promise<void>((resolve, reject) => {
      const authCmd = cp.spawn(
        "npx",
        ["-p", "@plasmicapp/cli", "plasmic", "auth", `--auth=${authPath}`],
        {
          cwd: dir.name,
          env: {
            ...process.env,
            PLASMIC_AUTH_POLL_TIMEOUT: String(120 * 1000),
          },
        }
      );
      authCmd.stdout.on("data", function (data) {
        const output = data.toString();
        const [, link] = output.match(/(https\S*)/) || [];
        console.log("[auth]", output);
        if (link) {
          console.log("[cypress] running on URL:", link);
          cypress
            .run({
              quiet: true,
              spec: "./cypress/integration/auth.spec.ts",
              env: { AUTH_URL: link },
            })
            .then((result: any) => {
              if (result.failures) {
                authCmd.stdout.destroy();
                reject(new Error("Unable to click the authentication link."));
                authCmd.kill();
              }
            })
            .catch(reject);
        }
      });
      authCmd.on("exit", function (code) {
        if (code === 0) {
          resolve();
          return;
        }
        reject(
          new Error(
            `Credentials were not created successfully. Error code: ${code}`
          )
        );
      });
    });

    console.log("Syncing on a new NextJs Codebase with the credentials...");

    await next.initApp(dir.name);
    await utils.syncProject(appDir, authPath);

    await next.copyPage(appDir);
    await utils.buildProject(appDir);
  });
});
