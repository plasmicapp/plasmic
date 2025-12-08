import { useUsersMap } from "@/wab/client/api-hooks";
import { NoItemMessage } from "@/wab/client/components/sidebar-tabs/versions-tab/NoItemMessage";
import {
  promptLoad,
  promptRevisionRevert,
} from "@/wab/client/components/sidebar-tabs/versions-tab/utils";
import VersionsListItem from "@/wab/client/components/sidebar/VersionsListItem";
import { ClickStopper } from "@/wab/client/components/widgets";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ApiUser, MainBranchId } from "@/wab/shared/ApiSchema";
import { MinimalRevisionInfo } from "@/wab/shared/SharedApi";
import { spawn } from "@/wab/shared/common";
import { Tooltip } from "antd";
import { observer } from "mobx-react";
import React from "react";

interface RevisionsListProps {
  studioCtx: StudioCtx;
}

export const RevisionsList = observer(function RevisionsList(
  props: RevisionsListProps
) {
  const { studioCtx } = props;
  const dbCtx = studioCtx.dbCtx();
  const currentBranchName = dbCtx.branchInfo?.name ?? MainBranchId;
  const revisions = studioCtx.revisions;

  const { data: userById } = useUsersMap(
    studioCtx.revisions.map((r) => r.createdById)
  );

  const onSelectRevision = async (projectRevision: MinimalRevisionInfo) => {
    const answer =
      !studioCtx.needsSaving() ||
      !studioCtx.canEditProject() ||
      (await promptLoad("Load autosaved version"));
    if (answer) {
      studioCtx.switchToRevision(projectRevision.id);
    }
  };

  const projectRevisions = React.useMemo(
    () =>
      revisions.filter((revision, index) => {
        // remove latest revision which is current state of the project
        if (index === 0) {
          return false;
        }

        // remove initial revision which were created during project creation
        if (
          studioCtx.releases.length === 0 &&
          currentBranchName === MainBranchId &&
          revision.revision <= 2
        ) {
          return false;
        }

        return true;
      }),
    [revisions.length, studioCtx.releases.length, currentBranchName]
  );

  const onRevert = async (revision: MinimalRevisionInfo, user?: ApiUser) => {
    const answer = await promptRevisionRevert(
      revision,
      revisions[0],
      studioCtx,
      userById && revision.createdById
        ? userById[revision.createdById]
        : undefined
    );
    if (answer) {
      await studioCtx.revertTo(revision);
    }
  };

  if (projectRevisions.length === 0) {
    return <NoItemMessage>No Autosaved Versions</NoItemMessage>;
  }

  return (
    <>
      {projectRevisions.map((revision) => {
        const author =
          userById && revision.createdById
            ? userById[revision.createdById]
            : undefined;
        return (
          <VersionsListItem
            key={revision.id}
            isSelected={
              !studioCtx.editMode && dbCtx.revisionInfo?.id === revision.id
            }
            itemDate={revision.createdAt}
            onClick={() => onSelectRevision(revision)}
            revertBtn={{
              wrap: (node) => (
                <ClickStopper
                  style={{
                    display: "flex",
                    alignItems: "center",
                  }}
                  preventDefault
                >
                  <Tooltip title="Revert to this version">{node}</Tooltip>
                </ClickStopper>
              ),
              props: {
                onClick: () => spawn(onRevert(revision, author)),
              },
            }}
            author={author}
          />
        );
      })}
    </>
  );
});
