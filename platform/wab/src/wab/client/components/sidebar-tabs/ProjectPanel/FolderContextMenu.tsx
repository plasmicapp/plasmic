import { menuSection } from "@/wab/client/components/menu-builder";
import { Menu } from "antd";
import * as React from "react";

/**
 * Context menu shown when right-clicking a folder row.
 *
 * @param arenaDisplay text to indicate the type of arenas in the folder
 * @param onAdd callback when add is clicked
 * @param onSelectRename callback when rename is clicked
 * @param onDelete callback when delete is clicked
 */
export function FolderContextMenu({
  arenaDisplay,
  onAdd,
  onSelectRename,
  onDelete,
}: {
  arenaDisplay: string;
  onAdd: () => void;
  onSelectRename: () => void;
  onDelete: () => void;
}) {
  return (
    <Menu id="proj-item-menu">
      {menuSection(
        "add",
        <Menu.Item key="add" onClick={onAdd}>
          <strong>Add</strong> {arenaDisplay}
        </Menu.Item>
      )}
      {menuSection(
        "rename",
        <Menu.Item
          key="rename"
          onClick={(e) => {
            e.domEvent.stopPropagation();
            onSelectRename();
          }}
        >
          <strong>Rename</strong> folder
        </Menu.Item>
      )}
      {menuSection(
        "delete",
        <Menu.Item key="delete" onClick={onDelete}>
          <strong>Delete</strong> folder
        </Menu.Item>
      )}
    </Menu>
  );
}
