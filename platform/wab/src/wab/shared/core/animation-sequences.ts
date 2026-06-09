import { toVarName } from "@/wab/shared/codegen/util";
import { allAnimationSequences } from "@/wab/shared/core/sites";
import { flattenTpls } from "@/wab/shared/core/tpls";
import {
  AnimationSequence,
  Component,
  Site,
  TplNode,
} from "@/wab/shared/model/classes";

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

/**
 * Collects the AnimationSequences referenced by the given components' RuleSets.
 */
export function extractUsedAnimationSequencesForComponents(
  components: Component[]
): Set<AnimationSequence> {
  const sequences = new Set<AnimationSequence>();
  for (const component of components) {
    for (const tpl of flattenTpls(component.tplTree)) {
      collectUsedAnimationSequencesForTpl(sequences, tpl);
    }
  }
  return sequences;
}

export function collectUsedAnimationSequencesForTpl(
  collector: Set<AnimationSequence>,
  tpl: TplNode
) {
  for (const vs of tpl.vsettings) {
    for (const anim of vs.rs.animations ?? []) {
      collector.add(anim.sequence);
    }
  }
}

export function getAnimationSequenceIdentifier(
  animationSequence: AnimationSequence
) {
  return `${toVarName(animationSequence.name)}-${animationSequence.uuid}`;
}
