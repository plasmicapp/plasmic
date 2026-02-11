import { useContextMenu } from "@/wab/client/components/ContextMenu";
import { PlumyIcon } from "@/wab/client/components/plume/plume-markers";
import {
  VariantSettingPopoverContent,
  VariantSettingPopoverTitle,
} from "@/wab/client/components/style-controls/DefinedIndicator";
import { Icon } from "@/wab/client/components/widgets/Icon";
import VariantIcon from "@/wab/client/plasmic/plasmic_kit_design_system/PlasmicIcon__Variant";
import KeyframesIcon from "@/wab/client/plasmic/plasmic_kit_icons/icons/PlasmicIcon__Keyframes";
import {
  PlasmicVariantRow,
  PlasmicVariantRow__OverridesType,
  PlasmicVariantRow__VariantsArgs,
} from "@/wab/client/plasmic/plasmic_kit_variants/PlasmicVariantRow";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { VariantPinState } from "@/wab/shared/PinManager";
import {
  VariantCombo,
  isBaseVariant,
  isVariantSettingEmpty,
  tryGetVariantSetting,
} from "@/wab/shared/Variants";
import { maybe } from "@/wab/shared/common";
import { isTplVariantable, summarizeTpl } from "@/wab/shared/core/tpls";
import { getEffectiveVariantSetting } from "@/wab/shared/effective-variant-setting";
import { Variant } from "@/wab/shared/model/classes";
import { PlumeVariantDef } from "@/wab/shared/plume/plume-registry";
import { PlusIcon } from "@graphiql/react";
import { observer } from "mobx-react";
import * as React from "react";
import { DraggableProvidedDragHandleProps } from "react-beautiful-dnd";

interface VariantRowProps {
  studioCtx: StudioCtx;
  viewCtx?: ViewCtx;
  variant: Variant | VariantCombo;
  pinState: VariantPinState | undefined;
  label?: React.ReactNode;
  menu?: () => React.ReactElement;
  className?: string;
  style?: React.CSSProperties;
  isReadOnly?: boolean;
  isStandalone?: boolean;
  isSplitVariant?: boolean;
  isDragging?: boolean;
  isDraggable?: boolean;
  dragHandleProps?: DraggableProvidedDragHandleProps;
  onClick?: () => void;
  onTarget?: (target: boolean) => void;
  onToggle?: () => void;
  plumeDef?: PlumeVariantDef;
  hasCodeExpression?: boolean;
  exprButton?: PlasmicVariantRow__OverridesType["exprButton"];
  addAnimationLayer?: () => void;
  type?: PlasmicVariantRow__VariantsArgs["type"];
  additional?: React.ReactNode;
  hideIcon?: boolean;
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
    isSplitVariant,
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
    addAnimationLayer,
    additional,
    hideIcon,
    type,
    ...rest
  } = props;

  const contextMenuProps = useContextMenu({ menu });

  const isBase = isBaseVariant(variant);
  const isRecording = pinState?.startsWith("selected");

  const tpl = viewCtx?.focusedTpl() ?? undefined;
  const indicatedVs =
    tpl &&
    isTplVariantable(tpl) &&
    maybe(
      tryGetVariantSetting(tpl, Array.isArray(variant) ? variant : [variant]),
      (vs) => (isVariantSettingEmpty(vs) ? undefined : vs)
    );

  const hasAnimations = !!addAnimationLayer;

  return (
    <PlasmicVariantRow
      type={
        type ||
        (isBase
          ? "baseVariant"
          : isStandalone
          ? "toggle"
          : isSplitVariant
          ? "splitVariant"
          : undefined)
      }
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
      showAddAnimation={hasAnimations}
      addAnimation={{
        start: <KeyframesIcon className={"text-xlg dimfg"} />,
        end: <PlusIcon className={"text-xlg dimfg"} />,
        ...(addAnimationLayer ? { onClick: addAnimationLayer } : {}),
      }}
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
        additional,
        removeAdditionalRowLeftPadding: true,
        onClickMain: () => {
          if (!isDragging) {
            onClick && onClick();
          }
        },
        hideIcon,
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
