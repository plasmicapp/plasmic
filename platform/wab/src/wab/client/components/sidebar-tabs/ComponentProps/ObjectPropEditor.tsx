import { isKnownExpr, TemplatedString, TplComponent } from "@/wab/classes";
import {
  ControlExtras,
  InnerPropEditorRow,
  isPropShown,
  PropValueEditorContext,
  usePropValueEditorContext,
} from "@/wab/client/components/sidebar-tabs/PropEditorRow";
import { SidebarModal } from "@/wab/client/components/sidebar/SidebarModal";
import { SidebarSection } from "@/wab/client/components/sidebar/SidebarSection";
import Button from "@/wab/client/components/widgets/Button";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { TutorialEventsType } from "@/wab/client/tours/tutorials/tutorials-events";
import { assert, uncheckedCast, withoutNils } from "@/wab/common";
import { codeLit, summarizeExpr } from "@/wab/exprs";
import {
  getPropTypeDefaultValue,
  getPropTypeType,
  isAdvancedProp,
  maybePropTypeToDisplayName,
  StudioPropType,
} from "@/wab/shared/code-components/code-components";
import { DefinedIndicatorType } from "@/wab/shared/defined-indicator";
import { smartHumanize } from "@/wab/strs";
import { summarizeVal } from "@/wab/vals";
import { PropType } from "@plasmicapp/host";
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
  tpl: TplComponent;
  ccContextData: any;
  onChange: (val: Value) => void;
  buttonType?: React.ComponentProps<typeof Button>["type"];
  defaultShowModal?: boolean;
  onClose?: () => void;
  componentPropValues: any;
  controlExtras: ControlExtras;
  "data-plasmic-prop"?: string;
  propType: StudioPropType<any>;
  disabled?: boolean;
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
    tpl,
    componentPropValues,
    controlExtras,
    "data-plasmic-prop": dataPlasmicProp,
    propType,
    disabled,
  } = props;
  const sc = useStudioCtx();
  const [showModal, setShowModal] = React.useState(defaultShowModal);
  const keepOpen =
    !!sc.onboardingTourState.flags.keepInspectObjectPropEditorOpen;

  const valueEditorCtx = usePropValueEditorContext();
  const exprCtx = valueEditorCtx.exprCtx;
  assert(exprCtx, "missing exprCtx in ObjectPropEditor");

  let defaultValue: Record<string, any>;
  if (controlExtras.path.length === 1) {
    defaultValue = getPropTypeDefaultValue(propType) ?? {};
  } else {
    defaultValue = usePropValueEditorContext().defaultValue ?? {};
  }
  return (
    <>
      <Button
        type={
          withoutNils(["leftAligned", buttonType]) as React.ComponentProps<
            typeof Button
          >["type"]
        }
        size="stretch"
        onClick={() => {
          setShowModal(true);
        }}
        disabled={disabled}
        data-plasmic-prop={props["data-plasmic-prop"]}
      >
        {objectNameFunc?.(evaluatedValue, componentPropValues, ccContextData, {
          ...controlExtras,
          item: evaluatedValue,
        }) ?? "Configure..."}
      </Button>
      <SidebarModal
        show={showModal || (defaultShowModal && keepOpen)}
        persistOnInteractOutside={keepOpen}
        title={`Edit ${
          objectNameFunc?.(
            evaluatedValue,
            componentPropValues,
            ccContextData,
            controlExtras
          ) ?? "Object"
        }`}
        onClose={() => {
          setShowModal(false);
          onClose?.();
          sc.tourActionEvents.dispatch({
            type: TutorialEventsType.ClosedPropEditor,
          });
        }}
      >
        <div className="pt-xxlg pb-xsm">
          <SidebarSection
            id="object-prop-editor-modal"
            key={`main.${tpl.uid}`}
            noBorder
          >
            {(renderMaybeCollapsibleRows) =>
              renderMaybeCollapsibleRows(
                Object.entries(fields).map(([fieldName, fieldPropType]) => {
                  const nextControlExtras: ControlExtras = {
                    path: [...controlExtras.path, fieldName],
                    item: evaluatedValue,
                  };
                  if (
                    !isPropShown(
                      fieldPropType,
                      componentPropValues,
                      ccContextData,
                      nextControlExtras
                    )
                  ) {
                    return null;
                  }
                  const fieldValue =
                    compositeValue && fieldName in compositeValue
                      ? compositeValue[fieldName]
                      : undefined;
                  const fieldValueExpr = isKnownExpr(fieldValue)
                    ? fieldValue
                    : getPropTypeType(fieldPropType) === "string" &&
                      isString(fieldValue)
                    ? new TemplatedString({ text: [fieldValue] })
                    : codeLit(fieldValue);

                  const definedIndicator: DefinedIndicatorType = isKnownExpr(
                    fieldValue
                  )
                    ? {
                        source: "setNonVariable",
                        prop: fieldName,
                        value: summarizeExpr(fieldValue, exprCtx),
                      }
                    : { source: "none" };

                  return {
                    collapsible: !!isAdvancedProp(fieldPropType) && !fieldValue,
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
                          label={
                            maybePropTypeToDisplayName(fieldPropType) ??
                            smartHumanize(fieldName)
                          }
                          onChange={(newFieldValue) => {
                            const newValue = { ...compositeValue };
                            if (!newFieldValue) {
                              delete newValue[fieldName];
                            } else {
                              newValue[fieldName] = newFieldValue;
                            }
                            onChange(uncheckedCast(newValue));
                          }}
                          onDelete={() => {
                            if (compositeValue) {
                              if (fieldName in defaultValue) {
                                compositeValue[fieldName] =
                                  defaultValue[fieldName];
                              } else {
                                delete compositeValue[fieldName];
                              }
                              onChange(compositeValue);
                            }
                          }}
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
      </SidebarModal>
    </>
  );
});

function summarizeObject(obj: object) {
  const keys = Object.keys(obj);
  if (keys.length === 0) {
    return "(empty)";
  } else {
    return (
      <div className="text-ellipsis fill-width">
        {keys
          .slice(0, 5)
          .map((key) => `${key}=${summarizeVal(obj[key])}`)
          .join(", ")}
      </div>
    );
  }
}
