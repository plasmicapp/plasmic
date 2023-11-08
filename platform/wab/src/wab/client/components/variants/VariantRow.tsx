import { observer } from "mobx-react-lite";
import * as React from "react";
import { DraggableProvidedDragHandleProps } from "react-beautiful-dnd";
import { Variant } from "../../../classes";
import { maybe } from "../../../common";
import { getEffectiveVariantSetting } from "../../../shared/effective-variant-setting";
import { VariantPinState } from "../../../shared/PinManager";
import { PlumeVariantDef } from "../../../shared/plume/plume-registry";
import {
  isBaseVariant,
  isVariantSettingEmpty,
  tryGetVariantSetting,
} from "../../../shared/Variants";
import { isTplVariantable, summarizeTpl } from "../../../tpls";
import VariantIcon from "../../plasmic/plasmic_kit_design_system/PlasmicIcon__Variant";
import {
  PlasmicVariantRow,
  PlasmicVariantRow__OverridesType,
} from "../../plasmic/plasmic_kit_variants/PlasmicVariantRow";
import { StudioCtx } from "../../studio-ctx/StudioCtx";
import { ViewCtx } from "../../studio-ctx/view-ctx";
import { useContextMenu } from "../ContextMenu";
import { PlumyIcon } from "../plume/plume-markers";
import {
  VariantSettingPopoverContent,
  VariantSettingPopoverTitle,
} from "../style-controls/DefinedIndicator";
import { Icon } from "../widgets/Icon";

interface VariantRowProps {
  studioCtx: StudioCtx;
  viewCtx?: ViewCtx;
  variant: Variant;
  pinState: VariantPinState | undefined;
  label?: React.ReactNode;
  menu?: () => React.ReactElement;
  className?: string;
  style?: React.CSSProperties;
  isReadOnly?: boolean;
  isStandalone?: boolean;
  isDragging?: boolean;
  isDraggable?: boolean;
  dragHandleProps?: DraggableProvidedDragHandleProps;
  onClick?: () => void;
  onTarget?: (target: boolean) => void;
  onToggle?: () => void;
  plumeDef?: PlumeVariantDef;
  hasCodeExpression?: boolean;
  exprButton?: PlasmicVariantRow__OverridesType["exprButton"];
}

export function pinStateToPlasmicPinState(pinState?: VariantPinState) {
  if (!pinState) {
    return undefined;
  }

  return pinState.startsWith("selected")
    ? "selected"
    : pinState === "pinned-true"
    ? "pinnedTrue"
    : pinState === "pinned-false"
    ? "pinnedFalse"
    : pinState === "evaluated-true"
    ? "evaluatedTrue"
    : undefined;
}

const VariantRow = observer(function VariantRow(props: VariantRowProps) {
  const {
    studioCtx,
    isStandalone,
    viewCtx,
    pinState,
    variant,
    label,
    className,
    style,
    menu,
    isReadOnly: _isReadOnly,
    isDragging,
    isDraggable,
    dragHandleProps,
    onClick,
    onTarget,
    onToggle,
    plumeDef,
    ...rest
  } = props;

  const contextMenuProps = useContextMenu({ menu });

  const isBase = isBaseVariant(variant);
  const isRecording = pinState?.startsWith("selected");

  const tpl = viewCtx?.focusedTpl() ?? undefined;
  const indicatedVs =
    tpl &&
    isTplVariantable(tpl) &&
    maybe(tryGetVariantSetting(tpl, [variant]), (vs) =>
      isVariantSettingEmpty(vs) ? undefined : vs
    );

  return (
    <PlasmicVariantRow
      type={isBase ? "baseVariant" : isStandalone ? "toggle" : undefined}
      pinState={pinStateToPlasmicPinState(pinState)}
      variantPinButton={{
        onToggle,
        ...{
          "data-event": "variantspanel-variant-pin-button",
        },
      }}
      recordButton={
        onTarget
          ? {
              tooltip: isRecording ? "Stop recording" : "Add to recording",
              onClick: (e) => {
                e.stopPropagation();
                onTarget(!isRecording);
              },
              ...{
                "data-test-class": `variant-record-button-${
                  isRecording ? "stop" : "start"
                }`,
                "data-event": "variantspanel-variant-record-button",
              },
            }
          : { render: () => null }
      }
      root={{
        props: {
          ...contextMenuProps,
          className,
          style,
          "data-test-class": "variant-row",
        },
      }}
      listItem={{
        menu,
        additional: null,
        onClick: () => {
          if (!isDragging) {
            onClick && onClick();
          }
        },
        isDraggable,
        isDragging,
        dragHandleProps,
        ...{
          "data-event": "variantspanel-variant-row",
          "data-event-is-base": `${isBase}`,
        },
      }}
      icon={
        plumeDef ? (
          <PlumyIcon def={plumeDef}>
            <Icon icon={VariantIcon} />
          </PlumyIcon>
        ) : (
          <Icon icon={VariantIcon} />
        )
      }
      isIndicated={!!indicatedVs}
      indicator={
        indicatedVs && tpl && viewCtx
          ? {
              popover: () => (
                <VariantSettingPopoverContent
                  site={studioCtx.site}
                  tpl={tpl}
                  vs={indicatedVs}
                  viewCtx={viewCtx}
                />
              ),

              popoverTitle: () => (
                <VariantSettingPopoverTitle vs={indicatedVs} viewCtx={viewCtx}>
                  {`Settings for element "${summarizeTpl(
                    tpl,
                    isTplVariantable(tpl)
                      ? getEffectiveVariantSetting(
                          tpl,
                          indicatedVs?.variants
                        ).rsh()
                      : undefined
                  )}"`}
                </VariantSettingPopoverTitle>
              ),

              placement: "left",
            }
          : undefined
      }
      {...rest}
    >
      {label}
    </PlasmicVariantRow>
  );
});

export default VariantRow;
