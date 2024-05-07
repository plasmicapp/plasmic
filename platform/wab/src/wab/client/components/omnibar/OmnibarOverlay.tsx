import { Omnibar, OmnibarItem } from "@/wab/client/components/omnibar/Omnibar";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { observer } from "mobx-react";
import * as React from "react";
import {
  FocusScope,
  OverlayContainer,
  OverlayProvider,
  useOverlay,
} from "react-aria";
import * as ReactDOM from "react-dom";
import { useOverlayTriggerState } from "react-stately";

interface OmnibarOverlayProps {}

export const OmnibarOverlay = observer(function OmnibarOverlay(
  props: OmnibarOverlayProps
) {
  const studioCtx = useStudioCtx();
  const omnibarState = studioCtx.getOmnibarState();
  const state = useOverlayTriggerState({
    isOpen: omnibarState.show,
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    onOpenChange: async (isOpen) =>
      studioCtx.changeUnsafe(() =>
        isOpen ? studioCtx.showOmnibar() : studioCtx.hideOmnibar()
      ),
  });

  const [isDragging, setDragging] = React.useState(false);
  const lastUsedItemsRef = React.useRef<OmnibarItem[]>([]);
  const overlayRef = React.useRef<HTMLDivElement>(null);
  const { overlayProps } = useOverlay(
    {
      isOpen: omnibarState.show,
      onClose: state.close,
      // We close whenever we blur.  This is more reliable than isDismissable,
      // since clicking in a canvas frame does not register as a click here.
      shouldCloseOnBlur: true,
    },
    overlayRef
  );

  return (
    <>
      {ReactDOM.createPortal(
        <OverlayProvider>
          {(state.isOpen || isDragging) && (
            <OverlayContainer>
              <FocusScope contain restoreFocus autoFocus>
                <div
                  {...overlayProps}
                  ref={overlayRef}
                  style={{
                    // If closed, but dragging, we need to render this invisibly
                    // to keep the draggable item mounted
                    display: state.isOpen ? "flex" : "none",
                    position: "fixed",
                    top: 80,
                    left: 0,
                    bottom: 0,
                    right: 0,
                    alignItems: "start",
                    justifyContent: "center",
                    zIndex: 99,
                  }}
                >
                  <Omnibar
                    studioCtx={studioCtx}
                    lastUsedItemsRef={lastUsedItemsRef}
                    onClose={() => {
                      setDragging(false);
                      state.close();
                    }}
                    onDragStart={() => {
                      setDragging(true);
                      state.close();
                    }}
                    onDragEnd={() => {
                      setDragging(false);
                    }}
                  />
                </div>
              </FocusScope>
            </OverlayContainer>
          )}
        </OverlayProvider>,
        document.body
      )}
    </>
  );
});
