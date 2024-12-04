import { WithContextMenu } from "@/wab/client/components/ContextMenu";
import { TextAndShortcut } from "@/wab/client/components/menu-builder";
import { reactPrompt } from "@/wab/client/components/quick-modals";
import { ComponentActionsSection } from "@/wab/client/components/sidebar-tabs/ComponentActionsSection";
import { DataPickerEditor } from "@/wab/client/components/sidebar-tabs/ComponentProps/DataPickerEditor";
import {
  DataPickerRunCodeActionContext,
  DataPickerTypesSchema,
  InitialMode,
} from "@/wab/client/components/sidebar-tabs/DataBinding/DataPicker";
import {
  PropEditorRowWrapper,
  isPropShown,
} from "@/wab/client/components/sidebar-tabs/PropEditorRow";
import ActionChip from "@/wab/client/components/sidebar-tabs/StateManagement/ActionChip";
import HandlerSection from "@/wab/client/components/sidebar-tabs/StateManagement/HandlerSection";
import VariableEditingForm from "@/wab/client/components/sidebar-tabs/StateManagement/VariableEditingForm";
import { mkInitialState } from "@/wab/client/components/sidebar-tabs/StateManagement/VariablesSection";
import { createNodeIcon } from "@/wab/client/components/sidebar-tabs/tpl-tree";
import { SidebarModal } from "@/wab/client/components/sidebar/SidebarModal";
import { SidebarSection } from "@/wab/client/components/sidebar/SidebarSection";
import {
  LabeledItem,
  NamedPanelHeader,
  ValueSetState,
} from "@/wab/client/components/sidebar/sidebar-helpers";
import { TplExpsProvider } from "@/wab/client/components/style-controls/StyleComponent";
import StyleSelect from "@/wab/client/components/style-controls/StyleSelect";
import StyleSwitch from "@/wab/client/components/style-controls/StyleSwitch";
import Button from "@/wab/client/components/widgets/Button";
import { Icon } from "@/wab/client/components/widgets/Icon";
import {
  useDataSource,
  useTopFrameApi,
} from "@/wab/client/contexts/AppContexts";
import ComponentIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Component";
import ChevronDownsvgIcon from "@/wab/client/plasmic/plasmic_kit_icons/icons/PlasmicIcon__ChevronDownSvg";
import { getComboForAction } from "@/wab/client/shortcuts/studio/studio-shortcuts";
import {
  BLOCKED_RUN_INTERACTION_MESSAGE,
  extractDataCtx,
} from "@/wab/client/state-management/interactions-meta";
import {
  doesCodeDependsOnPreviousStepsOrEventArgs,
  runCodeInDataPicker,
} from "@/wab/client/state-management/preview-steps";
import { StudioCtx, useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { VARIABLE_LOWER } from "@/wab/shared/Labels";
import { TplMgr } from "@/wab/shared/TplMgr";
import { flattenComponent } from "@/wab/shared/cached-selectors";
import {
  HighlightInteractionRequest,
  StudioPropType,
  isAdvancedProp,
} from "@/wab/shared/code-components/code-components";
import { getExportedComponentName } from "@/wab/shared/codegen/react-p/serialize-utils";
import { paramToVarName } from "@/wab/shared/codegen/util";
import { assert, ensure, hackyCast, spawn } from "@/wab/shared/common";
import {
  getComponentDisplayName,
  getRealParams,
  isCodeComponent,
  isHostLessCodeComponent,
  isPlumeComponent,
} from "@/wab/shared/core/components";
import {
  ExprCtx,
  createExprForDataPickerValue,
  extractValueSavedFromDataPicker,
} from "@/wab/shared/core/exprs";
import { ComponentPropOrigin } from "@/wab/shared/core/lang";
import {
  StateVariableType,
  addComponentState,
  getStateVarName,
} from "@/wab/shared/core/states";
import {
  EventHandlerKeyType,
  getDisplayNameOfEventHandlerKey,
  getReactEventHandlerTsType,
  isEventHandlerKeyForAttr,
  isEventHandlerKeyForParam,
  isTplComponent,
  isTplNamable,
  summarizeUnnamedTpl,
  tplHasRef,
} from "@/wab/shared/core/tpls";
import { DataSourceType } from "@/wab/shared/data-sources-meta/data-source-registry";
import { DefinedIndicatorType } from "@/wab/shared/defined-indicator";
import {
  Component,
  CustomCode,
  EventHandler,
  Expr,
  FunctionExpr,
  Interaction,
  ObjectPath,
  State,
  TplComponent,
  TplRef,
  TplTag,
  ensureKnownFunctionType,
  isKnownClassNamePropType,
  isKnownEventHandler,
  isKnownFunctionType,
} from "@/wab/shared/model/classes";
import { wabToTsType } from "@/wab/shared/model/model-util";
import { isValidJavaScriptCode } from "@/wab/shared/parser-utils";
import { getPlumeEditorPlugin } from "@/wab/shared/plume/plume-registry";
import { Dropdown, Input, Menu, Tooltip, notification } from "antd";
import L, { defer, isArray, sortBy } from "lodash";
import { autorun } from "mobx";
import { observer } from "mobx-react";
import React from "react";

export const ComponentPropsSection = observer(
  function ComponentPropsSection(props: {
    viewCtx: ViewCtx;
    tpl: TplComponent;
    customTitle?: React.ReactNode;
    expsProvider: TplExpsProvider;
    includeVariants?: boolean;
    tab: "settings" | "style";
  }) {
    const { viewCtx, tpl, expsProvider, tab, includeVariants } = props;
    const component = tpl.component;
    // For foreign components, we list all slot parameters too so that they can
    // type in raw string nodes.
    let params = getRealParams(component, { includeVariants }).filter(
      (param) => param.origin !== ComponentPropOrigin.ReactHTMLAttributes
    );
    const plumePlugin = getPlumeEditorPlugin(component);
    if (plumePlugin) {
      params = params.filter(
        (p) => plumePlugin.shouldShowInstanceProp?.(tpl, p) ?? true
      );
    }

    if (tab === "settings") {
      // Don't show ClassNamePropType
      params = params.filter((p) => !isKnownClassNamePropType(p.type));
    } else if (tab === "style") {
      // Only show ClassNamePropType
      params = params.filter((p) => isKnownClassNamePropType(p.type));
    }

    const { componentPropValues, ccContextData } =
      viewCtx.getComponentEvalContext(tpl);
    const propTypes = getComponentPropTypes(viewCtx, component);

    if (isCodeComponent(component) || isPlumeComponent(component)) {
      params = params.filter((param) => {
        const propType = ensure(
          propTypes,
          `didn't find a propType for the prop "${param.variable.name}" in "${component.name}" component`
        )[param.variable.name];
        return isPropShown(propType, componentPropValues, ccContextData, {
          path: [param.variable.name],
        });
      });
      // Keep the same ordering as the object keys in the props
      const paramNameToIndex = Object.fromEntries(
        Object.keys(propTypes ?? {}).map((key, index) => [key, index])
      );
      params = sortBy(
        params,
        (param) =>
          paramNameToIndex[
            paramToVarName(component, param, { useControlledProp: true })
          ] ?? param.variable.name
      );
    }

    const actions = getComponentActions(viewCtx, component).filter((action) => {
      if (
        hackyCast(action).type === "form-schema" &&
        !viewCtx.studioCtx.appCtx.appConfig.schemaDrivenForms
      ) {
        return false;
      }
      return !hackyCast(action).hidden?.(componentPropValues, ccContextData);
    });
    if (params.length === 0 && actions.length === 0) {
      return null;
    }
    const mainProps = params.filter(
      (param) => !isKnownFunctionType(param.type)
    );

    return (
      <>
        {(mainProps.length > 0 || actions.length > 0) && (
          <SidebarSection
            id="component-props-section"
            title={
              props.customTitle ??
              `${getComponentDisplayName(tpl.component)} ${
                tab === "settings" ? "props" : "nested styles"
              }`
            }
            key={`main.${tpl.uid}`}
          >
            {(renderMaybeCollapsibleRows) => (
              <>
                {tab === "settings" && actions.length > 0 && (
                  <ComponentActionsSection
                    viewCtx={viewCtx}
                    tpl={tpl as TplComponent}
                    expsProvider={expsProvider}
                    actions={actions}
                    componentPropValues={componentPropValues}
                    ccContextData={ccContextData}
                  />
                )}
                {mainProps.length > 0 &&
                  renderMaybeCollapsibleRows(
                    mainProps.map((param) => {
                      const propType = viewCtx.canvasCtx
                        .getRegisteredCodeComponentsMap()
                        .get(tpl.component.name)?.meta.props[
                        param.variable.name
                      ];
                      const isSet = !!expsProvider
                        .effectiveVs()
                        .args.find((_arg) => _arg.param === param);
                      return {
                        collapsible: !!isAdvancedProp(propType) && !isSet,
                        content: (
                          <PropEditorRowWrapper
                            key={param.uid}
                            tpl={tpl}
                            expsProvider={expsProvider}
                            param={param}
                            viewCtx={viewCtx}
                          />
                        ),
                      };
                    })
                  )}
              </>
            )}
          </SidebarSection>
        )}
      </>
    );
  }
);

export const InteractionPropEditor = observer(
  function InteractionPropEditor(props: {
    studioCtx: StudioCtx;
    viewCtx: ViewCtx;
    tpl: TplComponent | TplTag;
    modalTitle: React.ReactNode;
    component: Component;
    forceOpen: boolean;
    highlightOnMount?: HighlightInteractionRequest;
    eventHandlerKey: EventHandlerKeyType;
    value: EventHandler | CustomCode | ObjectPath | undefined | null;
    onChange: (value: Expr | undefined | null) => void;
    "data-plasmic-prop"?: string;
  }) {
    const {
      modalTitle,
      studioCtx,
      viewCtx,
      tpl,
      component,
      forceOpen,
      highlightOnMount,
      eventHandlerKey,
      value,
      onChange,
    } = props;
    const [showInteractionModal, setShowInteractionModal] =
      React.useState(false);

    React.useEffect(() => {
      return autorun(() => {
        if (
          studioCtx.newlyAddedEventHandlerKey &&
          getDisplayNameOfEventHandlerKey(eventHandlerKey, { tpl }) ===
            getDisplayNameOfEventHandlerKey(
              studioCtx.newlyAddedEventHandlerKey,
              {
                tpl,
              }
            )
        ) {
          studioCtx.newlyAddedEventHandlerKey = undefined;
          setShowInteractionModal(true);
        }
      });
    }, [eventHandlerKey]);
    return !value || isKnownEventHandler(value) ? (
      <>
        <ActionChip
          eventHandler={value}
          onClick={() => setShowInteractionModal(true)}
          data-plasmic-prop={props["data-plasmic-prop"]}
        />
        <SidebarModal
          title={modalTitle}
          show={forceOpen || showInteractionModal}
          persistOnInteractOutside={
            studioCtx.onboardingTourState.flags.keepInteractionModalOpen
          }
          onClose={() => {
            if (studioCtx.onboardingTourState.flags.keepInteractionModalOpen) {
              return;
            }

            setShowInteractionModal(false);
          }}
        >
          <HandlerSection
            tpl={tpl}
            sc={studioCtx}
            vc={viewCtx}
            component={component}
            keyedEventHandler={{
              key: eventHandlerKey,
              handler: value,
            }}
            onChange={onChange}
            highlightOnMount={highlightOnMount}
          />
        </SidebarModal>
      </>
    ) : (
      <ExprEditor
        value={value}
        onChange={onChange}
        data={{}}
        viewCtx={viewCtx}
        component={component}
      />
    );
  }
);

export function VariableEditor(props: {
  component: Component;
  studioCtx: StudioCtx;
  value: Expr | null;
  onChange: (newExpr: Expr | null) => void;
  viewCtx: ViewCtx;
  tpl: TplComponent | TplTag;
  variableTypes?: StateVariableType[];
  attr: string;
}) {
  const {
    component,
    studioCtx,
    value,
    onChange,
    viewCtx,
    tpl,
    variableTypes,
    attr,
  } = props;

  const [justAddedState, setJustAddedState] = React.useState<State | undefined>(
    undefined
  );
  const [isDataPickerVisible, setIsDataPickerVisible] = React.useState(false);

  const data = viewCtx.getCanvas$StateReferencesForTpl(tpl);

  const filteredData = {} as Record<string, any>;
  for (const [key, val] of Object.entries(data)) {
    const stateCells =
      viewCtx.canvasCtx.Sub.reactWeb.getStateCellsInPlasmicProxy(val);
    for (const { path, realPath } of stateCells) {
      const state = component.states.find(
        (istate) => getStateVarName(istate) === path
      );
      if (!state) {
        continue;
      }
      if (
        variableTypes &&
        !variableTypes.includes(state.variableType as StateVariableType)
      ) {
        continue;
      }
      if (state.implicitState?.accessType === "readonly") {
        continue;
      }
      L.set(filteredData, [key, ...realPath], L.get(val, realPath));
    }
  }

  return (
    <>
      {justAddedState && (
        <SidebarModal
          show
          title={`New ${VARIABLE_LOWER}`}
          onClose={() => {
            setJustAddedState(undefined);
            // we need to wait for the transition between modals end
            defer(() => setIsDataPickerVisible(true));
          }}
          hideCloseIcon
        >
          <VariableEditingForm
            state={justAddedState}
            studioCtx={studioCtx}
            component={component}
          />
        </SidebarModal>
      )}
      <DataPickerEditor
        viewCtx={viewCtx}
        flatten={true}
        data={filteredData}
        initialMode={"dataPicking"}
        hideStateSwitch={true}
        alwaysShowValuePathAsLabel={true}
        data-plasmic-prop={attr}
        value={extractValueSavedFromDataPicker(value, {
          projectFlags: viewCtx.projectFlags(),
          component,
          inStudio: true,
        })}
        onChange={(val) => {
          if (!val) {
            return;
          }
          const newExpr = createExprForDataPickerValue(val);
          onChange(newExpr);
        }}
        visible={isDataPickerVisible}
        setVisible={(val) => setIsDataPickerVisible(val)}
        onAddVariableBtnClick={() => {
          const state = mkInitialState(studioCtx, component);
          setJustAddedState(state);
          setIsDataPickerVisible(false);
          spawn(
            studioCtx.change(({ success }) => {
              addComponentState(studioCtx.site, component, state);
              return success();
            })
          );
          onChange(
            new ObjectPath({
              path: ["$state", getStateVarName(state)],
              fallback: null,
            })
          );
        }}
        context={`Set value for prop ${attr} of React component "${
          isTplComponent(tpl)
            ? getExportedComponentName(tpl.component)
            : tpl.tag
        }"`}
      />
    </>
  );
}

export function InteractionExprEditor(props: {
  viewCtx: ViewCtx;
  tpl: TplComponent | TplTag;
  value: Expr | undefined | null;
  onChange: (newExpr: ObjectPath | CustomCode | FunctionExpr | null) => void;
  currentInteraction: Interaction;
  eventHandlerKey: EventHandlerKeyType;
  alwaysShowValuePathAsLabel?: boolean;
  isBodyFunction?: boolean;
  "data-plasmic-prop"?: string;
  hidePreview?: boolean;
  component?: Component;
  isRunCodeInteraction?: boolean;
}) {
  const {
    viewCtx,
    tpl,
    value,
    onChange,
    currentInteraction,
    eventHandlerKey,
    alwaysShowValuePathAsLabel,
    isBodyFunction,
    component,
    isRunCodeInteraction,
    hidePreview: initialHidePreview,
  } = props;

  const [stepValue, setStepValue] = React.useState(null);
  const [hidePreview, setHidePreview] = React.useState(initialHidePreview);

  const data = extractDataCtx(
    viewCtx,
    tpl,
    undefined,
    currentInteraction,
    eventHandlerKey
  );

  const schema = {
    ...viewCtx.customFunctionsSchema(),
    ...(isEventHandlerKeyForParam(eventHandlerKey)
      ? Object.fromEntries(
          ensureKnownFunctionType(eventHandlerKey.param.type).params.map(
            (p) => [p.argName, wabToTsType(p.type)]
          )
        )
      : isEventHandlerKeyForAttr(eventHandlerKey)
      ? { event: getReactEventHandlerTsType(tpl, eventHandlerKey.attr) }
      : Object.fromEntries(
          eventHandlerKey.funcType.params.map((p) => [
            p.argName,
            wabToTsType(p.type),
          ])
        )),
  };
  const exprCtx: ExprCtx = {
    projectFlags: viewCtx.projectFlags(),
    component: viewCtx.currentComponent(),
    inStudio: true,
  };

  return (
    <DataPickerRunCodeActionContext.Provider
      value={
        currentInteraction && isRunCodeInteraction
          ? {
              interaction: currentInteraction,
              stepValue,
            }
          : undefined
      }
    >
      <ExprEditor
        value={value}
        onChange={onChange}
        data={data}
        schema={schema}
        viewCtx={viewCtx}
        alwaysShowValuePathAsLabel={alwaysShowValuePathAsLabel}
        isBodyFunction={isBodyFunction}
        data-plasmic-prop={props["data-plasmic-prop"]}
        hidePreview={hidePreview}
        component={component}
        isRunCodeInteraction={isRunCodeInteraction}
        onRunClick={async (runValue) => {
          assert(
            currentInteraction,
            "should have an interaction to execute a run code action"
          );
          if (!isValidJavaScriptCode(runValue)) {
            notification.error({
              message: "Invalid JavaScript code",
              description: "Please check your code and try again.",
            });
            return;
          }
          if (
            doesCodeDependsOnPreviousStepsOrEventArgs(
              runValue,
              currentInteraction,
              exprCtx,
              viewCtx.studioCtx
            )
          ) {
            notification.error({
              message: BLOCKED_RUN_INTERACTION_MESSAGE,
            });
            return;
          }
          const expr = createExprForDataPickerValue(runValue, null, true);
          try {
            setStepValue(
              await runCodeInDataPicker(expr, currentInteraction, viewCtx, tpl)
            );
            setHidePreview(false);
          } catch (err) {
            notification.error({
              message: "Failed to run this action",
              description: err.message,
            });
          }
        }}
      />
    </DataPickerRunCodeActionContext.Provider>
  );
}

export function ExprEditor(props: {
  value: Expr | string | (string | number)[] | undefined | null;
  onChange: (newExpr: ObjectPath | CustomCode | FunctionExpr | null) => void;
  onRunClick?: (code: string) => void;
  data: Record<string, any>;
  schema?: DataPickerTypesSchema;
  viewCtx?: ViewCtx;
  initialMode?: InitialMode;
  alwaysShowValuePathAsLabel?: boolean;
  isBodyFunction?: boolean;
  "data-plasmic-prop"?: string;
  functionArgNames?: string[];
  hidePreview?: boolean;
  component?: Component;
  isRunCodeInteraction?: boolean;
}) {
  const {
    value,
    onChange,
    data,
    schema,
    viewCtx,
    initialMode = "codeEditing",
    alwaysShowValuePathAsLabel,
    isBodyFunction,
    hidePreview,
    functionArgNames,
    component,
    isRunCodeInteraction,
    onRunClick,
  } = props;
  const [isDataPickerVisible, setIsDataPickerVisible] = React.useState(false);
  const studioCtx = useStudioCtx();

  return (
    <DataPickerEditor
      flatten={true}
      data={data}
      schema={schema}
      initialMode={initialMode}
      hidePreview={hidePreview}
      value={extractValueSavedFromDataPicker(value, {
        projectFlags: studioCtx.projectFlags(),
        component: component ?? null,
        inStudio: true,
      })}
      onChange={(val) => {
        if (!val) {
          return;
        }
        const newExpr = createExprForDataPickerValue(
          val,
          undefined,
          isBodyFunction,
          functionArgNames
        );
        onChange(newExpr);
      }}
      visible={isDataPickerVisible}
      setVisible={(val) => setIsDataPickerVisible(val)}
      viewCtx={viewCtx}
      alwaysShowValuePathAsLabel={alwaysShowValuePathAsLabel}
      data-plasmic-prop={props["data-plasmic-prop"]}
      isRunCodeInteraction={isRunCodeInteraction}
      onRunClick={onRunClick}
    />
  );
}

export function TargetPropEditor(props: {
  onChange: (value: string | undefined) => void;
  value: string | undefined;
  valueSetState?: ValueSetState;
}) {
  return (
    <div className="flex justify-start flex-fill">
      <StyleSwitch
        isChecked={props.value === "_blank"}
        onChange={(checked) => props.onChange(checked ? "_blank" : undefined)}
        valueSetState={props.valueSetState}
      >
        {null}
      </StyleSwitch>
    </div>
  );
}

export const TplRefEditor = observer(function TplRefEditor(props: {
  onChange: (value: TplRef | undefined) => void;
  value: TplRef | undefined;
  viewCtx: ViewCtx;
  valueSetState?: ValueSetState;
}) {
  const { value, onChange, viewCtx, valueSetState } = props;
  const component = viewCtx.currentComponent();
  const reffableTpls = flattenComponent(component)
    .filter(isTplNamable)
    .filter((tpl) => !!tpl.name && tplHasRef(tpl));
  const uuidToTpl = Object.fromEntries(
    reffableTpls.map((tpl) => [tpl.uuid, tpl])
  );
  return (
    <StyleSelect
      value={value?.tpl.uuid ?? null}
      onChange={(newValue) => {
        if (newValue) {
          onChange(new TplRef({ tpl: uuidToTpl[newValue] }));
        } else {
          onChange(undefined);
        }
      }}
      valueSetState={valueSetState}
      isDisabled={reffableTpls.length === 0}
      disabledTooltip={"No element action available"}
      placeholder="Pick an element"
    >
      {reffableTpls.map((tpl) => (
        <StyleSelect.Option value={tpl.uuid} textValue={tpl.name ?? ""}>
          <div className="flex hlist-gap-xsm">
            {createNodeIcon(tpl)}
            <span>{tpl.name}</span>
          </div>
        </StyleSelect.Option>
      ))}
    </StyleSelect>
  );
});

interface DataSourceEditorProps {
  value: Record<string, any> | undefined;
  onChange: (val: Record<string, any> | undefined) => void;
  dataSourceType: DataSourceType;
  readOnly?: boolean;
  paramName: string;
  tpl: TplComponent;
  defaultValueHint?: string;
}

export const DataSourceEditor = observer(function DataSourceEditor({
  dataSourceType,
  onChange,
  value,
  readOnly,
  tpl,
  paramName,
  defaultValueHint,
}: DataSourceEditorProps) {
  const studioCtx = useStudioCtx();
  const topFrameApi = useTopFrameApi();

  const onClick = async () => {
    const maybeVal = await topFrameApi.pickDataSource({
      sourceType: dataSourceType,
      existingSourceId: value?.id,
    });
    if (maybeVal && maybeVal !== "CANCELED") {
      onChange(maybeVal);
    }
  };

  React.useEffect(() => {
    const dispose = autorun(() => {
      const forceOpenProp = studioCtx.forceOpenProp;
      if (forceOpenProp) {
        const [c, p] = forceOpenProp;
        if (tpl.component === c && p === paramName) {
          spawn(onClick());
          studioCtx.forceOpenProp = null;
        }
      }
    });
    return dispose;
  }, [studioCtx]);

  const { data: dataSource, isValidating } = useDataSource(value?.id);

  return (
    <Input
      className={`form-control code text-right`}
      value={isValidating ? "loading..." : dataSource?.name}
      readOnly
      disabled={readOnly}
      onClick={onClick}
      placeholder={defaultValueHint ?? "unset"}
    />
  );
});

export const DataSelectorEditor = (props: {
  value?: string[] | null;
  data?: object;
  onChange?: (value: string[] | null | undefined) => void;
}) => {
  const { value, data, onChange } = props;

  const dataSelector: {
    data: any;
    selectedField?: string;
  }[] = [];

  let curData = data;
  if (value) {
    for (let i = 0; i < value.length; i++) {
      dataSelector.push({
        data: curData,
        selectedField: value[i],
      });
      curData = L.get(curData, value[i]);
    }
  }
  if (typeof curData === "object") {
    dataSelector.push({
      data: curData,
      selectedField: undefined,
    });
  }

  const handleChange = (newSelector: string, i: number) => {
    onChange?.([
      ...(value ?? []).slice(0, i),
      ...(newSelector !== "none" ? [newSelector] : []),
    ]);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
      }}
      className={"form-control text-right"}
    >
      {dataSelector.map(({ data: _data, selectedField }, i) => (
        <StyleSelect
          className={"form-control text-right"}
          value={selectedField ?? "none"}
          onChange={(val) => val && handleChange(val, i)}
          key={i}
        >
          <StyleSelect.Option key={`${i}_select`} value={"none"}>
            Select {!isArray(_data) ? "a field" : "an index"}...
          </StyleSelect.Option>
          {Object.keys(_data ?? {}).map((option, j) => (
            <StyleSelect.Option key={`${j}_${option}`} value={option}>
              {option}
            </StyleSelect.Option>
          ))}
        </StyleSelect>
      ))}
    </div>
  );
};

export const FallbackEditor = observer(function FallbackEditor_(props: {
  children: React.ReactNode;
  hideFallbackLabel?: boolean;
  isSet?: boolean;
  onUnset?: () => void;
  hideUnset?: boolean;
  // The definedIndicator of the Expr that has the Fallback
  definedIndicator?: DefinedIndicatorType;
}) {
  const {
    children,
    hideFallbackLabel,
    isSet,
    onUnset,
    hideUnset,
    definedIndicator,
  } = props;
  return (
    <IndentedRow
      menu={() => (
        <Menu>
          {isSet && onUnset && !hideUnset && (
            <Menu.Item key={"deleteFallback"} onClick={onUnset}>
              Unset fallback
            </Menu.Item>
          )}
        </Menu>
      )}
      label={!hideFallbackLabel && "Fallback"}
      definedIndicator={isSet ? definedIndicator : { source: "none" }}
    >
      {children}
    </IndentedRow>
  );
});

export function IndentedRow(props: {
  label?: React.ReactNode;
  children?: React.ReactNode;
  menu?: React.ComponentProps<typeof WithContextMenu>["overlay"];
  definedIndicator?: DefinedIndicatorType;
}) {
  const { children, label, menu, definedIndicator, ...rest } = props;
  return (
    <WithContextMenu
      className="panel-row flex-row fallback-spacing rel fill-width"
      overlay={menu}
      {...rest}
    >
      <LabeledItem
        className="fallback__label"
        label={label}
        alignment="top"
        icon={<div className="property-connector-line-icon" />}
        definedIndicator={definedIndicator}
      >
        {children}
      </LabeledItem>
    </WithContextMenu>
  );
}

export const AUTOCOMPLETE_OPTIONS = [
  "off",
  "on",
  "name",
  "honorific-prefix",
  "given-name",
  "additional-name",
  "family-name",
  "honorific-suffix",
  "nickname",
  "email",
  "username",
  "new-password",
  "current-password",
  "one-time-code",
  "organization-title",
  "organization",
  "street-address",
  "address-line1",
  "address-line2",
  "address-line3",
  "address-level4",
  "address-level3",
  "address-level2",
  "address-level1",
  "country",
  "country-name",
  "postal-code",
  "cc-name",
  "cc-given-name",
  "cc-additional-name",
  "cc-family-name",
  "cc-number",
  "cc-exp",
  "cc-exp-month",
  "cc-exp-year",
  "cc-csc",
  "cc-type",
  "transaction-currency",
  "transaction-amount",
  "language",
  "bday",
  "bday-day",
  "bday-month",
  "bday-year",
  "sex",
  "url",
  "photo",
  "tel",
  "tel-country-code",
  "tel-national",
  "tel-area-code",
  "tel-local",
  "tel-local-prefix",
  "tel-local-suffix",
  "tel-extension",
  "impp",
];

export async function promptForParamName(
  tplMgr: TplMgr,
  component: Component
): Promise<string | undefined> {
  let name = await reactPrompt({
    message: `Enter name for a new prop for "${getComponentDisplayName(
      component
    )}":`,
    placeholder: "Prop name",
    actionText: "Confirm",
  });
  if (!name) {
    return undefined;
  }

  name = name.trim();
  const validName = tplMgr.getUniqueParamName(component, name);
  if (validName !== name) {
    notification.info({
      message: "New prop created",
      description: (
        <>
          <code>{name}</code> is not a valid prop name; renamed to{" "}
          <code>{validName}</code> instead.
        </>
      ),
    });
  }
  return validName;
}

export const TplComponentNameSection = observer(TplComponentNameSection_);

function TplComponentNameSection_(props: {
  tpl: TplComponent;
  viewCtx: ViewCtx;
  menuOptions: { label: string; onClick: () => void }[];
}) {
  const { tpl, viewCtx, menuOptions } = props;
  const studioCtx = viewCtx.studioCtx;

  const subtitle =
    viewCtx.tplMgr().isOwnedBySite(tpl.component) &&
    !isCodeComponent(tpl.component) &&
    studioCtx.canEditComponent(tpl.component) ? (
      <Tooltip
        overlay={
          <TextAndShortcut
            children="Go to component"
            shortcut={getComboForAction("GO_TO_COMPONENT_ARENA")}
          />
        }
      >
        <a
          onClick={() =>
            studioCtx.change(({ success }) => {
              studioCtx.switchToComponentArena(tpl.component);
              return success();
            })
          }
        >
          {getComponentDisplayName(tpl.component)}
        </a>
      </Tooltip>
    ) : (
      getComponentDisplayName(tpl.component)
    );

  return (
    <SidebarSection>
      <NamedPanelHeader
        icon={<Icon icon={ComponentIcon} className="component-fg" />}
        value={tpl.name || ""}
        onChange={(name) =>
          viewCtx.change(() => viewCtx.getViewOps().renameTpl(name, tpl))
        }
        placeholder={summarizeUnnamedTpl(
          tpl,
          viewCtx.effectiveCurrentVariantSetting(tpl).rsh()
        )}
        subtitle={subtitle}
        description={tpl.component.codeComponentMeta?.description ?? undefined}
        suffix={menuOptions.length > 0 && <ApplyMenu items={menuOptions} />}
      />
    </SidebarSection>
  );
}

export const TplTagNameSection = observer(TplTagNameSection_);

function TplTagNameSection_(props: {
  tpl: TplTag;
  viewCtx: ViewCtx;
  menuOptions: { label: string; onClick: () => void }[];
}) {
  const { viewCtx, tpl, menuOptions } = props;
  const vtm = viewCtx.variantTplMgr();
  const effectiveVs = vtm.effectiveVariantSetting(tpl);

  return (
    <SidebarSection hasExtraContent={true}>
      <NamedPanelHeader
        icon={
          <span className="tag-fg">{createNodeIcon(tpl, effectiveVs)}</span>
        }
        value={tpl.name || ""}
        onChange={(name) =>
          viewCtx.change(() => viewCtx.getViewOps().renameTpl(name, tpl))
        }
        placeholder={summarizeUnnamedTpl(tpl, effectiveVs.rsh())}
        suffix={menuOptions.length > 0 && <ApplyMenu items={menuOptions} />}
      />
    </SidebarSection>
  );
}

const ApplyMenu = observer(function ApplyMenu_(props: {
  items: { label: string; onClick: () => void }[];
}) {
  const { items } = props;
  return (
    <Dropdown
      disabled={items.length === 0}
      overlay={
        <Menu
          items={items.map((op, idx) => {
            return {
              label: op.label,
              key: idx,
              onClick: op.onClick,
            };
          })}
        />
      }
      trigger={["click"]}
    >
      <Button
        className="flex-no-shrink"
        disabled={items.length === 0}
        type={"clear"}
        withIcons={"endIcon"}
        size={"wide"}
        endIcon={
          <Icon className="text-unset" size={18} icon={ChevronDownsvgIcon} />
        }
        data-test-id="apply-menu"
      >
        <span className="text-set">Apply</span>
      </Button>
    </Dropdown>
  );
});

export function getComponentPropTypes(
  viewCtx: ViewCtx,
  component: Component
): Record<string, StudioPropType<any>> {
  if (isCodeComponent(component)) {
    return viewCtx.getCodeComponentMeta(component)?.props ?? {};
  } else if (isPlumeComponent(component)) {
    return (
      getPlumeEditorPlugin(component)?.codeComponentMeta?.(component)?.props ??
      {}
    );
  } else {
    return {};
  }
}

export function getContextComponentPropTypes(
  studioCtx: StudioCtx,
  component: Component
): Record<string, StudioPropType<any>> {
  if (isCodeComponent(component)) {
    return (
      (isHostLessCodeComponent(component)
        ? studioCtx.getHostLessContextsMap()
        : studioCtx.getRegisteredContextsMap()
      ).get(component.name)?.meta.props ?? {}
    );
  } else {
    return {};
  }
}

function getComponentActions(viewCtx: ViewCtx, component: Component) {
  if (isCodeComponent(component)) {
    return viewCtx.getCodeComponentMeta(component)?.actions ?? [];
  } else if (isPlumeComponent(component)) {
    return getPlumeEditorPlugin(component)?.actions?.(component) ?? [];
  } else {
    return [];
  }
}
