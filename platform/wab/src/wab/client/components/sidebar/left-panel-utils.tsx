import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { Menu } from "antd";
import { without } from "lodash";
import React from "react";
import { ProjectDependency } from "@/wab/shared/model/classes";

export function useDepFilterButton(opts: {
  studioCtx: StudioCtx;
  deps: ProjectDependency[];
}) {
  const { studioCtx, deps } = opts;
  const [filterDeps, setFilterDeps] = React.useState<ProjectDependency[]>([]);

  return {
    filterDeps,
    filterProps:
      deps.length === 0
        ? {
            render: () => null,
          }
        : {
            tooltip:
              filterDeps.length === 0
                ? "Filter by imported projects"
                : `Filtering by: ${filterDeps
                    .map(
                      (d) =>
                        `"${studioCtx.projectDependencyManager.getNiceDepName(
                          d
                        )}"`
                    )
                    .join(", ")}`,
            overlay: () => {
              return (
                <Menu selectedKeys={filterDeps.map((d) => d.uuid)}>
                  {deps.map((dep) => (
                    <Menu.Item
                      key={dep.uuid}
                      onClick={() => {
                        if (filterDeps.includes(dep)) {
                          setFilterDeps(without(filterDeps, dep));
                        } else {
                          setFilterDeps([...filterDeps, dep]);
                        }
                      }}
                    >
                      {studioCtx.projectDependencyManager.getNiceDepName(dep)}
                    </Menu.Item>
                  ))}
                  <Menu.Divider />
                  <Menu.Item key="clear" onClick={() => setFilterDeps([])}>
                    Clear filter
                  </Menu.Item>
                </Menu>
              );
            },
            isActive: filterDeps.length > 0,
          },
  };
}
