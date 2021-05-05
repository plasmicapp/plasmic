import { OverlayTriggerState } from "@react-stately/overlays";
import { Placement } from "@react-types/overlays";
import { FocusStrategy } from "@react-types/shared";
import * as React from "react";

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
