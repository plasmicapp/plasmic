import React, { ReactNode } from "react";
import { isComponentArena, isPageArena } from "../../../shared/Arenas";
import { FRAME_CAP } from "../../../shared/Labels";
import { useStudioCtx } from "../../studio-ctx/StudioCtx";

export interface EmptyTabPlaceholderProps {
  children: ReactNode;
}

export function EmptyTabPlaceholder({ children }: EmptyTabPlaceholderProps) {
  const sc = useStudioCtx();
  const shouldShowTabs =
    isComponentArena(sc.currentArena) || isPageArena(sc.currentArena);

  return shouldShowTabs ? (
    <>{children}</>
  ) : (
    <div className={"EmptyTabPlaceholder"}>
      <div className={"panel-content"}>
        {!sc.currentArenaEmpty && `Select an ${FRAME_CAP} first`}
      </div>
    </div>
  );
}
