import { AppCtx } from "@/wab/client/app-ctx";
import { U, UU } from "@/wab/client/cli-routes";
import { Spinner } from "@/wab/client/components/widgets";
import { spawn } from "@/wab/shared/common";
import { StarterProjectConfig } from "@/wab/shared/devflags";
import { WorkspaceId } from "@/wab/shared/ApiSchema";
import * as React from "react";

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
