import { AppCtx } from "@/wab/client/app-ctx";
import DataSource from "@/wab/client/components/dashboard/DataSource";
import { DataSourceModal } from "@/wab/client/components/modals/DataSourceModal";
import { Matcher } from "@/wab/client/components/view-common";
import {
  DefaultWorkspaceDataSourcesProps,
  PlasmicWorkspaceDataSources,
} from "@/wab/client/plasmic/plasmic_kit_dashboard/PlasmicWorkspaceDataSources";
import { ApiDataSource, WorkspaceId } from "@/wab/shared/ApiSchema";
import { AccessLevel } from "@/wab/shared/EntUtil";
import { canEditDataSource } from "@/wab/shared/perms";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import * as React from "react";

export interface WorkspaceDataSourcesProps
  extends DefaultWorkspaceDataSourcesProps {
  workspaceId: WorkspaceId;
  appCtx: AppCtx;
  dataSources: ApiDataSource[];
  matcher: Matcher;
  readOnly: boolean;
  workspaceAccessLevel: AccessLevel;
  onUpdate: () => Promise<void>;
}

function WorkspaceDataSources_(
  {
    workspaceId,
    appCtx,
    dataSources,
    matcher,
    readOnly,
    workspaceAccessLevel,
    onUpdate,
    ...props
  }: WorkspaceDataSourcesProps,
  ref: HTMLElementRefOf<"div">
) {
  const [isEditing, setIsEditing] = React.useState<"new" | ApiDataSource>();
  const allowNewDataSources =
    appCtx.appConfig.enableDataQueries || !appCtx.appConfig.rscRelease;

  const showIntegrations = allowNewDataSources || !!dataSources.length;
  return (
    showIntegrations && (
      <>
        <PlasmicWorkspaceDataSources
          root={{ ref }}
          {...props}
          sources={{
            render: () =>
              dataSources
                .filter((source) => matcher.matches(source.name))
                .map((source) => (
                  <DataSource
                    appCtx={appCtx}
                    source={source}
                    readOnly={
                      !canEditDataSource(
                        source.ownerId,
                        appCtx.selfInfo?.id,
                        workspaceAccessLevel
                      )
                    }
                    matcher={matcher}
                    onClick={() => !readOnly && setIsEditing(source)}
                    onUpdate={onUpdate}
                  />
                )),
          }}
          newDataSource={{
            onClick: () => !readOnly && setIsEditing("new"),
          }}
          viewer={readOnly}
          overrides={{
            newDataSource: !allowNewDataSources
              ? () => {
                  return <></>;
                }
              : undefined,
          }}
        />
        {isEditing && (
          <DataSourceModal
            appCtx={appCtx}
            editingDataSource={isEditing}
            onDone={() => setIsEditing(undefined)}
            workspaceId={workspaceId}
            key={isEditing === "new" ? "new" : isEditing?.id}
            onUpdate={onUpdate}
            canEdit={
              isEditing === "new" ||
              canEditDataSource(
                isEditing.ownerId,
                appCtx.selfInfo?.id,
                workspaceAccessLevel
              )
            }
          />
        )}
      </>
    )
  );
}

const WorkspaceDataSources = React.forwardRef(WorkspaceDataSources_);
export default WorkspaceDataSources;
