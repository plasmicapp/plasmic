import { Split } from '@plasmicapp/loader-fetcher';
import { getActiveVariation as getActiveVariationSplits } from '@plasmicapp/loader-splits';
import { getSeededRandomFunction } from './random';

const DELIMITER = '__pm__';
const PLASMIC_SEED = 'plasmic_seed';
const SEED_RANGE = 16;

type Traits = Record<string, string | number | boolean>;

const getSeed = () => {
  return `${Math.floor(Math.random() * SEED_RANGE)}`;
};

export const rewriteWithoutTraits = (url: string) => {
  const [path, ...traitssArr] = url.split(DELIMITER);
  const traits = traitssArr.reduce((acc, elem) => {
    const [key, value] = elem.split('=');
    return {
      ...acc,
      [key]: value,
    };
  }, {});
  return {
    path:
      path === '/'
        ? path
        : path.endsWith('/')
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
    .join('');
};

export const rewriteWithTraits = (path: string, traits: Traits) => {
  return `${path}${path.endsWith('/') ? '' : '/'}${expandTraits(traits)}`;
};

export const generateAllPaths = (path: string) => {
  const paths = [
    path,
    ...Array(SEED_RANGE)
      .fill(0)
      .map(
        (_, idx) =>
          `${path}${path.endsWith('/') ? '' : '/'}__pm__${PLASMIC_SEED}=${idx}`
      ),
  ];
  return paths;
};

export const getMiddlewareResponse = (opts: {
  path: string;
  traits: Traits;
  cookies: Record<string, string>;
}) => {
  const newCookies: { key: string; value: string }[] = [];
  const seed = opts.cookies[PLASMIC_SEED] || getSeed();
  if (!opts.cookies[PLASMIC_SEED]) {
    newCookies.push({
      key: PLASMIC_SEED,
      value: seed,
    });
  }
  return {
    pathname: rewriteWithTraits(opts.path, {
      [PLASMIC_SEED]: seed,
      ...opts.traits,
    }),
    cookies: newCookies,
  };
};

export const getActiveVariation = (opts: {
  splits: Split[];
  traits: Record<string, string | number | boolean>;
  path: string;
}) => {
  const { splits, traits, path } = opts;
  return getActiveVariationSplits({
    splits,
    traits: {
      pageUrl: path,
      ...traits,
    },
    getKnownValue: () => undefined,
    updateKnownValue: () => null,
    getRandomValue: (key) => {
      const rand = getSeededRandomFunction((traits[PLASMIC_SEED] ?? '') + key);
      return rand();
    },
  });
};
