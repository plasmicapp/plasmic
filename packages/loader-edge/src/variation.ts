import {
  FetcherOptions,
  PlasmicModulesFetcher,
  Split,
} from '@plasmicapp/loader-fetcher';
import { getActiveVariation, getSplitKey } from '@plasmicapp/loader-splits';

export const DELIMITER = '__pm__';

export const rewriteWithoutVariation = (url: string) => {
  const [path, ...variationsArr] = url.split(DELIMITER);
  const variation = variationsArr.reduce((acc, elem) => {
    const [key, value] = elem.split('=');
    return {
      ...acc,
      [key]: value,
    };
  }, {});
  return {
    path,
    variation,
  };
};

const expandVariation = (variation: Record<string, string>) => {
  const cmp = (a: string, b: string) => {
    const idA = a.split('.')[1];
    const idB = b.split('.')[1];
    return idA < idB ? -1 : idA > idB ? 1 : 0;
  };
  return Object.keys(variation)
    .filter((key) => !key.startsWith('ext')) // remove external variations
    .sort(cmp)
    .map((key) => `${DELIMITER}${key}=${variation[key]}`)
    .join('');
};

export const rewriteWithVariation = (
  url: string,
  variation: Record<string, string>
) => {
  return `${url}${url.endsWith('/') ? '' : '/'}${expandVariation(variation)}`;
};

const generateAllSplitPaths = (splits: Split[]): string[] => {
  if (splits.length === 0) {
    return [''];
  }
  const [curSplit, ...tail] = splits;
  const tailPaths = generateAllSplitPaths(tail);
  const curPaths = [
    '',
    ...(curSplit.slices as Array<{ id: string }>).map((slice) =>
      expandVariation({
        [getSplitKey(curSplit)]: slice.id,
      })
    ),
  ];
  const paths: string[] = [];
  for (let i = 0; i < curPaths.length; i++) {
    for (let j = 0; j < tailPaths.length; j++) {
      paths.push(curPaths[i] + tailPaths[j]);
    }
  }
  return paths;
};

export const generateAllPaths = (path: string, splits: Split[]) => {
  return generateAllSplitPaths(
    splits.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  ).map((meta) => `${path}${path.endsWith('/') ? '' : '/'}${meta}`);
};

export type MiddlewareOptions = Pick<
  FetcherOptions,
  'projects' | 'host' | 'preview'
>;

export const getActiveSplits = async (opts: MiddlewareOptions) => {
  const fetcher = new PlasmicModulesFetcher(opts);
  const all = await fetcher.fetchAllData();
  const splits = all.activeSplits;
  const paths = all.components
    .filter((comp) => comp.isPage && comp.path)
    .map((comp) => comp.path);
  return {
    splits,
    paths,
  };
};

export const getMiddlewareResponse = async ({
  opts,
  cookies,
  traits,
  url,
}: {
  opts: MiddlewareOptions;
  cookies: Record<string, string>;
  traits: Record<string, string>;
  url: string;
}) => {
  const { splits } = await getActiveSplits(opts);

  const newCookies: { key: string; value: string }[] = [];

  const variation = getActiveVariation({
    splits,
    traits,
    getKnownValue: (key) => {
      return cookies[`plasmic:${key}`];
    },
    updateKnownValue: (key, value) => {
      newCookies.push({ key: `plasmic:${key}`, value });
    },
  });

  let newUrl = url;
  if (Object.keys(variation).length) {
    newUrl = rewriteWithVariation(url, variation);
  }

  return {
    url: newUrl,
    cookies: newCookies,
  };
};
