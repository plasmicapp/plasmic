import { AppCtx } from "@/wab/client/app-ctx";
import DataSource from "@/wab/client/components/dashboard/DataSource";
import { DataSourceModal } from "@/wab/client/components/modals/DataSourceModal";
import { Matcher } from "@/wab/client/components/view-common";
import {
  DefaultWorkspaceDataSourcesProps,
  PlasmicWorkspaceDataSources,
} from "@/wab/client/plasmic/plasmic_kit_dashboard/PlasmicWorkspaceDataSources";
import { ApiDataSource, WorkspaceId } from "@/wab/shared/ApiSchema";
import { isCoreTeamEmail } from "@/wab/shared/devflag-utils";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import * as React from "react";

export interface WorkspaceDataSourcesProps
  extends DefaultWorkspaceDataSourcesProps {
  workspaceId: WorkspaceId;
  appCtx: AppCtx;
  dataSources: ApiDataSource[];
  matcher: Matcher;
  readOnly: boolean;
  onUpdate: () => Promise<void>;
}

function WorkspaceDataSources_(
  {
    workspaceId,
    appCtx,
    dataSources,
    matcher,
    readOnly,
    onUpdate,
    ...props
  }: WorkspaceDataSourcesProps,
  ref: HTMLElementRefOf<"div">
) {
  const [isEditing, setIsEditing] = React.useState<"new" | ApiDataSource>();
  const showTutorialDBs = isCoreTeamEmail(
    appCtx.selfInfo?.email,
    appCtx.appConfig
  );
  return (
    <>
      <PlasmicWorkspaceDataSources
        root={{ ref }}
        {...props}
        sources={{
          render: () =>
            dataSources
              .filter(
                (source) =>
                  (showTutorialDBs || source.source !== "tutorialdb") &&
                  matcher.matches(source.name)
              )
              .map((source) => (
                <DataSource
                  appCtx={appCtx}
                  source={source}
                  readOnly={readOnly}
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
      />
      {isEditing && (
        <DataSourceModal
          appCtx={appCtx}
          editingDataSource={isEditing}
          onDone={() => setIsEditing(undefined)}
          workspaceId={workspaceId}
          key={isEditing === "new" ? "new" : isEditing?.id}
          onUpdate={onUpdate}
        />
      )}
    </>
  );
}

const WorkspaceDataSources = React.forwardRef(WorkspaceDataSources_);
export default WorkspaceDataSources;
