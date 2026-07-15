import ContextMenuIndicator from "@/wab/client/components/ContextMenuIndicator/ContextMenuIndicator";
import { ComponentPropModal } from "@/wab/client/components/modals/ComponentPropModal";
import { DataPickerEditor } from "@/wab/client/components/sidebar-tabs/ComponentProps/DataPickerEditor";
import { FallbackEditor } from "@/wab/client/components/sidebar-tabs/ComponentPropsSection";
import { getExpectedValuesForVariantGroup } from "@/wab/client/components/sidebar-tabs/DataBinding/DataPickerUtil";
import {
  LinkedPropIndicator,
  LinkToPropMenuItem,
  reconcileLinkedProp,
  UnlinkFromPropMenuItem,
} from "@/wab/client/components/sidebar-tabs/linked-prop-utils";
import {
  getValueSetState,
  LabeledItemRow,
  shouldBeDisabled,
  ValueSetState,
} from "@/wab/client/components/sidebar/sidebar-helpers";
import { SidebarSection } from "@/wab/client/components/sidebar/SidebarSection";
import StyleSelect from "@/wab/client/components/style-controls/StyleSelect";
import StyleSwitch from "@/wab/client/components/style-controls/StyleSwitch";
import { InstanceVariantsTooltip } from "@/wab/client/components/widgets/DetailedTooltips";
import { LabelWithDetailedTooltip } from "@/wab/client/components/widgets/LabelWithDetailedTooltip";
import { XMultiSelect } from "@/wab/client/components/XMultiSelect";
import { useViewCtx } from "@/wab/client/contexts/StudioContexts";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { toVarName } from "@/wab/shared/codegen/util";
import { assert, ensure, ensureInstance } from "@/wab/shared/common";
import {
  getRealParams,
  isPageComponent,
  isPlainComponent,
  mkVariantGroupArgExpr,
} from "@/wab/shared/core/components";
import {
  clone,
  codeLit,
  createExprForDataPickerValue,
  extractReferencedParam,
  extractValueSavedFromDataPicker,
  isFallbackSet,
  isRealCodeExpr,
} from "@/wab/shared/core/exprs";
import { tryGetTplOwnerComponent } from "@/wab/shared/core/tpls";
import { VARIANTS_CAP } from "@/wab/shared/Labels";
import {
  CustomCode,
  ensureKnownVariantsRef,
  isKnownCustomCode,
  isKnownObjectPath,
  isKnownVariantsRef,
  isKnownVarRef,
  ObjectPath,
  Param,
  TplComponent,
  Variant,
  VariantGroup,
  VariantsRef,
  VarRef,
} from "@/wab/shared/model/classes";
import { isOptionsType } from "@/wab/shared/model/model-util";
import { getPlumeEditorPlugin } from "@/wab/shared/plume/plume-registry";
import {
  isParamCompatibleWithVariantGroup,
  isStandaloneVariantGroup,
  variantGroupToLinkedPropType,
} from "@/wab/shared/Variants";
import { Menu } from "antd";
import L from "lodash";
import { observer } from "mobx-react";
import React from "react";

export interface VariantsPickerPanelProps {
  tpl: TplComponent;
}

export function _VariantsPickerPanel({ tpl }: VariantsPickerPanelProps) {
  const viewCtx = useViewCtx();
  const component = tpl.component;
  let variantGroups = component.variantGroups;

  const plugin = getPlumeEditorPlugin(component);
  if (plugin) {
    variantGroups = variantGroups.filter(
      (g) => plugin.shouldShowInstanceProp?.(tpl, g.param) ?? true
    );
  }

  if (variantGroups.length === 0) {
    return null;
  }

  const vs = viewCtx.variantTplMgr().tryGetTargetVariantSetting(tpl);

  return (
    <SidebarSection
      title={
        <LabelWithDetailedTooltip tooltip={<InstanceVariantsTooltip />}>
          {VARIANTS_CAP}
        </LabelWithDetailedTooltip>
      }
      isHeaderActive={
        vs &&
        vs.args.some((arg) => variantGroups.find((g) => g.param === arg.param))
      }
      data-test-id="variants-picker-section"
    >
      {variantGroups.map((group) => (
        <VariantPicker
          viewCtx={viewCtx}
          group={group}
          tpl={tpl}
          key={group.uid}
        />
      ))}
    </SidebarSection>
  );
}

export const VariantsPickerPanel = observer(_VariantsPickerPanel);

export const VariantPicker = observer(function VariantPicker(props: {
  viewCtx: ViewCtx;
  group: VariantGroup;
  tpl: TplComponent;
}) {
  const { viewCtx, group, tpl } = props;

  const studioCtx = useStudioCtx();

  const variantsByName = new Map<string, Variant>(
    group.variants.map((v) => [v.name, v])
  );

  const [defined, maybeArg] = viewCtx
    .variantTplMgr()
    .getArgAndDefinedIndicator(tpl, group.param);

  const currentExpr = maybeArg?.expr;
  const isDynamicValue = isRealCodeExpr(currentExpr);
  const [isDataPickerVisible, setIsDataPickerVisible] =
    React.useState<boolean>(false);
  const [showFallback, setShowFallback] = React.useState<boolean>(
    currentExpr !== undefined && isFallbackSet(currentExpr)
  );
  const [newParamModalVisible, setNewParamModalVisible] =
    React.useState<boolean>(false);

  const ownerComponent = tryGetTplOwnerComponent(tpl);
  const referencedParam =
    ownerComponent && currentExpr && isKnownVarRef(currentExpr)
      ? extractReferencedParam(ownerComponent, currentExpr)
      : undefined;

  const linkDrift =
    !!referencedParam &&
    !isParamCompatibleWithVariantGroup(referencedParam, group);

  const onReconcileLink =
    linkDrift &&
    referencedParam &&
    ownerComponent &&
    isOptionsType(referencedParam.type)
      ? () =>
          void reconcileLinkedProp({
            viewCtx,
            innerType: variantGroupToLinkedPropType(group),
            innerName: group.param.variable.name,
            outerParam: referencedParam,
            outerComponent: ownerComponent,
          })
      : undefined;

  // Mutually-exclusive states the variant arg can be in.
  const arg =
    referencedParam && ownerComponent
      ? ({ valueType: "linked", ownerComponent, referencedParam } as const)
      : isDynamicValue
      ? ({ valueType: "dynamic" } as const)
      : ({ valueType: "literal" } as const);

  const baseOptions = group.variants.map((variant) => ({
    value: variant.name,
    contents: () => variant.name,
  }));

  const label = group.param.variable.name;

  const { isDisabled, disabledTooltip } = shouldBeDisabled({
    props: {},
    label,
    indicators: [defined],
  });

  const activeVariantsInVg = isKnownVariantsRef(currentExpr)
    ? currentExpr.variants.map((v) => toVarName(v.name))
    : [];

  // Type of the new owner-component prop mirroring this variant group.
  const newPropType = variantGroupToLinkedPropType(group);

  const newPropDefaultExpr = isStandaloneVariantGroup(group)
    ? codeLit(!!activeVariantsInVg[0])
    : group.multi
    ? codeLit(activeVariantsInVg)
    : activeVariantsInVg[0]
    ? codeLit(activeVariantsInVg[0])
    : undefined;

  const canLinkToProp =
    !isDisabled &&
    !!ownerComponent &&
    (isPageComponent(ownerComponent) || isPlainComponent(ownerComponent)) &&
    viewCtx.tplMgr().canLinkToProp(tpl);

  const isCompatibleOwnerParam = (param: Param): boolean =>
    isParamCompatibleWithVariantGroup(param, group);

  const compatibleOwnerParams = ownerComponent
    ? getRealParams(ownerComponent).filter(isCompatibleOwnerParam)
    : [];

  const linkToOwnerParam = (param: Param) => {
    viewCtx.change(() => {
      viewCtx
        .variantTplMgr()
        .setArg(
          tpl,
          group.param.variable,
          new VarRef({ variable: param.variable })
        );
    });
  };

  const unlinkFromOwnerParam = () => {
    viewCtx.change(() => {
      viewCtx.variantTplMgr().delArg(tpl, group.param.variable);
    });
  };

  const linkToDynamicValue = () => {
    const variantTplMgr = viewCtx.variantTplMgr();
    const newExpr = new ObjectPath({
      path: ["undefined"],
      fallback: currentExpr ?? new VariantsRef({ variants: [] }),
    });
    viewCtx.change(() => {
      variantTplMgr.setArg(tpl, group.param.variable, newExpr);
      setShowFallback(true);
      setIsDataPickerVisible(true);
    });
  };

  const unlinkFromDynamicValue = () => {
    assert(
      currentExpr,
      "Unexpected undefined value, currentExpr must be defined when data binding"
    );
    assert(
      isKnownCustomCode(currentExpr) || isKnownObjectPath(currentExpr),
      "Unexpected currentExpr value, should be ObjectPath or CustomCode"
    );
    const fallback = currentExpr.fallback;
    viewCtx.change(() => {
      const variantTplMgr = viewCtx.variantTplMgr();
      if (isKnownVariantsRef(fallback)) {
        variantTplMgr.setArg(tpl, group.param.variable, fallback);
      } else {
        variantTplMgr.delArg(tpl, group.param.variable);
      }
    });
  };

  const renderValueEditor = (
    activeVariants: Variant[],
    updateActiveVariants: (newActiveVariants: Variant[]) => void,
    valueSetState: ValueSetState | undefined
  ) => {
    const options =
      activeVariants.length > 0
        ? [
            ...baseOptions,
            {
              value: null,
              contents: () => "(unset)",
            },
          ]
        : baseOptions;

    const onUnselect = (removedVariantName: string) => {
      viewCtx.change(() => {
        updateActiveVariants(
          L.without(
            activeVariants,
            ensure(
              variantsByName.get(removedVariantName),
              "Active variants are expected contain removedVariantName"
            )
          )
        );
      });
    };
    const onSelect = (addVariantName: string) => {
      viewCtx.change(() =>
        updateActiveVariants([
          ...activeVariants,
          ensure(
            variantsByName.get(addVariantName),
            "variantsByName is expected to contain addVariantName"
          ),
        ])
      );
    };
    return group.multi ? (
      <XMultiSelect
        options={L.difference(group.variants, activeVariants).map(
          (v) => v.name
        )}
        onSelect={onSelect}
        onUnselect={onUnselect}
        selectedItems={activeVariants.map((v) => v.name)}
        className="fill-width right-panel-input-background__no-height"
        renderSelectedItem={(name) => <code>{name}</code>}
        filterOptions={(_options, input) =>
          !input
            ? _options
            : _options.filter((n) =>
                n.toLowerCase().includes(input.toLowerCase())
              )
        }
        pillClassName="white-bg"
        isDisabled={isDisabled}
        disabledTooltip={disabledTooltip}
      />
    ) : isStandaloneVariantGroup(group) ? (
      <StyleSwitch
        isChecked={activeVariants[0] === group.variants[0]}
        onChange={(checked) =>
          checked
            ? onSelect(group.variants[0].name)
            : onUnselect(group.variants[0].name)
        }
        isDisabled={isDisabled}
        disabledTooltip={disabledTooltip}
        valueSetState={valueSetState}
      >
        {null}
      </StyleSwitch>
    ) : (
      <StyleSelect
        onChange={(valName) =>
          viewCtx.change(() =>
            updateActiveVariants(
              valName
                ? [
                    ensure(
                      variantsByName.get(valName as string),
                      "variantsByName is expected to contain valName"
                    ),
                  ]
                : []
            )
          )
        }
        value={activeVariants.length > 0 ? activeVariants[0].name : null}
        placeholder={" "}
        valueSetState={valueSetState}
        aria-label={group.param.variable.name}
        isDisabled={isDisabled}
        disabledTooltip={disabledTooltip}
      >
        {options.map((option) => (
          <StyleSelect.Option key={option.value} value={option.value}>
            {option.contents()}
          </StyleSelect.Option>
        ))}
      </StyleSelect>
    );
  };

  const contextMenu = isDisabled
    ? undefined
    : () => (
        <Menu>
          {arg.valueType !== "linked" && defined.source === "set" && (
            <Menu.Item
              key={"clear"}
              onClick={() =>
                viewCtx.change(() =>
                  viewCtx.variantTplMgr().delArg(tpl, group.param.variable)
                )
              }
            >
              Clear
            </Menu.Item>
          )}
          {arg.valueType === "literal" && (
            <Menu.Item key={"dynamicValue"} onClick={linkToDynamicValue}>
              Use dynamic value
            </Menu.Item>
          )}
          {arg.valueType === "dynamic" && !showFallback && (
            <Menu.Item key={"fallback"} onClick={() => setShowFallback(true)}>
              Change fallback value
            </Menu.Item>
          )}
          {arg.valueType === "dynamic" && (
            <Menu.Item key={"!dynamicValue"} onClick={unlinkFromDynamicValue}>
              Remove dynamic value
            </Menu.Item>
          )}
          {arg.valueType === "literal" && canLinkToProp && (
            <LinkToPropMenuItem
              availableParams={compatibleOwnerParams}
              onLinkExisting={linkToOwnerParam}
              onCreateNew={() => setNewParamModalVisible(true)}
            />
          )}
          {arg.valueType === "linked" && (
            <UnlinkFromPropMenuItem
              ownerComponent={arg.ownerComponent}
              referencedParam={arg.referencedParam}
              onUnlink={unlinkFromOwnerParam}
            />
          )}
        </Menu>
      );
  return (
    <>
      <LabeledItemRow
        key={group.uid}
        label={label}
        definedIndicator={defined}
        isDisabled={isDisabled}
        menu={contextMenu}
        noMenuButton
      >
        <ContextMenuIndicator
          menu={contextMenu}
          showDynamicValueButton={
            arg.valueType === "literal" && !studioCtx.contentEditorMode
          }
          onIndicatorClickDefault={() => {
            linkToDynamicValue();
          }}
          className="qb-custom-widget"
          fullWidth={!isStandaloneVariantGroup(group)}
        >
          {arg.valueType === "linked" ? (
            <LinkedPropIndicator
              ownerComponent={arg.ownerComponent}
              referencedParam={arg.referencedParam}
              warning={
                linkDrift
                  ? `Type no longer matches the linked prop "${
                      arg.referencedParam.variable.name
                    }"${onReconcileLink ? ". Click to update." : ""}`
                  : undefined
              }
              onWarningClick={onReconcileLink}
            />
          ) : arg.valueType === "dynamic" ? (
            <DataPickerEditor
              viewCtx={viewCtx}
              value={extractValueSavedFromDataPicker(currentExpr, {
                projectFlags: studioCtx.projectFlags(),
                component: tryGetTplOwnerComponent(tpl) ?? null,
                inStudio: true,
              })}
              onChange={(val) => {
                if (!val) {
                  return;
                }
                const codeExpr = ensureInstance(
                  currentExpr,
                  CustomCode,
                  ObjectPath
                );
                const fallbackExpr = codeExpr.fallback
                  ? clone(codeExpr.fallback)
                  : undefined;
                const newExpr = createExprForDataPickerValue(val, fallbackExpr);
                viewCtx.change(() => {
                  const variantTplMgr = viewCtx.variantTplMgr();
                  variantTplMgr.setArg(tpl, group.param.variable, newExpr);
                });
              }}
              onUnlink={unlinkFromDynamicValue}
              visible={isDataPickerVisible}
              setVisible={setIsDataPickerVisible}
              isDisabled={isDisabled}
              disabledTooltip={disabledTooltip}
              data={viewCtx.getCanvasEnvForTpl(tpl)}
              schema={viewCtx.customFunctionsSchema()}
              key={tpl.uid}
              expectedValues={getExpectedValuesForVariantGroup(group)}
            />
          ) : (
            renderValueEditor(
              currentExpr ? ensureKnownVariantsRef(currentExpr).variants : [],
              (newActiveVariants: Variant[]) => {
                const variantTplMgr = viewCtx.variantTplMgr();
                const newExpr = mkVariantGroupArgExpr(newActiveVariants);

                if (group.multi) {
                  variantTplMgr.setArg(tpl, group.param.variable, newExpr);
                } else if (newActiveVariants.length === 0) {
                  if (variantTplMgr.getArg(tpl, group.param.variable)) {
                    variantTplMgr.delArg(tpl, group.param.variable);
                  } else {
                    // Explicitly set the arg to undefined to deselect it.
                    variantTplMgr.setArg(tpl, group.param.variable, newExpr);
                  }
                } else {
                  variantTplMgr.setArg(tpl, group.param.variable, newExpr);
                }
              },
              getValueSetState(defined)
            )
          )}
        </ContextMenuIndicator>
      </LabeledItemRow>
      {arg.valueType === "dynamic" &&
        showFallback &&
        (() => {
          const codeExpr = ensureInstance(currentExpr, CustomCode, ObjectPath);
          return (
            <FallbackEditor
              isSet={isFallbackSet(codeExpr)}
              hideUnset={true}
              definedIndicator={defined}
            >
              {renderValueEditor(
                codeExpr.fallback
                  ? ensureKnownVariantsRef(codeExpr.fallback).variants
                  : [],
                (newActiveVariants: Variant[]) => {
                  const newExpr = mkVariantGroupArgExpr(newActiveVariants);
                  viewCtx.change(() => {
                    codeExpr.fallback = newExpr;
                  });
                },
                isFallbackSet(codeExpr) ? "isSet" : "isUnset"
              )}
            </FallbackEditor>
          );
        })()}
      {newParamModalVisible && ownerComponent && (
        <ComponentPropModal
          studioCtx={studioCtx}
          component={ownerComponent}
          visible={newParamModalVisible}
          suggestedName={tpl.name ? `${tpl.name} / ${label}` : label}
          suggestedDefaultExpr={newPropDefaultExpr}
          type={newPropType}
          onFinish={(newParam) => {
            setNewParamModalVisible(false);
            if (!newParam) {
              return;
            }
            viewCtx.change(() =>
              viewCtx
                .variantTplMgr()
                .setArg(
                  tpl,
                  group.param.variable,
                  new VarRef({ variable: newParam.variable })
                )
            );
          }}
        />
      )}
    </>
  );
});
