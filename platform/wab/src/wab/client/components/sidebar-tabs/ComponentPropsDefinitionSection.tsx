import { Component, Param } from "@/wab/classes";
import { WithContextMenu } from "@/wab/client/components/ContextMenu";
import { ComponentPropModal } from "@/wab/client/components/modals/ComponentPropModal";
import { confirm } from "@/wab/client/components/quick-modals";
import { ValuePreview } from "@/wab/client/components/sidebar-tabs/data-tab";
import { SidebarSection } from "@/wab/client/components/sidebar/SidebarSection";
import { IconLinkButton } from "@/wab/client/components/widgets";
import { EditableLabel } from "@/wab/client/components/widgets/EditableLabel";
import { Icon } from "@/wab/client/components/widgets/Icon";
import { LabeledListItem } from "@/wab/client/components/widgets/LabeledListItem";
import { SimpleReorderableList } from "@/wab/client/components/widgets/SimpleReorderableList";
import PlusIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Plus";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { moveIndex, spawn } from "@/wab/common";
import {
  canChangeParamExportType,
  canDeleteParam,
  canRenameParam,
  findPropUsages,
  getRealParams,
  isCodeComponent,
  removeComponentParam,
} from "@/wab/components";
import { ParamExportType } from "@/wab/lang";
import { toVarName } from "@/wab/shared/codegen/util";
import {
  COMPONENT_PROP_LOWER,
  COMPONENT_PROP_PLURAL_CAP,
} from "@/wab/shared/Labels";
import { getSlotParams } from "@/wab/shared/SlotUtils";
import { Menu } from "antd";
import { observer } from "mobx-react";
import React from "react";
import { DraggableProvidedDragHandleProps } from "react-beautiful-dnd";
import { FaCheck } from "react-icons/fa";

export const ComponentPropsDefinitionSection = observer(
  function ComponentParamsPanel(props: {
    studioCtx: StudioCtx;
    component: Component;
    justOneSection?: "variants" | "slots" | "meta";
  }) {
    const { studioCtx, component } = props;
    const [showNewParamModal, setShowNewParamModal] = React.useState(false);

    const slotParams = getSlotParams(component);
    const realParams = getRealParams(component);

    return (
      <>
        <SidebarSection
          title={COMPONENT_PROP_PLURAL_CAP}
          controls={
            <IconLinkButton
              onClick={() => setShowNewParamModal(true)}
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
              params={realParams}
              showType={true}
              showDefault={true}
              draggable
            />
          )}
        </SidebarSection>
        {showNewParamModal && (
          <ComponentPropModal
            studioCtx={studioCtx}
            component={component}
            visible={showNewParamModal}
            onFinish={() => setShowNewParamModal(false)}
          />
        )}
      </>
    );
  }
);

function PropsDefinitionSection(props: {
  studioCtx: StudioCtx;
  component: Component;
  params: Param[];
  showType?: boolean;
  draggable?: boolean;
  showDefault?: boolean;
}) {
  const { studioCtx, component, params, showType, showDefault, draggable } =
    props;
  return (
    <div className="mb-xlg">
      <SimpleReorderableList
        onReordered={(fromIndex, toIndex) =>
          studioCtx.change(({ success }) => {
            const realFromIndex = component.params.findIndex(
              (param) => params[fromIndex].uid === param.uid
            );
            const realToIndex = component.params.findIndex(
              (param) => params[toIndex].uid === param.uid
            );
            moveIndex(component.params, realFromIndex, realToIndex);
            return success();
          })
        }
        customDragHandle
      >
        {params.map((param) => (
          <PropRow
            studioCtx={studioCtx}
            component={component}
            param={param}
            showType={showType}
            showDefault={showDefault}
            draggable={draggable}
          />
        ))}
      </SimpleReorderableList>
    </div>
  );
}

const PropRow = observer(function ParamRow(props: {
  studioCtx: StudioCtx;
  component: Component;
  param: Param;
  children?: React.ReactNode;
  showType?: boolean;
  showDefault?: boolean;
  draggable?: boolean;
  dragHandleProps?: DraggableProvidedDragHandleProps;
}) {
  const { studioCtx, component, param, draggable } = props;

  const viewCtx = studioCtx.focusedViewCtx();
  const maybeState = component.states.find((s) => s.param === param);
  const env = viewCtx?.getCanvasEnvForTpl(component.tplTree);
  const currentValue = maybeState
    ? viewCtx?.getCanvasStateValue(maybeState)
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
            <EditableLabel
              value={param.variable.name}
              onEdit={(val) =>
                spawn(
                  studioCtx.change(({ success }) => {
                    if (val) {
                      studioCtx.tplMgr().renameParam(component, param, val);
                    }
                    return success();
                  })
                )
              }
              disabled={!canRename}
            />
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
          onFinish={() => setShowModal(false)}
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
