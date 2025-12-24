import {
  ControlExtras,
  InnerPropEditorRow,
  isPropShown,
  PropValueEditorContext,
  usePropValueEditorContext,
} from "@/wab/client/components/sidebar-tabs/PropEditorRow";
import { PopoverFrame } from "@/wab/client/components/sidebar/PopoverFrame";
import { SidebarSection } from "@/wab/client/components/sidebar/SidebarSection";
import Button from "@/wab/client/components/widgets/Button";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { TutorialEventsType } from "@/wab/client/tours/tutorials/tutorials-events";
import {
  getPropTypeDefaultValue,
  getPropTypeType,
  isAdvancedProp,
  maybePropTypeToDisplayName,
  StudioPropType,
} from "@/wab/shared/code-components/code-components";
import { assert, uncheckedCast, withoutNils } from "@/wab/shared/common";
import { codeLit, summarizeExpr } from "@/wab/shared/core/exprs";
import { DefinedIndicatorType } from "@/wab/shared/defined-indicator";
import { isKnownExpr, TemplatedString } from "@/wab/shared/model/classes";
import { smartHumanize } from "@/wab/shared/strs";
import { PropType } from "@plasmicapp/host";
import { ObjectType } from "@plasmicapp/host/registerComponent";
import { isString } from "lodash";
import { observer } from "mobx-react";
import React from "react";

export type ItemFunc<Value, Return> = (
  value: Value | undefined,
  componentPropValues: any,
  ccContextData: any,
  controlExtras: ControlExtras
) => Return;

export const ObjectPropEditor = observer(function ObjectPropEditor<
  Value extends object
>(props: {
  compositeValue: Value | undefined;
  evaluatedValue: Value | undefined;
  fields: Record<string, PropType<unknown>>;
  objectNameFunc?: ItemFunc<Value, string | undefined>;
  modalKey: string;
  ccContextData: any;
  onChange: (val: Value) => void;
  buttonType?: React.ComponentProps<typeof Button>["type"];
  defaultShowModal?: boolean;
  onClose?: () => void;
  componentPropValues: any;
  "data-plasmic-prop"?: string;
  controlExtras: ControlExtras;
  propType: StudioPropType<any>;
  disabled?: boolean;
  display?: ObjectType<any>["display"];
}) {
  const {
    compositeValue,
    evaluatedValue,
    fields,
    objectNameFunc,
    ccContextData,
    onChange,
    buttonType,
    defaultShowModal,
    onClose,
    modalKey,
    componentPropValues,
    controlExtras,
    propType,
    disabled,
    display = "popup",
  } = props;
  const sc = useStudioCtx();

  const valueEditorCtx = usePropValueEditorContext();
  const exprCtx = valueEditorCtx.exprCtx;
  assert(exprCtx, "missing exprCtx in ObjectPropEditor");

  let defaultValue: Record<string, any>;
  if (controlExtras.path.length === 1) {
    defaultValue = getPropTypeDefaultValue(propType) ?? {};
  } else {
    defaultValue = usePropValueEditorContext().defaultValue ?? {};
  }

  const [showModal, setShowModal] = React.useState(false);
  const keepOpen =
    !!sc.onboardingTourState.flags.keepInspectObjectPropEditorOpen;
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const shouldShowModal = showModal || !!(defaultShowModal && keepOpen);

  // Defer showing modal until the next frame so the button ref is available for positioning
  React.useEffect(() => {
    if (defaultShowModal && !showModal) {
      requestAnimationFrame(() => setShowModal(true));
    }
  }, [defaultShowModal]);

  const getFieldItemMeta = (
    fieldName: string,
    fieldPropType: PropType<unknown>
  ) => {
    const nextControlExtras: ControlExtras = {
      path: [...controlExtras.path, fieldName],
      item: evaluatedValue,
    };
    const fieldValue =
      compositeValue && fieldName in compositeValue
        ? compositeValue[fieldName]
        : undefined;
    const fieldValueExpr = isKnownExpr(fieldValue)
      ? fieldValue
      : getPropTypeType(fieldPropType) === "string" && isString(fieldValue)
      ? new TemplatedString({ text: [fieldValue] })
      : codeLit(fieldValue);

    const definedIndicator: DefinedIndicatorType = isKnownExpr(fieldValue)
      ? {
          source: "setNonVariable",
          prop: fieldName,
          value: summarizeExpr(fieldValue, exprCtx),
        }
      : { source: "none" };
    return {
      label:
        maybePropTypeToDisplayName(fieldPropType) ?? smartHumanize(fieldName),
      fieldValueExpr,
      definedIndicator,
      onChangeItem: (newFieldValue) => {
        const newValue = { ...compositeValue };
        if (!newFieldValue) {
          delete newValue[fieldName];
        } else {
          newValue[fieldName] = newFieldValue;
        }
        onChange(uncheckedCast(newValue));
      },
      onDeleteItem: () => {
        if (compositeValue) {
          if (fieldName in defaultValue) {
            compositeValue[fieldName] = defaultValue[fieldName];
          } else {
            delete compositeValue[fieldName];
          }
          onChange(compositeValue);
        }
      },
      fieldPropType,
      nextControlExtras,
      isHidden: !isPropShown(
        fieldPropType,
        componentPropValues,
        ccContextData,
        nextControlExtras
      ),
      isCollapsible: !!isAdvancedProp(fieldPropType, undefined) && !fieldValue,
    };
  };

  const renderPopup = () => {
    return (
      <>
        <Button
          ref={buttonRef}
          type={
            withoutNils(["leftAligned", buttonType]) as React.ComponentProps<
              typeof Button
            >["type"]
          }
          size="stretch"
          onClick={() => setShowModal(true)}
          disabled={disabled}
          data-plasmic-prop={props["data-plasmic-prop"]}
          className={shouldShowModal ? "button--active" : undefined}
        >
          {objectNameFunc?.(
            evaluatedValue,
            componentPropValues,
            ccContextData,
            {
              ...controlExtras,
              item: evaluatedValue,
            }
          ) ?? "Configure..."}
        </Button>
        <PopoverFrame
          show={shouldShowModal}
          title={`Edit ${
            objectNameFunc?.(
              evaluatedValue,
              componentPropValues,
              ccContextData,
              controlExtras
            ) ?? "Object"
          }`}
          valuePath={controlExtras.path}
          onClose={() => {
            setShowModal(false);
            onClose?.();
            sc.tourActionEvents.dispatch({
              type: TutorialEventsType.ClosedPropEditor,
            });
          }}
          persistOnInteractOutside={keepOpen}
          triggerElement={buttonRef.current ?? undefined}
        >
          <div className="pt-xxlg pb-xsm">
            <SidebarSection
              id="object-prop-editor-popover"
              key={modalKey}
              noBorder
            >
              {(renderMaybeCollapsibleRows) =>
                renderMaybeCollapsibleRows(
                  Object.entries(fields).map(([fieldName, fieldPropType]) => {
                    const {
                      label,
                      onChangeItem,
                      onDeleteItem,
                      fieldValueExpr,
                      definedIndicator,
                      nextControlExtras,
                      isHidden,
                      isCollapsible,
                    } = getFieldItemMeta(fieldName, fieldPropType);
                    if (isHidden) {
                      return null;
                    }
                    return {
                      collapsible: isCollapsible,
                      content: (
                        <PropValueEditorContext.Provider
                          value={{
                            ...valueEditorCtx,
                            defaultValue: defaultValue[fieldName],
                          }}
                        >
                          <InnerPropEditorRow
                            key={fieldName}
                            controlExtras={nextControlExtras}
                            propType={fieldPropType}
                            attr={fieldName}
                            label={label}
                            onChange={onChangeItem}
                            onDelete={onDeleteItem}
                            expr={fieldValueExpr}
                            disableLinkToProp={true}
                            definedIndicator={definedIndicator}
                          />
                        </PropValueEditorContext.Provider>
                      ),
                    };
                  })
                )
              }
            </SidebarSection>
          </div>
        </PopoverFrame>
      </>
    );
  };

  const renderInline = () => {
    const fieldEntries = Object.entries(fields);
    return (
      <div className="pl-xxlg">
        {fieldEntries.map(([fieldName, fieldPropType], index) => {
          const {
            label,
            onChangeItem,
            onDeleteItem,
            fieldValueExpr,
            definedIndicator,
            nextControlExtras,
            isHidden,
          } = getFieldItemMeta(fieldName, fieldPropType);
          const isLastItem = index === fieldEntries.length - 1;
          if (isHidden) {
            return null;
          }
          return (
            <PropValueEditorContext.Provider
              key={fieldName}
              value={{
                ...valueEditorCtx,
                defaultValue: defaultValue[fieldName],
              }}
            >
              <div className="mb-m rel">
                <InnerPropEditorRow
                  controlExtras={nextControlExtras}
                  propType={fieldPropType}
                  attr={fieldName}
                  label={label}
                  icon={
                    <div
                      className="property-connector-line-icon"
                      style={{ left: "-16px", position: "absolute" }}
                    />
                  }
                  onChange={onChangeItem}
                  onDelete={onDeleteItem}
                  expr={fieldValueExpr}
                  disableLinkToProp={true}
                  definedIndicator={definedIndicator}
                />
                {!isLastItem && (
                  <div className="property-connector-vertical-line" />
                )}
              </div>
            </PropValueEditorContext.Provider>
          );
        })}
      </div>
    );
  };

  // Inline display mode: render fields directly using IndentedRow
  if (display === "popup") {
    return renderPopup();
  }

  return renderInline();
});
