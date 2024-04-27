import { Component, ComponentVariantGroup, ObjectPath } from "@/wab/classes";
import { VariantLabel } from "@/wab/client/components/VariantControls";
import {
  makeVariantMenu,
  VariantDataPicker,
} from "@/wab/client/components/variants/variant-menu";
import VariantRow from "@/wab/client/components/variants/VariantRow";
import { EditableLabelHandles } from "@/wab/client/components/widgets/EditableLabel";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { ensure, spawn } from "@/wab/common";
import { VariantPinState } from "@/wab/shared/PinManager";
import { getPlumeVariantDef } from "@/wab/shared/plume/plume-registry";
import { observer } from "mobx-react";
import * as React from "react";
import { DraggableProvidedDragHandleProps } from "react-beautiful-dnd";

interface StandaloneVariantProps {
  studioCtx: StudioCtx;
  component: Component;
  onClone?: (newVariantGroup: ComponentVariantGroup) => void;
  onRenamed?: () => void;
  defaultEditing: boolean;
  group: ComponentVariantGroup;
  viewCtx?: ViewCtx;
  pinState: VariantPinState | undefined;
  isDraggable?: boolean;
  dragHandleProps?: DraggableProvidedDragHandleProps;
  isDragging?: boolean;
  onClick?: () => void;
  onTarget?: (target: boolean) => void;
  onToggle?: () => void;
}

function StandaloneVariant_(props: StandaloneVariantProps) {
  const {
    studioCtx,
    component,
    viewCtx,
    pinState,
    onClick,
    onTarget,
    onToggle,
  } = props;
  const ref = React.useRef<EditableLabelHandles>(null);
  const tplMgr = studioCtx.tplMgr();
  const plumeDef = getPlumeVariantDef(component, props.group.variants[0]);

  const hasCodeExpression = !!props.group.param.defaultExpr;
  const [visibleDataPicker, setVisibleDataPicker] = React.useState(false);

  return (
    <VariantRow
      studioCtx={studioCtx}
      isStandalone
      variant={props.group.variants[0]}
      viewCtx={viewCtx}
      pinState={pinState}
      onClick={onClick}
      onToggle={onToggle}
      onTarget={onTarget}
      plumeDef={plumeDef}
      hasCodeExpression={hasCodeExpression}
      exprButton={{
        wrap: (node) => (
          <VariantDataPicker
            studioCtx={studioCtx}
            component={props.component}
            group={props.group}
            visibleDataPicker={visibleDataPicker}
            setVisibleDataPicker={setVisibleDataPicker}
          >
            {node}
          </VariantDataPicker>
        ),
      }}
      menu={makeVariantMenu({
        isStandalone: true,
        variant: props.group.variants[0],
        component,
        onRemove: () =>
          spawn(studioCtx.siteOps().removeVariantGroup(component, props.group)),
        onClone: () =>
          spawn(
            studioCtx.change(({ success }) => {
              const newVariantGroup = tplMgr.cloneVariantGroup(
                component,
                props.group
              );
              props.onClone?.(newVariantGroup);
              return success();
            })
          ),
        onCopyTo: (toVariant) =>
          spawn(
            studioCtx.change(({ success }) => {
              tplMgr.copyToVariant(
                component,
                props.group.variants[0],
                toVariant
              );
              return success();
            })
          ),
        onMove: (toGroup) =>
          spawn(
            studioCtx.change(({ success }) => {
              tplMgr.moveVariant(component, props.group.variants[0], toGroup);
              return success();
            })
          ),
        onRename: () =>
          spawn(
            studioCtx.change(({ success }) => {
              if (ref.current) {
                ref.current.setEditing(true);
              }
              return success();
            })
          ),
        onChangeAccessType: (accessType) => {
          const state = ensure(
            props.group.linkedState,
            "Variant group is expected to have linked state"
          );
          spawn(
            studioCtx.change(({ success }) => {
              studioCtx.siteOps().updateState(state, {
                accessType,
              });
              return success();
            })
          );
        },
        onEditDynamicValue: () => {
          spawn(
            studioCtx.change(({ success }) => {
              if (!props.group.param.defaultExpr) {
                props.group.param.defaultExpr = new ObjectPath({
                  path: ["undefined"],
                  fallback: null,
                });
              }
              setVisibleDataPicker(true);
              return success();
            })
          );
        },

        onRemoveDynamicValue: () => {
          spawn(
            studioCtx.change(({ success }) => {
              props.group.param.defaultExpr = null;
              return success();
            })
          );
        },
      })}
      label={
        <>
          <VariantLabel
            ref={ref}
            doubleClickToEdit
            onRenamed={props.onRenamed}
            variant={props.group.variants[0]}
            defaultEditing={props.defaultEditing}
          />
        </>
      }
      isDraggable={props.isDraggable}
      dragHandleProps={props.dragHandleProps}
      isDragging={props.isDragging}
    />
  );
}

export const StandaloneVariant = observer(StandaloneVariant_);
