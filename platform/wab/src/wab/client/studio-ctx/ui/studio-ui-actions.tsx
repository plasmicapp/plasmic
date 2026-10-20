import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { UiActionType } from "@/wab/client/studio-ctx/ui/UiActionBus";
import {
  ComponentScopedTag,
  SiteScopedTag,
  UiId,
  parseUiId,
} from "@/wab/client/studio-ctx/ui/studio-ui-ids";
import { HighlightBlinker } from "@/wab/commons/components/HighlightBlinker";
import * as React from "react";

/**
 * Calls `handler(uuid, type)` when a UI action targets a model of the given
 * `typeTag`.
 *
 * Panels use this to bring the targeted row into view (expand/scroll), needed
 * because a collapsed or virtualized row isn't mounted, so its
 * {@link UiActionsOverlay} can't blink it until something reveals it first.
 *
 * @param typeTag - the model kind to listen for
 * @param handler - handles an action (by its type) for a matching model's uuid
 */
export function useModelUiActionHandler(
  tag: SiteScopedTag | ComponentScopedTag,
  handler: (uuid: string, type: UiActionType) => void,
) {
  const studioCtx = useStudioCtx();
  const handlerRef = React.useRef(handler);
  handlerRef.current = handler;
  React.useEffect(() => {
    const { dispose } = studioCtx.uiActionBus.registerListener((uiId, type) => {
      const parsed = parseUiId(uiId);
      if (parsed && parsed.type !== "Section" && parsed.tag === tag) {
        handlerRef.current(parsed.uuid, type);
      }
    });
    return dispose;
  }, [studioCtx, tag]);
}

/**
 * Registers with {@link UiActionBus} to receive UI actions.
 *
 * When a UI action is dispatched, this component overlays its parent's
 * bounding box with a blink effect (jump also scrolls into view).
 */
export function UiActionsOverlay({ uiId }: { uiId: UiId }) {
  const studioCtx = useStudioCtx();
  const [action, setAction] = React.useState<UiActionType | null>(null);

  React.useEffect(() => {
    const { dispose } = studioCtx.uiActionBus.registerHandler(uiId, (type) =>
      setAction(type),
    );
    return dispose;
  }, [studioCtx, uiId]);

  return action ? (
    <HighlightBlinker
      doScroll={action === "jump"}
      onFinish={() => setAction(null)}
    />
  ) : null;
}

/** Same as {@link UiActionsOverlay} but makes a wrapper div for you. */
export function UiActionsWrapper({
  uiId,
  children,
}: {
  uiId: UiId;
  children: React.ReactNode;
}) {
  return (
    <div className="rel">
      {children}
      <UiActionsOverlay uiId={uiId} />
    </div>
  );
}
