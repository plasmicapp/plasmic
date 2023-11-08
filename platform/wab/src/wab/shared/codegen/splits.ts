import {
  isKnownGlobalVariantSplitContent,
  RandomSplitSlice,
  SegmentSplitSlice,
  Split,
  SplitContent,
} from "@/wab/classes";
import { SplitStatus, SplitType } from "@/wab/splits";
import { sumBy } from "lodash";
import { toClassName, toVarName } from "./util";

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

function serializeSplit(split: Split, projectId: string) {
  switch (split.splitType) {
    case SplitType.Experiment: {
      const slices = split.slices as RandomSplitSlice[];
      const slicesSum = sumBy(slices, "prob");

      const serializedSplit: ExperimentSplit = {
        id: split.uuid,
        projectId,
        externalId: split.externalId,
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
        id: split.uuid,
        projectId,
        externalId: split.externalId,
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
        id: split.uuid,
        projectId,
        externalId: split.externalId,
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

export function exportActiveSplitsConfig(splits: Split[], projectId: string) {
  return splits
    .filter((split) => split.status === SplitStatus.Running)
    .map((s) => serializeSplit(s, projectId));
}
