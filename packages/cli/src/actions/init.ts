import chalk from "chalk";
import inquirer from "inquirer";
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
import { ensure, ensureString } from "../utils/lang-utils";
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
  enableSkipAuth?: boolean;
  reactRuntime?: "classic" | "automatic";
}

export async function initPlasmic(
  opts: InitArgs & { enableSkipAuth?: boolean }
) {
  if (!opts.baseDir) opts.baseDir = process.cwd();
  await getOrStartAuth(opts);

  const configFile =
    opts.config || findConfigFile(opts.baseDir, { traverseParents: false });
  if (configFile && existsBuffered(configFile)) {
    logger.error(
      "You already have a plasmic.json file! Please either delete or edit it directly."
    );
    return;
  }

  // path to plasmic.json
  const newConfigFile =
    opts.config || path.join(opts.baseDir, CONFIG_FILE_NAME);

  const answers = await deriveInitAnswers(opts);
  await writeConfig(newConfigFile, createInitConfig(answers), opts.baseDir);

  if (!process.env.QUIET) {
    logger.info("Successfully created plasmic.json.\n");
  }

  const answer = await confirmWithUser(
    "@plasmicapp/react-web is a small runtime required by Plasmic-generated code.\n  Do you want to add it now?",
    opts.yes
  );
  if (answer) {
    installUpgrade("@plasmicapp/react-web", opts.baseDir);
  }
}

function createInitConfig(opts: Omit<InitArgs, "baseDir">): PlasmicConfig {
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
      ...(opts.reactRuntime && { reactRuntime: opts.reactRuntime }),
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
  [T in keyof Omit<InitArgs, "baseDir">]?:
    | string
    | ((srcDir: string) => string);
} & {
  alwaysDerived: (keyof Omit<InitArgs, "baseDir">)[];
};

/**
 * A simpler subset of the DistinctQuestion interface that we actually use.
 */
interface SimpleQuestion {
  name: string;
  message: string;
  type?: "list";
  choices?: () => { name: string; value: string }[];
}

/**
 * Pretty-print the question along with the default answer, as if that was the choice
 * being made. Don't actually interactively prompt for a response.
 */
function simulatePrompt(
  question: SimpleQuestion,
  defaultAnswer: string | boolean | undefined,
  bold = false
) {
  const message = question.message.endsWith(">")
    ? question.message
    : question.message + ">";
  process.stdout.write((bold ? chalk.bold(message) : message) + " ");
  logger.info(
    chalk.cyan(
      question.choices?.().find((choice) => choice.value === defaultAnswer)
        ?.name ?? defaultAnswer
    )
  );
}

async function deriveInitAnswers(
  opts: Partial<InitArgs> & { baseDir: string }
) {
  const plasmicRootDir = opts.config ? path.dirname(opts.config) : opts.baseDir;

  const platform = !!opts.platform
    ? opts.platform
    : detectNextJs()
    ? "nextjs"
    : detectGatsby()
    ? "gatsby"
    : "react";
  const isCra = detectCreateReactApp();
  const isNext = platform === "nextjs";
  const isGatsby = platform === "gatsby";
  const isGeneric = !isCra && !isNext && !isGatsby;
  const isTypescript = detectTypescript();

  if (isNext) {
    logger.info("Detected Next.js...");
  } else if (isGatsby) {
    logger.info("Detected Gatsby...");
  } else if (isCra) {
    logger.info("Detected create-react-app...");
  }

  // Platform-specific defaults that take precedent
  const deriver = isNext
    ? getNextDefaults(plasmicRootDir)
    : isGatsby
    ? getGatsbyDefaults(plasmicRootDir)
    : isCra
    ? getCraDefaults(plasmicRootDir)
    : getGenericDefaults(plasmicRootDir);
  const srcDir = ensureString(deriver.srcDir);

  const getDefaultAnswer = (
    name: keyof Omit<InitArgs, "baseDir">,
    defaultAnswer?: string
  ) => {
    // Try to get the user CLI arg override first
    if (opts[name]) {
      return opts[name];
    } else if (deriver[name]) {
      // Then get the platform-specific default
      if (L.isFunction(deriver[name])) {
        const fn = deriver[name] as (s: string) => string;
        return fn(srcDir);
      }
      return deriver[name];
    } else {
      // Other specified default
      return defaultAnswer;
    }
  };

  // Start with a complete set of defaults. Some of these are not worth displaying.
  const answers: Omit<InitArgs, "baseDir"> = {
    host: getDefaultAnswer("host", "") as any,
    platform,
    codeLang: getDefaultAnswer("codeLang", isTypescript ? "ts" : "js") as any,
    codeScheme: getDefaultAnswer(
      "codeScheme",
      DEFAULT_CONFIG.code.scheme
    ) as any,
    styleScheme: getDefaultAnswer(
      "styleScheme",
      DEFAULT_CONFIG.style.scheme
    ) as any,
    imagesScheme: getDefaultAnswer(
      "imagesScheme",
      DEFAULT_CONFIG.images.scheme
    ) as any,
    imagesPublicDir: getDefaultAnswer(
      "imagesPublicDir",
      ensure(DEFAULT_PUBLIC_FILES_CONFIG.publicDir)
    ) as any,
    imagesPublicUrlPrefix: getDefaultAnswer(
      "imagesPublicUrlPrefix",
      ensure(DEFAULT_PUBLIC_FILES_CONFIG.publicUrlPrefix)
    ) as any,
    srcDir: getDefaultAnswer("srcDir", DEFAULT_CONFIG.srcDir) as any,
    plasmicDir: getDefaultAnswer(
      "plasmicDir",
      DEFAULT_CONFIG.defaultPlasmicDir
    ) as any,
    pagesDir: getDefaultAnswer("pagesDir", undefined) as any,
    reactRuntime: getDefaultAnswer("reactRuntime", "classic") as any,
  };
  const prominentAnswers = L.omit(answers, "codeScheme");

  if (process.env.QUIET) {
    return answers;
  }

  logger.info(
    chalk.bold(
      "Plasmic Express Setup -- Here are the default settings we recommend:\n"
    )
  );

  await performAsks(true);

  // Allow a user to short-circuit
  const useExpressQuestion: SimpleQuestion = {
    name: "continue",
    message: `Would you like to accept these defaults?`,
    type: "list",
    choices: () => [
      {
        value: "yes",
        name: "Accept these defaults",
      },
      {
        value: "no",
        name: "Customize the choices",
      },
    ],
  };
  logger.info("");

  if (opts.yes) {
    simulatePrompt(useExpressQuestion, "yes", true);
    return answers;
  } else {
    const useExpress = await inquirer.prompt([useExpressQuestion]);
    if (useExpress.continue === "yes") {
      return answers;
    }
  }

  /**
   * @param express When true, we pretty-print the question along with the default answer, as if that was the choice
   * being made. This is for displaying the default choices in the express setup.
   */
  async function performAsks(express: boolean) {
    // Proceed with platform-specific prompts
    async function maybePrompt(question: SimpleQuestion) {
      const name = ensure(question.name) as keyof Omit<InitArgs, "baseDir">;
      const message = ensure(question.message) as string;
      if (opts[name]) {
        logger.info(message + answers[name] + "(specified in CLI arg)");
      } else if (express) {
        const defaultAnswer = answers[name];
        simulatePrompt(question, defaultAnswer);
      } else if (!opts.yes && !deriver.alwaysDerived.includes(name)) {
        const ans = await inquirer.prompt({
          ...question,
          default: answers[name],
        });
        // Not sure why TS complains here without this cast.
        (answers as any)[name] = ans[name];
      }
      // Other questions are silently skipped
    }

    await maybePrompt({
      name: "srcDir",
      message: `${getInitArgsQuestion("srcDir")}\n>`,
    });

    await maybePrompt({
      name: "plasmicDir",
      message: `${getInitArgsQuestion("plasmicDir")} (This is relative to "${
        answers.srcDir
      }")\n>`,
    });

    if (isPageAwarePlatform(platform)) {
      await maybePrompt({
        name: "pagesDir",
        message: `${getInitArgsQuestion("pagesDir")} (This is relative to "${
          answers.srcDir
        }")\n>`,
      });
    }

    await maybePrompt({
      name: "codeLang",
      message: `${getInitArgsQuestion("codeLang")}\n`,
      type: "list",
      choices: () => [
        {
          name: `Typescript${isTypescript ? " (tsconfig.json detected)" : ""}`,
          value: "ts",
        },
        {
          name: `Javascript${
            !isTypescript ? " (no tsconfig.json detected)" : ""
          }`,
          value: "js",
        },
      ],
    });

    await maybePrompt({
      name: "styleScheme",
      message: `${getInitArgsQuestion("styleScheme")}\n`,
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
    });

    await maybePrompt({
      name: "imagesScheme",
      message: `${getInitArgsQuestion("imagesScheme")}\n`,
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
    });

    if (answers.imagesScheme === "public-files") {
      await maybePrompt({
        name: "imagesPublicDir",
        message: `${getInitArgsQuestion(
          "imagesPublicDir"
        )} (This is relative to "${answers.srcDir}")\n>`,
      });

      await maybePrompt({
        name: "imagesPublicUrlPrefix",
        message: `${getInitArgsQuestion("imagesPublicUrlPrefix")} ${
          isNext ? `(for Next.js, this is usually "/")` : ""
        }\n>`,
      });
    }
  }

  await performAsks(false);

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

/**
 * Consolidating where we are specifying the descriptions of InitArgs
 */
const INIT_ARGS_DESCRIPTION: {
  [T in keyof Omit<InitArgs, "baseDir">]: {
    shortDescription: string;
    longDescription?: string;
    question?: string;
    choices?: string[];
  };
} = {
  host: {
    shortDescription: "Plasmic host to use",
  },
  platform: {
    shortDescription: "Target platform",
    longDescription: "Target platform to generate code for",
    choices: ["react", "nextjs", "gatsby"],
  },
  codeLang: {
    shortDescription: "Target language",
    longDescription: "Target language to generate code for",
    question: `What target language should Plasmic generate code in?`,
    choices: ["js", "ts"],
  },
  codeScheme: {
    shortDescription: "Code generation scheme",
    longDescription: "Code generation scheme to use",
    choices: ["blackbox", "direct"],
  },
  styleScheme: {
    shortDescription: "Styling framework",
    longDescription: "Styling framework to use",
    question: "How should we generate css for Plasmic components?",
    choices: ["css", "css-modules"],
  },
  imagesScheme: {
    shortDescription: "Image scheme",
    longDescription: "How to reference used image files",
    question: "How should we reference image files used in Plasmic components?",
    choices: ["inlined", "files", "public-files"],
  },
  imagesPublicDir: {
    shortDescription: "Directory of public static files",
    longDescription: "Default directory to put public static files",
    question: "What directory should static image files be put into?",
  },
  imagesPublicUrlPrefix: {
    shortDescription: "URL prefix for static files",
    longDescription: "URL prefix from which the app will serve static files",
    question:
      "What's the URL prefix from which the app will serve static files?",
  },
  srcDir: {
    shortDescription: "Source directory",
    longDescription:
      "Default directory to put React component files (that you edit) into",
    question:
      "What directory should React component files (that you edit) be put into?",
  },
  plasmicDir: {
    shortDescription: "Plasmic-managed directory",
    longDescription:
      "Default directory to put Plasmic-managed files into; relative to src-dir",
    question:
      "What directory should Plasmic-managed files (that you should not edit) be put into?",
  },
  pagesDir: {
    shortDescription: "Pages directory",
    longDescription: "Default directory to put page files (that you edit) into",
    question: "What directory should pages be put into?",
  },
};

/**
 * Get the short description, which exists for all args
 * @param key
 * @returns
 */
export function getInitArgsShortDescription(
  key: keyof Omit<InitArgs, "baseDir">
) {
  return INIT_ARGS_DESCRIPTION[key]?.shortDescription;
}

/**
 * Try to get a long description, falling back to the short description
 * @param key
 * @returns
 */
export function getInitArgsLongDescription(
  key: keyof Omit<InitArgs, "baseDir">
) {
  return (
    INIT_ARGS_DESCRIPTION[key]?.longDescription ??
    INIT_ARGS_DESCRIPTION[key]?.shortDescription
  );
}

/**
 * Try to get a question form, falling back to the description
 * @param key
 * @returns
 */
export function getInitArgsQuestion(key: keyof Omit<InitArgs, "baseDir">) {
  return (
    INIT_ARGS_DESCRIPTION[key]?.question ??
    INIT_ARGS_DESCRIPTION[key]?.longDescription ??
    INIT_ARGS_DESCRIPTION[key]?.shortDescription
  );
}

/**
 * Get the possible choices for an arg
 * @param key
 * @returns
 */
export function getInitArgsChoices(key: keyof Omit<InitArgs, "baseDir">) {
  return INIT_ARGS_DESCRIPTION[key]?.choices;
}

/**
 * Get a `opt` object for use with the `yargs` library.
 * If no choices are specified, assume it's freeform string input
 * All options use "" as the default, unless overridden
 * @param key
 * @param defaultOverride
 * @returns
 */
export function getYargsOption(
  key: keyof Omit<InitArgs, "baseDir">,
  defaultOverride?: string
) {
  const arg = ensure(INIT_ARGS_DESCRIPTION[key]);
  return !arg.choices
    ? {
        describe: ensure(getInitArgsLongDescription(key)),
        string: true,
        default: defaultOverride ?? "",
      }
    : {
        describe: ensure(getInitArgsLongDescription(key)),
        choices: ["", ...ensure(getInitArgsChoices(key))],
        default: defaultOverride ?? "",
      };
}
