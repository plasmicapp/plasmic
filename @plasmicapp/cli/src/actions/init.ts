import fs from "fs";
import inquirer from "inquirer";
import path from "upath";
import os from "os";
import { CommonArgs } from "..";
import {
  findConfigFile,
  findAuthFile,
  AUTH_FILE_NAME,
  CONFIG_FILE_NAME,
  PlasmicConfig,
  fillDefaults,
  writeConfig,
  writeAuth,
  DEFAULT_CONFIG
} from "../utils/config-utils";
import { execSync, spawnSync } from "child_process";
import { installUpgrade, getCliVersion } from "../utils/npm-utils";

export interface InitArgs extends CommonArgs {
  host: string;
  platform: "react";
  codeLang: "ts";
  codeScheme: "blackbox";
  styleScheme: "css";
  srcDir: string;
  plasmicDir: string;
}
export async function initPlasmic(opts: InitArgs) {
  const configFile =
    opts.config || findConfigFile(process.cwd(), { traverseParents: false });
  if (configFile && fs.existsSync(configFile)) {
    console.error(
      "You already have a plasmic.json file!  Please either delete or edit it directly."
    );
    return;
  }

  const authFile =
    opts.auth || findAuthFile(process.cwd(), { traverseParents: true });
  if (!authFile || !fs.existsSync(authFile)) {
    const auth = await inquirer.prompt([
      {
        name: "user",
        message: "Your Plasmic user email"
      },
      {
        name: "token",
        message: `Your personal access token (create one at https://studio.plasmic.app/self/settings)`
      }
    ]);

    const newAuthFile = opts.auth || path.join(os.homedir(), AUTH_FILE_NAME);
    writeAuth(newAuthFile, {
      host: "https://studio.plasmic.app",
      user: auth.user,
      token: auth.token
    });

    console.log(
      `Successfully created Plasmic credentials file at ${newAuthFile}`
    );
  } else {
    console.log(`Using existing Plasmic credentials at ${authFile}`);
  }

  const langDetect = fs.existsSync("tsconfig.json")
    ? {
        lang: "ts",
        explanation: "tsconfig.json detected, guessing Typescript"
      }
    : {
        lang: "js",
        explanation: "No tsconfig.json detected, guessing Javascript"
      };

  const jsOpt = {
    name: "Javascript",
    value: "js",
    short: "js"
  };

  const tsOpt = {
    name: "Typescript",
    value: "ts",
    short: "ts"
  };

  const blackboxOpt = {
    name:
      "Blackbox Library: gives you a lib of presentational components that take prop overrides.",
    value: "blackbox",
    short: "blackbox"
  };

  const directOpt = {
    name:
      "Direct Edit: gives you components whose JSX trees you can directly edit to attach props.",
    value: "direct"
  };

  const answers = await inquirer.prompt([
    {
      name: "srcDir",
      message:
        "What directory should React component files (that you edit) be put into?\n>",
      default: DEFAULT_CONFIG.srcDir,
      when: () => !opts.srcDir
    },
    {
      name: "plasmicDir",
      message: (ans: any) =>
        `What directory should Plasmic-managed files be put into?
  (This is relative to ${ans.srcDir || DEFAULT_CONFIG.srcDir})
>`,
      default: DEFAULT_CONFIG.defaultPlasmicDir,
      when: () => !opts.plasmicDir
    },
    {
      name: "codeLang",
      message: `What target language should Plasmic generate code in?
  (${langDetect.explanation})
>`,
      type: "list",
      choices: () =>
        langDetect.lang === "js" ? [jsOpt, tsOpt] : [tsOpt, jsOpt],
      when: () => !opts.codeLang
    },
    {
      name: "codeScheme",
      message: `Which codegen scheme to use by default?
  - We generally recommend Blackbox for new users.
  - See https://plasmic.app/learn/codegen-schemes for examples.
  - You can choose schemes for individual components.
`,
      type: "list",
      choices: () => [blackboxOpt, directOpt],
      when: () => !opts.codeScheme
    }
  ]);

  const merged = { ...opts, ...answers };
  const newConfigFile =
    merged.config || path.join(process.cwd(), CONFIG_FILE_NAME);
  writeConfig(newConfigFile, createInitConfig(merged));
  console.log("Successfully created plasmic.json.");
  console.log();

  const addDep = await inquirer.prompt([
    {
      name: "answer",
      message:
        "@plasmicapp/react-web is a small runtime required by Plasmic-generated code.\n  Do you want to add it now?",
      type: "confirm"
    }
  ]);
  if (addDep.answer) {
    installUpgrade("@plasmicapp/react-web");
  }
}

function createInitConfig(opts: InitArgs): PlasmicConfig {
  return fillDefaults({
    srcDir: opts.srcDir,
    defaultPlasmicDir: opts.plasmicDir,
    code: {
      lang: opts.codeLang,
      scheme: opts.codeScheme
    },
    style: {
      scheme: opts.styleScheme
    },
    platform: opts.platform,
    cliVersion: getCliVersion()
  });
}
