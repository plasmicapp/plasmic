import inquirer, { DistinctQuestion } from "inquirer";
import L from "lodash";
import path from "upath";
import { CommonArgs } from "..";
import { logger } from "../deps";
import { getOrStartAuth } from "../utils/auth-utils";
import {
  CONFIG_FILE_NAME,
  DEFAULT_CONFIG,
  DEFAULT_PUBLIC_FILES_CONFIG,
  fillDefaults,
  findConfigFile,
  isPageAwarePlatform,
  PlasmicConfig,
  writeConfig,
} from "../utils/config-utils";
import {
  detectCreateReactApp,
  detectGatsby,
  detectNextJs,
  detectTypescript,
} from "../utils/envdetect";
import { existsBuffered } from "../utils/file-utils";
import { ensure } from "../utils/lang-utils";
import {
  findPackageJsonDir,
  getCliVersion,
  installUpgrade,
} from "../utils/npm-utils";
import { confirmWithUser } from "../utils/user-utils";

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
  pagesDir?: string;
}
export async function initPlasmic(opts: InitArgs) {
  await getOrStartAuth(opts);

  const configFile =
    opts.config || findConfigFile(process.cwd(), { traverseParents: false });
  if (configFile && existsBuffered(configFile)) {
    logger.error(
      "You already have a plasmic.json file! Please either delete or edit it directly."
    );
    return;
  }

  // path to plasmic.json
  const newConfigFile =
    opts.config || path.join(process.cwd(), CONFIG_FILE_NAME);

  const answers = await deriveInitAnswers(opts);
  await writeConfig(newConfigFile, createInitConfig(answers));

  logger.info("Successfully created plasmic.json.\n");

  const answer = await confirmWithUser(
    "@plasmicapp/react-web is a small runtime required by Plasmic-generated code.\n  Do you want to add it now?",
    opts.yes
  );
  if (answer) {
    installUpgrade("@plasmicapp/react-web");
  }
}

function createInitConfig(opts: InitArgs): PlasmicConfig {
  return fillDefaults({
    srcDir: opts.srcDir,
    defaultPlasmicDir: opts.plasmicDir,
    ...(opts.platform === "nextjs" && {
      nextjsConfig: {
        pagesDir: opts.pagesDir,
      },
    }),
    ...(opts.platform === "gatsby" && {
      gatsbyConfig: {
        pagesDir: opts.pagesDir,
      },
    }),
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

type DefaultDeriver = {
  [T in keyof InitArgs]?: string | ((srcDir: string) => string);
} & {
  alwaysDerived: (keyof InitArgs)[];
};

async function deriveInitAnswers(opts: Partial<InitArgs>) {
  const plasmicRootDir = opts.config
    ? path.dirname(opts.config)
    : process.cwd();

  let platform = opts.platform;
  if (!platform && detectNextJs()) {
    platform = "nextjs";
  }
  if (!platform && detectGatsby()) {
    platform = "gatsby";
  }
  if (!platform) {
    platform = "react";
  }

  const isCra = detectCreateReactApp();

  const isNext = platform === "nextjs";
  const isGatsby = platform === "gatsby";
  const isGeneric = !isCra && !isNext && !isGatsby;

  if (isNext) {
    console.log("Detected Next.js...");
  } else if (isGatsby) {
    console.log("Detected Gatsby...");
  } else if (isCra) {
    console.log("Detected create-react-app...");
  }

  const deriver = isNext
    ? getNextDefaults(plasmicRootDir)
    : isGatsby
    ? getGatsbyDefaults(plasmicRootDir)
    : isCra
    ? getCraDefaults(plasmicRootDir)
    : getGenericDefaults(plasmicRootDir);

  const answers: Partial<InitArgs> = {
    platform,
  };

  async function maybePrompt(question: DistinctQuestion) {
    const name = ensure(question.name) as keyof InitArgs;
    if (opts[name]) {
      answers[name] = opts[name] as any;
    } else {
      let defaultVal = deriver[name] || question.default;
      if (L.isFunction(defaultVal)) {
        defaultVal = defaultVal(ensure(answers.srcDir));
      }

      if (!opts.yes && !deriver.alwaysDerived.includes(name)) {
        const ans = await inquirer.prompt({ ...question, default: defaultVal });
        answers[name] = ans[name];
      } else {
        answers[name] = ensure(defaultVal);
      }
    }
  }

  await maybePrompt({
    name: "srcDir",
    message:
      "What directory should React component files (that you edit) be put into?\n>",
  });

  await maybePrompt({
    name: "plasmicDir",
    message: `What directory should Plasmic-managed files (that you should not edit) be put into? (This is relative to "${answers.srcDir}")\n>`,
    default: DEFAULT_CONFIG.defaultPlasmicDir,
  });

  if (isPageAwarePlatform(platform)) {
    await maybePrompt({
      name: "pagesDir",
      message: `What directory should pages be put into? (This is relative to "${answers.srcDir}")`,
    });
  }

  const isTypescript = detectTypescript();
  await maybePrompt({
    name: "codeLang",
    message: `What target language should Plasmic generate code in?`,
    type: "list",
    choices: () => [
      {
        name: `Typescript${isTypescript ? " (tsconfig.json detected)" : ""}`,
        value: "ts",
      },
      {
        name: "Javascript",
        value: "js",
      },
    ],
    default: isTypescript ? "ts" : "js",
  });

  await maybePrompt({
    name: "styleScheme",
    message: `How should we generate css for Plasmic components?\n`,
    type: "list",
    choices: () => [
      {
        name: `CSS modules, imported as "import sty from './plasmic.module.css'"`,
        value: "css-modules",
      },
      {
        name: `Plain CSS stylesheets, imported as "import './plasmic.css'"`,
        value: "css",
      },
    ],
    default: "css-modules",
  });

  await maybePrompt({
    name: "imagesScheme",
    message: `How should we reference image files used in Plasmic components?\n`,
    type: "list",
    choices: () => [
      {
        name: `Imported as files, like "import img from './image.png'". ${
          isGeneric ? "Not all bundlers support this." : ""
        }`,
        value: "files",
      },
      {
        name: `Images stored in a public folder, referenced like <img src="/static/image.png"/>`,
        value: "public-files",
      },
      {
        name: `Inlined as base64-encoded data URIs`,
        value: "inlined",
      },
    ],
    default: "inlined",
  });

  if (answers.imagesScheme === "public-files") {
    await maybePrompt({
      name: "imagesPublicDir",
      message: (ans: any) =>
        `What directory should static image files be put into? (This is relative to "${answers.srcDir}")\n`,
      default: DEFAULT_PUBLIC_FILES_CONFIG.publicDir,
    });

    await maybePrompt({
      name: "imagesPublicUrlPrefix",
      message: `What's the URL prefix from which the app will serve static files? ${
        isNext ? `(for Next.js, this is usually "/")` : ""
      }\n>`,
      default: DEFAULT_PUBLIC_FILES_CONFIG.publicUrlPrefix,
    });
  }

  return answers as InitArgs;
}

function getNextDefaults(plasmicRootDir: string): DefaultDeriver {
  const projectRootDir = findPackageJsonDir(plasmicRootDir) ?? plasmicRootDir;
  return {
    srcDir: path.relative(
      plasmicRootDir,
      path.join(projectRootDir, "components")
    ),
    pagesDir: (srcDir: string) =>
      path.relative(
        path.join(plasmicRootDir, srcDir),
        path.join(projectRootDir, "pages")
      ),
    styleScheme: "css-modules",
    imagesScheme: "public-files",
    imagesPublicDir: (srcDir: string) =>
      path.relative(
        path.join(plasmicRootDir, srcDir),
        path.join(projectRootDir, "public")
      ),
    imagesPublicUrlPrefix: "/",
    alwaysDerived: [
      "styleScheme",
      "imagesScheme",
      "imagesPublicDir",
      "pagesDir",
    ],
  };
}

function getGatsbyDefaults(plasmicRootDir: string): DefaultDeriver {
  const projectRootDir = findPackageJsonDir(plasmicRootDir) ?? plasmicRootDir;
  return {
    srcDir: path.relative(
      plasmicRootDir,
      path.join(projectRootDir, "src", "components")
    ),
    pagesDir: (srcDir: string) => {
      const absSrcDir = path.join(plasmicRootDir, srcDir);
      const absPagesDir = path.join(projectRootDir, "src", "pages");
      const relDir = path.relative(absSrcDir, absPagesDir);
      return relDir;
    },
    styleScheme: "css-modules",
    imagesScheme: "files",
    imagesPublicDir: (srcDir: string) =>
      path.relative(
        path.join(plasmicRootDir, srcDir),
        path.join(projectRootDir, "static")
      ),
    imagesPublicUrlPrefix: "/",
    alwaysDerived: ["imagesScheme", "pagesDir"],
  };
}

function getCraDefaults(plasmicRootDir: string): DefaultDeriver {
  const projectRootDir = findPackageJsonDir(plasmicRootDir) ?? plasmicRootDir;
  return {
    srcDir: path.relative(
      plasmicRootDir,
      path.join(projectRootDir, "src", "components")
    ),
    styleScheme: "css-modules",
    imagesScheme: "files",
    imagesPublicDir: (srcDir: string) =>
      path.relative(
        path.join(plasmicRootDir, srcDir),
        path.join(projectRootDir, "public")
      ),
    alwaysDerived: [],
  };
}

function getGenericDefaults(plasmicRootDir: string): DefaultDeriver {
  const projectRootDir = findPackageJsonDir(plasmicRootDir) ?? plasmicRootDir;
  const srcDir = existsBuffered(path.join(projectRootDir, "src"))
    ? path.join(projectRootDir, "src", "components")
    : path.join(projectRootDir, "components");
  return {
    srcDir: path.relative(plasmicRootDir, srcDir),
    alwaysDerived: [],
  };
}
