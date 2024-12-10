import { NonAuthCtx, useNonAuthCtx } from "@/wab/client/app-ctx";
import { Modal } from "@/wab/client/components/widgets/Modal";
import { WorkspaceId } from "@/wab/shared/ApiSchema";
import { Bundle } from "@/wab/shared/bundles";
import { DevFlagsType } from "@/wab/shared/devflags";
import { Button } from "antd";
import React, { useState } from "react";

type ProjectInfo = {
  projectId: string;
  bundle: string;
  name: string;
};

function useImportFromProdListener(
  onListen: (devflags: DevFlagsType, info: ProjectInfo[]) => Promise<void>
) {
  React.useEffect(() => {
    const listener = async (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.source === "import-project-from-prod") {
          const { devflags, projectsInfo } = data;
          await onListen(devflags, projectsInfo);
        }
      } catch {}
    };
    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, [onListen]);
}

async function setupHostlessWorkspace(
  nonAuthCtx: NonAuthCtx,
  hostLessWorkspaceId: WorkspaceId
) {
  try {
    // If it doesn't throw an error, it means the workspace exists
    await nonAuthCtx.api.getWorkspace(hostLessWorkspaceId);
  } catch (e) {
    async function getTeamId() {
      const { teams } = await nonAuthCtx.api.listTeams();
      const nonPersonalTeam = teams.find((t) => !t.personalTeamOwnerId);
      if (nonPersonalTeam) {
        return nonPersonalTeam.id;
      }
      const { team } = await nonAuthCtx.api.createTeam("Hostless Team");
      return team.id;
    }

    const teamId = await getTeamId();

    await nonAuthCtx.api.adminCreateWorkspace({
      id: hostLessWorkspaceId,
      name: "Hostless Workspace",
      description: "Workspace for hostless projects",
      teamId: teamId,
    });
  }
}

async function resetProjects(
  nonAuthCtx: NonAuthCtx,
  projectsInfo: ProjectInfo[]
) {
  console.log("## Deleting existing projects...");

  const projectIds = projectsInfo.flatMap((info) => {
    const parsedBundles = JSON.parse(info.bundle) as Array<[string, Bundle]>;
    const dependenciesProjectIds = parsedBundles.flatMap(([_, bundle]) =>
      Object.values(bundle.map)
        .filter((inst) => inst.__type === "ProjectDependency")
        .map((inst) => inst.projectId)
    );

    return [info.projectId, ...dependenciesProjectIds];
  });

  await Promise.all(
    projectIds.map((projectId) =>
      nonAuthCtx.api.deleteProjectAndRevisions(projectId)
    )
  );

  console.log("## Uploading new projects...");
  // We have to do it sync, since we can end up trying to insert the same project twice, concurrently and that will fail.
  for (const bundle of projectsInfo) {
    await nonAuthCtx.api.importProject(bundle.bundle, {
      keepProjectIdsAndNames: true,
      projectName: bundle.name,
    });
  }
}

export function AdminImportProjectsFromProd() {
  const nonAuthCtx = useNonAuthCtx();
  const [modalVisible, setModalVisible] = useState(false);
  const ref = React.createRef<HTMLIFrameElement>();

  const onListenProjectsInfo = React.useCallback(
    async (devflags: DevFlagsType, info: ProjectInfo[]) => {
      if (devflags.hostLessWorkspaceId) {
        await setupHostlessWorkspace(nonAuthCtx, devflags.hostLessWorkspaceId);
      }

      devflags.hideBlankStarter = false;

      await nonAuthCtx.api.setDevFlagOverrides(
        JSON.stringify(devflags, null, 2)
      );

      await resetProjects(nonAuthCtx, info);

      console.log("## Posting message to window...");
      ref.current!.contentWindow?.postMessage(
        JSON.stringify({
          source: "import-project-from-prod",
          done: true,
        })
      );

      setModalVisible(false);
    },
    [nonAuthCtx, ref]
  );

  useImportFromProdListener(onListenProjectsInfo);

  const showImportFromProd = window.location.hostname.includes("localhost");
  // Don't even show this on prod, just for extra safety
  if (!showImportFromProd) {
    return null;
  }

  return (
    <div>
      <h2>Import devflags and plasmic projects from prod</h2>
      <Modal
        open={modalVisible}
        footer={null}
        title={"Import plasmic projects from prod"}
        onCancel={() => setModalVisible(false)}
        width={800}
      >
        <iframe
          src="https://studio.plasmic.app/import-projects-from-prod"
          width={760}
          height={500}
          ref={ref}
        />
      </Modal>
      <Button
        disabled={window.location.hostname.startsWith(
          "https://studio.plasmic.app"
        )}
        onClick={() => setModalVisible((v) => !v)}
      >
        Import
      </Button>
      <p>This will override your current devflags</p>
    </div>
  );
}
