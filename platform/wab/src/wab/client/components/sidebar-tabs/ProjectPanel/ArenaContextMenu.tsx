import { menuSection } from "@/wab/client/components/menu-builder";
import { promptDeleteComponent } from "@/wab/client/components/modals/componentDeletionModal";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import {
  AnyArena,
  getArenaName,
  isComponentArena,
  isDedicatedArena,
  isMixedArena,
  isPageArena,
} from "@/wab/shared/Arenas";
import { componentsReferecerToPageHref } from "@/wab/shared/cached-selectors";
import { assert, spawn } from "@/wab/shared/common";
import {
  isPageComponent,
  isReusableComponent,
} from "@/wab/shared/core/components";
import { isAdminTeamEmail } from "@/wab/shared/devflag-utils";
import { Component } from "@/wab/shared/model/classes";
import { naturalSort } from "@/wab/shared/sort";
import { Menu } from "antd";
import * as React from "react";

export const deleteArenas = async (
  studioCtx: StudioCtx,
  arenas: AnyArena[]
) => {
  const allRefs = arenas.flatMap((arena) =>
    isDedicatedArena(arena) && isPageComponent(arena.component)
      ? Array.from(
          componentsReferecerToPageHref(studioCtx.site, arena.component)
        )
      : []
  );

  await studioCtx.changeObserved(
    () => allRefs,
    ({ success }) => {
      for (const arena of arenas) {
        if (isDedicatedArena(arena)) {
          studioCtx.siteOps().tryRemoveComponent(arena.component);
        } else if (isMixedArena(arena)) {
          studioCtx.siteOps().removeMixedArena(arena);
        }
      }
      return success();
    }
  );
};

/**
 * Context menu shown when right-clicking an arena row.
 *
 * @param onClose callback when context menu should close itself
 * @param onSelectRename callback when rename is clicked
 * Rename option will only be shown if `onClickRename` is set
 */
export function ArenaContextMenu({
  studioCtx,
  arena,
  onSelectRename,
  onClose,
}: {
  studioCtx: StudioCtx;
  arena: AnyArena;
  onSelectRename?: () => void;
  onClose?: () => void;
}) {
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

  const onFindReferences = () => {
    studioCtx.findReferencesComponent = component;
    onClose?.();
  };

  const onDelete = async () => {
    const confirmation = await promptDeleteComponent(
      getSiteItemTypeName(arena),
      getArenaName(arena),
      isDedicatedArena(arena)
        ? studioCtx.commentsCtx
            .computedData()
            .commentStatsByComponent.get(arena.component.uuid)?.commentCount
        : undefined
    );
    if (!confirmation) {
      return;
    }
    await deleteArenas(studioCtx, [arena]);
  };

  return (
    <Menu id="proj-item-menu">
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
        onSelectRename ? (
          <Menu.Item
            key="rename"
            onClick={(e) => {
              e.domEvent.stopPropagation();
              onSelectRename();
            }}
          >
            <strong>Rename</strong> {getSiteItemTypeName(arena)}
          </Menu.Item>
        ) : null,
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
                <strong>Replace</strong> all instances of this component with...
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
                          studioCtx.tplMgr().removeComponentGroup([component], {
                            convertPageHrefToCode: true,
                          });
                          return success();
                        }
                      )
                    }
                  >
                    <strong>Delete</strong> page, but convert PageHref to links
                  </Menu.Item>
                )}
              </Menu.SubMenu>
            )}
          </Menu.SubMenu>
        )}
    </Menu>
  );
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
