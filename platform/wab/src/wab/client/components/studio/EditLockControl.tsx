import { Tooltip } from "antd";
import { observer } from "mobx-react-lite";
import React from "react";
import { useStudioCtx } from "../../studio-ctx/StudioCtx";
import { READ_ONLY_EXPLANATION } from "../Messages";
import { LinkButton } from "../widgets";

export function _EditLockControl() {
  const sc = useStudioCtx();
  if (sc.isAtTip) {
    return null;
  }
  return (
    <Tooltip title={`${READ_ONLY_EXPLANATION} Reload project to edit.`}>
      <div>
        Project has been updated.{" "}
        {
          <strong>
            <LinkButton onClick={() => document.location.reload()}>
              Reload
            </LinkButton>
          </strong>
        }
      </div>
    </Tooltip>
  );
}

export const EditLockControl = observer(_EditLockControl);
