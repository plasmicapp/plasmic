import { toVarName } from "@/wab/shared/codegen/util";
import { allAnimationSequences } from "@/wab/shared/core/sites";
import { AnimationSequence, Site } from "@/wab/shared/model/classes";

/**
 * Collects all unique AnimationSequences used in a Site
 */
export function collectUsedAnimationSequences(site: Site): AnimationSequence[] {
  const allAnimSequences = allAnimationSequences(site, {
    includeDeps: "direct",
  });

  // We could add logic here to only include sequences that are actually used
  // by traversing all components and their RuleSets, but for now we include all

  return allAnimSequences;
}

export function getAnimationSequenceIdentifier(
  animationSequence: AnimationSequence
) {
  return toVarName(animationSequence.name + animationSequence.uuid);
}
