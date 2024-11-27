import RowGroup, { RowGroupProps } from "@/wab/client/components/RowGroup";
import RowItem from "@/wab/client/components/RowItem";
import { Matcher } from "@/wab/client/components/view-common";
import { Icon } from "@/wab/client/components/widgets/Icon";
import IconButton from "@/wab/client/components/widgets/IconButton";
import PlusIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Plus";
import { StudioCtx, useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import {
  AnyArena,
  getArenaName,
  isComponentArena,
  isDedicatedArena,
  isMixedArena,
  isPageArena,
} from "@/wab/shared/Arenas";
import {
  isPageComponent,
  isReusableComponent,
  PageComponent,
} from "@/wab/shared/core/components";
import { getFolderDisplayName } from "@/wab/shared/folders/folders-util";
import {
  Arena,
  Component,
  ComponentArena,
  PageArena,
} from "@/wab/shared/model/classes";
import * as React from "react";

import { COMMANDS } from "@/wab/client/commands/command";
import { menuSection } from "@/wab/client/components/menu-builder";
import promptDeleteComponent from "@/wab/client/components/modals/componentDeletionModal";
import { NavigationDropdownContext } from "@/wab/client/components/sidebar-tabs/ProjectPanel/NavigationDropdown";
import { EditableLabel } from "@/wab/client/components/widgets/EditableLabel";
import ComponentIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Component";
import GearIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Gear";
import MixedArenaIcon from "@/wab/client/plasmic/plasmic_kit_design_system/icons/PlasmicIcon__MixedArena";
import PageIcon from "@/wab/client/plasmic/plasmic_kit_design_system/icons/PlasmicIcon__Page";
import { componentsReferecerToPageHref } from "@/wab/shared/cached-selectors";
import { assert, ensure, maybe, spawn, switchType } from "@/wab/shared/common";
import { isAdminTeamEmail } from "@/wab/shared/devflag-utils";
import { naturalSort } from "@/wab/shared/sort";
import { Menu } from "antd";
import cn from "classnames";

export const HEADER_HEIGHT = 36;
export const PAGE_HEIGHT = 42;
export const ROW_HEIGHT = 32;

interface NavigationHeaderRowProps extends RowGroupProps {
  onAdd: () => Promise<void>;
  toggleExpand: () => void;
}

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
  indentMultiplier: number;
}

export function NavigationFolderRow({
  indentMultiplier,
  ...props
}: NavigationFolderRowProps) {
  return (
    <RowGroup
      style={{ height: ROW_HEIGHT, paddingLeft: indentMultiplier * 16 + 12 }}
      {...props}
    />
  );
}

interface NavigationArenaRowProps {
  arena: AnyArena;
  matcher: Matcher;
  indentMultiplier: number;
  isStandalone?: boolean;
}

export function NavigationArenaRow({
  arena,
  matcher,
  indentMultiplier,
  isStandalone,
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
  const menu = buildArenaRowMenu({ arena, setRenaming, studioCtx, onClose });
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
      onClick={async () => {
        onClose();
        await COMMANDS.navigation.switchArena.execute(studioCtx, arena);
      }}
      icon={<Icon icon={getArenaIcon(arena)} />}
      isSelected={studioCtx.currentArena === arena}
      menuSize="small"
      menu={menu}
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

function getArenaIcon(arena: AnyArena) {
  return switchType(arena)
    .when(Arena, () => MixedArenaIcon)
    .when(PageArena, () => PageIcon)
    .when(ComponentArena, () => ComponentIcon)
    .result();
}

function buildArenaRowMenu({
  arena,
  setRenaming,
  studioCtx,
  onClose,
}: {
  arena: AnyArena;
  onClose: () => void;
  setRenaming: (val: boolean) => void;
  studioCtx: StudioCtx;
}) {
  return () => {
    const currentArena = studioCtx.currentArena;
    const component = isDedicatedArena(arena) ? arena.component : undefined;

    const isSubComp = !!component && !!component.superComp;
    const isSuperComp = !!component && component.subComps.length > 0;
    const isAdmin = isAdminTeamEmail(
      studioCtx.appCtx.selfInfo?.email,
      studioCtx.appCtx.appConfig
    );

    const doReplaceAllInstances = (toComp: Component) => {
      spawn(studioCtx.siteOps().swapComponents(component!, toComp));
    };

    const componentToReplaceAllInstancesItem = (comp: Component) => {
      return (
        <Menu.Item
          key={comp.uuid}
          hidden={!isReusableComponent(comp) || comp === component}
          onClick={() => doReplaceAllInstances(comp)}
        >
          {comp.name}
        </Menu.Item>
      );
    };

    const replaceAllInstancesMenuItems = [
      ...menuSection(
        "local",
        ...naturalSort(studioCtx.site.components, (c) => c.name).map((comp) =>
          componentToReplaceAllInstancesItem(comp)
        )
      ),
      ...studioCtx.site.projectDependencies.flatMap((dep) =>
        menuSection(
          "imported",
          ...naturalSort(dep.site.components, (c) => c.name).map((comp) =>
            componentToReplaceAllInstancesItem(comp)
          )
        )
      ),
    ];

    const contentEditorMode = studioCtx.contentEditorMode;

    const shouldShowItem = {
      duplicate:
        isDedicatedArena(arena) &&
        !isSubComp &&
        (!contentEditorMode || (component && isPageComponent(component))),
      editInNewArtboard:
        isMixedArena(currentArena) &&
        isDedicatedArena(arena) &&
        !contentEditorMode,
      convertToComponent:
        component && isPageComponent(component) && !contentEditorMode,
      convertToPage:
        component &&
        isReusableComponent(component) &&
        !isSubComp &&
        !isSuperComp &&
        !contentEditorMode,
      delete:
        !isSubComp &&
        (!contentEditorMode || (component && isPageComponent(component))),
      findReferences: component && isReusableComponent(component),
      replaceAllInstances:
        component &&
        isReusableComponent(component) &&
        replaceAllInstancesMenuItems.length !== 0 &&
        !contentEditorMode,
    };

    const onDuplicate = () =>
      studioCtx.siteOps().tryDuplicatingComponent(component!, {
        focusNewComponent: true,
      });

    const onRename = () => setRenaming(true);

    const onRequestEditingInNewArtboard = () =>
      studioCtx.changeUnsafe(() =>
        studioCtx.siteOps().createNewFrameForMixedArena(component!)
      );

    const onConvertToComponent = () => {
      assert(
        component && isPageComponent(component),
        "Can only convert Page to component if it exists"
      );
      return studioCtx.siteOps().convertPageToComponent(component);
    };

    const onConvertToPage = () =>
      studioCtx.changeObserved(
        () => [component!],
        ({ success }) => {
          studioCtx.siteOps().convertComponentToPage(component!);
          return success();
        }
      );

    const onFindReferences = () =>
      studioCtx.changeUnsafe(
        () => (studioCtx.findReferencesComponent = component)
      );

    const onDelete = async () => {
      const confirmation = await promptDeleteComponent(
        getSiteItemTypeName(arena),
        getArenaName(arena)
      );
      if (!confirmation) {
        return;
      }
      await studioCtx.changeObserved(
        () => {
          return isDedicatedArena(arena) && isPageComponent(arena.component)
            ? Array.from(
                componentsReferecerToPageHref(studioCtx.site, arena.component)
              )
            : [];
        },
        ({ success }) => {
          if (isDedicatedArena(arena)) {
            studioCtx.siteOps().tryRemoveComponent(arena.component);
          } else if (isMixedArena(arena)) {
            studioCtx.siteOps().removeMixedArena(arena);
          }
          return success();
        }
      );
    };

    return (
      <Menu
        onClick={(e) => {
          e.domEvent.stopPropagation();
          // Auto-close the popover except for these actions
          if (
            ![
              "rename",
              "duplicate",
              "convertToComponent",
              "convertToPage",
            ].includes(e.key)
          ) {
            onClose();
          }
        }}
        id="proj-item-menu"
      >
        {menuSection(
          "references",
          <Menu.Item
            key="references"
            hidden={!shouldShowItem.findReferences}
            onClick={onFindReferences}
          >
            <strong>Find</strong> all references
          </Menu.Item>
        )}
        {menuSection(
          "component-actions",
          <Menu.Item
            key="rename"
            onClick={(e) => {
              e.domEvent.stopPropagation();
              onRename();
            }}
          >
            <strong>Rename</strong> {getSiteItemTypeName(arena)}
          </Menu.Item>,
          <Menu.Item
            key="duplicate"
            hidden={!shouldShowItem.duplicate}
            onClick={onDuplicate}
          >
            <strong>Duplicate</strong> {getSiteItemTypeName(arena)}
          </Menu.Item>
        )}
        {menuSection(
          "artboard-actions",
          <Menu.Item
            key="editInNewArtboard"
            hidden={!shouldShowItem.editInNewArtboard}
            onClick={onRequestEditingInNewArtboard}
          >
            <strong>Edit</strong> in new artboard
          </Menu.Item>,
          <Menu.Item
            key="convertToComponent"
            hidden={!shouldShowItem.convertToComponent}
            onClick={onConvertToComponent}
          >
            <strong>Convert</strong> to reusable component
          </Menu.Item>,
          <Menu.Item
            key="convertToPage"
            hidden={!shouldShowItem.convertToPage}
            onClick={onConvertToPage}
          >
            <strong>Convert</strong> to page component
          </Menu.Item>
        )}
        {shouldShowItem.replaceAllInstances &&
          menuSection(
            "replace",
            <Menu.SubMenu
              key="replaceAllInstances"
              title={
                <span>
                  <strong>Replace</strong> all instances of this component
                  with...
                </span>
              }
            >
              {replaceAllInstancesMenuItems}
            </Menu.SubMenu>
          )}
        {menuSection(
          "delete",
          <Menu.Item
            key="delete"
            onClick={onDelete}
            hidden={!shouldShowItem.delete}
          >
            <strong>Delete</strong> {getSiteItemTypeName(arena)}
          </Menu.Item>
        )}
        {isAdmin &&
          menuSection(
            "debug",
            <Menu.SubMenu key="debug" title={"Debug"}>
              {component && (
                <Menu.SubMenu
                  key="site-splitting"
                  title="Site-splitting utilities"
                >
                  {isPageComponent(component) && (
                    <Menu.Item
                      key="delete-preserve-links"
                      onClick={async () =>
                        studioCtx.changeObserved(
                          () => [
                            component,
                            ...componentsReferecerToPageHref(
                              studioCtx.site,
                              component
                            ),
                          ],
                          ({ success }) => {
                            studioCtx
                              .tplMgr()
                              .removeComponentGroup([component], {
                                convertPageHrefToCode: true,
                              });
                            return success();
                          }
                        )
                      }
                    >
                      <strong>Delete</strong> page, but convert PageHref to
                      links
                    </Menu.Item>
                  )}
                </Menu.SubMenu>
              )}
            </Menu.SubMenu>
          )}
      </Menu>
    );
  };
}

function getSiteItemTypeName(item: AnyArena) {
  if (isMixedArena(item)) {
    return "arena";
  } else if (isComponentArena(item)) {
    return "component";
  } else if (isPageArena(item)) {
    return "page";
  } else {
    return "folder";
  }
}
