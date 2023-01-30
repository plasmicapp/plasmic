import * as fs from "fs";
import * as inquirer from "inquirer";
import * as path from "path";
import yargs from "yargs";
import { spawnOrFail } from "./src/utils/cmd-utils";
import { PlatformType, SchemeType } from "./src/utils/types";

// https://studio.plasmic.app/projects/47tFXWjN2C4NyHFGGpaYQ3
const projectId = "47tFXWjN2C4NyHFGGpaYQ3";

interface ArgSet {
  platform: PlatformType;
  appDir?: boolean;
  scheme: SchemeType;
  typescript: boolean;
}

async function run() {
  const allArgSets: ArgSet[] = [];
  [false, true].forEach((typescript) => {
    (["loader", "codegen"] as const).forEach((scheme) => {
      allArgSets.push({
        platform: "nextjs",
        appDir: false,
        scheme,
        typescript,
      });
      allArgSets.push({
        platform: "gatsby",
        scheme,
        typescript,
      });
      allArgSets.push({
        platform: "react",
        scheme,
        typescript,
      });
    });

    allArgSets.push({
      platform: "nextjs",
      appDir: true,
      scheme: "loader", // TODO: support codegen with appDir
      typescript,
    });
  });
  const allArgSetNames = allArgSets.map(getProjectName).sort();

  let yargsCommand = yargs.command(
    "$0 [arg-sets..]",
    `Runs create-plasmic-app with predefined sets of args for you.

Valid arg sets:\n\tall\n\t${allArgSetNames.join("\n\t")}`,
    (yargs) => yargs
  );

  const cliArgSetNames = yargsCommand.strict().argv["arg-sets"] as
    | string[]
    | undefined;

  // If arg sets were not passed in via CLI args, prompt for them.
  const selectedArgSetNames =
    cliArgSetNames && cliArgSetNames.length > 0
      ? cliArgSetNames
      : ((
          await inquirer.prompt({
            name: "arg-sets",
            type: "checkbox",
            message: "Select arg sets:",
            choices: allArgSetNames,
            pageSize: allArgSetNames.length,
            validate: (input) => {
              if (input.length === 0) {
                return "Please select at least 1 arg set.";
              }
              return true;
            },
          })
        )["arg-sets"] as string[]);

  let selectedArgSets: ArgSet[];
  if (selectedArgSetNames.includes("all")) {
    selectedArgSets = allArgSets;
  } else {
    const allArgSetMap = new Map(
      allArgSets.map((argSet) => [getProjectName(argSet), argSet])
    );
    selectedArgSets = selectedArgSetNames.map((name) => {
      const argSet = allArgSetMap.get(name);
      if (argSet) {
        return argSet;
      } else {
        console.error(`Invalid arg set: ${name}`);
        process.exit(1);
      }
    });
  }

  // we use /tmp to avoid plasmic CLI thinking we are in a TypeScript project all the time
  // if everything succeeds, we move it back to this directory
  const tmpOutDir = "/tmp/cpa-out";
  const finalOutDir = path.resolve("cpa-out");

  // delete existing projects
  fs.rmSync(tmpOutDir, { recursive: true, force: true });

  // run create-plasmic-app and build
  for (const argSet of selectedArgSets) {
    const projectName = getProjectName(argSet);

    const options = [
      `--platform=${argSet.platform}`,
      `--appDir=${argSet.appDir}`,
      `--scheme=${argSet.scheme}`,
      `--typescript=${argSet.typescript}`,
      `--projectId=${projectId}`,
    ].join(" ");

    const cpa = path.resolve("dist/index.js");
    // this probably only works on *nix systems, sorry :(
    const cmd = `mkdir -p ${tmpOutDir} && cd ${tmpOutDir} && node ${cpa} ${projectName} ${options} && cd ${projectName} && yarn build`;
    await spawnOrFail(cmd);

    const tmpProjectDir = path.join(tmpOutDir, projectName);
    const finalProjectDir = path.join(finalOutDir, projectName);

    // delete any git repos
    fs.rmSync(path.join(tmpProjectDir, ".git"), {
      recursive: true,
      force: true,
    });

    // move back to create-plasmic-app directory
    fs.rmSync(finalProjectDir, { recursive: true, force: true });
    fs.renameSync(tmpProjectDir, finalProjectDir);
  }
}
run().catch((e) => {
  console.error(e);
  process.exit(1);
});

function getProjectName(argSet: ArgSet) {
  const projectNameInputs = [
    argSet.platform,
    argSet.appDir === undefined ? undefined : argSet.appDir ? "app" : "pages",
    argSet.scheme,
    argSet.typescript ? "ts" : "js",
  ];
  return projectNameInputs.filter((input) => !!input).join("-");
}
