import { AnimationSequence, Site } from "@/wab/shared/model/classes";

/**
 * Collects all unique AnimationSequences used in a Site
 */
export function collectUsedAnimationSequences(site: Site): AnimationSequence[] {
  const usedSequences = new Set<AnimationSequence>();

  // Collect from site-level animation sequences
  if (site.animationSequences) {
    site.animationSequences.forEach((seq) => usedSequences.add(seq));
  }

  // We could add logic here to only include sequences that are actually used
  // by traversing all components and their RuleSets, but for now we include all

  return Array.from(usedSequences);
}
