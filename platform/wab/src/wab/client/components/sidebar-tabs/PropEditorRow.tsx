import ContextMenuIndicator from "@/wab/client/components/ContextMenuIndicator/ContextMenuIndicator";
import { ComponentPropModal } from "@/wab/client/components/modals/ComponentPropModal";
import { DataPickerEditor } from "@/wab/client/components/sidebar-tabs/ComponentProps/DataPickerEditor";
import {
  AUTOCOMPLETE_OPTIONS,
  FallbackEditor,
  getComponentPropTypes,
  getContextComponentPropTypes,
  IndentedRow,
} from "@/wab/client/components/sidebar-tabs/ComponentPropsSection";
import { ValuePreview } from "@/wab/client/components/sidebar-tabs/data-tab";
import { DataPickerTypesSchema } from "@/wab/client/components/sidebar-tabs/DataBinding/DataPicker";
import { getInputTagType } from "@/wab/client/components/sidebar-tabs/HTMLAttributesSection";
import { PropValueEditor } from "@/wab/client/components/sidebar-tabs/PropValueEditor";
import WarningIcon from "@/wab/client/plasmic/plasmic_kit_icons/icons/PlasmicIcon__WarningTriangleSvg";

import {
  getValueSetState,
  InvariantablePropTooltip,
  LabeledItemRow,
  ValueSetState,
} from "@/wab/client/components/sidebar/sidebar-helpers";
import { TplExpsProvider } from "@/wab/client/components/style-controls/StyleComponent";
import { InlineIcon } from "@/wab/client/components/widgets";
import { Icon } from "@/wab/client/components/widgets/Icon";
import InfoIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Info";
import LinkIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Link";
import PlusIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Plus";
import { StudioCtx, useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { StandardMarkdown } from "@/wab/client/utils/StandardMarkdown";
import { HighlightBlinker } from "@/wab/commons/components/HighlightBlinker";
import { DeepReadonly } from "@/wab/commons/types";
import { getLinkedCodeProps } from "@/wab/shared/cached-selectors";
import {
  ensurePropTypeToWabType,
  getPropTypeLayout,
  getPropTypeType,
  isAllowedDefaultExprForPropType,
  isDynamicValueDisabledInPropType,
  isExprValuePropType,
  isPlainObjectPropType,
  maybePropTypeToAbout,
  StudioPropType,
  wabTypeToPropType,
} from "@/wab/shared/code-components/code-components";
import {
  assert,
  ensure,
  ensureInstance,
  filterFalsy,
  hackyCast,
  isOneOf,
  leftZip,
  maybe,
  strictZip,
  swallow,
  switchType,
  tuple,
} from "@/wab/shared/common";
import { getContextDependentValue } from "@/wab/shared/context-dependent-value";
import {
  extractParamsFromPagePath,
  getComponentDisplayName,
  getParamDisplayName,
  getRealParams,
  isCodeComponent,
  isContextCodeComponent,
  isPageComponent,
  isPlainComponent,
  isPlumeComponent,
} from "@/wab/shared/core/components";
import {
  asCode,
  clone,
  codeLit,
  createExprForDataPickerValue,
  ExprCtx,
  extractReferencedParam,
  extractValueSavedFromDataPicker,
  hasDynamicParts,
  isAllowedDefaultExpr,
  isDynamicExpr,
  isFallbackSet,
  isPageHref,
  isRealCodeExpr,
  renderable,
  tryExtractJson,
} from "@/wab/shared/core/exprs";
import { JsonValue } from "@/wab/shared/core/lang";
import {
  getTplTextBlockContent,
  isTplRawString,
  isTplTag,
  TplTagCodeGenType,
} from "@/wab/shared/core/tpls";
import {
  getInvalidArgErrorMessage,
  InvalidArgMeta,
} from "@/wab/shared/core/val-nodes";
import {
  computeDefinedIndicator,
  DefinedIndicatorType,
} from "@/wab/shared/defined-indicator";
import { tryEvalExpr } from "@/wab/shared/eval";
import { getInputTypeOptions } from "@/wab/shared/html-utils";
import { RESET_CAP } from "@/wab/shared/Labels";
import {
  CollectionExpr,
  CompositeExpr,
  CustomCode,
  CustomFunctionExpr,
  DataSourceOpExpr,
  EventHandler,
  Expr,
  FunctionArg,
  FunctionExpr,
  GenericEventHandler,
  ImageAssetRef,
  isKnownClassNamePropType,
  isKnownCustomCode,
  isKnownExpr,
  isKnownFunctionExpr,
  isKnownFunctionType,
  isKnownObjectPath,
  isKnownQueryData,
  isKnownRenderExpr,
  isKnownTemplatedString,
  isKnownVarRef,
  MapExpr,
  ObjectPath,
  PageHref,
  Param,
  QueryInvalidationExpr,
  RawText,
  RenderExpr,
  StrongFunctionArg,
  StyleExpr,
  StyleTokenRef,
  TemplatedString,
  TplComponent,
  TplRef,
  TplTag,
  Type,
  VariantsRef,
  VarRef,
} from "@/wab/shared/model/classes";
import {
  isRenderableType,
  typeFactory,
  typesEqual,
} from "@/wab/shared/model/model-util";
import { hashExpr } from "@/wab/shared/site-diffs";
import { getTplComponentArg, unsetTplComponentArg } from "@/wab/shared/TplMgr";
import { $$$ } from "@/wab/shared/TplQuery";
import { isBaseVariant } from "@/wab/shared/Variants";
import { ensureBaseVariantSetting } from "@/wab/shared/VariantTplMgr";
import { Menu, Tooltip } from "antd";
import { capitalize, isString, keyBy } from "lodash";
import { observer } from "mobx-react";
import React, { useMemo } from "react";

export interface ControlExtras {
  path: (number | string)[];
  item?: any; // used for objects and array types
}

interface PropEditorContextData {
  componentPropValues: Record<string, any>;
  ccContextData: any;
  invalidArg?: InvalidArgMeta;
  tpl?: TplTag | TplComponent;
  viewCtx?: ViewCtx;
  env: { [key: string]: any } | undefined;
  schema?: DataPickerTypesSchema;
  exprCtx?: ExprCtx;
  defaultValue?: Record<string, any>;
}

export const PropValueEditorContext =
  React.createContext<PropEditorContextData>({
    componentPropValues: {},
    ccContextData: {},
    env: undefined,
  });

export const usePropValueEditorContext = () => {
  return React.useContext(PropValueEditorContext);
};

export function isPropShown(
  propType: StudioPropType<any>,
  componentPropValues: Record<string, any>,
  ccContextData: any = {},
  controlExtras: ControlExtras = { path: [] }
) {
  const propTypeType = getPropTypeType(propType);
  if (
    propTypeType &&
    isOneOf(propTypeType, [
      "styleScopeClass",
      "themeResetClass",
      "themeStyles",
      "controlMode",
    ])
  ) {
    return false;
  }
  if (isPlainObjectPropType(propType) && propType.type !== "slot") {
    const objPropType = propType;
    return !swallow({ warn: true }, () =>
      hackyCast(objPropType.hidden)?.(
        componentPropValues,
        ccContextData,
        controlExtras
      )
    );
  }
  return true;
}

function tryGetTplRawString(expr: Expr) {
  if (isKnownRenderExpr(expr) && expr.tpl.length === 1) {
    const tpl = expr.tpl[0];
    return isTplRawString(tpl) ? tpl : undefined;
  }
  return undefined;
}

// Return a tuple of (value, editable).
export function updateOrCreateExpr(
  expr: Expr | null | undefined,
  type: Type,
  val: any,
  owningTpl?: TplTag | TplComponent,
  viewCtx?: ViewCtx
) {
  if (owningTpl && isRenderableType(type)) {
    assert(isString(val), "Used to create a tpl with inlined text");
    assert(viewCtx, "ViewCtx is required to update a renderableType");
    const vtm = viewCtx.variantTplMgr();
    if (expr) {
      const tpl = tryGetTplRawString(expr);
      if (tpl) {
        vtm.ensureCurrentVariantSetting(tpl).text = new RawText({
          text: val,
          markers: [],
        });
        return expr;
      }
    }
    const textNode = vtm.mkTplInlinedText(val);
    textNode.codeGenType = TplTagCodeGenType.NoTag;
    textNode.parent = owningTpl;
    return renderable(textNode);
  } else if (isKnownExpr(val)) {
    return val;
  } else {
    return codeLit(val);
  }
}

function isQuery(_expr: Expr | undefined) {
  return (
    isKnownObjectPath(_expr) &&
    _expr.path[0] === "$queries" &&
    _expr.path.length === 2
  );
}

function extractLitFromMaybeRenderable(
  expr: Expr | undefined | null,
  viewCtx: ViewCtx | undefined
): [JsonValue | Expr | undefined, boolean] {
  if (!expr) {
    return [undefined, true];
  }

  return switchType(expr)
    .when(RenderExpr, (renderExpr): [string | undefined, boolean] => {
      if (renderExpr.tpl.length === 0 || !viewCtx) {
        return [undefined, true];
      }
      const tpl = tryGetTplRawString(renderExpr);
      return tpl
        ? tuple(getTplTextBlockContent(renderExpr.tpl[0], viewCtx), true)
        : tuple("Please edit in canvas", false);
    })
    .when(
      [
        CollectionExpr,
        PageHref,
        DataSourceOpExpr,
        TemplatedString,
        StyleTokenRef,
        EventHandler,
        GenericEventHandler,
        ObjectPath,
        VarRef,
        VariantsRef,
        TplRef,
        FunctionExpr,
        FunctionArg,
        QueryInvalidationExpr,
        CompositeExpr,
        MapExpr,
        CollectionExpr,
        CustomFunctionExpr,
        ImageAssetRef,
      ],
      (_expr): [Expr, boolean] => [_expr, true]
    )
    .when(CustomCode, (customCode): [JsonValue | Expr | undefined, boolean] => {
      if (isRealCodeExpr(customCode)) {
        return [expr, true];
      }
      return tuple(tryExtractJson(expr), true);
    })
    .when(
      [StyleExpr, StrongFunctionArg],
      (_expr): [JsonValue | undefined, boolean] =>
        tuple(tryExtractJson(expr), true)
    )
    .result();
}

export const inferPropTypeFromAttr = (
  viewCtx: ViewCtx,
  tpl: TplTag | TplComponent,
  attr: string
) => {
  if (isTplTag(tpl)) {
    if (tpl.tag === "input" && attr === "type") {
      const type = getInputTagType(tpl);
      return {
        type: "choice" as const,
        options: getInputTypeOptions(type) || [],
      };
    } else if (attr === "autoComplete") {
      return {
        type: "choice" as const,
        options: AUTOCOMPLETE_OPTIONS.map((op) => ({
          value: op,
          label: capitalize(op),
        })),
      };
    } else if (tpl.tag === "img" && attr === "loading") {
      return {
        type: "choice" as const,
        options: ["eager", "lazy"].map((op) => ({
          value: op,
          label: capitalize(op),
        })),
      };
    } else if (attr === "style") {
      return {
        type: "object" as const,
        requireObject: true,
        control: "sidebar",
      };
    } else if (attr === "aria-hidden") {
      return {
        type: "choice" as const,
        options: ["true", "false"].map((op) => ({
          value: op,
          label: capitalize(op),
        })),
      };
    }
    const key2param = keyBy(
      viewCtx.tagMeta().paramsForTag(tpl.tag),
      (param) => param.name
    );
    const wabType =
      key2param[attr]?.type?.name === "any"
        ? typeFactory.text()
        : key2param[attr]?.type ?? typeFactory.text();
    return wabTypeToPropType(wabType);
  }
  return undefined;
};

const inferPropTypeFromParam = (
  studioCtx: StudioCtx,
  viewCtx: ViewCtx | undefined,
  tpl: TplComponent,
  param: Param
): StudioPropType<any> => {
  let propType = wabTypeToPropType(param.type);
  // code components can have more advanced prop types.
  if (viewCtx) {
    if (isCodeComponent(tpl.component) || isPlumeComponent(tpl.component)) {
      const propTypes = getComponentPropTypes(viewCtx, tpl.component);
      return param.variable.name in propTypes
        ? propTypes[param.variable.name]
        : propType;
    } else {
      const maybeLinkedProp = getLinkedCodeProps(tpl.component).get(
        param.variable.name
      );
      if (maybeLinkedProp) {
        const [innerTpl, linkedProp] = maybeLinkedProp;
        const propTypes = getComponentPropTypes(viewCtx, innerTpl.component);
        return linkedProp.variable.name in propTypes
          ? propTypes[linkedProp.variable.name]
          : propType;
      }
    }
  } else if (isContextCodeComponent(tpl.component)) {
    propType = getContextComponentPropTypes(studioCtx, tpl.component)[
      param.variable.name
    ];
  }
  return propType;
};

export const PropEditorRowWrapper = observer(PropEditorRowWrapper_);

function PropEditorRowWrapper_(props: {
  viewCtx: ViewCtx;
  param: Param;
  tpl: TplComponent;
  expsProvider: TplExpsProvider;
}) {
  const { viewCtx, param, tpl, expsProvider } = props;

  const vtm = viewCtx.variantTplMgr();
  const effectiveVs = expsProvider.effectiveVs();
  const arg = effectiveVs.args.find((_arg) => _arg.param === param);
  const argSource = effectiveVs.getArgSource(param);
  const defined = computeDefinedIndicator(
    viewCtx.site,
    viewCtx.currentComponent(),
    argSource,
    expsProvider.targetIndicatorCombo
  );
  const onDeleteArg = () =>
    viewCtx.change(() => {
      vtm.delArg(tpl, param.variable);
    });
  const origExpr = maybe(arg, (x) => x.expr) || param.defaultExpr || undefined;

  const propType = inferPropTypeFromParam(
    viewCtx.studioCtx,
    viewCtx,
    tpl,
    param
  );
  const { componentPropValues, ccContextData, invalidArgs } =
    viewCtx.getComponentEvalContext(tpl, param);
  const controlExtras: ControlExtras = { path: [param.variable.name] };
  if (
    isPlainObjectPropType(propType) &&
    !isPropShown(propType, componentPropValues, ccContextData, controlExtras)
  ) {
    return null;
  }

  const shouldHighlight =
    viewCtx.highlightParam &&
    viewCtx.highlightParam.tpl === tpl &&
    viewCtx.highlightParam.param === param;

  const isDisabled =
    isPlainObjectPropType(propType) &&
    hackyCast(propType).invariantable &&
    !isBaseVariant(expsProvider.targetIndicatorCombo);

  return (
    <PropEditorRow
      key={param.variable.name}
      attr={param.variable.name}
      expr={origExpr}
      label={getParamDisplayName(tpl.component, param)}
      definedIndicator={defined}
      onDelete={defined.source === "set" ? onDeleteArg : undefined}
      propType={propType}
      shouldHighlight={shouldHighlight}
      disabled={isDisabled}
      tooltip={
        isDisabled && (
          <InvariantablePropTooltip
            propName={getParamDisplayName(tpl.component, param)}
          />
        )
      }
      onChange={(expr) => {
        assert(!isDisabled, "Trying to override an invariantable prop");
        viewCtx.change(() => {
          if (expr) {
            if (isKnownVarRef(expr)) {
              const baseArg = getTplComponentArg(
                tpl,
                ensureBaseVariantSetting(viewCtx.currentComponent(), tpl),
                param.variable
              );
              // unset all variant arguments so that there is no override to a link
              unsetTplComponentArg(tpl, param.variable);
              // Parameter link is always stored in base.
              vtm.setArgUnderVariantSetting(
                tpl,
                param.variable,
                expr,
                vtm.ensureBaseVariantSetting(tpl)
              );

              const referencedParam = extractReferencedParam(
                viewCtx.currentComponent(),
                expr
              );
              const baseExpr = baseArg?.expr ?? param.defaultExpr;
              if (
                referencedParam &&
                baseExpr &&
                isAllowedDefaultExpr(baseExpr) &&
                isAllowedDefaultExprForPropType(propType)
              ) {
                referencedParam.defaultExpr = clone(baseExpr);
              }
            } else {
              vtm.setArg(tpl, param.variable, expr);
            }
          } else {
            if (isKnownVarRef(origExpr)) {
              vtm.delArgFromVariantSetting(
                tpl,
                param.variable,
                vtm.ensureBaseVariantSetting(tpl)
              );
            } else {
              vtm.delArg(tpl, param.variable);
            }
          }
        });
      }}
      about={param.about ?? undefined}
      viewCtx={viewCtx}
      tpl={tpl}
      componentPropValues={componentPropValues}
      ccContextData={ccContextData}
      invalidArg={invalidArgs.find((invalidArg) => invalidArg.param === param)}
    />
  );
}

const isMenuEmpty = (menu: React.ReactElement) => {
  return filterFalsy(menu.props.children).length === 0;
};

interface PropEditorRowProps {
  expr: DeepReadonly<Expr> | undefined;
  label: string;
  definedIndicator?: DefinedIndicatorType;
  valueSetState?: ValueSetState;
  onChange: (expr: Expr | undefined) => void;
  onDelete?: () => void;
  about?: string;
  propType: StudioPropType<any>;
  layout?: "horizontal" | "vertical";
  attr: string;
  disableLinkToProp?: boolean;
  disableDynamicValue?: true;
  disableFallback?: boolean;
  disabled?: boolean;
  controlExtras?: ControlExtras;
  isNested?: boolean;
  icon?: React.ReactNode;
  shouldHighlight?: boolean;
  tooltip?: React.ReactNode;
}

function canLinkPropToParam(type: Type, existingParam: Param) {
  if (type.name === "href") {
    return typesEqual(type, existingParam.type);
  }
  if (isKnownFunctionType(type)) {
    if (
      !isKnownFunctionType(existingParam.type) ||
      type.params.length !== existingParam.type.params.length
    ) {
      return false;
    }
    return strictZip(type.params, existingParam.type.params).every(
      ([argType1, argType2]) =>
        // Not using typesEqual because it is more strict
        // For example, it checks if the function arg names are equal
        argType1.type.name === argType2.type.name
    );
  }
  return true;
}

export interface PropEditorRef {
  focus: () => void;
  isFocused: () => boolean;
  element: HTMLElement | null;
}

export const InnerPropEditorRow = observer(InnerPropEditorRow_);

function InnerPropEditorRow_(props: PropEditorRowProps) {
  const {
    about = maybePropTypeToAbout(props.propType),
    label,
    attr,
    definedIndicator = { source: "none" },
    propType,
    expr: origExpr,
    disableLinkToProp,
    disableFallback,
    disabled,
    valueSetState,
    isNested = false,
    controlExtras = { path: [props.attr] },
    icon,
    shouldHighlight,
    onChange,
    onDelete,
  } = props;

  const currValueEditorCtx = usePropValueEditorContext();
  const {
    componentPropValues,
    ccContextData,
    invalidArg,
    env: origCanvasEnv,
    tpl,
    viewCtx,
  } = currValueEditorCtx;

  const canvasEnv = {
    ...origCanvasEnv,
    ...getExtraEnvFromPropType(
      propType,
      componentPropValues,
      ccContextData,
      controlExtras
    ),
  };
  const ref = React.useRef<PropEditorRef>(null);

  const { maybeUnwrapExpr, maybeWrapExpr } =
    getExprTransformationBasedOnPropType(propType);
  const expr = maybeUnwrapExpr(origExpr);

  const studioCtx = useStudioCtx();
  const [newParamModalVisibile, setNewParamModalVisible] =
    React.useState(false);
  const [isDataPickerVisible, setIsDataPickerVisible] = React.useState(false);
  const disabledDynamicValue =
    props.disableDynamicValue ??
    (isDynamicValueDisabledInPropType(propType) ||
      isExprValuePropType(propType));
  const [showFallback, setShowFallback] = React.useState<boolean>(
    expr !== undefined && isFallbackSet(expr) && !disabledDynamicValue
  );
  const layout = props.layout ?? getPropTypeLayout(propType);
  const wabType = ensurePropTypeToWabType(studioCtx.site, propType);
  const ownerComponent = tpl && $$$(tpl).owningComponent();
  const referencedParam =
    ownerComponent && expr && !disableLinkToProp
      ? extractReferencedParam(ownerComponent, expr)
      : undefined;
  const isCustomCode = isRealCodeExpr(expr);
  const forceSetState = isNested ? ("isSet" as const) : undefined;
  const canLinkToProp =
    !disableLinkToProp &&
    !disabled &&
    viewCtx &&
    tpl &&
    viewCtx.tplMgr().canLinkToProp(tpl) &&
    (!wabType ||
      (!isKnownClassNamePropType(wabType) && !isRenderableType(wabType)));

  const schema = studioCtx.customFunctionsSchema();

  const exprCtx = {
    projectFlags: studioCtx.projectFlags(),
    component: ownerComponent ?? null,
    inStudio: true,
  };

  const evaluated = useMemo(
    () =>
      expr && canvasEnv && isDynamicExpr(expr)
        ? tryEvalExpr(asCode(expr, exprCtx).code, canvasEnv)
        : undefined,
    [expr ? hashExpr(expr, exprCtx) : undefined, canvasEnv]
  );

  const readOnly = !!(
    isPlainObjectPropType(propType) &&
    propType.type !== "slot" &&
    getContextDependentValue(
      propType.readOnly,
      componentPropValues,
      ccContextData,
      controlExtras
    )
  );

  const allowDynamicValue =
    !readOnly &&
    !referencedParam &&
    !disabledDynamicValue &&
    !disabled &&
    !isExprValuePropType(propType);

  const showDynamicValueButton =
    allowDynamicValue && !studioCtx.contentEditorMode && !isCustomCode;

  function switchToDynamicValue() {
    const newExpr = new ObjectPath({
      path: ["undefined"],
      fallback: expr ? clone(expr) : codeLit(undefined),
    });
    onChange(maybeWrapExpr(newExpr));
    setShowFallback(true);
    setIsDataPickerVisible(true);
  }

  const contextMenu = (
    <Menu>
      {!readOnly &&
        !referencedParam &&
        expr &&
        ["set", "none", "invariantable", "setNonVariable"].includes(
          definedIndicator.source
        ) &&
        !["functionArgs"].includes(getPropTypeType(propType) ?? "") && (
          <>
            {onDelete && (
              <Menu.Item onClick={() => onDelete()}>
                {RESET_CAP} <strong>{label}</strong> prop
              </Menu.Item>
            )}
          </>
        )}
      {!readOnly &&
        referencedParam &&
        referencedParam.defaultExpr &&
        viewCtx &&
        ownerComponent && (
          <Menu.Item
            onClick={() =>
              viewCtx.change(() => (referencedParam.defaultExpr = null))
            }
          >
            <span>
              Unset default value for component prop{" "}
              <strong>
                {getComponentDisplayName(ownerComponent)}.
                {referencedParam.variable.name}
              </strong>
            </span>
          </Menu.Item>
        )}
      {!readOnly && referencedParam && ownerComponent && (
        <Menu.Item onClick={() => onChange(undefined)}>
          <span>
            Unlink from component prop{" "}
            <strong>
              {getComponentDisplayName(ownerComponent)}.
              {referencedParam.variable.name}
            </strong>
          </span>
        </Menu.Item>
      )}
      {!readOnly &&
        ownerComponent &&
        (isPageComponent(ownerComponent) || isPlainComponent(ownerComponent)) &&
        !referencedParam &&
        canLinkToProp && (
          <Menu.SubMenu title={<span>Allow external access</span>}>
            {getRealParams(ownerComponent)
              .filter((p) => canLinkPropToParam(wabType, p))
              .map((param) => (
                <Menu.Item
                  key={param.uid}
                  onClick={() => {
                    onChange(new VarRef({ variable: param.variable }));
                  }}
                >
                  <strong>{param.variable.name}</strong>
                </Menu.Item>
              ))}
            {getRealParams(ownerComponent).length > 0 && <Menu.Divider />}
            <Menu.Item onClick={() => setNewParamModalVisible(true)}>
              <div className="flex flex-vcenter">
                <Icon icon={PlusIcon} className="mr-sm" /> Create new prop
              </div>
            </Menu.Item>
          </Menu.SubMenu>
        )}
      {!readOnly &&
        allowDynamicValue &&
        !isCustomCode &&
        !isExprValuePropType(propType) &&
        !(isKnownTemplatedString(expr) && hasDynamicParts(expr)) && (
          <Menu.Item
            id="use-dynamic-value-btn"
            key={"customCode"}
            onClick={() => {
              switchToDynamicValue();
            }}
          >
            Use dynamic value
          </Menu.Item>
        )}
      {!readOnly &&
        isCustomCode &&
        !showFallback &&
        isExprValuePropType(propType) &&
        allowDynamicValue &&
        !disableFallback && (
          <Menu.Item key={"fallback"} onClick={() => setShowFallback(true)}>
            Change fallback value
          </Menu.Item>
        )}
      {!readOnly &&
        !referencedParam &&
        isCustomCode &&
        !isExprValuePropType(propType) && (
          <Menu.Item
            key={"!customCode"}
            onClick={() => {
              onChange(
                isKnownCustomCode(expr) || isKnownObjectPath(expr)
                  ? maybeWrapExpr(expr.fallback)
                  : undefined
              );
            }}
          >
            Remove dynamic value
          </Menu.Item>
        )}
    </Menu>
  );

  React.useEffect(() => {
    if (ref.current && shouldHighlight) {
      ref.current.focus();
    }
  }, [shouldHighlight, ref, viewCtx]);

  const renderEditorForReferencedParam = () => {
    assert(
      referencedParam,
      "trying to render a referencedParam editor without a referecend param"
    );
    assert(ownerComponent, "referenced params should have an owner component");
    return (
      <div className="flex flex-align-start labeled-item__value-vpadding">
        <Icon icon={LinkIcon} className="mr-ch dimfg" />
        <span>
          Linked to{" "}
          <strong>
            {getComponentDisplayName(ownerComponent)}.
            {referencedParam.variable.name}
          </strong>
        </span>
      </div>
    );
  };

  const renderDataPickerEditorForDynamicValue = () => {
    // displaying a "whole" custom code expression.
    // Template literals are not here, since they still display a string editor and can have mixed text and expressions.
    const codeExpr = ensureInstance(expr, CustomCode, ObjectPath);
    return (
      <DataPickerEditor
        viewCtx={viewCtx}
        value={extractValueSavedFromDataPicker(codeExpr, exprCtx)}
        onChange={(val) => {
          if (!val) {
            return;
          }
          const fallbackExpr = codeExpr.fallback
            ? clone(codeExpr.fallback)
            : undefined;
          const newExpr = createExprForDataPickerValue(val, fallbackExpr);
          onChange(maybeWrapExpr(newExpr));
        }}
        onUnlink={() => onChange(maybeWrapExpr(codeExpr.fallback))}
        visible={isDataPickerVisible}
        setVisible={setIsDataPickerVisible}
        data={canvasEnv}
        flatten={true}
        expectedValues={(propType as any)?.exprHint ?? undefined}
        schema={schema}
      />
    );
  };

  const renderDefaultEditor = () => {
    const [exprLit, editable] = extractLitFromMaybeRenderable(expr, viewCtx);
    return (
      <PropValueEditor
        attr={attr}
        value={exprLit}
        label={label}
        disabled={disabled || !editable}
        valueSetState={
          forceSetState ?? valueSetState ?? getValueSetState(definedIndicator)
        }
        propType={propType}
        component={ownerComponent}
        onChange={(val) => {
          if (exprLit == null && val == null) {
            return;
          }
          if (isRenderableType(wabType)) {
            assert(viewCtx, "viewCtx is required for renderable type");
            viewCtx.change(() => {
              const newExpr = updateOrCreateExpr(
                expr,
                wabType,
                val,
                tpl,
                viewCtx
              );
              if (newExpr !== expr) {
                onChange(maybeWrapExpr(newExpr));
              }
            });
          } else {
            const newExpr = updateOrCreateExpr(expr, wabType, val);
            if (newExpr !== expr) {
              onChange(maybeWrapExpr(newExpr));
            }
          }
        }}
        controlExtras={controlExtras}
        ref={ref}
      />
    );
  };

  return (
    <div className="panel-row" style={{ position: "relative" }}>
      <div className="flex flex-col fill-width">
        <PropValueEditorContext.Provider
          value={{
            ...currValueEditorCtx,
            env: canvasEnv,
            schema,
            exprCtx,
          }}
        >
          {invalidArg && (
            <div className="invalid-arg-icon">
              <Tooltip title={getInvalidArgErrorMessage(invalidArg)}>
                <WarningIcon />
              </Tooltip>
            </div>
          )}
          <LabeledItemRow
            data-test-id={`prop-editor-row-${attr ?? label}`}
            label={
              <div className={about ? "pointer" : ""}>
                {isPlainObjectPropType(propType) &&
                hackyCast(propType).required ? (
                  <span className="required-prop">{label}</span>
                ) : (
                  label
                )}
                {about ? (
                  <InlineIcon>
                    &thinsp;
                    <Icon icon={InfoIcon} className="dimfg" />
                  </InlineIcon>
                ) : null}
              </div>
            }
            definedIndicator={definedIndicator}
            layout={layout}
            menu={!isMenuEmpty(contextMenu) ? contextMenu : undefined}
            noMenuButton
            icon={icon}
            tooltip={
              props.tooltip ? (
                props.tooltip
              ) : about ? (
                <>
                  <strong>{label}</strong>: {about}
                </>
              ) : undefined
            }
          >
            <div className="flex-col fill-width flex-align-start">
              <ContextMenuIndicator
                menu={!isMenuEmpty(contextMenu) ? contextMenu : undefined}
                showDynamicValueButton={showDynamicValueButton}
                tooltip={
                  isKnownTemplatedString(expr)
                    ? "Append dynamic value"
                    : undefined
                }
                onIndicatorClickDefault={() => {
                  switchToDynamicValue();
                }}
                className="qb-custom-widget"
                fullWidth={!isBooleanPropType(propType) || isCustomCode}
              >
                {referencedParam && !disableLinkToProp
                  ? renderEditorForReferencedParam()
                  : isCustomCode &&
                    !(isKnownQueryData(wabType) && isQuery(expr)) &&
                    !disabledDynamicValue
                  ? renderDataPickerEditorForDynamicValue()
                  : renderDefaultEditor()}
              </ContextMenuIndicator>
              {isPlainObjectPropType(propType) &&
                "helpText" in propType &&
                propType.helpText !== undefined && (
                  <div className="fill-width dimfg gap-xsm">
                    <StandardMarkdown>
                      {propType.helpText.trim()}
                    </StandardMarkdown>
                  </div>
                )}
              {expr && isKnownTemplatedString(expr) && evaluated && (
                <ValuePreview val={evaluated.val} err={evaluated.err} />
              )}
            </div>
          </LabeledItemRow>
          {newParamModalVisibile && ownerComponent && viewCtx && (
            <ComponentPropModal
              studioCtx={studioCtx}
              suggestedName={label}
              component={ownerComponent}
              visible={newParamModalVisibile}
              type={wabType}
              onFinish={(newParam) => {
                setNewParamModalVisible(false);
                if (!newParam) {
                  return;
                }
                viewCtx.change(() => {
                  newParam.description = "metaProp";
                  const _expr = new VarRef({
                    variable: newParam.variable,
                  });
                  onChange(_expr);
                });
              }}
            />
          )}
          {isPageHref(expr) &&
            extractParamsFromPagePath(
              ensure(
                expr.page.pageMeta,
                "PageHref is expected to contain a page"
              ).path
            ).map((param) => {
              return (
                <InnerPropEditorRow
                  key={param}
                  expr={expr.params[param]}
                  attr={param}
                  propType={"string"}
                  label={param}
                  definedIndicator={definedIndicator}
                  onChange={(paramValue) => {
                    const newExpr = clone(expr);
                    if (paramValue) {
                      newExpr.params[param] = ensureInstance(
                        paramValue,
                        TemplatedString,
                        CustomCode,
                        ObjectPath,
                        VarRef
                      );
                    } else {
                      delete newExpr.params[param];
                    }
                    onChange(maybeWrapExpr(newExpr));
                  }}
                  onDelete={() => {
                    const newExpr = clone(expr) as PageHref;
                    delete newExpr.params[param];
                    onChange(maybeWrapExpr(newExpr));
                  }}
                  disableLinkToProp={props.disableLinkToProp}
                  disableDynamicValue={props.disableDynamicValue}
                  icon={<div className="property-connector-line-icon" />}
                />
              );
            })}
          {isCustomCode &&
            !(isKnownQueryData(wabType) && isQuery(expr)) &&
            allowDynamicValue &&
            showFallback &&
            !disableFallback &&
            viewCtx &&
            (() => {
              // If we were displaying a "whole" custom code expression, then now we need to show the fallback.
              const codeExpr = ensureInstance(expr, CustomCode, ObjectPath);
              const [fallbackLit, editable] = extractLitFromMaybeRenderable(
                codeExpr.fallback,
                viewCtx
              );
              return (
                <FallbackEditor
                  isSet={isFallbackSet(codeExpr)}
                  onUnset={() => {
                    viewCtx.change(() => {
                      const newExpr = isKnownCustomCode(codeExpr)
                        ? new CustomCode({
                            code: codeExpr.code,
                            fallback: undefined,
                          })
                        : new ObjectPath({
                            path: codeExpr.path,
                            fallback: undefined,
                          });
                      onChange(maybeWrapExpr(newExpr));
                    });
                  }}
                >
                  <PropValueEditor
                    attr={attr}
                    propType={propType}
                    value={fallbackLit}
                    label={label}
                    disabled={!editable}
                    valueSetState={fallbackLit ? "isSet" : "isUnset"}
                    component={ownerComponent}
                    // Don't show default value hint for fallback
                    hideDefaultValueHint
                    onChange={(val) => {
                      if (fallbackLit == null && val == null) {
                        return;
                      }

                      viewCtx.change(() => {
                        const fallbackExpr = updateOrCreateExpr(
                          expr,
                          wabType,
                          val,
                          tpl,
                          viewCtx
                        );
                        const newExpr = isKnownCustomCode(codeExpr)
                          ? new CustomCode({
                              code: codeExpr.code,
                              fallback: fallbackExpr,
                            })
                          : new ObjectPath({
                              path: codeExpr.path,
                              fallback: fallbackExpr,
                            });
                        onChange(maybeWrapExpr(newExpr));
                      });
                    }}
                    onDelete={onDelete}
                    controlExtras={controlExtras}
                  />
                </FallbackEditor>
              );
            })()}
          {referencedParam &&
            !disabledDynamicValue &&
            !disableLinkToProp &&
            isAllowedDefaultExprForPropType(propType) &&
            (() => {
              assert(
                referencedParam,
                "trying to render a referencedParam editor without a referecend param"
              );
              assert(
                ownerComponent,
                "referenced params should have an owner component"
              );
              assert(viewCtx, "referenced params should have a ViewCtx");
              // displaying the default value of a linked prop.
              const defaultExpr = referencedParam.defaultExpr;
              const [defaultExprLit, _editable] = extractLitFromMaybeRenderable(
                defaultExpr,
                viewCtx
              );
              return (
                <IndentedRow
                  label="Default"
                  data-test-id={`prop-editor-row-default-${attr ?? label}`}
                >
                  <PropValueEditor
                    attr={attr}
                    value={defaultExprLit}
                    label={label}
                    disabled={false}
                    valueSetState={
                      valueSetState ?? getValueSetState(definedIndicator)
                    }
                    propType={propType}
                    component={ownerComponent}
                    onChange={(val) => {
                      if (!defaultExprLit && !val) {
                        return;
                      }
                      return viewCtx.change(() => {
                        const newExpr = updateOrCreateExpr(
                          expr,
                          wabType,
                          val,
                          tpl,
                          viewCtx
                        );
                        referencedParam.defaultExpr = newExpr;
                      });
                    }}
                  />
                </IndentedRow>
              );
            })()}
        </PropValueEditorContext.Provider>
        {shouldHighlight && (
          <HighlightBlinker
            doScroll
            onFinish={() => {
              if (viewCtx) {
                viewCtx.highlightParam = undefined;
              }
            }}
          />
        )}
      </div>
    </div>
  );
}

function isBooleanPropType(propType: StudioPropType<any>) {
  if (["boolean", "target"].includes(getPropTypeType(propType) ?? "")) {
    return true;
  }
  if (
    isPlainObjectPropType(propType) &&
    propType.type === "function" &&
    !!propType.control
  ) {
    return isBooleanPropType(propType.control);
  }
  return false;
}

export function getExtraEnvFromPropType(
  propType: StudioPropType<any>,
  componentPropValues: Record<string, any>,
  ccContextData: any,
  controlExtras: ControlExtras = { path: [] }
) {
  if (!isPlainObjectPropType(propType)) {
    return {};
  }
  if (propType.type === "function" && "argValues" in propType) {
    const argValues =
      getContextDependentValue(
        propType.argValues,
        componentPropValues,
        ccContextData,
        controlExtras
      ) ?? [];
    return Object.fromEntries(
      leftZip(propType.argNames, argValues).map(([argName, argValue]) => [
        argName,
        argValue,
      ])
    );
  } else if (propType.type === "exprEditor") {
    return (
      getContextDependentValue(
        propType.data,
        componentPropValues,
        ccContextData,
        controlExtras
      ) ?? {}
    );
  } else {
    return {};
  }
}

function getExprTransformationBasedOnPropType(propType: StudioPropType<any>) {
  if (isPlainObjectPropType(propType) && propType.type === "function") {
    const argNames =
      "argTypes" in propType
        ? propType.argTypes.map(({ name }) => name)
        : propType.argNames;
    return {
      maybeWrapExpr: (x: Expr | undefined | null) => {
        if (x == null) {
          return undefined;
        }
        return new FunctionExpr({
          bodyExpr: x,
          argNames,
        });
      },
      maybeUnwrapExpr: (x: Expr | undefined | null) => {
        if (x == null) {
          return undefined;
        }
        return isKnownFunctionExpr(x) ? x.bodyExpr : undefined;
      },
    };
  }
  return {
    maybeWrapExpr: (x: Expr | undefined | null) => (x == null ? undefined : x),
    maybeUnwrapExpr: (x: Expr | undefined | null) =>
      x == null ? undefined : x,
  };
}

export const PropEditorRow = observer(PropEditorRow_);

function PropEditorRow_(
  props: PropEditorRowProps & {
    viewCtx: ViewCtx;
    tpl: TplTag | TplComponent;
    env?: Record<string, any>;
    schema?: DataPickerTypesSchema;
    componentPropValues?: Record<string, any>;
    ccContextData?: any;
    invalidArg?: InvalidArgMeta;
  }
) {
  const { tpl, viewCtx, ...rest } = props;
  const getCurrentComponentEvalContext = () => {
    if (
      !!props.componentPropValues ||
      !!props.ccContextData ||
      !!props.invalidArg
    ) {
      return props;
    }
    const { componentPropValues, ccContextData, invalidArgs } =
      viewCtx.getComponentEvalContext(tpl);
    const invalidArg = invalidArgs.find(
      (arg) => arg.param.variable.name === rest.attr
    );
    return {
      componentPropValues,
      ccContextData,
      invalidArg,
    };
  };
  const { componentPropValues, ccContextData, invalidArg } =
    getCurrentComponentEvalContext();
  const env = !props.env ? viewCtx.getCanvasEnvForTpl(tpl) : props.env;
  const schema = !props.schema ? viewCtx.customFunctionsSchema() : props.schema;

  return (
    <PropValueEditorContext.Provider
      value={{
        tpl,
        viewCtx,
        componentPropValues: componentPropValues ?? {},
        ccContextData,
        invalidArg,
        env,
        schema,
      }}
    >
      <InnerPropEditorRow {...rest} />
    </PropValueEditorContext.Provider>
  );
}
