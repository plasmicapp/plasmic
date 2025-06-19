import CommentIndicatorIcon from "@/wab/client/components/comments/CommentIndicatorIcon";
import RowGroup, { RowGroupProps } from "@/wab/client/components/RowGroup";
import RowItem from "@/wab/client/components/RowItem";
import { ArenaContextMenu } from "@/wab/client/components/sidebar-tabs/ProjectPanel/ArenaContextMenu";
import { FolderContextMenu } from "@/wab/client/components/sidebar-tabs/ProjectPanel/FolderContextMenu";
import { NavigationDropdownContext } from "@/wab/client/components/sidebar-tabs/ProjectPanel/NavigationDropdown";
import { Matcher } from "@/wab/client/components/view-common";
import { EditableLabel } from "@/wab/client/components/widgets/EditableLabel";
import { Icon } from "@/wab/client/components/widgets/Icon";
import IconButton from "@/wab/client/components/widgets/IconButton";
import ComponentIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Component";
import GearIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Gear";
import PlusIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Plus";
import MixedArenaIcon from "@/wab/client/plasmic/plasmic_kit_design_system/icons/PlasmicIcon__MixedArena";
import PageIcon from "@/wab/client/plasmic/plasmic_kit_design_system/icons/PlasmicIcon__Page";
import { StudioCtx, useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ArenaType } from "@/wab/shared/ApiSchema";
import {
  AnyArena,
  getArenaName,
  isComponentArena,
  isPageArena,
} from "@/wab/shared/Arenas";
import { ensure, maybe, spawn, switchType } from "@/wab/shared/common";
import { PageComponent } from "@/wab/shared/core/components";
import { getFolderDisplayName } from "@/wab/shared/folders/folders-util";
import { ARENA_LOWER } from "@/wab/shared/Labels";
import { Arena, ComponentArena, PageArena } from "@/wab/shared/model/classes";
import cn from "classnames";
import * as React from "react";

export const HEADER_HEIGHT = 36;
export const PAGE_HEIGHT = 42;
export const ROW_HEIGHT = 32;

export interface Header {
  type: "header";
  name: React.ReactNode;
  key: string;
  items: ArenaPanelRow[];
  count: number;
  onAdd: () => Promise<void>;
}

export interface PageArenaData {
  type: "page";
  key: string;
  arena: PageArena;
  isStandalone?: boolean;
}

export interface CustomArenaData {
  type: "custom";
  key: string;
  arena: Arena;
  isStandalone?: boolean;
}

export interface ComponentArenaData {
  type: "component";
  key: string;
  arena: ComponentArena;
  isStandalone?: boolean;
}

export interface AnyData {
  type: "any";
  key: string;
  element: React.ReactNode;
}

export type ArenaData = ComponentArenaData | CustomArenaData | PageArenaData;

export type ArenaPanelRow = Header | FolderElement | ArenaData | AnyData;

export type OnAddArena = (
  type: ArenaType,
  folderName?: string
) => Promise<void>;

export type OnDeleteFolder = (folder: FolderElement) => Promise<void>;

export type OnFolderRenamed = (folder: FolderElement, newName: string) => void;

export interface ArenaFolderActions {
  onAddArena: OnAddArena;
  onDeleteFolder: OnDeleteFolder;
  onFolderRenamed: OnFolderRenamed;
}

export interface FolderElement {
  type: "folder-element";
  name: string;
  sectionType: ArenaType;
  path?: string;
  key: string;
  items: ArenaPanelRow[];
  count: number;
  actions: ArenaFolderActions;
}

interface NavigationHeaderRowProps extends RowGroupProps {
  onAdd: () => Promise<void>;
  toggleExpand: () => void;
}

export const getArenaDisplay = (arenaType: ArenaType): string => {
  return arenaType === "custom" ? ARENA_LOWER : arenaType;
};

export function NavigationHeaderRow({
  onAdd,
  toggleExpand,
  ...props
}: NavigationHeaderRowProps) {
  return (
    <RowGroup
      style={{ height: HEADER_HEIGHT }}
      className="bt-dim"
      showActions={true}
      actions={
        <IconButton
          onClick={async (e) => {
            e.stopPropagation();
            await onAdd();
            if (!props.isOpen) {
              toggleExpand();
            }
          }}
        >
          <Icon icon={PlusIcon} />
        </IconButton>
      }
      {...props}
    />
  );
}

interface NavigationFolderRowProps extends RowGroupProps {
  folder: FolderElement;
  matcher: Matcher;
  indentMultiplier: number;
  toggleExpand: () => void;
}

export function NavigationFolderRow({
  folder,
  matcher,
  indentMultiplier,
  isOpen,
  toggleExpand,
}: NavigationFolderRowProps) {
  const [renaming, setRenaming] = React.useState(false);
  const labelClass = renaming ? "no-select fill-width" : "no-select";
  const { onAddArena, onDeleteFolder, onFolderRenamed } = folder.actions;
  return (
    <RowGroup
      style={{ height: ROW_HEIGHT, paddingLeft: indentMultiplier * 16 + 12 }}
      showActions={true}
      menu={
        <FolderContextMenu
          onAdd={async () => {
            if (!isOpen) {
              toggleExpand();
            }
            await onAddArena(folder.sectionType, folder.path);
          }}
          itemDisplay={getArenaDisplay(folder.sectionType)}
          onSelectRename={() => setRenaming(true)}
          onDelete={() => onDeleteFolder(folder)}
        />
      }
      actions={<div></div>}
      groupSize={folder.count}
      isOpen={isOpen}
    >
      <EditableLabel
        value={folder.name}
        editing={renaming}
        shrinkLabel={true}
        labelFactory={({ className, ...restProps }) => (
          <div className={cn(labelClass, className)} {...restProps} />
        )}
        onEdit={(newName) => {
          onFolderRenamed(folder, newName);
          setRenaming(false);
        }}
        // We need to programmatically trigger editing, because otherwise
        // double-click will both trigger the editing and also trigger a
        // navigation to the item
        programmaticallyTriggered
      >
        <div className="flex-col">{matcher.boldSnippets(folder.name)}</div>
      </EditableLabel>
    </RowGroup>
  );
}

export interface NavigationArenaRowProps {
  arena: AnyArena;
  matcher: Matcher;
  indentMultiplier: number;
  isStandalone?: boolean;
  isSelected?: boolean;
  onClick: (arena: AnyArena) => void;
}

export function NavigationArenaRow({
  arena,
  matcher,
  indentMultiplier,
  isStandalone,
  isSelected,
  onClick,
}: NavigationArenaRowProps) {
  const [renaming, setRenaming] = React.useState(false);
  const studioCtx = useStudioCtx();
  const { onClose } = ensure(
    React.useContext(NavigationDropdownContext),
    "Expected NavigationDropdownContext"
  );
  const fullArenaName = getArenaName(arena);
  const displayName = isStandalone
    ? fullArenaName
    : getFolderDisplayName(fullArenaName);
  const isPage = isPageArena(arena);
  const pathName = isPage ? arena.component.pageMeta?.path : undefined;

  const pageRowProps = isPage
    ? {
        showActionsOnHover: true,
        actions: (
          <IconButton
            size="small"
            tooltip="Page settings"
            onClick={() =>
              studioCtx.change(({ success }) => {
                studioCtx.showPageSettings = arena.component as PageComponent;
                return success();
              })
            }
          >
            <Icon icon={GearIcon} />
          </IconButton>
        ),
      }
    : {};

  return (
    <RowItem
      style={{
        height: isPage ? PAGE_HEIGHT : ROW_HEIGHT,
        paddingLeft: indentMultiplier * 16 + 12,
      }}
      onClick={() => onClick(arena)}
      icon={<Icon icon={getArenaIcon(arena, studioCtx)} />}
      isSelected={isSelected ?? studioCtx.currentArena === arena}
      menuSize="small"
      menu={
        <ArenaContextMenu
          studioCtx={studioCtx}
          arena={arena}
          onSelectRename={() => setRenaming(true)}
          onClose={onClose}
        />
      }
      {...pageRowProps}
    >
      <EditableLabel
        value={fullArenaName}
        editing={renaming}
        labelFactory={({ className, ...restProps }) => (
          <div
            className={cn("no-select fill-width", className)}
            {...restProps}
          />
        )}
        onEdit={(newName) => {
          maybe(studioCtx.siteOps().tryRenameArena(arena, newName), (p) =>
            spawn(p)
          );
          setRenaming(false);
        }}
        // We need to programmatically trigger editing, because otherwise
        // double-click will both trigger the editing and also trigger a
        // navigation to the item
        programmaticallyTriggered
      >
        <div className="flex-col">
          {matcher.boldSnippets(displayName)}
          {pathName && (
            <span className="dimfg">{matcher.boldSnippets(pathName)}</span>
          )}
        </div>
      </EditableLabel>
    </RowItem>
  );
}

interface NavigationAnyRowProps {
  element: React.ReactNode;
  matcher: Matcher;
}

export function NavigationAnyRow({ element, matcher }: NavigationAnyRowProps) {
  return (
    <div className="ph-lg pv-m fill-width dimfg" style={{ height: ROW_HEIGHT }}>
      {matcher.boldSnippets(element)}
    </div>
  );
}

function getArenaIcon(arena: AnyArena, studioCtx: StudioCtx) {
  if (isPageArena(arena) || isComponentArena(arena)) {
    const commentsStats = studioCtx.commentsCtx
      .computedData()
      .commentStatsByComponent.get(arena.component.uuid);
    if (commentsStats && studioCtx.showCommentsPanel) {
      return () => (
        <CommentIndicatorIcon
          commentCount={commentsStats.commentCount}
          replyCount={commentsStats.replyCount}
        />
      );
    }
  }
  return switchType(arena)
    .when(Arena, () => MixedArenaIcon)
    .when(PageArena, () => PageIcon)
    .when(ComponentArena, () => ComponentIcon)
    .result();
}
