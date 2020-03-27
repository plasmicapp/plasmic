import fs from "fs";
import inquirer from "inquirer";
import path from "path";
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
  writeAuth
} from "../utils/config-utils";

export interface InitArgs extends CommonArgs {
  host: string;
  platform: "react";
  codeLang: "ts";
  codeScheme: "blackbox";
  styleScheme: "css";
  srcDir: string;
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
    const initial = await inquirer.prompt([
      {
        name: "host",
        message: "Host of the Plasmic instance to use",
        default: "http://localhost:3003"
      }
    ]);
    const auth = await inquirer.prompt([
      {
        name: "user",
        message: "Your plasmic user email"
      },
      {
        name: "token",
        message: `Your personal access token (create one at ${initial.host}/self/settings)`
      }
    ]);

    const newAuthFile = opts.auth || path.join(os.homedir(), AUTH_FILE_NAME);
    writeAuth(newAuthFile, {
      host: initial.host,
      user: auth.user,
      token: auth.token
    });

    console.log(
      `Successfully created Plasmic credentials file at ${newAuthFile}`
    );
  } else {
    console.log(`Using existing Plasmic credentials at ${authFile}`);
  }

  const newConfigFile =
    opts.config || path.join(process.cwd(), CONFIG_FILE_NAME);
  writeConfig(newConfigFile, createInitConfig(opts));
  console.log("Successfully created plasmic.json");
}

function createInitConfig(opts: InitArgs): PlasmicConfig {
  return fillDefaults({
    srcDir: opts.srcDir,
    code: {
      lang: opts.codeLang,
      scheme: opts.codeScheme
    },
    style: {
      scheme: opts.styleScheme
    },
    platform: opts.platform
  });
}
