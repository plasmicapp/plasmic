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
import { StudioCtx, useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { TutorialEventsType } from "@/wab/client/tours/tutorials/tutorials-events";
import {
  customFunctionId,
  wabTypeToPropType,
} from "@/wab/shared/code-components/code-components";
import {
  cx,
  ensure,
  mkShortId,
  spawn,
  swallow,
  withoutFalsy,
} from "@/wab/shared/common";
import { ExprCtx, codeLit, getRawCode } from "@/wab/shared/core/exprs";
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
import { tryEvalExpr } from "@/wab/shared/eval";

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
  const availableCustomFunction = studioCtx.site.customFunctions;
  const propValueEditorContext = React.useMemo(() => {
    return {
      componentPropValues: {},
      ccContextData: {},
      exprCtx,
      schema,
      env: data,
    };
  }, [schema, data, exprCtx]);

  React.useEffect(() => {
    if (availableCustomFunction.length > 0 && !value?.func) {
      onChange({
        ...value,
        func: availableCustomFunction[0],
        args: [],
      });
    }
  }, [value, availableCustomFunction]);

  const argsMap = groupBy(value?.args ?? [], (arg) => arg.argType.argName);

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
          valueSetState={value?.func ? "isSet" : undefined}
          isDisabled={isDisabled || readOnly}
          onChange={(id) => {
            if (value?.func && id === customFunctionId(value.func)) {
              return;
            }
            onChange({
              ...value,
              func: availableCustomFunction.find(
                (fn) => customFunctionId(fn) === id
              ),
              args: [],
            });
          }}
        >
          {availableCustomFunction.map((fn) => {
            const functionId = customFunctionId(fn);
            return (
              <StyleSelect.Option key={fn.uid} value={functionId}>
                {smartHumanize(functionId)}
              </StyleSelect.Option>
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

            return (
              <PropValueEditorContext.Provider value={propValueEditorContext}>
                <InnerPropEditorRow
                  attr={param.argName}
                  propType={wabTypeToPropType(param.type)}
                  expr={curExpr}
                  label={argLabel}
                  onChange={(expr) => {
                    if (expr == null) {
                      return;
                    }
                    const newExpr = isKnownExpr(expr) ? expr : codeLit(expr);
                    const newArgs = [...(value?.args ?? [])];
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
  executeQueue: CustomFunctionExpr[];
  setExecuteQueue: React.Dispatch<React.SetStateAction<CustomFunctionExpr[]>>;
  env?: Record<string, any>;
  exprCtx: ExprCtx;
}) {
  const { executeQueue, setExecuteQueue, env, exprCtx } = props;
  const studioCtx = useStudioCtx();
  const [mutateOpResults, setMutateOpResults] = React.useState<any | undefined>(
    undefined
  );
  const [expandLevel, setExpandLevel] = React.useState(3);

  const opResults = mutateOpResults;

  const popExecuteQueue = React.useCallback(async () => {
    if (executeQueue.length > 0) {
      const [nextOp, ...rest] = executeQueue;
      try {
        const result = await executeCustomFunctionOp(
          studioCtx,
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
                    value={JSON.stringify({
                      data: opResults,
                    })}
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
      ...(value ?? {}),
    }));
    const [sourceFetchError, setSourceFetchError] = React.useState<
      Error | undefined
    >(undefined);
    const [isExecuting, setIsExecuting] = React.useState(false);
    const [executeQueue, setExecuteQueue] = React.useState<
      CustomFunctionExpr[]
    >([]);

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

export async function executeCustomFunctionOp(
  studioCtx: StudioCtx,
  expr: CustomFunctionExpr,
  env: Record<string, any> | undefined,
  exprCtx: ExprCtx
) {
  const { func, args } = expr;
  const functionId = customFunctionId(func);
  const argsMap = groupBy(args, (arg) => arg.argType.argName);
  const regFunc = ensure(
    studioCtx.getRegisteredFunctionsMap().get(functionId),
    "Missing registered function for server query"
  );
  const argLits =
    func.params.map((param) => {
      if (argsMap[param.argName]) {
        return (
          swallow(
            () =>
              tryEvalExpr(
                getRawCode(argsMap[param.argName][0].expr, exprCtx),
                env ?? {}
              )?.val
          ) ?? undefined
        );
      }
      return undefined;
    }) ?? [];
  try {
    const serverData = await regFunc.function(...argLits);

    return serverData;
  } catch (err) {
    return { error: err };
  }
}
