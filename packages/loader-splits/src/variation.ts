import { Split } from '@plasmicapp/loader-fetcher';

type MatchOp = 'eq' | 'lt' | 'lte' | 'gt' | 'gte';

function isMatching(
  cond: Record<MatchOp, string | number>,
  value: string | number
) {
  let numMatches = 0;
  Object.keys(cond).forEach((op) => {
    switch (op) {
      case 'eq': {
        numMatches += Number(value === cond[op]);
        break;
      }
      case 'lt': {
        numMatches += Number(value < cond[op]);
        break;
      }
      case 'lte': {
        numMatches += Number(value <= cond[op]);
        break;
      }
      case 'gt': {
        numMatches += Number(value > cond[op]);
        break;
      }
      case 'gte': {
        numMatches += Number(value >= cond[op]);
        break;
      }
      default: {
        throw new Error('Unknown match value');
      }
    }
  });

  return numMatches === Object.keys(cond).length;
}

const matchesPattern = (
  pattern: Record<string, any>,
  traits: Record<string, string | number>
) => {
  let matches = 0;
  Object.keys(pattern).forEach((attr) => {
    matches += Number(isMatching(pattern[attr], traits[attr]));
  });
  return matches === Object.keys(pattern).length;
};

export const getSplitKey = (split: Split) => {
  return `${split.type === 'experiment' ? 'exp.' : 'seg.'}${split.id}`;
};

export function getActiveVariation(opts: {
  splits: Split[];
  traits: Record<string, string | number>;
  getKnownValue: (key: string) => string | undefined;
  updateKnownValue: (key: string, value: string) => void;
}) {
  const { splits, getKnownValue, updateKnownValue } = opts;
  const variation: Record<string, string> = {};
  splits.forEach((split) => {
    const key = getSplitKey(split);
    const knownVal = getKnownValue(key);
    if (knownVal) {
      variation[key] = knownVal;
      return;
    }
    const numSlices = split.slices.length;
    let chosenSlice = undefined;
    if (split.type === 'experiment') {
      let p = Math.random();
      chosenSlice = split.slices[numSlices - 1];
      for (let i = 0; i < numSlices; i++) {
        if (p - split.slices[i].prob <= 0) {
          chosenSlice = split.slices[i];
          break;
        }
        p -= split.slices[i].prob;
      }
    } else if (split.type === 'segment') {
      for (let i = 0; i < numSlices; i++) {
        if (matchesPattern(split.slices[i].cond, opts.traits)) {
          chosenSlice = split.slices[i];
        }
      }
    }

    if (chosenSlice) {
      variation[key] = chosenSlice.id;
      if (split.externalId && chosenSlice.externalId) {
        variation[`ext.${split.externalId}`] = chosenSlice.externalId;
      }
      updateKnownValue(key, chosenSlice.id);
    }
  });

  return variation;
}
