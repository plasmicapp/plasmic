import { CreateNewMenuItemContent } from "@/wab/client/components/menu-builder";
import { DataTokenRef } from "@/wab/commons/DataToken";
import { ProjectId } from "@/wab/shared/ApiSchema";
import { walkDependencyTree } from "@/wab/shared/core/project-deps";
import { Site } from "@/wab/shared/model/classes";
import { naturalSortByName } from "@/wab/shared/sort";
import { Menu } from "antd";
import React from "react";

/**
 * Builds the "Use data token" submenu.
 *
 * @param opts.site - Project site whose tokens are listed.
 * @param opts.projectId - ID of that project, owner of the local tokens.
 * @param opts.onSelect - Invoked with the selected token and its project ID.
 * @param opts.onCreate - When set, appends a "Create new data token" item.
 */
export function makeDataTokensSubMenu(opts: {
  site: Site;
  projectId: ProjectId;
  onSelect: (dataTokenRef: DataTokenRef) => void;
  onCreate?: () => void;
}): JSX.Element | null {
  const localTokens = naturalSortByName(opts.site.dataTokens);
  const depGroups = walkDependencyTree(opts.site, "direct").filter(
    (d) => d.site.dataTokens.length > 0
  );

  const hasTokens = localTokens.length > 0 || depGroups.length > 0;
  if (!hasTokens && !opts.onCreate) {
    return null;
  }

  return (
    <Menu.SubMenu key={"data-tokens-submenu"} title="Use data token">
      {localTokens.map((token) => (
        <Menu.Item
          key={token.uuid}
          onClick={() => opts.onSelect({ token, projectId: opts.projectId })}
        >
          {token.name}
        </Menu.Item>
      ))}
      {depGroups.map((dep) => (
        <Menu.ItemGroup
          key={dep.projectId}
          title={`Imported from "${dep.name}"`}
        >
          {naturalSortByName(dep.site.dataTokens).map((token) => (
            <Menu.Item
              key={token.uuid}
              onClick={() =>
                opts.onSelect({
                  token,
                  projectId: dep.projectId as ProjectId,
                })
              }
            >
              {token.name}
            </Menu.Item>
          ))}
        </Menu.ItemGroup>
      ))}
      {opts.onCreate && hasTokens && <Menu.Divider key="create-divider" />}
      {opts.onCreate && (
        <Menu.Item key="create-data-token" onClick={opts.onCreate}>
          <CreateNewMenuItemContent entity="data token" />
        </Menu.Item>
      )}
    </Menu.SubMenu>
  );
}
