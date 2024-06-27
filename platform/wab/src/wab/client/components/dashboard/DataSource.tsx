import { AppCtx } from "@/wab/client/app-ctx";
import { promptMoveToWorkspace } from "@/wab/client/components/dashboard/dashboard-actions";
import { confirmDeleteDataSource } from "@/wab/client/components/data-source-ui";
import { Matcher } from "@/wab/client/components/view-common";
import {
  DefaultDataSourceProps,
  PlasmicDataSource,
} from "@/wab/client/plasmic/plasmic_kit_dashboard/PlasmicDataSource";
import { assert } from "@/wab/shared/common";
import { MaybeWrap } from "@/wab/commons/components/ReactUtil";
import { ApiDataSource } from "@/wab/shared/ApiSchema";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import { Dropdown, Menu, notification } from "antd";
import * as React from "react";

export interface DataSourceProps extends DefaultDataSourceProps {
  appCtx: AppCtx;
  source: ApiDataSource;
  matcher?: Matcher;
  onClick: () => void;
  onUpdate: () => Promise<any>;
}

function DataSource_(
  { source, appCtx, onUpdate, matcher, ...props }: DataSourceProps,
  ref: HTMLElementRefOf<"div">
) {
  const isOwner = appCtx.selfInfo && appCtx.selfInfo.id === source.ownerId;
  return (
    <MaybeWrap
      cond={!props.readOnly}
      wrapper={(children) => (
        <Dropdown
          overlay={() => (
            <Menu>
              {isOwner && (
                <Menu.Item
                  onClick={async () => {
                    await confirmDeleteDataSource(appCtx, source, onUpdate);
                  }}
                >
                  Delete
                </Menu.Item>
              )}
              {isOwner && (
                <Menu.Item
                  key="move"
                  onClick={async () => {
                    const response = await promptMoveToWorkspace(
                      appCtx,
                      null,
                      false,
                      "Move"
                    );
                    if (!response) {
                      return;
                    }
                    assert(
                      response.result === "workspace",
                      "Must specify a workspace"
                    );
                    await appCtx.api.updateDataSource(source.id, {
                      workspaceId: response.workspace.id,
                    });
                    notification.success({
                      message: `Integration ${source.name} moved to ${response.workspace.name}`,
                    });
                    await onUpdate();
                  }}
                >
                  Move to workspace
                </Menu.Item>
              )}
            </Menu>
          )}
          trigger={["contextMenu"]}
        >
          {children}
        </Dropdown>
      )}
    >
      <PlasmicDataSource root={{ ref }} {...props}>
        {matcher
          ? matcher.boldSnippets(source.name, "yellow-snippet")
          : source.name}
      </PlasmicDataSource>
    </MaybeWrap>
  );
}

const DataSource = React.forwardRef(DataSource_);
export default DataSource;
