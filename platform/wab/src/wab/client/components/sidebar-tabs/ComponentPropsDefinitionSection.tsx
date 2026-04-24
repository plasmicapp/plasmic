import { WithContextMenu } from "@/wab/client/components/ContextMenu";
import RowGroup from "@/wab/client/components/RowGroup";
import { ComponentPropModal } from "@/wab/client/components/modals/ComponentPropModal";
import { confirm } from "@/wab/client/components/quick-modals";
import { ValuePreview } from "@/wab/client/components/sidebar-tabs/data-tab";
import { SidebarSection } from "@/wab/client/components/sidebar/SidebarSection";
import { IconLinkButton } from "@/wab/client/components/widgets";
import { PropsTooltip } from "@/wab/client/components/widgets/DetailedTooltips";
import { EditableLabel } from "@/wab/client/components/widgets/EditableLabel";
import { Icon } from "@/wab/client/components/widgets/Icon";
import { LabelWithDetailedTooltip } from "@/wab/client/components/widgets/LabelWithDetailedTooltip";
import { LabeledListItem } from "@/wab/client/components/widgets/LabeledListItem";
import { SimpleReorderableList } from "@/wab/client/components/widgets/SimpleReorderableList";
import PlusIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Plus";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import {
  COMPONENT_PROP_LOWER,
  COMPONENT_PROP_PLURAL_CAP,
} from "@/wab/shared/Labels";
import { getSlotParams } from "@/wab/shared/SlotUtils";
import { toVarName } from "@/wab/shared/codegen/util";
import { ensure, spawn } from "@/wab/shared/common";
import {
  canChangeParamExportType,
  canDeleteParam,
  canRenameParam,
  findPropUsages,
  getParamDisplayName,
  getRealParams,
  isCodeComponent,
  removeComponentParam,
} from "@/wab/shared/core/components";
import { ParamExportType } from "@/wab/shared/core/lang";
import {
  getAncestorFolderPaths,
  getFolderDisplayName,
  parseFolderSegments,
  renameFolderLeaf,
} from "@/wab/shared/folders/folders-util";
import {
  PropFolderNode,
  PropTreeNode,
  buildPropTree,
  collectParams,
  reorderLevel,
} from "@/wab/shared/folders/prop-tree";
import { Component, Param, isKnownPropParam } from "@/wab/shared/model/classes";
import { Menu, Tooltip } from "antd";
import { observer } from "mobx-react";
import React from "react";
import { DraggableProvidedDragHandleProps } from "react-beautiful-dnd";
import { FaCheck } from "react-icons/fa";

type PropsTreeCtxValue = {
  openNewPropModal: (prefix: string) => void;
  expandedFolders: Set<string>;
  toggleFolderExpanded: (path: string) => void;
  expandAncestorsOf: (param: Param) => void;
};
const PropsTreeCtx = React.createContext<PropsTreeCtxValue | null>(null);
const usePropsTreeCtx = () =>
  ensure(React.useContext(PropsTreeCtx), "PropsTreeCtx missing");

/**
 * The sidebar section for prop definitions. Delegates rendering to `PropsDefinitionSection`
 */
export const ComponentPropsDefinitionSection = observer(
  function ComponentParamsPanel(props: {
    studioCtx: StudioCtx;
    component: Component;
    viewCtx: ViewCtx;
    justOneSection?: "variants" | "slots" | "meta";
  }) {
    const { studioCtx, component, viewCtx } = props;
    const [newPropPrefix, setNewPropPrefix] = React.useState<string | null>(
      null
    );
    const [expandedFolders, setExpandedFolders] = React.useState(
      new Set<string>()
    );

    const expandAncestorsOf = (param: Param) => {
      const ancestors = getAncestorFolderPaths(
        getParamDisplayName(component, param)
      );
      setExpandedFolders((prev) => new Set([...prev, ...ancestors]));
    };

    const slotParams = getSlotParams(component);
    const realParams = getRealParams(component);

    return (
      <PropsTreeCtx.Provider
        value={{
          openNewPropModal: setNewPropPrefix,
          expandedFolders,
          toggleFolderExpanded: (path) =>
            setExpandedFolders((prev) => {
              const next = new Set(prev);
              next.has(path) ? next.delete(path) : next.add(path);
              return next;
            }),
          expandAncestorsOf,
        }}
      >
        <SidebarSection
          title={
            <LabelWithDetailedTooltip tooltip={PropsTooltip}>
              {COMPONENT_PROP_PLURAL_CAP}
            </LabelWithDetailedTooltip>
          }
          controls={
            <IconLinkButton
              onClick={() => setNewPropPrefix("")}
              data-test-id="add-prop-btn"
            >
              <Icon icon={PlusIcon} />
            </IconLinkButton>
          }
          zeroBodyPadding
          emptyBody={!slotParams.length && !realParams.length}
          data-test-id="props-section"
        >
          {realParams.length > 0 && (
            <PropsDefinitionSection
              studioCtx={studioCtx}
              component={component}
              viewCtx={viewCtx}
              params={realParams}
              draggable
            />
          )}
        </SidebarSection>
        {newPropPrefix !== null && (
          <ComponentPropModal
            studioCtx={studioCtx}
            component={component}
            visible
            suggestedName={newPropPrefix}
            onFinish={(newParam) => {
              if (newParam) {
                expandAncestorsOf(newParam);
              }
              setNewPropPrefix(null);
            }}
          />
        )}
      </PropsTreeCtx.Provider>
    );
  }
);

/**
 * Renders the props section content.
 */
const PropsDefinitionSection = observer(function PropsDefinitionSection(props: {
  studioCtx: StudioCtx;
  component: Component;
  viewCtx: ViewCtx;
  params: Param[];
  draggable?: boolean;
}) {
  const { studioCtx, component, viewCtx, params, draggable } = props;
  const tree = buildPropTree(component, params);
  return (
    <div className="mb-xlg">
      <PropsLevel
        studioCtx={studioCtx}
        component={component}
        viewCtx={viewCtx}
        siblings={tree}
        draggable={draggable}
      />
    </div>
  );
});

/**
 * Renders one level (siblings) of the folder tree as a reorderable list.
 */
const PropsLevel = observer(function PropsLevel(props: {
  studioCtx: StudioCtx;
  component: Component;
  viewCtx: ViewCtx;
  siblings: PropTreeNode[];
  draggable?: boolean;
}) {
  const { studioCtx, component, viewCtx, siblings, draggable } = props;
  return (
    <SimpleReorderableList
      onReordered={(fromIndex, toIndex) =>
        studioCtx.change(({ success }) => {
          reorderLevel(component, siblings, fromIndex, toIndex);
          return success();
        })
      }
      customDragHandle
    >
      {siblings.map((node) =>
        node.kind === "param" ? (
          <PropRow
            key={`param-${node.param.uid}`}
            studioCtx={studioCtx}
            component={component}
            viewCtx={viewCtx}
            param={node.param}
            draggable={draggable}
          />
        ) : (
          <PropFolderRow
            key={`folder-${node.path}`}
            studioCtx={studioCtx}
            component={component}
            viewCtx={viewCtx}
            node={node}
            draggable={draggable}
          />
        )
      )}
    </SimpleReorderableList>
  );
});

/**
 * Renders a prop folder, i.e. the folder header, and its children (delegated to `PropsLevel`)
 */
const PropFolderRow = observer(function PropFolderRow(props: {
  studioCtx: StudioCtx;
  component: Component;
  viewCtx: ViewCtx;
  node: PropFolderNode;
  draggable?: boolean;
  dragHandleProps?: DraggableProvidedDragHandleProps;
}) {
  const { studioCtx, component, viewCtx, node, draggable, dragHandleProps } =
    props;
  const { openNewPropModal, expandedFolders, toggleFolderExpanded } =
    usePropsTreeCtx();
  const isOpen = expandedFolders.has(node.path);
  const leafCount = collectParams(node).length;
  return (
    <>
      <RowGroup
        isOpen={isOpen}
        onClick={() => toggleFolderExpanded(node.path)}
        groupSize={leafCount}
        draggable={draggable}
        dragHandleProps={dragHandleProps}
        showActions
        actions={
          <Tooltip title={`Add ${COMPONENT_PROP_LOWER} to folder`}>
            <IconLinkButton
              onClick={(e) => {
                e.stopPropagation();
                openNewPropModal(
                  `${parseFolderSegments(node.path).join(" / ")} / `
                );
              }}
              data-test-id="add-prop-to-folder-btn"
            >
              <Icon icon={PlusIcon} />
            </IconLinkButton>
          </Tooltip>
        }
      >
        {node.name}
      </RowGroup>
      {isOpen && (
        <div className="pl-lg">
          <PropsLevel
            studioCtx={studioCtx}
            component={component}
            viewCtx={viewCtx}
            siblings={node.children}
            draggable={draggable}
          />
        </div>
      )}
    </>
  );
});

/**
 * A leaf prop row
 */
const PropRow = observer(function ParamRow(props: {
  studioCtx: StudioCtx;
  component: Component;
  viewCtx: ViewCtx;
  param: Param;
  children?: React.ReactNode;
  draggable?: boolean;
  dragHandleProps?: DraggableProvidedDragHandleProps;
}) {
  const { studioCtx, component, viewCtx, param, draggable } = props;
  const { expandAncestorsOf } = usePropsTreeCtx();

  const maybeState = component.states.find((s) => s.param === param);
  const env = viewCtx.getCanvasEnvForTpl(component.tplTree);
  const currentValue = maybeState
    ? viewCtx.getCanvasStateValue(maybeState)
    : env?.$props?.[toVarName(param.variable.name)];

  const [showModal, setShowModal] = React.useState(false);
  const canRename = canRenameParam(component, param);
  const overlay = () =>
    makeParamMenu(studioCtx, component, param, {
      onConfigureParam: () => setShowModal(true),
    });

  return (
    <>
      <WithContextMenu overlay={overlay}>
        <LabeledListItem
          draggable={draggable}
          dragHandleProps={props.dragHandleProps}
          onClick={() => setShowModal(true)}
          label={
            <div>
              <EditableLabel
                value={getFolderDisplayName(
                  getParamDisplayName(component, param)
                )}
                onEdit={(val) =>
                  spawn(
                    studioCtx.change(({ success }) => {
                      if (val) {
                        const newName = renameFolderLeaf(
                          getParamDisplayName(component, param),
                          val
                        );
                        studioCtx
                          .tplMgr()
                          .renameParam(component, param, newName);
                        expandAncestorsOf(param);
                      }
                      return success();
                    })
                  )
                }
                disabled={!canRename}
              />
              {isKnownPropParam(param) && param.advanced && (
                <div className="text-xsm dimfg">(advanced)</div>
              )}
            </div>
          }
          menu={overlay}
        >
          <ValuePreview val={currentValue} />
        </LabeledListItem>
      </WithContextMenu>
      {showModal && (
        <ComponentPropModal
          visible
          studioCtx={studioCtx}
          component={component}
          existingParam={param}
          onFinish={(updatedParam) => {
            if (updatedParam) {
              expandAncestorsOf(updatedParam);
            }
            setShowModal(false);
          }}
        />
      )}
    </>
  );
});

function makeParamMenu(
  studioCtx: StudioCtx,
  component: Component,
  param: Param,
  opts: { onConfigureParam: () => void }
) {
  return (
    <Menu>
      <Menu.Item onClick={() => opts.onConfigureParam()}>
        Configure {COMPONENT_PROP_LOWER}
      </Menu.Item>
      {canChangeParamExportType(component, param) && (
        <Menu.SubMenu title="Set code export type to">
          {[
            ParamExportType.External,
            ParamExportType.Internal,
            ParamExportType.ToolsOnly,
          ].map((exportType) => (
            <Menu.Item
              key={exportType}
              onClick={() =>
                studioCtx.changeUnsafe(() => (param.exportType = exportType))
              }
            >
              {exportType}{" "}
              {param.exportType === exportType ? <FaCheck /> : null}
            </Menu.Item>
          ))}
        </Menu.SubMenu>
      )}
      {!isCodeComponent(component) && canDeleteParam(component, param) && (
        <Menu.Item
          onClick={async () => {
            const usages = findPropUsages(component, param);
            if (usages?.length > 0) {
              const confirmed = await confirm({
                title: "Confirm deletion",
                message: `Prop "${
                  param.displayName ?? param.variable.name
                }" is still being used by ${component.name} in ${
                  usages.length
                } ${
                  usages.length > 1 ? "different locations" : "location"
                }. Are you sure you want to delete it?`,
                confirmLabel: "Delete",
              });
              if (!confirmed) {
                return;
              }
            }

            await studioCtx.changeUnsafe(() => {
              removeComponentParam(studioCtx.site, component, param);
            });
          }}
        >
          Delete {COMPONENT_PROP_LOWER}
        </Menu.Item>
      )}
    </Menu>
  );
}
