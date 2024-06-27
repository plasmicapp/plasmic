import { useCurrentRecordingTarget } from "@/wab/client/hooks/useCurrentRecordingTarget";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { switchType } from "@/wab/shared/common";
import { ComponentArena } from "@/wab/shared/model/classes";
import * as tokens from "@/wab/styles/_tokens";
import * as cssVariables from "@/wab/styles/css-variables";
import { observer } from "mobx-react";
import { useEffect } from "react";

export const NON_BASE_VARIANT_COLOR = tokens.tomato9;
export const BASE_VARIANT_COLOR = tokens.blue9;
export const PLAYER_COLORS = [
  tokens.multiplayerColor01,
  tokens.multiplayerColor02,
  tokens.multiplayerColor03,
  tokens.multiplayerColor04,
  tokens.multiplayerColor05,
  tokens.multiplayerColor06,
  tokens.multiplayerColor07,
] as const;

function getRootElement() {
  return document.querySelector(":root") as HTMLElement;
}

function useSelectionControlsColor() {
  const currentTargeting = useCurrentRecordingTarget();

  useEffect(() => {
    getRootElement().style.setProperty(
      cssVariables.selectionControlsColor,
      currentTargeting === "baseVariant"
        ? BASE_VARIANT_COLOR
        : NON_BASE_VARIANT_COLOR
    );
  }, [currentTargeting]);
}

function useGridSpacing() {
  const studioCtx = useStudioCtx();

  useEffect(() => {
    if (studioCtx.currentArena) {
      const spacing = switchType(studioCtx.currentArena)
        .when(ComponentArena, () => "80px")
        .elseUnsafe(() => "150px");

      getRootElement().style.setProperty(cssVariables.gridSpacing, spacing);
    }
  }, [studioCtx.currentArena]);
}

export function getGlobalCssVariableValue(variable: string) {
  return getComputedStyle(getRootElement()).getPropertyValue(variable);
}

export const GlobalCssVariables = observer(function GlobalCssVariables_() {
  useSelectionControlsColor();
  useGridSpacing();
  return null;
});
