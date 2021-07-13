import { Placement } from "@react-types/overlays";
import { FocusStrategy } from "@react-types/shared";
import * as React from "react";
import { OverlayTriggerState } from "react-stately";

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
