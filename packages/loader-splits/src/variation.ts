import { Split } from '@plasmicapp/loader-fetcher';
import jsonLogic from 'json-logic-js';

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
        if (
          jsonLogic.apply(split.slices[i].cond, {
            time: new Date().toISOString(),
            ...opts.traits,
          })
        ) {
          chosenSlice = split.slices[i];
        }
      }
    }

    if (chosenSlice) {
      variation[key] = chosenSlice.id;
      if (split.externalId && chosenSlice.externalId) {
        variation[`ext.${split.externalId}`] = chosenSlice.externalId;
      }
      if (split.type === 'experiment') {
        updateKnownValue(key, chosenSlice.id);
      }
    }
  });

  return variation;
}
