import { observer } from "mobx-react-lite";
import * as React from "react";
import { DraggableProvidedDragHandleProps } from "react-beautiful-dnd";
import { Component, ComponentVariantGroup, ObjectPath } from "../../../classes";
import { ensure, spawn } from "../../../common";
import { VariantPinState } from "../../../shared/PinManager";
import { getPlumeVariantDef } from "../../../shared/plume/plume-registry";
import { StudioCtx } from "../../studio-ctx/StudioCtx";
import { ViewCtx } from "../../studio-ctx/view-ctx";
import { VariantLabel } from "../VariantControls";
import { EditableLabelHandles } from "../widgets/EditableLabel";
import { makeVariantMenu, VariantDataPicker } from "./variant-menu";
import VariantRow from "./VariantRow";

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
