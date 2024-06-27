import { HostConfig } from "@/wab/client/components/HostConfig";
import { showTemporaryPrompt } from "@/wab/client/components/quick-modals";
import { useAppCtx } from "@/wab/client/contexts/AppContexts";
import { useTopFrameCtx } from "@/wab/client/frame-ctx/top-frame-ctx";
import { mkUuid, spawn } from "@/wab/shared/common";
import { ApiProject } from "@/wab/shared/ApiSchema";
import { notification } from "antd";
import * as React from "react";

/** This component displays a prompt if the host isn't loading. */
export function HostLoadTimeoutPrompt({
  project,
  editorPerm,
}: {
  project: ApiProject;
  editorPerm: boolean;
}) {
  const { hostConnected } = useTopFrameCtx();
  const appCtx = useAppCtx();
  React.useEffect(() => {
    if (!!project && !hostConnected) {
      const key = mkUuid();
      const id = setTimeout(() => {
        notification.warn({
          message: "Looks like the host app is taking a while to load.",
          duration: 0,
          ...(editorPerm
            ? {
                key,
                description: (
                  <p>
                    Would you like to{" "}
                    <a
                      onClick={() => {
                        spawn(
                          showTemporaryPrompt(() => (
                            <HostConfig
                              appCtx={appCtx}
                              project={project}
                              onCancel={() => {}}
                              onUpdate={async (canSkipRefresh) => {
                                if (!canSkipRefresh) {
                                  window.location.reload();
                                }
                              }}
                            />
                          ))
                        );
                        notification.close(key);
                      }}
                    >
                      update
                    </a>{" "}
                    the host app URL?
                  </p>
                ),
              }
            : {}),
        });
      }, 10000);
      return () => {
        clearTimeout(id);
        notification.close(key);
      };
    }
    return () => {};
  }, [project, editorPerm, hostConnected]);
  return null;
}
