import { ensureBaseVariantSetting } from "@/wab/shared/Variants";
import {
  EventHandlerKeyType,
  findExprsInInteraction,
  isEventHandlerKeyForAttr,
  isEventHandlerKeyForParam,
} from "@/wab/shared/core/tpls";
import { Interaction, TplNode } from "@/wab/shared/model/classes";
import { isInteractionResultUsedInExpr } from "@/wab/shared/refactoring";
import { remove } from "lodash";
import { Result, err, ok } from "neverthrow";

export type DeleteInteractionResult = Result<void, string>;

/**
 * Delete an interaction step from an element's event handler. Errors if a
 * sibling step reads this step's result via `$steps` (Studio's own Remove
 * leaves such references dangling; here an explicit error beats a silent
 * break). When the last step is removed, the now-empty event handler is
 * removed from its attr/arg slot too.
 */
export function deleteInteraction(opts: {
  tpl: TplNode;
  eventHandlerKey: EventHandlerKeyType;
  interaction: Interaction;
}): DeleteInteractionResult {
  const { tpl, eventHandlerKey, interaction } = opts;
  const eventHandler = interaction.parent;

  if (
    !isEventHandlerKeyForAttr(eventHandlerKey) &&
    !isEventHandlerKeyForParam(eventHandlerKey)
  ) {
    return err(
      `Interaction "${interaction.interactionName}" belongs to a nested code-component handler, which is not supported by this operation.`
    );
  }

  const referencing = eventHandler.interactions.find(
    (sibling) =>
      sibling !== interaction &&
      findExprsInInteraction(sibling).some((expr) =>
        isInteractionResultUsedInExpr(interaction, expr)
      )
  );
  if (referencing) {
    return err(
      `Interaction "${interaction.interactionName}" cannot be deleted: step "${referencing.interactionName}" reads its result via $steps.`
    );
  }

  remove(eventHandler.interactions, (it) => it === interaction);
  if (eventHandler.interactions.length === 0) {
    const baseVs = ensureBaseVariantSetting(tpl);
    if (isEventHandlerKeyForAttr(eventHandlerKey)) {
      delete baseVs.attrs[eventHandlerKey.attr];
    } else {
      remove(baseVs.args, (arg) => arg.param === eventHandlerKey.param);
    }
  }
  return ok(undefined);
}
