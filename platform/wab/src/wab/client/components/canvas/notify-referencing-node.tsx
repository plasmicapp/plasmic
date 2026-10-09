import type { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { mkUuid, spawn } from "@/wab/shared/common";
import { tryGetTplOwnerComponent } from "@/wab/shared/core/tpls";
import { TplNode } from "@/wab/shared/model/classes";
import { notification } from "antd";
import React from "react";

export function notifyReferencingNode(
  title: string,
  message: string,
  referencingNode: TplNode | null | undefined,
  studioCtx: StudioCtx,
) {
  const owningComponent = referencingNode
    ? tryGetTplOwnerComponent(referencingNode)
    : undefined;
  const key = mkUuid();
  notification.error({
    key,
    message: title,
    description: (
      <>
        {message}{" "}
        {referencingNode && owningComponent ? (
          <a
            onClick={() => {
              spawn(
                studioCtx.setStudioFocusOnTpl(owningComponent, referencingNode),
              );
              notification.destroy(key);
            }}
          >
            [Go to reference]
          </a>
        ) : null}
      </>
    ),
  });
}
