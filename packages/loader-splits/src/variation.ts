import type {
  ExperimentSlice,
  SegmentSlice,
  Split,
} from "@plasmicapp/loader-fetcher";
import jsonLogic from "json-logic-js";
import { getSeededRandomFunction } from "./random";

const isBrowser =
  typeof window !== "undefined" &&
  window != null &&
  typeof window.document !== "undefined";

export const PLASMIC_SEED = "plasmic_seed";

const BUILTIN_TRAITS_UNKNOWN = {
  pageUrl: "unknown",
};

const getBrowserBuiltinTraits = () => {
  if (!isBrowser) {
    return {};
  }
  return {
    pageUrl: document.location.href,
  };
};

export const getSplitKey = (split: Split) => {
  return `${split.type === "experiment" ? "exp." : "seg."}${split.id}`;
};

export function getActiveVariation(opts: {
  splits: Split[];
  traits: Record<string, string | number | boolean>;
  getKnownValue?: (key: string) => string | undefined;
  updateKnownValue?: (key: string, value: string) => void;
  getRandomValue?: (key: string) => number;
  enableUnseededExperiments?: boolean;
}) {
  const { splits, getKnownValue, updateKnownValue } = opts;
  const getRandomValue = (key: string) => {
    if (opts.getRandomValue) {
      return opts.getRandomValue(key);
    }

    if (opts.traits[PLASMIC_SEED]) {
      const rand = getSeededRandomFunction(
        (opts.traits[PLASMIC_SEED] ?? "") + key
      );
      return rand();
    }

    // If we don't have a seed we won't be able to get a consistent variation
    // in SSR, so we just return 0. Unless if expressly enabled.
    if (!opts.enableUnseededExperiments) {
      return 0;
    }

    return Math.random();
  };
  const variation: Record<string, string> = {};
  splits.forEach((split) => {
    const key = getSplitKey(split);
    const knownVal = getKnownValue?.(key);
    if (knownVal) {
      variation[key] = knownVal;
      return;
    }
    const numSlices = split.slices.length;
    let chosenSlice = undefined;
    if (split.type === "experiment") {
      let p = getRandomValue(split.id);
      chosenSlice = split.slices[numSlices - 1];
      for (let i = 0; i < numSlices; i++) {
        if (p - split.slices[i].prob <= 0) {
          chosenSlice = split.slices[i];
          break;
        }
        p -= split.slices[i].prob;
      }
    } else if (split.type === "segment") {
      for (let i = 0; i < numSlices; i++) {
        if (
          jsonLogic.apply(split.slices[i].cond, {
            time: new Date().toISOString(),
            ...BUILTIN_TRAITS_UNKNOWN,
            ...getBrowserBuiltinTraits(),
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
      if (split.type === "experiment") {
        updateKnownValue?.(key, chosenSlice.id);
      }
    }
  });

  return variation;
}

export function getExternalIds(
  splits: Split[],
  variation: Record<string, string>
) {
  const externalVariation: Record<string, string> = {};
  Object.keys(variation).forEach((variationKey) => {
    const [, splitId] = variationKey.split(".");
    const sliceId = variation[variationKey];
    const split = splits.find(
      (s) => s.id === splitId || s.externalId === splitId
    );
    if (split && split.externalId) {
      const slice = (
        split.slices as Array<ExperimentSlice | SegmentSlice>
      ).find((s) => s.id === sliceId || s.externalId === sliceId);
      if (slice?.externalId) {
        // Save variation without ext prefix
        externalVariation[`${split.externalId}`] = slice.externalId;
      }
    }
  });
  return externalVariation;
}
