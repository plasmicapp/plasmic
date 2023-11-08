import * as React from "react";
import { spawn } from "../../../common";
import { StarterProjectConfig } from "../../../devflags";
import { WorkspaceId } from "../../../shared/ApiSchema";
import { AppCtx } from "../../app-ctx";
import { U, UU } from "../../cli-routes";
import { Spinner } from "../widgets";

export function FromStarterTemplate(props: {
  appCtx: AppCtx;
  starter: StarterProjectConfig;
  workspaceId?: WorkspaceId;
}) {
  const { appCtx, starter, workspaceId } = props;

  const { projectId, baseProjectId, name } = starter;
  React.useEffect(() => {
    const createProject = async () => {
      if (projectId) {
        const { projectId: newProjectId } = await appCtx.api.cloneProject(
          projectId,
          { name, workspaceId }
        );
        return newProjectId;
      } else if (baseProjectId) {
        const { projectId: newProjectId } =
          await appCtx.api.clonePublishedTemplate(
            baseProjectId,
            name,
            workspaceId
          );
        return newProjectId;
      }
      return undefined;
    };
    if (appCtx.selfInfo && !appCtx.selfInfo.waitingEmailVerification) {
      spawn(
        createProject().then((newProjectId) => {
          if (newProjectId) {
            location.href = U.project({ projectId: newProjectId });
          }
        })
      );
    } else if (!appCtx.selfInfo) {
      appCtx.router.routeTo(
        UU.login.fill({}, { continueTo: `/starters/${starter.tag}` })
      );
    } else {
      appCtx.router.routeTo(
        UU.emailVerification.fill(
          {},
          { continueTo: `/starters/${starter.tag}` }
        )
      );
    }
  }, [projectId, baseProjectId, appCtx, name]);

  return <Spinner />;
}
