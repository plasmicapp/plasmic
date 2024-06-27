import { withDefault } from "@/wab/shared/common";
import {
  allGlobalVariantsReferencedByComponent,
  isPageComponent,
} from "@/wab/shared/core/components";
import { toClassName, toVarName } from "@/wab/shared/codegen/util";
import {
  isKnownGlobalVariantSplitContent,
  RandomSplitSlice,
  SegmentSplitSlice,
  Site,
  Split,
  SplitContent,
} from "@/wab/shared/model/classes";
import { SplitStatus, SplitType } from "@/wab/shared/core/splits";
import { sumBy, uniq } from "lodash";

interface SerializedGlobalVariantSplitContent {
  type: "global-variant";
  projectId: string;
  groupId: string;
  group: string;
  variant: string;
}

interface SerializedSlice {
  id: string;
  externalId?: string | null;
  contents: SerializedGlobalVariantSplitContent[];
}

interface SerializedExperimentSlice extends SerializedSlice {
  prob: number;
}

interface SerializedSegmentSlice extends SerializedSlice {
  cond: any;
}

export interface ActiveSplit {
  id: string;
  projectId: string;
  name: string;
  // Paths of pages that can be affected by this split
  pagesPaths: string[];
  description?: string | null;
  externalId?: string | null;
}

interface ExperimentSplit extends ActiveSplit {
  type: "experiment";
  slices: SerializedExperimentSlice[];
}

interface SegmentSplit extends ActiveSplit {
  type: "segment";
  slices: SerializedSegmentSlice[];
}

function serializeSplitContent(splitContent: SplitContent, projectId: string) {
  if (isKnownGlobalVariantSplitContent(splitContent)) {
    const serialized: SerializedGlobalVariantSplitContent = {
      type: "global-variant",
      projectId,
      groupId: splitContent.group.uuid,
      group: toClassName(splitContent.group.param.variable.name), // needs capitalize first
      variant: toVarName(splitContent.variant.name), // needs first to not be capitalized
    };
    return serialized;
  }

  throw new Error("Unsupported");
}

function parseSplitCond(str: string, projectId: string) {
  try {
    const obj = JSON.parse(str);
    return obj;
  } catch (e) {
    console.error(
      `[split] Failed to parse condition in projectId=${projectId} ${str} `
    );
    return {};
  }
}

function convertRowsToJsonLogic(obj: any) {
  const logic = obj["__logic"];
  return logic ?? {};
}

function serializeSplit(
  split: Split,
  projectId: string,
  globalVariantsToPathsMap: Record<string, string[]>
) {
  const common: ActiveSplit = {
    id: split.uuid,
    name: split.name,
    projectId,
    externalId: split.externalId,
    description: split.description,
    pagesPaths: uniq(
      split.slices.flatMap((slice) => {
        return slice.contents.flatMap((c) => {
          if (isKnownGlobalVariantSplitContent(c)) {
            return withDefault(globalVariantsToPathsMap, c.variant.uuid, []);
          }
          return [];
        });
      })
    ),
  };

  switch (split.splitType) {
    case SplitType.Experiment: {
      const slices = split.slices as RandomSplitSlice[];
      const slicesSum = sumBy(slices, "prob");

      const serializedSplit: ExperimentSplit = {
        ...common,
        type: "experiment",
        slices: slices.map((slice) => ({
          id: slice.uuid,
          externalId: slice.externalId,
          prob: slice.prob / slicesSum,
          contents: slice.contents.map((c) =>
            serializeSplitContent(c, projectId)
          ),
        })),
      };
      return serializedSplit;
    }
    case SplitType.Segment: {
      const slices = split.slices as SegmentSplitSlice[];
      const serializedSplit: SegmentSplit = {
        ...common,
        type: "segment",
        slices: slices.map((slice) => ({
          id: slice.uuid,
          externalId: slice.externalId,
          cond: convertRowsToJsonLogic(parseSplitCond(slice.cond, projectId)),
          contents: slice.contents.map((c) =>
            serializeSplitContent(c, projectId)
          ),
        })),
      };
      return serializedSplit;
    }
    case SplitType.Schedule: {
      const slices = split.slices as SegmentSplitSlice[];
      const serializedSplit: SegmentSplit = {
        ...common,
        type: "segment",
        slices: slices.map((slice) => ({
          id: slice.uuid,
          externalId: slice.externalId,
          cond: parseSplitCond(slice.cond, projectId),
          contents: slice.contents.map((c) =>
            serializeSplitContent(c, projectId)
          ),
        })),
      };
      return serializedSplit;
    }
    default:
      throw new Error("Unsupported");
  }
}

export function exportActiveSplitsConfig(site: Site, projectId: string) {
  const activeSplits = site.splits.filter(
    (split) => split.status === SplitStatus.Running
  );

  const globalVariantsToPathsMap: Record<string, string[]> = {};

  site.components.forEach((component) => {
    if (isPageComponent(component)) {
      const path = component.pageMeta.path;
      const globalVariants = allGlobalVariantsReferencedByComponent(component);
      globalVariants.forEach((gv) => {
        const paths = withDefault(globalVariantsToPathsMap, gv.uuid, []);
        paths.push(path);
        globalVariantsToPathsMap[gv.uuid] = paths;
      });
    }
  });

  return activeSplits.map((s) =>
    serializeSplit(s, projectId, globalVariantsToPathsMap)
  );
}
