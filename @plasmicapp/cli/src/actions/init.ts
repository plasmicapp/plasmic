import inquirer from "inquirer";
import os from "os";
import path from "upath";
import { v4 as uuidv4 } from "uuid";
import { CommonArgs } from "..";
import { logger } from "../deps";
import {
  AUTH_FILE_NAME,
  CONFIG_FILE_NAME,
  DEFAULT_CONFIG,
  DEFAULT_PUBLIC_FILES_CONFIG,
  fillDefaults,
  findAuthFile,
  findConfigFile,
  PlasmicConfig,
  writeAuth,
  writeConfig,
} from "../utils/config-utils";
import { existsBuffered } from "../utils/file-utils";
import {
  getCliVersion,
  getParsedPackageJson,
  installUpgrade,
} from "../utils/npm-utils";
import { pollAuthToken } from "../utils/poll-token";

export interface InitArgs extends CommonArgs {
  host: string;
  platform: "" | "react" | "nextjs" | "gatsby";
  codeLang: "" | "ts" | "js";
  codeScheme: "" | "blackbox" | "direct";
  styleScheme: "" | "css" | "css-modules";
  imagesScheme: "" | "inlined" | "files" | "public-files";
  imagesPublicDir: string;
  imagesPublicUrlPrefix: string;
  srcDir: string;
  plasmicDir: string;
}
export async function initPlasmic(opts: InitArgs) {
  const authFile =
    opts.auth || findAuthFile(process.cwd(), { traverseParents: true });
  let createdAuthFile = false;
  if (!authFile || !existsBuffered(authFile)) {
    const auth = await inquirer.prompt([
      {
        name: "user",
        message: "Your Plasmic user email",
      },
    ]);

    const initToken = uuidv4();
    logger.info(
      `Please log into this link: ${opts.host}/auth/plasmic-init/${initToken}`
    );

    let authToken: string;
    try {
      authToken = await pollAuthToken(opts.host, auth.user, initToken);
    } catch (e) {
      console.error(`Could not get auth token from Plasmic: ${e}`);
      return;
    }

    const newAuthFile = opts.auth || path.join(os.homedir(), AUTH_FILE_NAME);
    writeAuth(newAuthFile, {
      host: opts.host,
      user: auth.user,
      token: authToken,
    });

    logger.info(
      `Successfully created Plasmic credentials file at ${newAuthFile}`
    );
    createdAuthFile = true;
  } else {
    logger.info(`Using existing Plasmic credentials at ${authFile}`);
  }

  const configFile =
    opts.config || findConfigFile(process.cwd(), { traverseParents: false });
  if (configFile && existsBuffered(configFile)) {
    if (createdAuthFile) {
      // This is the case when `init` is not running for the first time (possibly triggered by other command),
      // but the auth file couldn't be found (e.g. if the user accidentally removed it).
      logger.info(`Using existing plasmic.json file at ${configFile}`);
    } else {
      logger.error(
        "You already have a plasmic.json file!  Please either delete or edit it directly."
      );
    }
    return;
  }

  const langDetect = existsBuffered("tsconfig.json")
    ? {
        lang: "ts",
        explanation: "tsconfig.json detected, guessing Typescript",
      }
    : {
        lang: "js",
        explanation: "No tsconfig.json detected, guessing Javascript",
      };

  const platformDetect =
    existsBuffered("next.config.js") ||
    existsBuffered(".next") ||
    existsBuffered("next-env.d.ts") ||
    (() => {
      try {
        const packageJsonContent = getParsedPackageJson();
        return packageJsonContent.scripts.build === "next build";
      } catch {
        return false;
      }
    })()
      ? {
          platform: "nextjs",
          explanation: "Next.js detected",
        }
      : existsBuffered("gatsby-config.js")
      ? {
          platform: "gatsby",
          explanation: "Gatsby detected",
        }
      : {};

  const reactOpt = {
    name: "React",
    value: "react",
  };

  const nextjsOpt = {
    name: "Next.js",
    value: "nextjs",
  };

  const gatsbyOpt = {
    name: "Gatsby",
    value: "gatsby",
  };

  const jsOpt = {
    name: "Javascript",
    value: "js",
    short: "js",
  };

  const tsOpt = {
    name: "Typescript",
    value: "ts",
    short: "ts",
  };

  const blackboxOpt = {
    name:
      "Blackbox Library: gives you a lib of presentational components that take prop overrides.",
    value: "blackbox",
    short: "blackbox",
  };

  const directOpt = {
    name:
      "Direct Edit: gives you components whose JSX trees you can directly edit to attach props.",
    value: "direct",
  };

  const plainCssOpt = {
    name: `Plain CSS stylesheets, imported as "import './plasmic.css'"`,
    value: "css",
  };

  const cssModuleOpt = {
    name: `CSS modules, imported as "import sty from './plasmic.module.css'"`,
    value: "css-modules",
  };

  const inlinedImagesOpt = {
    name: `Inlined as base64-encoded data URIs`,
    value: "inlined",
  };

  const filesImagesOpt = {
    name: `Imported as files, like "import img from './image.png'". Not all bundlers support this.`,
    value: "files",
  };

  const publicFilesImagesOpt = {
    name: `Images stored in a public folder, referenced like <img src="/static/image.png"/>`,
    value: "public-files",
  };

  const answers = await inquirer.prompt([
    {
      name: "platform",
      message: `What platform should code generation target? ${
        platformDetect.platform ? `(${platformDetect.explanation})` : ""
      }\n>`,
      type: "list",
      choices: [reactOpt, nextjsOpt, gatsbyOpt],
      default: platformDetect.platform || DEFAULT_CONFIG.platform,
      when: () => !opts.platform,
    },
    {
      name: "srcDir",
      message:
        "What directory should React component files (that you edit) be put into?\n>",
      default:
        platformDetect.platform === "nextjs"
          ? "./components"
          : DEFAULT_CONFIG.srcDir,
      when: () => !opts.srcDir,
    },
    {
      name: "plasmicDir",
      message: (ans: any) =>
        `What directory should Plasmic-managed files be put into?
  (This is relative to ${ans.srcDir || DEFAULT_CONFIG.srcDir})
>`,
      default: DEFAULT_CONFIG.defaultPlasmicDir,
      when: () => !opts.plasmicDir,
    },
    {
      name: "codeLang",
      message: `What target language should Plasmic generate code in?
  (${langDetect.explanation})
>`,
      type: "list",
      choices: () =>
        langDetect.lang === "js" ? [jsOpt, tsOpt] : [tsOpt, jsOpt],
      when: () => !opts.codeLang,
    },
    {
      name: "codeScheme",
      message: `Which codegen scheme should Plasmic use by default?
  - We generally recommend Blackbox for new users.
  - See https://plasmic.app/learn/codegen-overview for examples.
  - You can choose schemes for individual components.
>`,
      type: "list",
      choices: () => [blackboxOpt, directOpt],
      when: () => !opts.codeScheme,
    },
    {
      name: "styleScheme",
      message: `How should we generate css for Plasmic components?`,
      type: "list",
      choices: () => [cssModuleOpt, plainCssOpt],
      when: () => !opts.styleScheme,
    },
    {
      name: "imagesScheme",
      message: `How should we reference image files used in Plasmic components? ${
        platformDetect.platform === "nextjs"
          ? `\n  (${platformDetect.explanation}, guessing Public folder)`
          : ""
      }\n>`,
      type: "list",
      choices: () => [inlinedImagesOpt, filesImagesOpt, publicFilesImagesOpt],
      default: () =>
        platformDetect.platform === "nextjs"
          ? publicFilesImagesOpt.value
          : inlinedImagesOpt.value,
      when: () => !opts.imagesScheme,
    },
    {
      name: "imagesPublicDir",
      message: (ans: any) =>
        `What directory should static image files be put into?
  (This is relative to ${ans.srcDir || DEFAULT_CONFIG.srcDir})
>`,
      default: DEFAULT_PUBLIC_FILES_CONFIG.publicDir,
      when: (ans: any) =>
        !opts.imagesPublicDir &&
        (opts.imagesScheme || ans.imagesScheme) === publicFilesImagesOpt.value,
    },
    {
      name: "imagesPublicUrlPrefix",
      message: `What's the URL prefix from which the app will serve static files?\n>`,
      default: (ans: any) =>
        platformDetect.platform === "nextjs" &&
        path.join(
          opts.srcDir || ans.srcDir,
          opts.imagesPublicDir || ans.imagesPublicDir
        ) === path.normalize("./public")
          ? "/"
          : DEFAULT_PUBLIC_FILES_CONFIG.publicUrlPrefix,
      when: (ans: any) =>
        !opts.imagesPublicUrlPrefix &&
        (opts.imagesScheme || ans.imagesScheme) === publicFilesImagesOpt.value,
    },
  ]);

  const merged = { ...opts, ...answers };
  const newConfigFile =
    merged.config || path.join(process.cwd(), CONFIG_FILE_NAME);
  writeConfig(newConfigFile, createInitConfig(merged));
  logger.info("Successfully created plasmic.json.\n");

  const addDep = await inquirer.prompt([
    {
      name: "answer",
      message:
        "@plasmicapp/react-web is a small runtime required by Plasmic-generated code.\n  Do you want to add it now?",
      type: "confirm",
    },
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
      ...(opts.codeLang && { lang: opts.codeLang }),
      ...(opts.codeScheme && { scheme: opts.codeScheme }),
    },
    style: {
      ...(opts.styleScheme && { scheme: opts.styleScheme }),
    },
    images: {
      ...(opts.imagesScheme && { scheme: opts.imagesScheme }),
      ...(opts.imagesScheme && { publicDir: opts.imagesPublicDir }),
      ...(opts.imagesScheme && { publicUrlPrefix: opts.imagesPublicUrlPrefix }),
    },
    ...(opts.platform && { platform: opts.platform }),
    cliVersion: getCliVersion(),
  });
}
