import { OperationResult } from "@/wab/client/operations/common";
import { upsertAnimationSequences } from "@/wab/client/operations/html-to-tpl";
import { processKeyframesRule } from "@/wab/client/web-importer/html-parser";
import { AnimationSequence, Site } from "@/wab/shared/model/classes";
import { Atrule, parse as cssParse, walk } from "css-tree";

export type UpsertAnimationResult = OperationResult<{
  animation: AnimationSequence;
}>;

/**
 * Upsert an animation from a CSS `@keyframes` block.
 * The animation's name comes from the `@keyframes` identifier. If an
 * animation with that name already exists, its keyframes are replaced
 * in place
 */
export function upsertAnimation(opts: {
  site: Site;
  keyframesRule: string;
}): UpsertAnimationResult {
  const { site, keyframesRule } = opts;

  let parsedCssVal;
  try {
    parsedCssVal = cssParse(keyframesRule);
  } catch (e: unknown) {
    return {
      result: "error",
      message: `Failed to parse provided CSS`,
    };
  }

  let keyframesAtrule: Atrule | null = null;
  walk(parsedCssVal, (node) => {
    if (
      !keyframesAtrule &&
      node.type === "Atrule" &&
      node.name === "keyframes"
    ) {
      keyframesAtrule = node;
    }
  });

  if (!keyframesAtrule) {
    return {
      result: "error",
      message: "No `@keyframes` rule found in the provided CSS.",
    };
  }

  const wiSequence = processKeyframesRule(keyframesAtrule);
  if (!wiSequence) {
    return {
      result: "error",
      message: "Failed to parse the `@keyframes` rule.",
    };
  }

  if (!wiSequence.name.trim()) {
    return {
      result: "error",
      message:
        "The @keyframes rule is missing an identifier. Expected @keyframes <name> { ... }.",
    };
  }

  if (wiSequence.keyframes.length === 0) {
    return {
      result: "error",
      message:
        "The `@keyframes` rule has no valid keyframe selectors. Use `from`, `to`, or `N%` selectors.",
    };
  }

  const [animation] = upsertAnimationSequences([wiSequence], {
    site,
  });

  return { result: "success", animation };
}
