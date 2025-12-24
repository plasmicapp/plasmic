import { ArrayPropEditor } from "@/wab/client/components/sidebar-tabs/ComponentProps/ArrayPropEditor";
import { BoolPropEditor } from "@/wab/client/components/sidebar-tabs/ComponentProps/BoolPropEditor";
import { CardPickerEditor } from "@/wab/client/components/sidebar-tabs/ComponentProps/CardPickerEditor";
import { ChoicePropEditor } from "@/wab/client/components/sidebar-tabs/ComponentProps/ChoicePropEditor";
import { CodeEditor } from "@/wab/client/components/sidebar-tabs/ComponentProps/CodeEditor";
import { CustomPropEditor } from "@/wab/client/components/sidebar-tabs/ComponentProps/CustomPropEditor";
import { DataPickerEditor } from "@/wab/client/components/sidebar-tabs/ComponentProps/DataPickerEditor";
import DateRangeStringsEditor from "@/wab/client/components/sidebar-tabs/ComponentProps/DateRangeStringsEditor";
import DateStringEditor from "@/wab/client/components/sidebar-tabs/ComponentProps/DateStringEditor";
import { EnumPropEditor } from "@/wab/client/components/sidebar-tabs/ComponentProps/EnumPropEditor";
import { FormValidationRulesEditor } from "@/wab/client/components/sidebar-tabs/ComponentProps/FormValidationRulesEditor";
import {
  GraphQLEditor,
  GraphQLValue,
} from "@/wab/client/components/sidebar-tabs/ComponentProps/GraphQLEditor";
import { HrefEditor } from "@/wab/client/components/sidebar-tabs/ComponentProps/HrefEditor";
import { ImagePropEditor } from "@/wab/client/components/sidebar-tabs/ComponentProps/ImagePropEditor";
import { InvalidationEditor } from "@/wab/client/components/sidebar-tabs/ComponentProps/InvalidationEditor";
import { MultiSelectEnumPropEditor } from "@/wab/client/components/sidebar-tabs/ComponentProps/MultiSelectEnumPropEditor";
import { NumPropEditor } from "@/wab/client/components/sidebar-tabs/ComponentProps/NumPropEditor";
import { ObjectPropEditor } from "@/wab/client/components/sidebar-tabs/ComponentProps/ObjectPropEditor";
import {
  QueryBuilderPropEditor,
  QueryBuilderValue,
} from "@/wab/client/components/sidebar-tabs/ComponentProps/QueryBuilderPropEditor";
import { RichTextPropEditor } from "@/wab/client/components/sidebar-tabs/ComponentProps/RichTextPropEditor";
import { TemplatedStringPropEditor } from "@/wab/client/components/sidebar-tabs/ComponentProps/StringPropEditor";
import {
  DataSourceEditor,
  ExprEditor,
  InteractionExprEditor,
  InteractionPropEditor,
  TargetPropEditor,
  TplRefEditor,
  VariableEditor,
} from "@/wab/client/components/sidebar-tabs/ComponentPropsSection";
import { FormDataConnectionPropEditor } from "@/wab/client/components/sidebar-tabs/DataSource/ConnectToDBTable";
import { DataSourceOpDataPicker } from "@/wab/client/components/sidebar-tabs/DataSource/DataSourceOpDataPicker";
import { DataSourceOpPicker } from "@/wab/client/components/sidebar-tabs/DataSource/DataSourceOpPicker";
import {
  ControlExtras,
  PropEditorRow,
  usePropValueEditorContext,
} from "@/wab/client/components/sidebar-tabs/PropEditorRow";
import { CustomFunctionEditor } from "@/wab/client/components/sidebar-tabs/ServerQuery/CustomFunctionEditor";
import {
  StyleExprButton,
  StyleExprSpec,
} from "@/wab/client/components/sidebar-tabs/StyleExprModal";
import { ValueSetState } from "@/wab/client/components/sidebar/sidebar-helpers";
import { ColorButton } from "@/wab/client/components/style-controls/ColorButton";
import { extractDataCtx } from "@/wab/client/state-management/interactions-meta";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { mkTokenRef, tryParseTokenRef } from "@/wab/commons/StyleToken";
import { unwrap } from "@/wab/commons/failable-utils";
import { isStandaloneVariantGroup } from "@/wab/shared/Variants";
import {
  StudioPropType,
  getPropTypeType,
  isCustomControlType,
  isPlainObjectPropType,
  propTypeToWabType,
  wabTypeToPropType,
} from "@/wab/shared/code-components/code-components";
import {
  assert,
  ensure,
  ensureArray,
  hackyCast,
  hasKey,
  mkShortId,
  uncheckedCast,
} from "@/wab/shared/common";
import { getContextDependentValue } from "@/wab/shared/context-dependent-value";
import {
  ExprCtx,
  asCode,
  clone,
  codeLit,
  createExprForDataPickerValue,
  deserCompositeExprMaybe,
  getRawCode,
  isRealCodeExpr,
  isRealCodeExprEnsuringType,
  mergeUserMinimalValueWithCompositeExpr,
  serCompositeExprMaybe,
  tryExtractJson,
} from "@/wab/shared/core/exprs";
import { ImageAssetType } from "@/wab/shared/core/image-asset-type";
import { JsonValue } from "@/wab/shared/core/lang";
import { siteFinalStyleTokensAllDepsDict } from "@/wab/shared/core/site-style-tokens";
import {
  getDisplayNameOfEventHandlerKey,
  isTplComponent,
} from "@/wab/shared/core/tpls";
import { DataSourceType } from "@/wab/shared/data-sources-meta/data-source-registry";
import { CanvasEnv, tryEvalExpr } from "@/wab/shared/eval";
import {
  CollectionExpr,
  Component,
  Expr,
  FunctionArg,
  ImageAssetRef,
  PageHref,
  StrongFunctionArg,
  StyleTokenRef,
  TplComponent,
  VarRef,
  Variant,
  VariantsRef,
  ensureKnownCollectionExpr,
  ensureKnownFunctionType,
  ensureKnownVarRef,
  ensureKnownVariantsRef,
  isKnownCustomFunctionExpr,
  isKnownDataSourceOpExpr,
  isKnownEventHandler,
  isKnownExpr,
  isKnownFunctionArg,
  isKnownImageAsset,
  isKnownImageAssetRef,
  isKnownPageHref,
  isKnownQueryInvalidationExpr,
  isKnownStyleTokenRef,
  isKnownTemplatedString,
  isKnownTplComponent,
  isKnownTplRef,
  isKnownTplTag,
} from "@/wab/shared/model/classes";
import { typesEqual } from "@/wab/shared/model/model-util";
import { smartHumanize } from "@/wab/shared/strs";
import { ComponentContextConfig } from "@plasmicapp/host";
import type { RulesLogic } from "json-logic-js";
import L, { isNil, isNumber } from "lodash";
import { observer } from "mobx-react";
import React from "react";

/**
 * Get an ExprCtx from ViewCtx when editing props in the component sidebar,
 * and use the provided exprCtx in the server query modal.
 */
function getEvalExprCtx(
  viewCtx: ViewCtx | undefined,
  exprCtx: ExprCtx | undefined
): ExprCtx {
  return viewCtx
    ? {
        projectFlags: viewCtx.projectFlags(),
        component: viewCtx.currentComponent(),
        inStudio: true,
      }
    : exprCtx!;
}

const PropValueEditor_ = (
  props: {
    propType: StudioPropType<any>;
    component?: Component;
    attr: string;
    // Require this since it is typically needed to be computed outside anyway, so delegate the source of truth.
    label: string;
    value: JsonValue | Expr | undefined;
    disabled?: boolean;
    valueSetState?: ValueSetState;
    onChange: (value: JsonValue | Expr | undefined) => void;
    onDelete?: () => void;
    controlExtras?: ControlExtras;
    hideDefaultValueHint?: boolean;
  },
  ref
) => {
  const {
    attr = "",
    label,
    value,
    component,
    valueSetState,
    onChange,
    onDelete,
    disabled = false,
    propType,
    controlExtras = { path: [] },
    hideDefaultValueHint,
  } = props;
  const {
    env,
    schema,
    viewCtx,
    tpl,
    componentPropValues,
    ccContextData,
    exprCtx,
  } = usePropValueEditorContext();
  const studioCtx = useStudioCtx();
  const litValue = React.useMemo(
    () => (isKnownExpr(value) ? tryExtractJson(value) : value),
    [value, env]
  );
  const [isDataPickerVisible, setIsDataPickerVisible] =
    React.useState<boolean>(false);

  const _getContextDependentValue = React.useCallback(
    function <P>(
      contextDependentValue?:
        | P
        | ComponentContextConfig<typeof componentPropValues, P>
    ) {
      return getContextDependentValue(
        contextDependentValue,
        componentPropValues,
        ccContextData,
        controlExtras
      );
    },
    [componentPropValues, ccContextData, controlExtras]
  );

  let defaultValueHint;

  let readOnly: boolean | undefined = undefined;
  if (isPlainObjectPropType(propType) && propType.type !== "slot") {
    const readOnlyType = propType.readOnly;
    readOnly = _getContextDependentValue(readOnlyType) ?? false;
  }

  if (
    isPlainObjectPropType(propType) &&
    propType.type != "custom" &&
    propType.type != "slot" &&
    propType.type != "dataSource" &&
    propType.type != "class" &&
    propType.type != "styleScopeClass" &&
    propType.type != "themeResetClass" &&
    propType.type != "themeStyles" &&
    propType.type != "eventHandler" &&
    propType.type != "interaction" &&
    propType.type != "tpl" &&
    propType.type != "href" &&
    propType.type != "function" &&
    propType.type != "queryInvalidation" &&
    propType.type != "dataSourceOpData" &&
    propType.type != "target" &&
    propType.type != "controlMode" &&
    propType.type != "formDataConnection" &&
    propType.type != "dynamic" &&
    !isNil(propType.defaultValueHint) &&
    !hideDefaultValueHint
  ) {
    const plainObjectPropType = propType;
    defaultValueHint = _getContextDependentValue(
      plainObjectPropType.defaultValueHint
    );
  }

  if (isCustomControlType(propType)) {
    // Custom control
    const impl = isPlainObjectPropType(propType) ? propType.control : propType;
    ensure(isKnownTplComponent(tpl), "Custom control requires a tpl component");
    return (
      <CustomPropEditor
        value={value ?? defaultValueHint}
        tpl={tpl as TplComponent}
        onChange={onChange}
        viewCtx={viewCtx}
        impl={impl}
        componentPropValues={componentPropValues}
        ccContextData={ccContextData}
        propName={label}
      />
    );
  } else if (getPropTypeType(propType) === "target") {
    return (
      <TargetPropEditor
        value={value as string}
        onChange={onChange}
        valueSetState={valueSetState}
      />
    );
  } else if (getPropTypeType(propType) === "href") {
    return (
      <HrefEditor
        value={(isKnownPageHref(value) ? value : litValue) as string | PageHref}
        onChange={onChange}
        disabled={disabled || !!readOnly}
        key={tpl?.uid}
        data-plasmic-prop={attr}
      />
    );
  } else if ((getPropTypeType(propType) as any) === "dateString") {
    return (
      <DateStringEditor
        value={litValue as string}
        onChange={onChange}
        defaultValueHint={defaultValueHint}
        disabled={disabled || readOnly}
        data-plasmic-prop={attr}
      />
    );
  } else if ((getPropTypeType(propType) as any) === "dateRangeStrings") {
    return (
      <DateRangeStringsEditor
        value={value as [string | undefined, string | undefined]}
        // onChange takes `JsonValue | Expr | undefined`
        // but DateRangeStringsEditor expects `[string | undefined, string | undefined]`
        // The issue is that `undefined` is not valid JSON.
        // Should DateRangeStringsEditor use `null` instead?
        // @ts-expect-error - see above
        onChange={onChange}
        defaultValueHint={defaultValueHint}
        disabled={disabled || readOnly}
      />
    );
  } else if (getPropTypeType(propType) === "boolean") {
    return (
      <BoolPropEditor
        value={value as boolean}
        defaultValueHint={defaultValueHint as boolean}
        onChange={onChange}
        disabled={disabled || readOnly}
        data-plasmic-prop={attr}
      />
    );
  } else if (isPlainObjectPropType(propType) && propType.type === "choice") {
    const options = _getContextDependentValue(propType.options) ?? [];
    const allowSearch = _getContextDependentValue(propType.allowSearch);
    const onSearch = _getContextDependentValue(propType.onSearch);
    const multiSelect = _getContextDependentValue(propType.multiSelect);
    return (
      <ChoicePropEditor
        attr={attr}
        readOnly={disabled || readOnly}
        onChange={onChange}
        defaultValueHint={defaultValueHint}
        valueSetState={valueSetState}
        // @ts-expect-error - cannot make TS happy due to props being union type
        value={litValue}
        allowSearch={allowSearch}
        onSearch={onSearch}
        multiSelect={multiSelect}
        filterOption={propType.filterOption}
        options={options}
      />
    );
  } else if (
    isPlainObjectPropType(propType) &&
    propType.type === "interaction"
  ) {
    const highlightOnMount = _getContextDependentValue(
      propType.highlightOnMount
    );
    const forceOpen = _getContextDependentValue(propType.forceOpen) ?? false;
    assert(
      isKnownTplComponent(tpl) || isKnownTplTag(tpl),
      "interaction prop type is available only for tag and components"
    );
    assert(viewCtx, "interaction prop type requires a viewCtx");
    assert(component, "interaction prop type requires a component");
    assert(
      value == null ||
        isKnownEventHandler(value) ||
        isRealCodeExprEnsuringType(value),
      "unexpected value type for interaction"
    );
    return (
      <InteractionPropEditor
        studioCtx={studioCtx}
        viewCtx={viewCtx}
        component={component}
        value={value}
        onChange={onChange}
        tpl={tpl}
        forceOpen={forceOpen}
        highlightOnMount={highlightOnMount}
        eventHandlerKey={propType.eventHandlerKey}
        data-plasmic-prop={attr}
        modalTitle={getDisplayNameOfEventHandlerKey(propType.eventHandlerKey, {
          tpl,
        })}
      />
    );
  } else if (
    isPlainObjectPropType(propType) &&
    propType.type === "eventHandler"
  ) {
    assert(
      isKnownTplComponent(tpl),
      "interaction prop type is available only for tag and components"
    );
    assert(viewCtx, "interaction prop type requires a viewCtx");
    assert(component, "interaction prop type requires a component");
    assert(
      value == null ||
        isKnownEventHandler(value) ||
        isRealCodeExprEnsuringType(value),
      "unexpected value type for interaction"
    );
    return (
      <InteractionPropEditor
        studioCtx={studioCtx}
        viewCtx={viewCtx}
        component={component}
        value={value}
        onChange={onChange}
        tpl={tpl}
        forceOpen={false}
        eventHandlerKey={{
          funcType: ensureKnownFunctionType(
            unwrap(propTypeToWabType(studioCtx.site, propType))
          ),
        }}
        modalTitle={label}
      />
    );
  } else if (
    isPlainObjectPropType(propType) &&
    (propType.type as any) === "formValidationRules"
  ) {
    // assert(component, /"validation rules prop type requires a component");
    assert(viewCtx, "validation rules prop type requires a viewCtx");
    assert(tpl, "validation rules prop type type requires a tpl");
    return (
      <FormValidationRulesEditor
        tpl={tpl}
        viewCtx={viewCtx}
        onChange={onChange}
        value={value as CollectionExpr}
      />
    );
  } else if (isPlainObjectPropType(propType) && propType.type === "variable") {
    assert(component, "variable prop type requires a component");
    assert(viewCtx, "variable prop type requires a viewCtx");
    assert(tpl, "variable prop type requires a tpl");
    return (
      <VariableEditor
        component={component}
        studioCtx={studioCtx}
        onChange={onChange}
        value={value as Expr | null}
        viewCtx={viewCtx}
        tpl={tpl}
        variableTypes={propType.variableTypes}
        attr={attr}
      />
    );
  } else if (
    isPlainObjectPropType(propType) &&
    propType.type === "interactionExprValue"
  ) {
    assert(tpl, "interactionExprValue prop type requires a tpl");
    assert(viewCtx, "interactionExprValue prop type requires a viewCtx");
    const currentInteraction = ensure(
      _getContextDependentValue(propType.currentInteraction),
      "interactionExprValue prop type requires a current interaction"
    );
    const eventHandlerKey = ensure(
      _getContextDependentValue(propType.eventHandlerKey),
      "interactionExprValue prop type requires an eventHandlerKey"
    );
    return (
      <InteractionExprEditor
        viewCtx={viewCtx}
        tpl={tpl}
        currentInteraction={currentInteraction}
        eventHandlerKey={eventHandlerKey}
        value={value as Expr | null}
        onChange={onChange}
        alwaysShowValuePathAsLabel={true}
        isBodyFunction={propType.isBodyFunction}
        data-plasmic-prop={attr}
        hidePreview={propType.hidePreview}
        component={component}
        isRunCodeInteraction={propType.isRunCodeInteraction}
      />
    );
  } else if (
    isPlainObjectPropType(propType) &&
    propType.type === "variantGroup"
  ) {
    const varRef = value ? ensureKnownVarRef(value) : undefined;
    const options =
      component?.variantGroups.map((vg) => ({
        value: vg.param.variable.name,
        label: vg.param.variable.name,
      })) ?? [];
    return (
      <EnumPropEditor
        value={varRef?.variable.name}
        onChange={(name) => {
          if (!name) {
            onChange(null);
            return;
          }
          const variantGroup = ensure(
            component?.variantGroups.find(
              (vg) => vg.param.variable.name === name
            ),
            "Cannot find vgroup with given name"
          );
          onChange(new VarRef({ variable: variantGroup.param.variable }));
        }}
        onDelete={onDelete}
        options={options}
        className={"form-control"}
        valueSetState={valueSetState}
        defaultValueHint={defaultValueHint}
        readOnly={readOnly || options.length === 0}
        disabledTooltip={"No variant available"}
        data-plasmic-prop={attr}
      />
    );
  } else if (isPlainObjectPropType(propType) && propType.type === "varRef") {
    const options = _getContextDependentValue(propType.options) ?? [];
    const varRef = value ? ensureKnownVarRef(value) : undefined;
    return (
      <EnumPropEditor
        value={varRef?.variable.name}
        onChange={(name) => {
          if (!name) {
            onChange(null);
            return;
          }
          const variable = ensure(
            options.find((opt) => opt.name === name),
            "Cannot find a variable with given name"
          );
          onChange(new VarRef({ variable }));
        }}
        onDelete={onDelete}
        options={options.map((opt) => opt.name)}
        className={"form-control"}
        valueSetState={valueSetState}
        defaultValueHint={defaultValueHint}
        readOnly={readOnly || options.length === 0}
        disabledTooltip={"No interaction prop available"}
        data-plasmic-prop={attr}
      />
    );
  } else if (
    isPlainObjectPropType(propType) &&
    propType.type === "functionArgs"
  ) {
    const functionType = _getContextDependentValue(propType.functionType);
    const parametersMeta = _getContextDependentValue(propType.parametersMeta);
    assert(functionType, "function type not found");
    const args = value ? ensureKnownCollectionExpr(value) : undefined;

    let innerComponentPropValues: Record<string, any> | undefined =
      componentPropValues;
    let innerCcContextData: any = ccContextData;

    if (propType.forExternal) {
      innerCcContextData = undefined;
      innerComponentPropValues = undefined;
    }
    if (propType.targetTpl && viewCtx) {
      const targetTpl = ensure(
        _getContextDependentValue(propType.targetTpl),
        "if targetTpl is specified, it should return a valid tpl"
      );
      ({
        componentPropValues: innerComponentPropValues,
        ccContextData: innerCcContextData,
      } = viewCtx.getComponentEvalContext(targetTpl));
    }
    return (
      <>
        {functionType.params.map((p, i) => {
          assert(
            isPlainObjectPropType(propType) && propType.type === "functionArgs",
            "unexpected: checked outside the map function"
          );

          const FunctionArgClass = propType.isFunctionTypeAttachedToModel
            ? FunctionArg
            : StrongFunctionArg;
          const arg = args?.exprs.find((expr) =>
            isKnownFunctionArg(expr) ? typesEqual(expr.argType, p) : undefined
          ) as FunctionArg | undefined;
          const argParameterType = parametersMeta
            ? parametersMeta[i].type
            : wabTypeToPropType(p.type);
          return (
            <PropEditorRow
              {...props}
              env={env}
              // don't expose model data to code components
              componentPropValues={innerComponentPropValues}
              ccContextData={innerCcContextData}
              disableLinkToProp={true}
              viewCtx={ensure(
                viewCtx,
                "functionArgs prop type requires a viewCtx"
              )}
              tpl={ensure(tpl, "functionArgs prop type requires a tpl")}
              layout={"vertical"}
              definedIndicator={{ source: "invariantable" }}
              attr={p.argName}
              label={p.displayName ?? smartHumanize(p.argName)}
              propType={argParameterType}
              expr={arg?.expr}
              onChange={(val) => {
                if (!val) {
                  return;
                }
                const newCollectionExpr: CollectionExpr = args
                  ? clone(args)
                  : new CollectionExpr({ exprs: [] });
                const newFunctionArg = new FunctionArgClass({
                  uuid: mkShortId(),
                  argType: p,
                  expr: isKnownExpr(val) ? val : codeLit(val),
                });
                newCollectionExpr.exprs[i] = newFunctionArg;
                onChange(newCollectionExpr);
              }}
            />
          );
        })}
      </>
    );
  } else if (isPlainObjectPropType(propType) && propType.type === "variant") {
    const variantsRef = value ? ensureKnownVariantsRef(value) : undefined;
    const variantTypes = propType.variantTypes;

    const vgroupVarRef = _getContextDependentValue(propType.variantGroup);
    const vgroup = component?.variantGroups.find(
      (vg) => vg.param.variable === vgroupVarRef?.variable
    );

    let variantOptions: Variant[];
    if (vgroup) {
      variantOptions = vgroup.variants;
    } else {
      const filteredVgroups =
        (variantTypes
          ? component?.variantGroups.filter(
              (vg) =>
                (variantTypes.includes("multi") && vg.multi) ||
                (variantTypes.includes("toggle") &&
                  isStandaloneVariantGroup(vg)) ||
                (variantTypes.includes("single") &&
                  !vg.multi &&
                  !isStandaloneVariantGroup(vg))
            )
          : component?.variantGroups) ?? [];
      variantOptions = filteredVgroups.flatMap((vg) => vg.variants);
    }

    const options = [
      ...(vgroup && isStandaloneVariantGroup(vgroup)
        ? [{ value: vgroup.variants[0].name, label: "Set" }]
        : variantOptions.map((v) => ({
            value: v.name,
            label: v.name,
          }))),
      ...(vgroup && !vgroup.multi ? [{ value: "", label: "Unset" }] : []),
    ];

    const onChangeVariants = (val: string | string[] | null) => {
      if (!val) {
        onChange(new VariantsRef({ variants: [] }));
        return;
      }

      const names = ensureArray(val);
      const variants = names.map((name) =>
        ensure(
          variantOptions.find((v) => v.name === name),
          "Cannot find given variant in options"
        )
      );
      onChange(new VariantsRef({ variants }));
    };

    if (vgroup?.multi) {
      return (
        <MultiSelectEnumPropEditor
          className="flex-fill SidebarSection__Container--NoBorder"
          onChange={(v) => onChangeVariants(v)}
          options={options}
          value={variantsRef?.variants.map((v) => v.name)}
          defaultValueHint={defaultValueHint}
          data-plasmic-prop={attr}
        />
      );
    }

    return (
      <EnumPropEditor
        value={
          (variantsRef?.variants.length ?? 0) > 0
            ? variantsRef?.variants[0].name
            : ""
        }
        onChange={(v) => onChangeVariants(v as string)}
        onDelete={onDelete}
        options={options}
        className={"form-control"}
        valueSetState={valueSetState}
        defaultValueHint={defaultValueHint}
        readOnly={readOnly}
        data-plasmic-prop={attr}
      />
    );
  } else if (viewCtx && getPropTypeType(propType) === "tpl") {
    return (
      <TplRefEditor
        value={isKnownTplRef(value) ? value : undefined}
        onChange={onChange}
        viewCtx={viewCtx}
        valueSetState={valueSetState}
      />
    );
  } else if (
    isPlainObjectPropType(propType) &&
    propType.type === "queryInvalidation"
  ) {
    const data =
      tpl && viewCtx
        ? extractDataCtx(
            viewCtx,
            tpl,
            env as CanvasEnv,
            _getContextDependentValue(propType.currentInteraction),
            _getContextDependentValue(propType.eventHandlerKey)
          )
        : undefined;
    return (
      <InvalidationEditor
        value={isKnownQueryInvalidationExpr(value) ? value : undefined}
        data={data}
        schema={schema}
        onChange={onChange}
        layout="vertical"
        component={component}
      />
    );
  } else if (getPropTypeType(propType) === "number") {
    let min: number | undefined = undefined;
    let max: number | undefined = undefined;
    let step: number | undefined = undefined;

    const ensureNumberValueIsValid = (x: number | undefined) =>
      isNumber(x) && isFinite(x) ? x : undefined;
    if (isPlainObjectPropType(propType) && propType.type === "number") {
      min = ensureNumberValueIsValid(_getContextDependentValue(propType.min));
      max = ensureNumberValueIsValid(_getContextDependentValue(propType.max));
      if (propType.control === "slider") {
        step = ensureNumberValueIsValid(
          _getContextDependentValue(propType.step)
        );
        if (isNil(min) || isNil(max) || isNil(step) || min > max || step <= 0) {
          step = undefined;
        }
      }
    }
    return (
      <NumPropEditor
        value={litValue as number}
        onChange={onChange}
        onAfterChange={() => viewCtx?.stopUnlogged()}
        min={min}
        max={max}
        defaultValueHint={defaultValueHint}
        readOnly={readOnly}
        data-plasmic-prop={attr}
        step={step}
        control={
          isPlainObjectPropType(propType) && propType.type === "number"
            ? propType.control
            : undefined
        }
      />
    );
  } else if (
    isPlainObjectPropType(propType) &&
    propType.type === "dataSourceOp"
  ) {
    assert(
      isKnownDataSourceOpExpr(value) || value === undefined,
      "Value is expected to be either a DataSourceOpExpr or undefined"
    );
    const allowedOps = _getContextDependentValue(propType.allowedOps);
    return (
      <DataSourceOpPicker
        queryKey={`${tpl?.uuid ?? ""}-${
          ccContextData?.currentInteraction?.uuid ?? ""
        }-${attr}`}
        key={value?.uid}
        value={value}
        onChange={onChange}
        readOnly={readOnly}
        readOpsOnly={!(propType as any).allowWriteOps}
        schema={schema}
        parent={!propType.allowWriteOps ? tpl : undefined}
        allowedOps={allowedOps}
        component={component}
        interaction={_getContextDependentValue(propType.currentInteraction)}
        viewCtx={viewCtx}
        tpl={tpl}
        eventHandlerKey={_getContextDependentValue(propType.eventHandlerKey)}
      />
    );
  } else if (
    isPlainObjectPropType(propType) &&
    propType.type === "customFunctionOp"
  ) {
    assert(
      isKnownCustomFunctionExpr(value) || value === undefined,
      "Value is expected to be either a CustomFunctionExpr or undefined"
    );
    const allowedOps = _getContextDependentValue(propType.allowedOps);
    return (
      <CustomFunctionEditor
        queryKey={`${tpl?.uuid ?? ""}-${
          ccContextData?.currentInteraction?.uuid ?? ""
        }-${attr}`}
        key={value?.uid}
        value={value}
        onChange={onChange}
        allowedOps={allowedOps}
        component={component}
        interaction={_getContextDependentValue(propType.currentInteraction)}
        viewCtx={viewCtx}
        tpl={tpl}
        eventHandlerKey={_getContextDependentValue(propType.eventHandlerKey)}
      />
    );
  } else if (
    isTplComponent(tpl) &&
    isPlainObjectPropType(propType) &&
    propType.type === "dataSource"
  ) {
    return (
      <DataSourceEditor
        value={hasKey(value, "id") ? value : undefined}
        onChange={onChange}
        dataSourceType={propType.dataSource as DataSourceType}
        readOnly={readOnly}
        paramName={attr}
        tpl={tpl}
        defaultValueHint={defaultValueHint}
      />
    );
  } else if (
    isPlainObjectPropType(propType) &&
    propType.type === "dataSourceOpData"
  ) {
    const allowedOps = _getContextDependentValue(propType.allowedOps);
    return (
      <DataSourceOpDataPicker
        env={env}
        schema={schema}
        value={value}
        component={component}
        valueSetState={valueSetState}
        readOnly={readOnly}
        onChange={onChange}
        allowedOps={allowedOps}
        data-plasmic-prop={attr}
      />
    );
  } else if (
    isPlainObjectPropType(propType) &&
    propType.type === "formDataConnection"
  ) {
    assert(
      isKnownDataSourceOpExpr(value) || value === undefined,
      "Value is expected to be either a DataSourceOpExpr or undefined"
    );
    assert(isKnownTplComponent(tpl), "tpl is expected to be a TplComponent");
    return (
      <FormDataConnectionPropEditor
        env={env ?? {}}
        schema={schema}
        value={value}
        onChange={onChange}
        component={component}
        tpl={tpl}
        disabled={disabled}
      />
    );
  } else if (isPlainObjectPropType(propType) && propType.type === "class") {
    return (
      <StyleExprButton
        viewCtx={viewCtx!}
        tpl={tpl as TplComponent}
        attr={attr}
        spec={propType as StyleExprSpec}
        title={propType.displayName}
      />
    );
  } else if (
    isPlainObjectPropType(propType) &&
    propType.type === "cardPicker"
  ) {
    const options = _getContextDependentValue(propType.options) ?? [];
    const title = _getContextDependentValue(propType.modalTitle);
    const onSearch = _getContextDependentValue(propType.onSearch);
    const showInput = _getContextDependentValue(propType.showInput);
    return (
      <CardPickerEditor
        onChange={onChange}
        onSearch={onSearch}
        value={value as string}
        options={options}
        title={title}
        showInput={showInput}
      />
    );
  } else if (getPropTypeType(propType) === "dataSelector") {
    let alwaysShowValuePathAsLabel = false;
    let propData: Record<string, any> = {};
    let mergeWithExternalData = false;
    if (isPlainObjectPropType(propType) && propType.type === "dataSelector") {
      alwaysShowValuePathAsLabel = propType.alwaysShowValuePathAsLabel ?? false;
      propData = _getContextDependentValue(propType.data) ?? {};
      // mergeWithExternalData renamed to isolateEnv
      mergeWithExternalData =
        propType.isolateEnv !== undefined
          ? !propType.isolateEnv
          : uncheckedCast<any>(propType).mergeWithExternalData ?? true;
    }
    const data = {
      ...propData,
      ...(tpl && mergeWithExternalData
        ? {
            ...env,
            ..._getContextDependentValue(hackyCast(propType).extraData),
          }
        : {}),
    };
    return (
      <DataPickerEditor
        viewCtx={viewCtx}
        value={value as (string | number)[] | string}
        onChange={onChange}
        visible={isDataPickerVisible}
        setVisible={setIsDataPickerVisible}
        data={data}
        schema={schema}
        isDisabled={L.isEmpty(data)}
        disabledTooltip={"Data not found."}
        hideStateSwitch={true}
        alwaysShowValuePathAsLabel={alwaysShowValuePathAsLabel}
        data-plasmic-prop={attr}
      />
    );
  } else if (getPropTypeType(propType) === "exprEditor") {
    let propData: Record<string, any> = {};
    let mergeWithExternalData = true;
    if (isPlainObjectPropType(propType) && propType.type === "exprEditor") {
      propData = _getContextDependentValue(propType.data) ?? {};
      mergeWithExternalData =
        propType.isolateEnv !== undefined
          ? !propType.isolateEnv
          : uncheckedCast<any>(propType).mergeWithExternalData ?? true;
    }
    const data = {
      ...propData,
      ...(tpl && mergeWithExternalData
        ? {
            ...env,
            ..._getContextDependentValue(hackyCast(propType).extraData),
          }
        : {}),
    };

    return (
      <ExprEditor
        value={value as Expr | null}
        onChange={onChange}
        data={data}
        schema={schema}
        viewCtx={viewCtx}
        initialMode={"dataPicking"}
        data-plasmic-prop={attr}
        component={component}
      />
    );
  } else if (isPlainObjectPropType(propType) && propType.type === "function") {
    const control = propType.control ?? {
      type: "exprEditor",
      mergeWithExternalData: true,
    }; // default control;
    return <PropValueEditor {...props} propType={control} ref={ref} />;
  } else if (isPlainObjectPropType(propType) && propType.type === "dynamic") {
    const control = ensure(
      _getContextDependentValue(propType.control),
      "missing control for dynamic prop type"
    );
    const fixedValue =
      getPropTypeType(control) === "exprEditor" && !isRealCodeExpr(value)
        ? createExprForDataPickerValue(JSON.stringify(litValue))
        : value;
    return (
      <PropValueEditor
        {...props}
        propType={control}
        value={fixedValue}
        ref={ref}
      />
    );
  } else if (isPlainObjectPropType(propType) && propType.type === "color") {
    return (
      <ColorButton
        onChange={(colorOrToken) => {
          const maybeToken = tryParseTokenRef(
            colorOrToken,
            siteFinalStyleTokensAllDepsDict(studioCtx.site)
          );
          if (maybeToken) {
            onChange(new StyleTokenRef({ token: maybeToken.base }));
          } else {
            onChange(colorOrToken);
          }
        }}
        color={
          isKnownStyleTokenRef(value)
            ? mkTokenRef(value.token)
            : isKnownTemplatedString(value)
            ? JSON.parse(
                asCode(value, {
                  projectFlags: studioCtx.projectFlags(),
                  component: viewCtx?.currentComponent() ?? null,
                  inStudio: true,
                }).code
              )
            : (value as string) || ""
        }
        valueSetState={valueSetState}
        hideTokenPicker={hackyCast(propType).disableTokens}
        sc={studioCtx}
        data-plasmic-prop={attr}
        valuePath={controlExtras.path}
      />
    );
  } else if (getPropTypeType(propType) === "array") {
    if (
      isPlainObjectPropType(propType) &&
      propType.type === "array" &&
      propType.itemType &&
      (viewCtx || exprCtx)
    ) {
      const evalExprCtx = getEvalExprCtx(viewCtx, exprCtx);
      const userMinimalValue = _getContextDependentValue(
        propType.unstable__minimalValue
      );
      let deseredValue = deserCompositeExprMaybe(value);

      let evaluated = isKnownExpr(value)
        ? tryEvalExpr(getRawCode(value, evalExprCtx), env ?? {}).val
        : value;
      if (userMinimalValue) {
        deseredValue = mergeUserMinimalValueWithCompositeExpr(
          userMinimalValue,
          value,
          evalExprCtx,
          env ?? {},
          propType.unstable__keyFunc
        );
        evaluated = userMinimalValue;
      }
      return (
        <ArrayPropEditor
          onChange={(newValue) => {
            onChange(clone(serCompositeExprMaybe(newValue)));
          }}
          compositeValue={deseredValue as any}
          evaluatedValue={evaluated}
          subfields={propType.itemType.fields ?? {}}
          canDeleteFunc={propType.unstable__canDelete}
          itemNameFunc={propType.itemType.nameFunc}
          ccContextData={ccContextData}
          componentPropValues={componentPropValues}
          controlExtras={controlExtras}
          modalKey={
            // Set key based on Tpl ID for components and controlExtras for server queries
            viewCtx && isTplComponent(tpl)
              ? `main.${tpl.uid}.${attr}`
              : `arr.${controlExtras.path.join(".")}.${attr}`
          }
          data-plasmic-prop={attr}
          propType={propType}
          disabled={disabled}
        />
      );
    } else {
      return (
        <CodeEditor
          onChange={onChange}
          value={value === undefined ? defaultValueHint : value}
          title={label}
          lang="json"
          saveAsObject
          isDisabled={readOnly}
          fileName={attr}
          defaultFullscreen
        />
      );
    }
  } else if (getPropTypeType(propType) === "object") {
    if (
      isPlainObjectPropType(propType) &&
      propType.type === "object" &&
      propType.fields &&
      (viewCtx || exprCtx)
    ) {
      const evaluated = isKnownExpr(value)
        ? tryEvalExpr(
            getRawCode(value, getEvalExprCtx(viewCtx, exprCtx)),
            env ?? {}
          ).val
        : value;
      const compositeValue = deserCompositeExprMaybe(value);
      return (
        <ObjectPropEditor
          data-plasmic-prop={attr}
          onChange={(newValue) => {
            onChange(clone(serCompositeExprMaybe(newValue)));
          }}
          compositeValue={
            value === undefined ? defaultValueHint : (compositeValue as any)
          }
          evaluatedValue={value === undefined ? defaultValueHint : evaluated}
          fields={propType.fields}
          modalKey={
            viewCtx && isTplComponent(tpl)
              ? `main.${tpl.uid}.${attr}`
              : `obj.${controlExtras.path.join(".")}.${attr}`
          }
          objectNameFunc={propType.nameFunc}
          componentPropValues={componentPropValues}
          ccContextData={ccContextData}
          controlExtras={controlExtras}
          propType={propType}
          display={propType.display}
        />
      );
    } else {
      return (
        <CodeEditor
          onChange={onChange}
          value={value === undefined ? defaultValueHint : value}
          title={label}
          lang="json"
          fileName={attr}
          requireObject={
            isPlainObjectPropType(propType) && hackyCast(propType).requireObject
          }
          saveAsObject
          isDisabled={readOnly}
          defaultFullscreen={
            isPlainObjectPropType(propType) &&
            hackyCast(propType).control === "sidebar"
              ? false
              : true
          }
        />
      );
    }
  } else if (
    isPlainObjectPropType(propType) &&
    propType.type === "queryBuilder"
  ) {
    const config = _getContextDependentValue(propType.config);
    if (!config) {
      // QueryBuilder validates the value against the config's fields,
      // so make sure the config is loaded before rendering.
      return null;
    }
    return (
      <QueryBuilderPropEditor
        config={config}
        value={value as RulesLogic | QueryBuilderValue}
        onChange={onChange}
        disabled={disabled || readOnly}
      />
    );
  } else if (getPropTypeType(propType) === "richText") {
    return (
      <RichTextPropEditor
        onChange={onChange}
        value={value === undefined ? defaultValueHint : value}
      />
    );
  } else if (
    isPlainObjectPropType(propType) &&
    propType.type === "code" &&
    propType.lang === "graphql"
  ) {
    const endpoint = _getContextDependentValue(propType.endpoint);
    const method = _getContextDependentValue(propType.method);
    const headers = _getContextDependentValue(propType.headers);

    return (
      <GraphQLEditor
        title={label}
        endpoint={endpoint ?? ""}
        headers={headers as Record<string, string>}
        method={method}
        onChange={onChange as (value: GraphQLValue | null | undefined) => void}
        value={value as GraphQLValue | null}
      />
    );
  } else if (
    isPlainObjectPropType(propType) &&
    propType.type === "code" &&
    ["css", "html", "javascript", "json"].includes(propType.lang)
  ) {
    return (
      <CodeEditor
        onChange={onChange}
        value={
          value === undefined ? defaultValueHint : (value as string | null)
        }
        title={label}
        lang={propType.type === "code" ? propType.lang : "text"}
        defaultFullscreen={
          "control" in propType && propType.control === "sidebar" ? false : true
        }
        isDisabled={readOnly}
        data-plasmic-prop={attr}
        fileName={attr}
      />
    );
  } else if (
    isPlainObjectPropType(propType) &&
    propType.type === "string" &&
    propType.control === "large"
  ) {
    return (
      <CodeEditor
        onChange={onChange}
        value={
          value === undefined ? defaultValueHint : (value as string | null)
        }
        title={label}
        lang={"text"}
        defaultFullscreen
        isDisabled={readOnly}
        fileName={attr}
      />
    );
  } else if (getPropTypeType(propType) === "imageUrl") {
    const sc = useStudioCtx();
    return (
      <ImagePropEditor
        attr={attr}
        studioCtx={sc}
        value={
          isKnownImageAssetRef(value) ? value.asset : value ?? defaultValueHint
        }
        onPicked={(picked) => {
          if (isKnownImageAsset(picked)) {
            onChange(new ImageAssetRef({ asset: picked }));
          } else {
            onChange(picked);
          }
        }}
        type={ImageAssetType.Picture}
        readOnly={readOnly}
      />
    );
  } else {
    return (
      <TemplatedStringPropEditor
        data={env}
        schema={schema}
        viewCtx={viewCtx}
        value={value as string}
        readOnly={readOnly}
        onChange={onChange}
        disabled={disabled}
        defaultValueHint={defaultValueHint}
        data-plasmic-prop={attr}
        leftAligned
        valueSetState={valueSetState}
        ref={ref}
        component={component}
      />
    );
  }
};

export const PropValueEditor = observer(React.forwardRef(PropValueEditor_));
