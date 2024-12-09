import { mkProjectLocation, openNewTab } from "@/wab/client/cli-routes";
import RowItem from "@/wab/client/components/RowItem";
import { MenuBuilder } from "@/wab/client/components/menu-builder";
import { DefaultComponentKindModal } from "@/wab/client/components/modals/DefaultComponentKindModal";
import { showModalToRefreshCodeComponentProps } from "@/wab/client/components/modals/codeComponentModals";
import promptDeleteComponent from "@/wab/client/components/modals/componentDeletionModal";
import {
  reactPrompt,
  showTemporaryPrompt,
} from "@/wab/client/components/quick-modals";
import { DraggableInsertable } from "@/wab/client/components/studio/add-drawer/DraggableInsertable";
import { Matcher } from "@/wab/client/components/view-common";
import { Icon } from "@/wab/client/components/widgets/Icon";
import { AddItemType } from "@/wab/client/definitions/insertables";
import ComponentIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Component";
import { StudioCtx, useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { MainBranchId } from "@/wab/shared/ApiSchema";
import { isMixedArena } from "@/wab/shared/Arenas";
import { FRAME_CAP } from "@/wab/shared/Labels";
import { isBuiltinCodeComponent } from "@/wab/shared/code-components/builtin-code-components";
import {
  UnknownComponentError,
  compareComponentPropsWithMeta,
} from "@/wab/shared/code-components/code-components";
import { spawn } from "@/wab/shared/common";
import {
  CodeComponent,
  DefaultComponentKind,
  defaultComponentKinds,
  getComponentDisplayName,
  getDefaultComponentKind,
  getDefaultComponentLabel,
  getFolderComponentDisplayName,
  getSuperComponents,
  isCodeComponent,
  isContextCodeComponent,
  isHostLessCodeComponent,
  isReusableComponent,
} from "@/wab/shared/core/components";
import { Component } from "@/wab/shared/model/classes";
import { Menu, Popover, notification } from "antd";
import { observer } from "mobx-react";
import * as React from "react";

export const ComponentRow = observer(function ComponentRow(props: {
  component: Component;
  matcher: Matcher;
  indentMultiplier: number;
  importedFrom?: string;
}) {
  const { component, matcher, importedFrom, indentMultiplier } = props;
  const studioCtx = useStudioCtx();
  const isPlainComponent =
    isReusableComponent(component) &&
    !isCodeComponent(component) &&
    !importedFrom;
  const isCodeComp = isCodeComponent(component);
  const readOnly = studioCtx.getLeftTabPermission("components") === "readable";

  const overlay = () => {
    const builder = new MenuBuilder();
    if (isCodeComp) {
      buildCodeComponentMenuItems(builder, studioCtx, component);
    } else {
      buildPlasmicComponentMenuItems(
        builder,
        studioCtx,
        component,
        readOnly,
        isPlainComponent,
        importedFrom
      );
    }

    return builder.build({ menuName: "component-item-menu" });
  };

  const calcIndent = !matcher.hasQuery()
    ? getSuperComponents(component).length + indentMultiplier
    : indentMultiplier;

  const defaultComponentKind = getDefaultComponentKind(
    studioCtx.site,
    component
  );
  return (
    <DraggableInsertable
      sc={studioCtx}
      spec={{
        key: component.uuid,
        label: getComponentDisplayName(component),
        factory: (vc: ViewCtx) => {
          return vc.variantTplMgr().mkTplComponentWithDefaults(component);
        },
        icon: (
          <Icon
            icon={ComponentIcon}
            className={!isCodeComp ? "component-fg" : undefined}
          />
        ),
        type: AddItemType.tpl,
      }}
    >
      <RowItem
        style={{
          height: 32,
          paddingLeft: calcIndent * 16 + 6,
          paddingRight: 6,
        }}
        icon={<Icon icon={ComponentIcon} />}
        menu={overlay}
        menuSize={"small"}
        onClick={
          isPlainComponent
            ? () => {
                spawn(
                  studioCtx.change(({ success }) => {
                    studioCtx.switchToComponentArena(component);
                    return success();
                  })
                );
              }
            : undefined
        }
        data-test-id={`listitem-component-${component.name}`}
      >
        {defaultComponentKind ? (
          <Popover
            content={
              <p>
                <strong>Default component:</strong>{" "}
                {getDefaultComponentLabel(defaultComponentKind)}
              </p>
            }
          >
            <strong>
              {matcher.boldSnippets(getFolderComponentDisplayName(component))}
            </strong>
          </Popover>
        ) : (
          matcher.boldSnippets(getFolderComponentDisplayName(component))
        )}
      </RowItem>
    </DraggableInsertable>
  );
});

function buildPlasmicComponentMenuItems(
  builder: MenuBuilder,
  studioCtx: StudioCtx,
  component: Component,
  readOnly: boolean,
  isPlainComponent: boolean,
  importedFrom?: string
) {
  const onDuplicate = readOnly
    ? undefined
    : () => studioCtx.siteOps().tryDuplicatingComponent(component);
  const arena = studioCtx.currentArena;
  builder.genSection(undefined, (push) => {
    if (!readOnly && isPlainComponent) {
      push(
        <Menu.Item
          key="open-dedicated-arena"
          onClick={() =>
            studioCtx.changeUnsafe(() =>
              studioCtx.switchToComponentArena(component)
            )
          }
        >
          <strong data-test-id="edit-component">Edit</strong> component
        </Menu.Item>
      );
      if (isMixedArena(arena)) {
        push(
          <Menu.Item
            key="open"
            onClick={() =>
              studioCtx.changeUnsafe(() =>
                studioCtx.siteOps().createNewFrameForMixedArena(component)
              )
            }
          >
            <strong>Edit</strong> in new {FRAME_CAP}
          </Menu.Item>
        );
      }
    }
    if (importedFrom) {
      push(
        <Menu.Item
          key="open-imported-component"
          onClick={() => {
            openNewTab(
              mkProjectLocation({
                projectId: importedFrom,
                slug: component.name,
                branchName: MainBranchId,
                branchVersion: "latest",
                arenaType: "component",
                arenaUuidOrNameOrPath: component.uuid,
              })
            );
          }}
        >
          <strong>Open</strong> component in new tab
        </Menu.Item>
      );
    }
  });

  builder.genSection(undefined, (push) => {
    if (!readOnly && isPlainComponent) {
      push(
        <Menu.Item
          key="rename"
          onClick={async () => {
            const name = await reactPrompt({
              message: "What's the new name for this component?",
              actionText: "Rename",
              placeholder: "New component name",
              defaultValue: component.name,
            });

            if (name) {
              await studioCtx.changeUnsafe(() =>
                studioCtx.siteOps().tryRenameComponent(component, name)
              );
            }
          }}
        >
          <strong>Rename</strong> component
        </Menu.Item>
      );
    }

    if (onDuplicate) {
      push(
        <Menu.Item key="duplicate" onClick={() => onDuplicate()}>
          <strong>Duplicate</strong> component
        </Menu.Item>
      );
    }

    if (!readOnly && isPlainComponent) {
      push(
        <Menu.Item
          key="convert_to_page"
          onClick={() =>
            studioCtx.changeObserved(
              () => [component],
              ({ success }) => {
                studioCtx.siteOps().convertComponentToPage(component);
                return success();
              }
            )
          }
        >
          <strong>Convert</strong> to page
        </Menu.Item>
      );
    }
  });

  buildCommonComponentMenuItems(builder, studioCtx, component);

  builder.genSection(undefined, (push) => {
    if (!readOnly && isPlainComponent) {
      push(
        <Menu.Item
          key="delete"
          onClick={async () => {
            const confirmation = await promptDeleteComponent(
              "component",
              component.name
            );
            if (!confirmation) {
              return;
            }
            await studioCtx.changeUnsafe(() =>
              studioCtx.siteOps().tryRemoveComponent(component)
            );
          }}
        >
          <strong>Delete</strong> component
        </Menu.Item>
      );
    }
  });
}

function buildCodeComponentMenuItems(
  builder: MenuBuilder,
  studioCtx: StudioCtx,
  component: CodeComponent
) {
  builder.genSection(undefined, (push) => {
    push(
      <Menu.Item
        key="refresh"
        onClick={() => {
          const registration = studioCtx.codeComponentsRegistry
            .getRegisteredCodeComponentsMap()
            .get(component.name);
          if (!registration) {
            notification.error({
              message: "Code component not registered",
            });
            return;
          }
          const { meta } = registration;

          const diffsOrError = compareComponentPropsWithMeta(
            studioCtx.site,
            component,
            meta
          );
          diffsOrError.match({
            success: (diffs) => {
              if (
                [diffs.addedProps, diffs.removedProps, diffs.updatedProps].some(
                  (i) => i.length > 0
                )
              ) {
                spawn(
                  showModalToRefreshCodeComponentProps([
                    { ...diffs, component },
                  ])
                );
              } else {
                notification.info({
                  message: `${getComponentDisplayName(
                    component
                  )} is up to date`,
                });
              }
            },
            failure: (err: UnknownComponentError) => {
              notification.error({
                message: err.message,
              });
              reportError(err);
            },
          });
        }}
      >
        <strong>Refresh</strong> registered props
      </Menu.Item>
    );
  });

  buildCommonComponentMenuItems(builder, studioCtx, component);

  builder.genSection(undefined, (push) => {
    if (isHostLessCodeComponent(component)) {
      return;
    }
    push(
      <Menu.Item
        key="delete"
        onClick={() =>
          studioCtx.siteOps().tryRemapCodeComponent(
            component,
            <>
              Delete code component {getComponentDisplayName(component)} (
              <code>{component.codeComponentMeta.importPath}</code>)
            </>
          )
        }
      >
        <strong>Delete</strong> component
      </Menu.Item>
    );
  });
}

function buildCommonComponentMenuItems(
  builder: MenuBuilder,
  studioCtx: StudioCtx,
  component: Component
) {
  const onFindReferences = () => {
    spawn(
      studioCtx.changeUnsafe(
        () => (studioCtx.findReferencesComponent = component)
      )
    );
  };
  builder.genSection(undefined, (push) => {
    push(
      <Menu.Item key="references" onClick={onFindReferences}>
        <strong>Find</strong> all references
      </Menu.Item>
    );
    genComponentSwapMenuItem(builder, studioCtx, component);
  });

  builder.genSection(undefined, (push) => {
    push(
      <Menu.Item
        key="promote-default-kind"
        onClick={async () => {
          const kind = await showTemporaryPrompt<
            DefaultComponentKind | undefined
          >((onSubmit, onCancel) => (
            <DefaultComponentKindModal
              onSubmit={onSubmit}
              onCancel={onCancel}
            />
          ));
          if (kind) {
            spawn(
              studioCtx.change(({ success }) => {
                studioCtx
                  .siteOps()
                  .promoteComponentToDefaultKind(studioCtx, component, kind);
                return success();
              })
            );
          }
        }}
      >
        Set as <strong>default component category</strong>
      </Menu.Item>
    );
    const matchingDefaultComponent = Object.entries(
      studioCtx.site.defaultComponents
    ).find(([_, _component]) => _component === component);
    if (matchingDefaultComponent) {
      const [kind] = matchingDefaultComponent;
      push(
        <Menu.Item
          key="demote-default-kind"
          onClick={async () => {
            await studioCtx.change(({ success }) => {
              delete studioCtx.site.defaultComponents[kind];
              return success();
            });
          }}
        >
          Unset as{" "}
          <strong>
            default component category {defaultComponentKinds[kind]}
          </strong>
        </Menu.Item>
      );
    }
    push(
      <Menu.Item
        key="set-page-wrapper"
        onClick={async () => {
          await studioCtx.change(({ success }) => {
            studioCtx.site.pageWrapper =
              studioCtx.site.pageWrapper === component ? undefined : component;
            return success();
          });
        }}
      >
        {studioCtx.site.pageWrapper === component ? "Unset" : "Set"} as{" "}
        <strong>default page wrapper</strong>
      </Menu.Item>
    );
  });
}

function genComponentSwapMenuItem(
  builder: MenuBuilder,
  studioCtx: StudioCtx,
  component: Component
) {
  const doSwap = (toComp: Component) => {
    spawn(studioCtx.siteOps().swapComponents(component, toComp));
  };
  const pushComps = (
    comps: Component[],
    push: (x: React.ReactElement) => void,
    includeCodeComponents: boolean
  ) => {
    for (const comp of comps) {
      if (
        isReusableComponent(comp) &&
        comp !== component &&
        (!isCodeComponent(comp) ||
          (!isBuiltinCodeComponent(comp) &&
            (includeCodeComponents || isHostLessCodeComponent(comp)) &&
            !isContextCodeComponent(comp)))
      ) {
        push(
          <Menu.Item key={comp.uuid} onClick={() => doSwap(comp)}>
            {getComponentDisplayName(comp)}
          </Menu.Item>
        );
      }
    }
  };
  builder.genSub(
    <>
      <strong>Replace</strong> all instances of this component with...
    </>,
    (push) => {
      pushComps(studioCtx.site.components, push, true);
      for (const dep of studioCtx.site.projectDependencies) {
        builder.genSection(`Imported from "${dep.name}"`, (_push) => {
          pushComps(dep.site.components, _push, false);
        });
      }
    }
  );
}
