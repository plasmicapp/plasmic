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

const PLASMIC_SEED = "plasmic_seed";

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
  useSeedBucketing?: boolean;
  seedRange?: number;
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
    // We will only get the known value for experiments, for segments we will always evaluate the traits
    const knownVal =
      split.type === "experiment" ? getKnownValue?.(key) : undefined;
    if (knownVal) {
      variation[key] = knownVal;
      return;
    }
    const numSlices = split.slices.length;
    let chosenSlice = undefined;
    if (split.type === "experiment") {
      /**
       * If useSeedBucketing is enabled, we will use the seed to bucket the user
       * into a slice. Otherwise, we will use the random value to bucket the user
       * into a slice.
       *
       * By using seed bucketing, we ensure the number of seeds that each slice gets,
       * is proportional to the slice's probability.
       */
      if (opts.useSeedBucketing) {
        const seed = opts.traits[PLASMIC_SEED];
        const buckets: string[] = [];
        const totalBuckets = opts.seedRange ?? 1;
        let avaiableBuckets = totalBuckets;
        for (let i = 0; i < numSlices; i++) {
          const slice = split.slices[i];
          const numBuckets = Math.min(
            Math.floor(slice.prob * totalBuckets),
            avaiableBuckets
          );
          for (let j = 0; j < numBuckets; j++) {
            buckets.push(slice.id);
          }
          avaiableBuckets -= numBuckets;
        }
        if (buckets.length > 0) {
          // We need to stable shuffle the buckets to ensure that the order of the
          // buckets is deterministic.
          const shuffleRand = getSeededRandomFunction(split.id);
          for (let i = 0; i < buckets.length; i++) {
            const j = Math.floor(shuffleRand() * (i + 1));
            [buckets[i], buckets[j]] = [buckets[j], buckets[i]];
          }
          // We use the seed to bucket the user into a slice.
          const sliceIdx = +(seed ?? "0") % buckets.length;
          chosenSlice = split.slices.find((s) => s.id === buckets[sliceIdx]);
        } else {
          chosenSlice = split.slices[numSlices - 1];
        }
      } else {
        let p = getRandomValue(split.id);
        chosenSlice = split.slices[numSlices - 1];
        for (let i = 0; i < numSlices; i++) {
          if (p - split.slices[i].prob <= 0) {
            chosenSlice = split.slices[i];
            break;
          }
          p -= split.slices[i].prob;
        }
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

interface ExternalIDsFilters {
  projectIds?: string[];
  customFilter?: (split: Split) => boolean;
}

export function getExternalIds(
  splits: Split[],
  variation: Record<string, string>,
  filters?: ExternalIDsFilters
) {
  const externalVariation: Record<string, string> = {};

  function shouldIncludeSplit(split: Split) {
    if (!filters) {
      return true;
    }
    if (filters.projectIds && !filters.projectIds.includes(split.projectId)) {
      return false;
    }
    if (filters.customFilter && !filters.customFilter(split)) {
      return false;
    }
    return true;
  }

  Object.keys(variation).forEach((variationKey) => {
    const [, splitId] = variationKey.split(".");
    const sliceId = variation[variationKey];
    const split = splits.find(
      (s) => s.id === splitId || s.externalId === splitId
    );
    if (split && split.externalId && shouldIncludeSplit(split)) {
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

export interface PickedVariationDescription {
  name: string;
  description?: string;
  pagesPaths: string[];
  type: "original" | "override";
  chosenValue: string;
  externalIdGroup?: string;
  externalIdValue?: string;
}

export function describeVariationForKey(
  splits: Split[],
  key: string,
  value: string
): PickedVariationDescription {
  const [, splitId] = key.split(".");
  const split = splits.find(
    (s) => s.id === splitId || s.externalId === splitId
  );

  if (!split) {
    throw new Error(`Split not found for key "${key}"`);
  }

  const sliceIndex = split.slices.findIndex(
    (s) => s.id === value || s.externalId === value
  );

  if (sliceIndex === -1) {
    throw new Error(`Invalid split value "${value}" for key "${key}"`);
  }

  return {
    name: split.name,
    description: split.description,
    pagesPaths: split.pagesPaths,
    type: sliceIndex === 0 ? "original" : "override",
    chosenValue: value,
    externalIdGroup: split.externalId,
    externalIdValue:
      sliceIndex >= 0 && split.slices[sliceIndex].externalId
        ? split.slices[sliceIndex].externalId
        : undefined,
  };
}

/**
 * Gets a more human-readable description of the variation
 */
export function describeVariation(
  splits: Split[],
  variation: Record<string, string>
): Record<string, PickedVariationDescription> {
  return Object.fromEntries(
    Object.entries(variation).map(([key, value]) => {
      return [key, describeVariationForKey(splits, key, value)];
    })
  );
}
