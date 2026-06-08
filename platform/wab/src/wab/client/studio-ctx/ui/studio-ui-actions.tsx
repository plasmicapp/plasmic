import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { UiActionType } from "@/wab/client/studio-ctx/ui/UiActionBus";
import { UiId } from "@/wab/client/studio-ctx/ui/studio-ui-ids";
import { HighlightBlinker } from "@/wab/commons/components/HighlightBlinker";
import * as React from "react";

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
      setAction(type)
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
