import type { Placement } from "@react-types/overlays";
import type { FocusStrategy } from "@react-types/shared";
import * as React from "react";
import type { OverlayTriggerState } from "@react-stately/overlays";

export interface TriggeredOverlayContextValue {
  triggerRef: React.RefObject<HTMLElement>;
  state: OverlayTriggerState;
  autoFocus?: boolean | FocusStrategy;

  placement?: Placement;
  overlayMatchTriggerWidth?: boolean;
  overlayMinTriggerWidth?: boolean;
  overlayWidth?: number;
}

export const TriggeredOverlayContext = React.createContext<
  TriggeredOverlayContextValue | undefined
>(undefined);
