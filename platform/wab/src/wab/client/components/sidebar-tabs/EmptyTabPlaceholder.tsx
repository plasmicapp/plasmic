import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { isComponentArena, isPageArena } from "@/wab/shared/Arenas";
import { FRAME_CAP } from "@/wab/shared/Labels";
import React, { ReactNode } from "react";

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
