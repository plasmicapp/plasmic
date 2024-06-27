import {
  isKnownGlobalVariantSplitContent,
  Split,
  VariantGroup,
} from "@/wab/shared/model/classes";

export const extractGlobalVariantSplitContent = (split: Split) => {
  const contents = split.slices[1].contents[0];
  if (isKnownGlobalVariantSplitContent(contents)) {
    return contents.group;
  }
  return undefined;
};
export const findMatchingSplitToGroup = (
  splits: Split[],
  group: VariantGroup
) => {
  return splits.find((split) => {
    const extracted = extractGlobalVariantSplitContent(split);
    return extracted && extracted === group;
  });
};
