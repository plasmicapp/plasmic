import {
  buildInteractionArgs,
  InteractionAction,
  mkInteraction,
} from "@/wab/shared/core/states";
import {
  EventHandlerKeyType,
  getAllEventHandlerOptions,
  getEventHandlerByEventKey,
  isEventHandlerKeyForAttr,
  isEventHandlerKeyForParam,
  isTplComponent,
  isTplTag,
  setEventHandlerByEventKey,
} from "@/wab/shared/core/tpls";
import {
  Component,
  EventHandler,
  Interaction,
  isKnownEventHandler,
  TplNode,
} from "@/wab/shared/model/classes";
import { err, ok, Result } from "neverthrow";

export type CreateInteractionResult = Result<Interaction, string>;

const MAX_LISTED_EVENTS = 15;

function eventKeyName(key: EventHandlerKeyType): string | undefined {
  return isEventHandlerKeyForAttr(key)
    ? key.attr
    : isEventHandlerKeyForParam(key)
    ? key.param.variable.name
    : undefined;
}

/**
 * Create an interaction step on an element's event handler, appended after
 * any existing steps. `eventName` is the tag's DOM event prop (e.g.
 * "onClick") or, for a component instance, the name of a FunctionType
 * params name.
 */
export function createInteraction(opts: {
  component: Component;
  tpl: TplNode;
  eventName: string;
  action: InteractionAction;
  name: string;
}): CreateInteractionResult {
  const { component, tpl, eventName, action } = opts;

  if (!isTplTag(tpl) && !isTplComponent(tpl)) {
    return err(
      "Interactions can only be added to tags and component instances."
    );
  }
  const options = getAllEventHandlerOptions(tpl);
  const key = options.find((option) => eventKeyName(option) === eventName);
  if (!key) {
    const names = options.map(eventKeyName).filter((n): n is string => !!n);
    const listed =
      names.length > MAX_LISTED_EVENTS
        ? `${names.slice(0, MAX_LISTED_EVENTS).join(", ")}, …`
        : names.join(", ");
    return err(
      `Event "${eventName}" is not available on this element. Available events: ${listed}.`
    );
  }
  const interactionArgsResult = buildInteractionArgs(action, { component });
  if (interactionArgsResult.isErr()) {
    return err(interactionArgsResult.error);
  }
  const existing = getEventHandlerByEventKey(component, tpl, key);
  if (existing && !isKnownEventHandler(existing)) {
    return err(
      `The "${eventName}" handler of this element is a custom expression, not an interaction list; edit it in Studio instead.`
    );
  }

  const eventHandler = existing ?? new EventHandler({ interactions: [] });
  const interaction = mkInteraction(
    eventHandler,
    action.actionName,
    opts.name,
    interactionArgsResult.value
  );
  eventHandler.interactions.push(interaction);
  if (!existing) {
    setEventHandlerByEventKey(tpl, key, eventHandler);
  }
  return ok(interaction);
}
