import { AppCtx } from "@/wab/client/app-ctx";
import { U, UU } from "@/wab/client/cli-routes";
import { Spinner } from "@/wab/client/components/widgets";
import { WorkspaceId } from "@/wab/shared/ApiSchema";
import { spawn } from "@/wab/shared/common";
import * as React from "react";

export function FromStarterTemplate(props: {
  appCtx: AppCtx;
  projectId?: string;
  baseProjectId?: string;
  name?: string;
  path: string;
  workspaceId?: WorkspaceId;
  version?: string;
}) {
  const { appCtx, projectId, baseProjectId, name, path, workspaceId, version } =
    props;

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
            workspaceId,
            version
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
      appCtx.router.routeTo(UU.login.fill({}, { continueTo: path }));
    } else {
      appCtx.router.routeTo(
        UU.emailVerification.fill({}, { continueTo: path })
      );
    }
  }, [projectId, baseProjectId, appCtx, name]);

  return <Spinner />;
}
