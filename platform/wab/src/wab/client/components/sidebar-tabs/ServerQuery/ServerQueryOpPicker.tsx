import { BottomModalButtons } from "@/wab/client/components/BottomModal";
import { StringPropEditor } from "@/wab/client/components/sidebar-tabs/ComponentProps/StringPropEditor";
import { DataPickerTypesSchema } from "@/wab/client/components/sidebar-tabs/DataBinding/DataPicker";
import {
  InnerPropEditorRow,
  PropValueEditorContext,
} from "@/wab/client/components/sidebar-tabs/PropEditorRow";
import { LabeledItemRow } from "@/wab/client/components/sidebar/sidebar-helpers";
import StyleSelect from "@/wab/client/components/style-controls/StyleSelect";
import Button from "@/wab/client/components/widgets/Button";
import { Icon } from "@/wab/client/components/widgets/Icon";
import SearchIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Search";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { TutorialEventsType } from "@/wab/client/tours/tutorials/tutorials-events";
import {
  StudioPropType,
  customFunctionId,
  wabTypeToPropType,
} from "@/wab/shared/code-components/code-components";
import {
  cx,
  ensure,
  mkShortId,
  spawn,
  withoutFalsy,
} from "@/wab/shared/common";
import { ExprCtx, clone, codeLit } from "@/wab/shared/core/exprs";
import {
  ComponentServerQuery,
  CustomFunctionExpr,
  FunctionArg,
  Interaction,
  TplNode,
  isKnownComponentServerQuery,
  isKnownExpr,
} from "@/wab/shared/model/classes";
import { smartHumanize } from "@/wab/shared/strs";
import { notification } from "antd";
import { groupBy } from "lodash";
import { observer } from "mobx-react";
import * as React from "react";
import { useMountedState } from "react-use";

import styles from "@/wab/client/components/sidebar-tabs/ServerQuery/ServerQueryOpPicker.module.scss";
import { Tab, Tabs } from "@/wab/client/components/widgets";
import { allCustomFunctions } from "@/wab/shared/cached-selectors";
import {
  executeCustomFunctionOp,
  getCustomFunctionParams,
  useCustomFunctionOp,
} from "@/wab/shared/core/custom-functions";
import type { ServerQueryResult } from "@plasmicapp/react-web/lib/data-sources";
import useSWR from "swr";

const LazyCodePreview = React.lazy(
  () => import("@/wab/client/components/coding/CodePreview")
);

interface CustomFunctionExprDraft extends Partial<CustomFunctionExpr> {
  queryName?: string;
}

export function ServerQueryOpDraftForm(props: {
  value?: CustomFunctionExprDraft;
  onChange: React.Dispatch<React.SetStateAction<CustomFunctionExprDraft>>; // (value: DataSourceOpDraftValue) => void;
  readOnly?: boolean;
  env: Record<string, any> | undefined;
  schema?: DataPickerTypesSchema;
  onUpdateSourceFetchError?: (error: Error | undefined) => void;
  isDisabled?: boolean;
  showQueryName?: boolean;
  /**
   * Whether only read operations are allowed
   */
  readOpsOnly?: boolean;
  allowedOps?: string[];
  exprCtx: ExprCtx;
}) {
  const {
    value,
    isDisabled,
    onChange,
    readOnly,
    env: data,
    schema,
    readOpsOnly,
    onUpdateSourceFetchError,
    allowedOps,
    showQueryName,
    exprCtx,
  } = props;
  const studioCtx = useStudioCtx();
  const availableCustomFunction = allCustomFunctions(studioCtx.site).map(
    ({ customFunction }) => customFunction
  );
  const argsMap = React.useMemo(
    () => groupBy(value?.args ?? [], (arg) => arg.argType.argName),
    [value]
  );
  const evaluatedArgs = React.useMemo(() => {
    if (!value || !value.func || !value.args) {
      return {};
    }
    const params = getCustomFunctionParams(
      value as CustomFunctionExpr,
      data,
      exprCtx
    );
    return Object.keys(argsMap).reduce((acc, argName, index) => {
      acc[argName] = params[index];
      return acc;
    }, {} as Record<string, any>);
  }, [argsMap]);

  const { dataKey, fetcher, funcParamsValues } = React.useMemo(() => {
    const func = value?.func;
    if (!func) {
      return {
        dataKey: null,
        fetcher: null,
        funcParamsValues: [],
      };
    }
    const registeredMeta = studioCtx
      .getRegisteredFunctionsMap()
      .get(customFunctionId(func))?.meta;

    const fnContext = registeredMeta?.fnContext;
    if (!fnContext) {
      return {
        dataKey: null,
        fetcher: null,
        funcParamsValues: [],
      };
    }

    const params = func.params.map((param) => evaluatedArgs[param.argName]);

    return {
      ...fnContext(...params),
      funcParamsValues: params,
    };
  }, [studioCtx, value?.func, evaluatedArgs]);

  const { data: ccContextData } = useSWR(dataKey, fetcher);

  const propValueEditorContext = React.useMemo(() => {
    return {
      componentPropValues: funcParamsValues ?? [],
      ccContextData,
      exprCtx,
      schema,
      env: data,
    };
  }, [schema, data, funcParamsValues, exprCtx, ccContextData]);

  React.useEffect(() => {
    if (availableCustomFunction.length > 0 && !value?.func) {
      onChange({
        ...value,
        func: availableCustomFunction[0],
        args: [],
      });
    }
  }, [value, availableCustomFunction]);

  const groupedCustomFunctions = groupBy(
    availableCustomFunction,
    (fn) => fn.namespace ?? null
  );

  return (
    <div id="data-source-modal-draft-section">
      {showQueryName && (
        <LabeledItemRow label="Query name">
          <StringPropEditor
            value={value?.queryName}
            onChange={(newName) => onChange({ ...value, queryName: newName })}
          />
        </LabeledItemRow>
      )}
      <LabeledItemRow label={"Custom function"}>
        <StyleSelect
          value={value?.func ? customFunctionId(value.func) : undefined}
          placeholder={"Select a custom function"}
          valueSetState={value?.func ? "isSet" : undefined}
          isDisabled={isDisabled || readOnly}
          onChange={(id) => {
            if (value?.func && id === customFunctionId(value.func)) {
              return;
            }

            const func = availableCustomFunction.find(
              (fn) => customFunctionId(fn) === id
            );

            onChange({
              ...value,
              func,
              args: [],
            });
          }}
        >
          {Object.keys(groupedCustomFunctions).map((namespace) => {
            const isNullGroup = namespace === "null";
            return (
              <StyleSelect.OptionGroup
                title={!isNullGroup ? smartHumanize(namespace) : undefined}
                noTitle={isNullGroup}
              >
                {groupedCustomFunctions[namespace].map((fn) => {
                  const functionId = customFunctionId(fn);
                  return (
                    <StyleSelect.Option key={fn.uid} value={functionId}>
                      {fn.displayName ?? smartHumanize(fn.importName)}
                    </StyleSelect.Option>
                  );
                })}
              </StyleSelect.OptionGroup>
            );
          })}
        </StyleSelect>
      </LabeledItemRow>
      {value?.func && (
        <>
          {value.func.params.map((param) => {
            const argLabel = param.displayName ?? smartHumanize(param.argName);
            const curArg =
              param.argName in argsMap ? argsMap[param.argName][0] : undefined;
            const curExpr = curArg?.expr;
            const propType =
              studioCtx
                .getRegisteredFunctionsMap()
                .get(customFunctionId(value.func!))
                ?.meta.params?.find((p) => p.name === param.argName) ??
              wabTypeToPropType(param.type);

            return (
              <PropValueEditorContext.Provider value={propValueEditorContext}>
                <InnerPropEditorRow
                  attr={param.argName}
                  propType={propType as StudioPropType<any>}
                  expr={curExpr}
                  label={argLabel}
                  valueSetState={curExpr ? "isSet" : undefined}
                  onChange={(expr) => {
                    if (expr == null) {
                      return;
                    }
                    const newExpr = isKnownExpr(expr) ? expr : codeLit(expr);
                    const newArgs = value?.args ?? [];
                    const changedArg = newArgs.find(
                      (arg) => arg.argType === curArg?.argType
                    );
                    if (changedArg) {
                      changedArg.expr = newExpr;
                    } else {
                      newArgs.push(
                        new FunctionArg({
                          uuid: mkShortId(),
                          expr: newExpr,
                          argType: param,
                        })
                      );
                    }

                    onChange({
                      ...value,
                      args: newArgs,
                    });
                  }}
                />
              </PropValueEditorContext.Provider>
            );
          })}
        </>
      )}
    </div>
  );
}

function _ServerQueryOpPreview(props: {
  data?: Partial<ServerQueryResult>;
  executeQueue: CustomFunctionExpr[];
  setExecuteQueue: React.Dispatch<React.SetStateAction<CustomFunctionExpr[]>>;
  env?: Record<string, any>;
  exprCtx: ExprCtx;
}) {
  const { data, executeQueue, setExecuteQueue, env, exprCtx } = props;
  const studioCtx = useStudioCtx();
  const [mutateOpResults, setMutateOpResults] = React.useState<any | undefined>(
    data
  );
  const [expandLevel, setExpandLevel] = React.useState(3);

  const opResults = mutateOpResults;

  const popExecuteQueue = React.useCallback(async () => {
    if (executeQueue.length > 0) {
      const [nextOp, ...rest] = executeQueue;
      const functionId = customFunctionId(nextOp.func);
      const regFunc = ensure(
        studioCtx.getRegisteredFunctionsMap().get(functionId),
        "Missing registered function for server query"
      );
      try {
        const result = await executeCustomFunctionOp(
          regFunc.function,
          nextOp,
          env,
          exprCtx
        );
        setMutateOpResults(result);
      } catch (err) {
        notification.error({
          message: `Operation failed`,
          description: err.message,
        });
      }
      setExecuteQueue(rest);
    }
  }, [executeQueue, setExecuteQueue]);

  React.useEffect(() => {
    spawn(popExecuteQueue());
  }, [executeQueue, setExecuteQueue]);

  const extraContent = React.useMemo(() => {
    return (
      <div className="flex-row fill-height mr-m flex-vcenter">
        <a onClick={() => setExpandLevel(50)}>Expand All</a>
      </div>
    );
  }, []);

  return (
    <div
      id="data-source-modal-preview-section"
      className={cx(
        "flex fill-width fill-height overflow-hidden ph-lg",
        styles.container
      )}
    >
      <Tabs
        tabKey={"response"}
        className="fill-height"
        tabBarClassName="hilite-tabs justify-between"
        tabClassName="hilite-tab"
        activeTabClassName="hilite-tab--active"
        tabBarExtraContent={extraContent}
        tabs={withoutFalsy([
          new Tab({
            name: "Response",
            key: "response",
            contents: () => (
              <React.Suspense>
                {opResults != null ? (
                  <LazyCodePreview
                    value={JSON.stringify(opResults)}
                    data={{}}
                    className="code-preview-inner"
                    opts={{
                      expandLevel: expandLevel,
                    }}
                  />
                ) : (
                  "Waiting for execution"
                )}
              </React.Suspense>
            ),
          }),
        ])}
      />
    </div>
  );
}

export const ServerQueryOpPreview = React.memo(_ServerQueryOpPreview);

export const ServerQueryOpExprFormAndPreview = observer(
  function ServerQueryOpExprFormAndPreview(props: {
    value?: CustomFunctionExpr;
    onSave: (value: CustomFunctionExpr, opExprName?: string) => void;
    onCancel: () => void;
    readOnly?: boolean;
    env: Record<string, any> | undefined;
    schema?: DataPickerTypesSchema;
    parent?: ComponentServerQuery | TplNode;
    /**
     * Whether only read operations are allowed
     */
    readOpsOnly?: boolean;
    allowedOps?: string[];
    exprCtx: ExprCtx;
    interaction?: Interaction;
  }) {
    const {
      value,
      onSave,
      onCancel,
      readOnly,
      env,
      schema,
      parent,
      readOpsOnly,
      allowedOps,
      exprCtx,
    } = props;
    const studioCtx = useStudioCtx();
    const isMounted = useMountedState();
    const [draft, setDraft] = React.useState<CustomFunctionExprDraft>(() => ({
      queryName: isKnownComponentServerQuery(parent) ? parent.name : undefined,
      ...(value ? clone(value) : {}),
    }));
    const [sourceFetchError, setSourceFetchError] = React.useState<
      Error | undefined
    >(undefined);
    const [isExecuting, setIsExecuting] = React.useState(false);
    const [executeQueue, setExecuteQueue] = React.useState<
      CustomFunctionExpr[]
    >([]);
    const functionId = value ? customFunctionId(value.func) : undefined;
    const regFunc = functionId
      ? studioCtx.getRegisteredFunctionsMap().get(functionId)
      : undefined;
    const result = useCustomFunctionOp(
      regFunc?.function ?? (() => undefined),
      value,
      env,
      exprCtx
    );

    const missingRequiredArgs = [];
    // const missingRequiredArgs = getMissingRequiredArgsFromDraft(
    //   draft,
    //   exprCtx
    // ).map(([argName, argMeta]) => getArgLabel(argMeta, argName));

    const saveOpExpr = async () => {
      if (isMounted()) {
        if (missingRequiredArgs.length === 0) {
          onSave(
            new CustomFunctionExpr({
              func: draft.func!,
              args: draft.args!,
            }),
            draft.queryName
          );

          studioCtx.tourActionEvents.dispatch({
            type: TutorialEventsType.SaveDataSourceQuery,
          });
        } else {
          notification.error({
            message: `Missing required fields: ${missingRequiredArgs.join(
              ", "
            )}`,
          });
        }
      }
    };

    const contents = (
      <div className="fill-height">
        <div className="flex-row fill-height">
          <div
            className={cx({
              "flex-col fill-height fill-width": true,
            })}
            style={{ width: 500, flexShrink: 0 }}
          >
            <div className="flex-col fill-width fill-height overflow-scroll p-xxlg flex-children-no-shrink">
              <ServerQueryOpDraftForm
                value={draft}
                onChange={(getNewDraft) => {
                  setDraft((old) => {
                    const newDraft =
                      typeof getNewDraft === "function"
                        ? getNewDraft(old)
                        : getNewDraft;
                    return newDraft;
                  });
                }}
                readOnly={readOnly}
                env={env}
                schema={schema}
                isDisabled={readOnly}
                readOpsOnly={readOpsOnly}
                onUpdateSourceFetchError={setSourceFetchError}
                allowedOps={allowedOps}
                showQueryName={isKnownComponentServerQuery(parent)}
                exprCtx={exprCtx}
              />
            </div>
            <BottomModalButtons>
              <Button
                id="data-source-modal-save-btn"
                type="primary"
                disabled={!!sourceFetchError}
                onClick={saveOpExpr}
              >
                Save
              </Button>
              <Button
                onClick={async () => {
                  if (isExecuting || executeQueue.length > 0) {
                    return;
                  }
                  setIsExecuting(true);
                  if (draft.func && draft.args) {
                    const opExpr = new CustomFunctionExpr({
                      func: draft.func,
                      args: draft.args,
                    });
                    setExecuteQueue([...executeQueue, opExpr]);
                  }
                  setIsExecuting(false);
                }}
                withIcons={"startIcon"}
                disabled={
                  missingRequiredArgs.length > 0 ||
                  isExecuting ||
                  executeQueue.length > 0
                }
                startIcon={<Icon icon={SearchIcon} />}
                {...(missingRequiredArgs.length > 0
                  ? {
                      tooltip: `Missing required fields: ${missingRequiredArgs.join(
                        ", "
                      )}`,
                    }
                  : {})}
              >
                {isExecuting || executeQueue.length > 0
                  ? "Executing..."
                  : "Execute"}
              </Button>
              <Button onClick={onCancel}>Cancel</Button>
            </BottomModalButtons>
          </div>
          <ServerQueryOpPreview
            data={result}
            executeQueue={executeQueue}
            setExecuteQueue={setExecuteQueue}
            env={env}
            exprCtx={exprCtx}
          />
        </div>
      </div>
    );
    return contents;
  }
);
