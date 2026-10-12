import { toVarName } from "@/wab/shared/codegen/util";
import { flattenTpls } from "@/wab/shared/core/tpls";
import {
  AnimationSequence,
  Component,
  TplNode,
} from "@/wab/shared/model/classes";

/**
 * Collects the AnimationSequences referenced by the given components' RuleSets.
 */
export function extractUsedAnimationSequencesForComponents(
  components: Component[],
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
  tpl: TplNode,
) {
  for (const vs of tpl.vsettings) {
    for (const anim of vs.rs.animations ?? []) {
      collector.add(anim.sequence);
    }
  }
}

export function getAnimationSequenceIdentifier(
  animationSequence: AnimationSequence,
) {
  return `${toVarName(animationSequence.name)}-${animationSequence.uuid}`;
}
