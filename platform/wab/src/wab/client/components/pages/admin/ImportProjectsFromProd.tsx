import { useNonAuthCtx } from "@/wab/client/app-ctx";
import { Modal } from "@/wab/client/components/widgets/Modal";
import { spawn } from "@/wab/shared/common";
import { Button } from "antd";
import React, { useState } from "react";

export function ImportProjectsFromProd() {
  const nonAuthCtx = useNonAuthCtx();
  const [projectsInfo, setProjectsInfo] = React.useState<
    { projectId: string; bundle: string; name: string }[] | undefined
  >(undefined);
  const [modalVisible, setModalVisible] = useState(false);
  const ref = React.createRef<HTMLIFrameElement>();
  React.useEffect(() => {
    const listener = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.source === "import-project-from-prod") {
          setProjectsInfo(data.projectsInfo);
          spawn(
            nonAuthCtx.api.setDevFlagOverrides(
              JSON.stringify(data.devflags, null, 2)
            )
          );
        }
      } catch {}
    };
    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, []);

  const updateProjects = async () => {
    if (projectsInfo) {
      console.log("## Deleting existing projects...");
      for (const bundle of projectsInfo) {
        await nonAuthCtx.api.deleteProjectAndRevisions(bundle.projectId);
      }
      console.log("## Uploading new projects...");
      // We have to do it sync, since we can end up trying to insert the same project twice, concurrently and that will fail.
      for (const bundle of projectsInfo) {
        await nonAuthCtx.api.importProject(bundle.bundle, {
          keepProjectIdsAndNames: true,
          projectName: bundle.name,
        });
      }

      ref.current!.contentWindow?.postMessage(
        JSON.stringify({
          source: "import-project-from-prod",
          done: true,
        })
      );

      setModalVisible(false);
    }
  };

  React.useEffect(() => {
    spawn(updateProjects());
  }, [projectsInfo]);

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
