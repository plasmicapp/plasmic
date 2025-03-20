import type { Split } from "@plasmicapp/loader-fetcher";
import {
  getActiveVariation as getActiveVariationSplits,
  getSeededRandomFunction,
} from "@plasmicapp/loader-splits";

export const DELIMITER = "__pm__";
export const PLASMIC_SEED = "plasmic_seed";
const DEFAULT_PLASMIC_SEED_RANGE = 16;

type Traits = Record<string, string | number | boolean>;

const getSeed = (seedRange: number = DEFAULT_PLASMIC_SEED_RANGE) => {
  return `${Math.floor(Math.random() * seedRange)}`;
};

export const rewriteWithoutTraits = (url: string) => {
  const [path, ...traitssArr] = url.split(DELIMITER);
  const traits = traitssArr.reduce((acc, elem) => {
    const [key, value] = elem.split("=");
    return {
      ...acc,
      [key]: value,
    };
  }, {});
  return {
    path:
      path === "/"
        ? path
        : path.endsWith("/")
        ? path.substring(0, path.length - 1)
        : path,
    traits,
  };
};

const expandTraits = (traits: Traits) => {
  const cmp = (a: string, b: string) => {
    return a < b ? -1 : a > b ? 1 : 0;
  };
  return Object.keys(traits)
    .sort(cmp)
    .map((key) => `${DELIMITER}${key}=${traits[key]}`)
    .join("");
};

export const rewriteWithTraits = (path: string, traits: Traits) => {
  if (Object.keys(traits).length === 0) {
    return path;
  }

  return `${path}${path.endsWith("/") ? "" : "/"}${expandTraits(traits)}`;
};

export const generateAllPaths = (
  path: string,
  seedRange: number = DEFAULT_PLASMIC_SEED_RANGE
) => {
  return generateAllPathsWithTraits(path, {}, seedRange);
};

/**
 * Generates all possible paths with the given traits. Should be used to enable fallback false
 */
export function generateAllPathsWithTraits(
  path: string,
  traitValues: Record<string, string[]> = {},
  seedRange = DEFAULT_PLASMIC_SEED_RANGE
) {
  const traitsCombinations = [{}];
  traitsCombinations.push(
    ...Array(seedRange)
      .fill(0)
      .map((_, idx) => ({
        [PLASMIC_SEED]: idx,
      }))
  );
  for (const [trait, possibleValues] of Object.entries(traitValues)) {
    const newCombinations = [];
    for (const traitValue of possibleValues) {
      for (const combination of traitsCombinations) {
        newCombinations.push({
          ...combination,
          [trait]: traitValue,
        });
      }
    }
    traitsCombinations.push(...newCombinations);
  }
  return traitsCombinations.map((traits) => rewriteWithTraits(path, traits));
}

export const getMiddlewareResponse = (opts: {
  path: string;
  traits: Traits;
  cookies: Record<string, string>;
  seedRange?: number;
}) => {
  const newCookies: { key: string; value: string }[] = [];

  const seedRange = Number.isInteger(opts.seedRange)
    ? opts.seedRange
    : DEFAULT_PLASMIC_SEED_RANGE;
  const seed = opts.cookies[PLASMIC_SEED] || getSeed(seedRange);

  let traits = opts.traits;
  if (seedRange && seedRange > 0) {
    traits = {
      ...traits,
      [PLASMIC_SEED]: seed,
    };

    if (!opts.cookies[PLASMIC_SEED]) {
      newCookies.push({
        key: PLASMIC_SEED,
        value: seed,
      });
    }
  }
  return {
    pathname: rewriteWithTraits(opts.path, traits),
    cookies: newCookies,
  };
};

export const getActiveVariation = (opts: {
  splits: Split[];
  traits: Record<string, string | number | boolean>;
  path: string;
  enableUnseededExperiments?: boolean;
}) => {
  const { splits, traits, path, enableUnseededExperiments } = opts;
  return getActiveVariationSplits({
    splits,
    traits: {
      pageUrl: path,
      ...traits,
    },
    enableUnseededExperiments,
    getKnownValue: () => undefined,
    updateKnownValue: () => null,
    getRandomValue: (key: string) => {
      const rand = getSeededRandomFunction((traits[PLASMIC_SEED] ?? "") + key);
      return rand();
    },
  });
};
