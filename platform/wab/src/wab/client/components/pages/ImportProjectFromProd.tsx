import { NonAuthCtx } from "@/wab/client/app-ctx";
import { ensureArray, spawn } from "@/wab/shared/common";
import { DevFlagsType, InsertableTemplatesSelectable } from "@/wab/shared/devflags";
import { ProjectId } from "@/wab/shared/ApiSchema";
import { getBundle } from "@/wab/shared/bundles";
import L from "lodash";
import React from "react";

export function ImportProjectsFromProd({
  nonAuthCtx,
}: {
  nonAuthCtx: NonAuthCtx;
}) {
  const [isLoading, setIsLoading] = React.useState(true);

  const isNonNil = function <T>(value: T): value is NonNullable<T> {
    return value !== null && value !== undefined;
  };

  React.useEffect(() => {
    spawn(
      (async () => {
        const extractProjectIdsFromInsertableTemplates = (
          insertableTemplates: InsertableTemplatesSelectable[]
        ) =>
          insertableTemplates.flatMap((templateItem) =>
            "items" in templateItem
              ? extractProjectIdsFromInsertableTemplates(templateItem.items)
              : [templateItem.projectId]
          );
        const devflagsStringified = await nonAuthCtx.api.getDevFlagOverrides();
        console.log("exporting projects", "devflags str", devflagsStringified);
        if (devflagsStringified?.data) {
          const devflags = JSON.parse(devflagsStringified.data) as DevFlagsType;
          console.log("exporting projects", "devflags", devflags);
          const projectIds = L.uniq([
            ...(devflags.hostLessComponents?.flatMap((hostLessComponent) =>
              ensureArray(hostLessComponent.projectId)
            ) ?? []),
            ...(devflags.starterSections?.flatMap((starter) =>
              starter.projects.flatMap((starterProject) => [
                starterProject.baseProjectId,
                starterProject.projectId,
              ])
            ) ?? []),
            ...extractProjectIdsFromInsertableTemplates(
              ensureArray(devflags.insertableTemplates ?? [])
            ),
          ]).filter(isNonNil);
          console.log("exporting projects", "projects", projectIds);
          // doing it sequentially so that we don't bring down the server
          const projectsInfo: Array<{
            projectId: ProjectId;
            name: string;
            bundle: string;
          }> = [];
          for (const projectId of projectIds) {
            const { depPkgs, project, rev } = await nonAuthCtx.api.getSiteInfo(
              projectId
            );
            projectsInfo.push({
              projectId: project.id,
              name: project.name,
              bundle: JSON.stringify([
                ...depPkgs.map((info) => {
                  return [info.id, info.model];
                }),
                [project.id, getBundle(rev, nonAuthCtx.lastBundleVersion)],
              ]),
            });
          }
          window.parent.postMessage(
            JSON.stringify({
              source: "import-project-from-prod",
              devflags,
              projectsInfo,
            }),
            "*"
          );
        }
      })()
    );

    const listener = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.source === "import-project-from-prod") {
          if (data.done) {
            setIsLoading(false);
          }
        }
      } catch {}
    };
    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, []);
  return (
    <>
      <h1>
        {isLoading ? "Importing projects..." : "Done! Please refresh the page"}
      </h1>
    </>
  );
}
