import { mkNameArg } from "@/wab/shared/core/lang";
import {
  buildInteractionArgs,
  InteractionAction,
  isInteractionActionName,
} from "@/wab/shared/core/states";
import { GenericError } from "@/wab/shared/error-handling";
import {
  Component,
  Expr,
  Interaction,
  isKnownFunctionExpr,
} from "@/wab/shared/model/classes";
import { renameInteractionAndFixExprs } from "@/wab/shared/refactoring";
import { err, ok, Result } from "neverthrow";

export type UpdateInteractionResult = Result<void, GenericError>;

export interface InteractionChanges {
  name?: string;
  action?: InteractionAction;
}

/**
 * Update an interaction step. All requested changes are validated up front,
 * so an error result means nothing was changed.
 *
 * Field semantics:
 * - name: deduped rename; `$steps.<name>` references in sibling steps are
 *   fixed up automatically. Renaming works for any action kind.
 * - action: replaces the step's action wholesale — actionName and args —
 *   with the same validation as creation, so it can also switch the step to
 *   a different action kind. Only steps whose current action has a
 *   canonical `InteractionAction` representation can be replaced;
 *   Studio-built steps of other kinds (e.g. data-source operations) can't
 *   be recreated by these operations, so replacing them would be
 *   destructive.
 */
export function updateInteraction(
  component: Component,
  interaction: Interaction,
  changes: InteractionChanges
): UpdateInteractionResult {
  const { name, action } = changes;

  if (name === undefined && action === undefined) {
    return err({
      message: `No changes provided for interaction "${interaction.interactionName}".`,
    });
  }
  if (name !== undefined && !name.trim()) {
    return err({ message: "Interaction name cannot be empty." });
  }
  let interactionArgs: Record<string, Expr> | undefined;
  if (action !== undefined) {
    if (!isInteractionActionName(interaction.actionName)) {
      return err({
        message: `Interaction "${interaction.interactionName}" uses the "${interaction.actionName}" action, which cannot be replaced with this operation; edit it in Studio instead.`,
      });
    }
    // Replacing a run-code body keeps the event args in scope.
    const prevArg = interaction.args.find((a) => a.name === "customFunction");
    const codeArgNames =
      interaction.actionName === "customFunction" &&
      prevArg &&
      isKnownFunctionExpr(prevArg.expr)
        ? prevArg.expr.argNames
        : [];
    const interactionArgsResult = buildInteractionArgs(action, {
      component,
      codeArgNames,
    });
    if (interactionArgsResult.isErr()) {
      return err({ message: interactionArgsResult.error });
    }
    interactionArgs = interactionArgsResult.value;
  }

  if (name !== undefined) {
    renameInteractionAndFixExprs(interaction, name);
  }
  if (action !== undefined && interactionArgs !== undefined) {
    interaction.actionName = action.actionName;
    interaction.args = Object.entries(interactionArgs).map(([argName, expr]) =>
      mkNameArg({ name: argName, expr })
    );
  }
  return ok(undefined);
}
