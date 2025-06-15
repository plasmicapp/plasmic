import RowGroup from "@/wab/client/components/RowGroup";
import { FolderContextMenu } from "@/wab/client/components/sidebar-tabs/ProjectPanel/FolderContextMenu";
import { Matcher } from "@/wab/client/components/view-common";
import { Component } from "@/wab/shared/model/classes";
import { observer } from "mobx-react";
import * as React from "react";

export interface ComponentFolder {
  type: "folder" | "folder-component";
  name: string;
  key: string;
  items: ComponentPanelRow[];
  count: number;
  path?: string;
  actions: ComponentFolderActions;
}

export interface ComponentData {
  type: "component";
  key: string;
  component: Component;
  importedFrom?: string;
}

export type ComponentPanelRow = ComponentFolder | ComponentData;
export type OnFolderRenamed = (
  folder: ComponentFolder,
  newName: string
) => Promise<void>;
export type OnDeleteFolder = (folder: ComponentFolder) => Promise<void>;

export type OnAddComponent = (folderName?: string) => Promise<void>;

export interface ComponentFolderActions {
  onAddComponent: OnAddComponent;
  onDeleteFolder: OnDeleteFolder;
  onFolderRenamed: OnFolderRenamed;
}

interface ComponentFolderRowProps {
  folder: ComponentFolder;
  matcher: Matcher;
  indentMultiplier: number;
  isOpen: boolean;
  toggleExpand: () => void;
}

export const ComponentFolderRow = observer(function ComponentFolderRow(
  props: ComponentFolderRowProps
) {
  const { folder, matcher, indentMultiplier, isOpen, toggleExpand } = props;
  const { onAddComponent, onDeleteFolder, onFolderRenamed } = folder.actions;

  const [renaming, setRenaming] = React.useState(false);

  return (
    <RowGroup
      style={{
        height: 32,
        paddingLeft: indentMultiplier * 16 + 6,
      }}
      groupSize={folder.count}
      isOpen={isOpen}
      showActions={true}
      menu={
        <FolderContextMenu
          onAdd={async () => {
            if (!isOpen) {
              toggleExpand();
            }
            await onAddComponent(folder.path);
          }}
          itemDisplay={"component"}
          onSelectRename={() => setRenaming(true)}
          onDelete={() => onDeleteFolder(folder)}
        />
      }
      actions={<div></div>}
    >
      {matcher.boldSnippets(folder.name)}
    </RowGroup>
  );
});
