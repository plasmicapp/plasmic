import { BottomModalButtons } from "@/wab/client/components/BottomModal";
import { StringPropEditor } from "@/wab/client/components/sidebar-tabs/ComponentProps/StringPropEditor";
import { DataPickerTypesSchema } from "@/wab/client/components/sidebar-tabs/DataBinding/DataPicker";
import { PropValueEditorContextData } from "@/wab/client/components/sidebar-tabs/PropEditorRow";
import styles from "@/wab/client/components/sidebar-tabs/ServerQuery/ServerQueryOpPicker.module.scss";
import {
  getServerQueryParamRowItems,
  propTypeForParam,
} from "@/wab/client/components/sidebar-tabs/ServerQuery/ServerQueryParamRow";
import {
  ServerQueryOpArgs,
  useServerQueryOp,
} from "@/wab/client/components/sidebar-tabs/ServerQuery/useServerQueryOp";
import { SidebarSection } from "@/wab/client/components/sidebar/SidebarSection";
import { LabeledItemRow } from "@/wab/client/components/sidebar/sidebar-helpers";
import {
  createFakeHostLessComponent,
  shouldShowHostLessPackage,
} from "@/wab/client/components/studio/add-drawer/AddDrawer";
import StyleSelect from "@/wab/client/components/style-controls/StyleSelect";
import { Tab, Tabs } from "@/wab/client/components/widgets";
import Button from "@/wab/client/components/widgets/Button";
import { Icon } from "@/wab/client/components/widgets/Icon";
import {
  InvalidArgsBadge,
  InvalidArgsSummary,
} from "@/wab/client/components/widgets/InvalidArgs";
import PlusIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Plus";
import SearchIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Search";
import { StudioCtx, useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { CUSTOM_CODE_QUERY_CAP } from "@/wab/shared/Labels";
import { allCustomFunctions } from "@/wab/shared/cached-selectors";
import {
  getPropTypeDefaultValue,
  normalizeCustomFunctionParams,
} from "@/wab/shared/code-components/code-components";
import { ServerQueryOp } from "@/wab/shared/codegen/react-p/server-queries/utils";
import { makeShortProjectId, toVarName } from "@/wab/shared/codegen/util";
import {
  cx,
  ensureArray,
  mkShortId,
  spawn,
  switchType,
  withoutFalsy,
} from "@/wab/shared/common";
import {
  StatefulQueryState,
  getCustomFunctionParams,
} from "@/wab/shared/core/custom-functions";
import {
  ExprCtx,
  clone,
  codeLit,
  customCode,
  stripParens,
} from "@/wab/shared/core/exprs";
import { InvalidArg } from "@/wab/shared/core/invalid-arg";
import { isHostlessPackageInstalled } from "@/wab/shared/core/project-deps";
import {
  customFunctionId,
  makeCustomCodeQueryKey,
} from "@/wab/shared/core/query-ids";
import { flattenExprs } from "@/wab/shared/core/tpls";
import { DEVFLAGS, HostLessComponentInfo } from "@/wab/shared/devflags";
import { makeDataTokenIdentifier } from "@/wab/shared/eval/expression-parser";
import {
  ArgType,
  ComponentServerQuery,
  CustomCode,
  CustomFunction,
  CustomFunctionExpr,
  Expr,
  FunctionArg,
  Interaction,
  Site,
  TplTag,
  isKnownComponentServerQuery,
} from "@/wab/shared/model/classes";
import { convertToFunction } from "@/wab/shared/parser-utils";
import { renameDataTokenInExpr } from "@/wab/shared/refactoring";
import { smartHumanize } from "@/wab/shared/strs";
import { notification } from "antd";
import { groupBy } from "lodash";
import { reaction } from "mobx";
import { observer } from "mobx-react";
import * as React from "react";
import useSWR from "swr";
import type { SetRequired } from "type-fest";

import { cleanDataForPreview } from "@/wab/client/components/sidebar-tabs/DataBinding/DataPickerCodeEditorLayout";
import { prepareEnvForDataPicker } from "@/wab/client/components/sidebar-tabs/DataBinding/DataPickerUtil";
import DataQueryCodeEditorLayout from "@/wab/client/components/sidebar-tabs/DataBinding/DataQueryCodeEditorLayout";
const LazyValuePreview = React.lazy(async () => {
  const mod = await import("@/wab/client/components/coding/CodePreview");
  return { default: mod.ValuePreview };
});

const CUSTOM_CODE_OPTION = "__custom_code__";

type ServerQueryMode = "query" | "mutation";

export function mkCustomFunctionArgs(
  studioCtx: StudioCtx,
  customFunction: CustomFunction,
  mode: ServerQueryMode
): FunctionArg[] {
  const registrationMeta =
    studioCtx.getRegisteredFunction(customFunction)?.meta;
  if (!registrationMeta?.params) {
    return [];
  }

  const args: FunctionArg[] = [];
  const registeredParams = normalizeCustomFunctionParams(
    registrationMeta.params
  );
  const defaultParamValues = customFunction.params.map(() => undefined as any);
  for (const [paramIndex, param] of customFunction.params.entries()) {
    const registeredParam = registeredParams.find(
      (p) => p.name === param.argName
    );
    if (!registeredParam) {
      continue;
    }

    const defaultValue = getPropTypeDefaultValue(registeredParam, {
      componentPropValues: defaultParamValues,
      ccContextData: undefined,
      controlExtras: {
        path: [param.argName],
        mode,
      },
    });
    if (defaultValue != null) {
      defaultParamValues[paramIndex] = defaultValue;
      args.push(
        new FunctionArg({
          uuid: mkShortId(),
          argType: param,
          expr: codeLit(defaultValue),
        })
      );
    }
  }
  return args;
}

interface QueryDraft {
  queryName?: string;
  fnExpr?: CustomFunctionExpr;
  codeExpr?: CustomCode;
}

type ValidQueryDraft =
  | SetRequired<QueryDraft, "fnExpr">
  | SetRequired<QueryDraft, "codeExpr">;
function isValidQueryDraft(draft: QueryDraft): draft is ValidQueryDraft {
  if (draft.codeExpr) {
    const code = stripParens(draft.codeExpr.code);
    if (code.length === 0) {
      return false;
    }
    // Block save/execute on unparseable JS so we don't commit a broken draft.
    try {
      convertToFunction(code);
      return true;
    } catch {
      return false;
    }
  }
  return draft.fnExpr !== undefined;
}

function getDraftFromOp(
  op: ServerQueryOp | undefined,
  queryName?: string
): QueryDraft {
  if (!op) {
    return { queryName };
  }
  return switchType(op)
    .when(CustomCode, (code) => ({
      queryName,
      codeExpr: clone(code),
    }))
    .when(CustomFunctionExpr, (expr) => ({
      queryName,
      fnExpr: clone(expr),
    }))
    .result();
}

interface AvailableCustomFunctionInfo {
  item: HostLessComponentInfo;
  projectIds: string[];
}

const INSTALLABLE_PREFIX = "install-custom-function-";

function getAllCustomFunctions(site: Site) {
  return allCustomFunctions(site).map((fnInfo) => fnInfo.customFunction);
}

/**
 * Get all available custom functions from hostless packages that are not yet installed
 */
function getAvailableCustomFunctions(
  studioCtx: StudioCtx
): AvailableCustomFunctionInfo[] {
  const hostLessComponentsMeta =
    studioCtx.appCtx.appConfig.hostLessComponents ??
    DEVFLAGS.hostLessComponents ??
    [];
  const availableCustomFunctions: AvailableCustomFunctionInfo[] = [];

  for (const meta of hostLessComponentsMeta) {
    const isInstalled = isHostlessPackageInstalled(
      meta,
      studioCtx.site.projectDependencies
    );
    // Only show packages that should be visible
    if (isInstalled || !shouldShowHostLessPackage(studioCtx, meta)) {
      continue;
    }
    const projectIds = ensureArray(meta.projectId);

    // Get custom function items from this package
    for (const item of meta.items) {
      if (item.isCustomFunction && !item.hidden && !item.hiddenOnStore) {
        availableCustomFunctions.push({ item, projectIds });
      }
    }
  }
  return availableCustomFunctions;
}

export const ServerQueryOpDraftForm = observer(
  function ServerQueryOpDraftForm(props: {
    value: QueryDraft;
    onChange: (value: QueryDraft) => void;
    readOnly?: boolean;
    env: Record<string, any> | undefined;
    schema?: DataPickerTypesSchema;
    isDisabled?: boolean;
    showQueryName?: boolean;
    allowedOps?: string[];
    exprCtx: ExprCtx;
    mode: ServerQueryMode;
    invalidArgs: Record<string, InvalidArg> | undefined;
    currGlobalThis?: typeof globalThis;
  }) {
    const {
      value,
      isDisabled,
      onChange,
      readOnly,
      env: data,
      schema,
      showQueryName,
      exprCtx,
      mode,
      invalidArgs,
      currGlobalThis,
    } = props;
    const studioCtx = useStudioCtx();
    const viewCtx = studioCtx.focusedViewCtx();

    const cleanedEnvData = React.useMemo(
      () =>
        cleanDataForPreview(
          prepareEnvForDataPicker(
            viewCtx,
            data ?? {},
            exprCtx.component ?? undefined
          )
        ),
      [viewCtx, data, exprCtx.component]
    );

    const isCustomCodeMode = !!value.codeExpr;

    const [isInstalling, setIsInstalling] = React.useState(false);
    const installableFunctions = React.useMemo(
      () => getAvailableCustomFunctions(studioCtx),
      [studioCtx.site.projectDependencies.length]
    );
    const availableFunctions = React.useMemo(
      () =>
        getAllCustomFunctions(studioCtx.site).filter((fn) =>
          mode === "mutation" ? fn.isMutation : fn.isQuery
        ),
      [studioCtx.site.projectDependencies.length, mode]
    );

    const argsMap = React.useMemo(
      () => groupBy(value.fnExpr?.args ?? [], (arg) => arg.argType.argName),
      [value.fnExpr?.args]
    );
    const evaluatedArgs = React.useMemo(() => {
      if (!value.fnExpr || !value.fnExpr.func || !value.fnExpr.args) {
        return [];
      }
      try {
        return getCustomFunctionParams(
          value.fnExpr,
          data,
          exprCtx,
          currGlobalThis
        );
      } catch {
        // getCustomFunctionParams throws to surface code errors, but we only use it here for
        // prop visibility/context data, so they can be safely ignored.
        return [];
      }
    }, [value, data, exprCtx, currGlobalThis]);

    const evaluatedFnContext = React.useMemo(() => {
      const func = value?.fnExpr?.func;
      if (!func) {
        return {
          funcId: null,
          dataKey: null,
          fetcher: null,
          funcParamsValues: [],
        };
      }
      const funcId = customFunctionId(func);
      const registration = studioCtx.getRegisteredFunction(func);
      const registeredMeta = registration?.meta;

      const fnContext = registeredMeta?.fnContext;
      if (!fnContext) {
        return {
          funcId: null,
          dataKey: null,
          fetcher: null,
          funcParamsValues: evaluatedArgs,
        };
      }

      try {
        return {
          funcId,
          ...fnContext(...evaluatedArgs),
          funcParamsValues: evaluatedArgs,
        };
      } catch (fnContextError) {
        console.warn(`Error running fnContext for "${funcId}"`, fnContextError);
        return {
          funcId: null,
          dataKey: null,
          fetcher: null,
          funcParamsValues: evaluatedArgs,
        };
      }
    }, [studioCtx, value?.fnExpr?.func, evaluatedArgs]);

    const { funcId, dataKey, fetcher, funcParamsValues } = evaluatedFnContext;
    const { data: ccContextData } = useSWR(dataKey, fetcher, {
      onError: (fnContextFetcherError) => {
        console.warn(
          `Error running fetcher in fnContext for "${funcId}"`,
          fnContextFetcherError
        );
      },
    });

    const propValueEditorContext =
      React.useMemo<PropValueEditorContextData>(() => {
        return {
          tpl: viewCtx?.tplRoot() as TplTag | undefined,
          viewCtx,
          componentPropValues: funcParamsValues ?? [],
          ccContextData,
          invalidArgs,
          exprCtx,
          schema,
          env: data,
        };
      }, [
        viewCtx,
        schema,
        data,
        funcParamsValues,
        exprCtx,
        ccContextData,
        invalidArgs,
      ]);

    React.useEffect(() => {
      // Don't auto-select a function when in custom code mode
      if (isCustomCodeMode) {
        return;
      }

      if (availableFunctions.length === 0) {
        if (value?.fnExpr) {
          onChange({ ...value, fnExpr: undefined });
        }
        return;
      }

      const firstFunc = availableFunctions[0];
      if (!value?.fnExpr) {
        const args = mkCustomFunctionArgs(studioCtx, firstFunc, mode);
        onChange({
          ...value,
          fnExpr: new CustomFunctionExpr({
            func: firstFunc,
            args,
          }),
        });
      } else {
        const functionExistsInSite = availableFunctions.some(
          (fn) => fn.uid === value.fnExpr?.func?.uid
        );
        if (!functionExistsInSite) {
          // Selected function was removed, reset to first available function
          onChange({
            ...value,
            fnExpr: new CustomFunctionExpr({
              func: firstFunc,
              args: mkCustomFunctionArgs(studioCtx, firstFunc, mode),
            }),
          });
        }
      }
    }, [value?.fnExpr?.func?.uid, availableFunctions, isCustomCodeMode]);

    const groupedCustomFunctions = groupBy(
      availableFunctions,
      (fn) => fn.namespace ?? null
    );

    // Rebuild fnExpr with `mkArgs` applied to the current args and commit it.
    const commitFnExprArgs = React.useCallback(
      (mkArgs: (args: FunctionArg[]) => FunctionArg[]) => {
        if (value.fnExpr) {
          onChange({
            queryName: value.queryName,
            fnExpr: new CustomFunctionExpr({
              ...value.fnExpr,
              args: mkArgs(value.fnExpr.args),
            }),
          });
        }
      },
      [onChange, value]
    );

    const handlePropEditorRowChange = React.useCallback(
      (param: ArgType, newExpr: Expr) =>
        commitFnExprArgs((args) => {
          const newArgs = [...args];
          const changedArg = newArgs.find((arg) => arg.argType === param);
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
          return newArgs;
        }),
      [commitFnExprArgs]
    );

    const handlePropEditorRowDelete = React.useCallback(
      (param: ArgType) =>
        commitFnExprArgs((args) => args.filter((arg) => arg.argType !== param)),
      [commitFnExprArgs]
    );

    const handleInstallCustomFunction = async (
      customFunctionInfo: AvailableCustomFunctionInfo
    ) => {
      setIsInstalling(true);
      try {
        const { item, projectIds } = customFunctionInfo;

        // Track existing custom function IDs before installation
        const existingFunctionIds = new Set(
          getAllCustomFunctions(studioCtx.site).map((fn) => fn.uid)
        );

        const fakeItem = createFakeHostLessComponent(item, projectIds);
        await studioCtx.runFakeItem(fakeItem);

        const newFunc = getAllCustomFunctions(studioCtx.site).find(
          (fn) => !existingFunctionIds.has(fn.uid)
        );

        if (newFunc) {
          onChange({
            ...value,
            codeExpr: undefined,
            fnExpr: new CustomFunctionExpr({
              func: newFunc,
              args: mkCustomFunctionArgs(studioCtx, newFunc, mode),
            }),
          });
        }
      } catch (error) {
        notification.error({
          message: "Failed to install custom function",
          description: (error as any).message,
        });
      } finally {
        setIsInstalling(false);
      }
    };

    const handleCodeChange = React.useCallback(
      (newCode: string) => {
        onChange({
          ...value,
          codeExpr: customCode(newCode),
        });
      },
      [onChange, value]
    );

    const dropdownValue = isCustomCodeMode
      ? CUSTOM_CODE_OPTION
      : value?.fnExpr
      ? customFunctionId(value.fnExpr.func)
      : undefined;

    return (
      <div id="data-source-modal-draft-section">
        {showQueryName && (
          <LabeledItemRow label="Query name" data-test-id="query-name">
            <StringPropEditor
              value={value?.queryName}
              onChange={(newName) => onChange({ ...value, queryName: newName })}
            />
          </LabeledItemRow>
        )}
        <LabeledItemRow label={"Data query"}>
          <StyleSelect
            value={dropdownValue}
            placeholder={"Select..."}
            valueSetState={dropdownValue ? "isSet" : undefined}
            isDisabled={isDisabled || readOnly || isInstalling}
            onChange={(id) => {
              if (id === dropdownValue) {
                return;
              }

              if (id === CUSTOM_CODE_OPTION) {
                onChange({
                  queryName: value.queryName,
                  codeExpr:
                    value.codeExpr ??
                    new CustomCode({
                      code: "",
                      fallback: undefined,
                    }),
                  fnExpr: undefined,
                });
                return;
              }

              // Check if this is an installable custom function
              if (id?.startsWith(INSTALLABLE_PREFIX)) {
                const componentName = id.substring(INSTALLABLE_PREFIX.length);
                const customFunctionInfo = installableFunctions.find(
                  (info) => info.item.componentName === componentName
                );
                if (customFunctionInfo) {
                  spawn(handleInstallCustomFunction(customFunctionInfo));
                }
                return;
              }

              const func = availableFunctions.find(
                (fn) => customFunctionId(fn) === id
              );
              onChange({
                queryName: value.queryName,
                codeExpr: undefined,
                fnExpr: func
                  ? new CustomFunctionExpr({
                      func,
                      args: mkCustomFunctionArgs(studioCtx, func, mode),
                    })
                  : undefined,
              });
            }}
          >
            {Object.keys(groupedCustomFunctions).map((namespace) => {
              const isNullGroup = namespace === "null";
              return (
                <StyleSelect.OptionGroup
                  key={namespace}
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
            {installableFunctions.length > 0 && (
              <StyleSelect.OptionGroup title={undefined} noTitle={false}>
                {installableFunctions.map((info) => {
                  const itemId = `${INSTALLABLE_PREFIX}${info.item.componentName}`;
                  return (
                    <StyleSelect.Option key={itemId} value={itemId}>
                      <Icon
                        icon={PlusIcon}
                        style={{ color: "#999", marginRight: 4 }}
                      />
                      {info.item.displayName}
                    </StyleSelect.Option>
                  );
                })}
              </StyleSelect.OptionGroup>
            )}
            <StyleSelect.OptionGroup title={undefined} noTitle={false}>
              <StyleSelect.Option value={CUSTOM_CODE_OPTION}>
                {CUSTOM_CODE_QUERY_CAP}...
              </StyleSelect.Option>
            </StyleSelect.OptionGroup>
          </StyleSelect>
        </LabeledItemRow>
        {isCustomCodeMode ? (
          <DataQueryCodeEditorLayout
            data={cleanedEnvData}
            defaultValue={stripParens(value.codeExpr?.code ?? "")}
            onChange={handleCodeChange}
            schema={schema}
            context="server query custom code"
          />
        ) : (
          value?.fnExpr &&
          value.fnExpr.func.params.length > 0 && (
            <SidebarSection
              title="Parameters"
              key={`params.${value.fnExpr.func.uid}`}
              zeroBodyPadding
              zeroHeaderPadding
              className={styles.paramsSection}
            >
              {(renderMaybeCollapsibleRows) =>
                renderMaybeCollapsibleRows(
                  value.fnExpr!.func.params.flatMap((param) => {
                    const propType = propTypeForParam(
                      param,
                      value.fnExpr!.func,
                      studioCtx
                    );
                    return getServerQueryParamRowItems({
                      param,
                      argsMap,
                      propType,
                      propValueEditorContext,
                      mode,
                      onParamChange: handlePropEditorRowChange,
                      onParamDelete: handlePropEditorRowDelete,
                    });
                  })
                )
              }
            </SidebarSection>
          )
        )}
      </div>
    );
  }
);

/** Renders "not executed" UI if queryState is undefined. */
function _ServerQueryOpPreview(props: {
  queryState: StatefulQueryState | undefined;
  invalidArgs: Record<string, InvalidArg> | undefined;
}) {
  const { queryState, invalidArgs } = props;
  const invalidArgsList = invalidArgs ? Object.values(invalidArgs) : undefined;
  const previewValue = React.useMemo(() => {
    if (!queryState) {
      return "Not executed"; // this value should never actually be shown
    }
    switch (queryState.state) {
      case "initial":
      case "loading":
        return "Loading...";
      case "done":
        return "data" in queryState ? queryState.data : queryState.error;
    }
  }, [queryState]);

  // The preview component doesn't support collapsing,
  // so hack around this by remounting the component to collapse.
  const [previewExpand, setPreviewExpand] = React.useState(false);
  const [previewCollapseCount, setPreviewCollapseCount] = React.useState(1);

  const expandOpts = React.useMemo(() => {
    if (previewExpand) {
      return { expandLevel: 50 };
    }
    if (
      previewValue !== null &&
      typeof previewValue === "object" &&
      "body" in previewValue &&
      typeof previewValue.body === "object"
    ) {
      // Expand body 2 levels for arrays and 1 level for objects
      const expandPaths = Array.isArray(previewValue.body)
        ? ["$", "$.body", "$.body.*"]
        : ["$", "$.body"];
      return { expandPaths };
    }
    return { expandLevel: 1 };
  }, [previewValue, previewExpand]);

  const extraContent = React.useMemo(() => {
    return (
      <div className="flex-row gap-lg fill-height mr-m flex-vcenter">
        <a
          onClick={() => {
            setPreviewExpand(false);
            setPreviewCollapseCount((x) => x + 1);
          }}
        >
          Collapse All
        </a>
        <a
          onClick={() => {
            setPreviewExpand(true);
          }}
        >
          Expand All
        </a>
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
            contents: () =>
              invalidArgsList ? (
                <div className="flex-col fill-width fill-height flex-vcenter flex-hcenter gap-m dimfg text-center">
                  <InvalidArgsBadge>
                    <strong>Fix validation errors</strong>
                  </InvalidArgsBadge>
                  <div>
                    <InvalidArgsSummary invalidArgs={invalidArgsList} />
                  </div>
                </div>
              ) : !queryState ? (
                <div className="flex-col fill-width fill-height flex-vcenter flex-hcenter dimfg">
                  Press Execute to preview results
                </div>
              ) : (
                <React.Suspense>
                  <LazyValuePreview
                    key={previewCollapseCount}
                    val={previewValue}
                    className="code-preview-inner"
                    opts={expandOpts}
                  />
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
    value: ServerQueryOp | ComponentServerQuery | undefined;
    onSave: (value: ServerQueryOp, opExprName?: string) => void;
    onCancel: () => void;
    readOnly?: boolean;
    env: Record<string, any> | undefined;
    currGlobalThis?: typeof globalThis;
    schema?: DataPickerTypesSchema;
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
      currGlobalThis,
      schema,
      allowedOps,
      exprCtx,
      interaction,
    } = props;
    const mode: ServerQueryMode = interaction ? "mutation" : "query";
    const studioCtx = useStudioCtx();
    const parentQuery = isKnownComponentServerQuery(value) ? value : undefined;
    const [draft, setDraft] = React.useState<QueryDraft>(() => {
      const op = isKnownComponentServerQuery(value) ? value.op : value;
      return getDraftFromOp(op ?? undefined, parentQuery?.name);
    });

    // Watch for data token renames and update draft expressions accordingly
    React.useEffect(() => {
      const dispose = reaction(
        () => {
          // Track data tokens by their uid and name
          return studioCtx.site.dataTokens.map((token) => ({
            uid: token.uid,
            name: token.name,
          }));
        },
        (currentTokens, previousTokens) => {
          if (!draft.fnExpr?.args && !draft.codeExpr) {
            return;
          }

          // Find which tokens were renamed
          const renames: Array<{ oldName: string; newName: string }> = [];
          currentTokens.forEach((curr, idx) => {
            const prev = previousTokens[idx];
            if (prev && curr.uid === prev.uid && curr.name !== prev.name) {
              renames.push({ oldName: prev.name, newName: curr.name });
            }
          });

          if (renames.length > 0) {
            // Update the draft expressions with the new token names
            setDraft((prevDraft) => {
              if (!prevDraft.fnExpr?.args && !prevDraft.codeExpr) {
                return prevDraft;
              }

              // Apply all renames to each arg expression and all nested expressions
              renames.forEach(({ oldName, newName }) => {
                const shortId = makeShortProjectId(studioCtx.siteInfo.id);
                const oldIdentifier = makeDataTokenIdentifier(
                  shortId,
                  toVarName(oldName)
                );
                const newIdentifier = makeDataTokenIdentifier(
                  shortId,
                  toVarName(newName)
                );

                prevDraft.fnExpr?.args.forEach((arg) => {
                  flattenExprs(arg.expr).forEach((expr) => {
                    renameDataTokenInExpr(expr, oldIdentifier, newIdentifier);
                  });
                });

                if (prevDraft.codeExpr) {
                  renameDataTokenInExpr(
                    prevDraft.codeExpr,
                    oldIdentifier,
                    newIdentifier
                  );
                }
              });

              // Return a new draft object to trigger re-render
              return { ...prevDraft };
            });
          }
        }
      );
      return () => dispose();
    }, [studioCtx.site.dataTokens, draft.fnExpr?.args, draft.codeExpr]);

    const [executeArgs, setExecuteArgs] = React.useState<ServerQueryOpArgs>();
    const { queryState, invalidArgs } = useServerQueryOp(executeArgs);
    const validDraft = isValidQueryDraft(draft) && draft;
    const saveOp = validDraft
      ? async () => {
          const op = validDraft.codeExpr ?? validDraft.fnExpr;
          if (op) {
            onSave(op, validDraft.queryName);
          }
        }
      : undefined;

    const executeOp =
      validDraft && env
        ? () => {
            const queryName = validDraft.queryName || "untitled";
            if (validDraft.fnExpr) {
              const registeredFn = studioCtx.getRegisteredFunction(
                validDraft.fnExpr.func
              );
              if (registeredFn) {
                setExecuteArgs({
                  expr: clone(validDraft.fnExpr) as CustomFunctionExpr,
                  env,
                  exprCtx,
                  currGlobalThis,
                });
              }
            } else if (validDraft.codeExpr) {
              setExecuteArgs({
                fnId: makeCustomCodeQueryKey(parentQuery?.uuid ?? queryName),
                code: clone(validDraft.codeExpr) as CustomCode,
                env,
              });
            }
          }
        : undefined;

    // Auto-execute on mount if initial value is valid
    React.useEffect(() => {
      if (executeOp) {
        executeOp();
      }
    }, []);

    const contents = (
      <div className="fill-height">
        <div className="flex-row fill-height">
          <div
            className={cx({
              "flex-col fill-height fill-width": true,
            })}
            style={{ maxWidth: 500, flexShrink: 0 }}
          >
            <div className="flex-col fill-width fill-height overflow-scroll p-xxlg flex-children-no-shrink">
              <ServerQueryOpDraftForm
                value={draft}
                onChange={setDraft}
                readOnly={readOnly}
                env={env}
                currGlobalThis={currGlobalThis}
                schema={schema}
                isDisabled={readOnly}
                allowedOps={allowedOps}
                showQueryName={!!parentQuery}
                exprCtx={exprCtx}
                mode={mode}
                invalidArgs={invalidArgs}
              />
            </div>
            <BottomModalButtons>
              <Button
                id="data-source-modal-save-btn"
                type="primary"
                disabled={!saveOp}
                onClick={saveOp}
              >
                Save
              </Button>
              <Button
                onClick={executeOp}
                withIcons={"startIcon"}
                disabled={!validDraft}
                startIcon={<Icon icon={SearchIcon} />}
              >
                Execute
              </Button>
              <Button onClick={onCancel}>Cancel</Button>
            </BottomModalButtons>
          </div>
          <ServerQueryOpPreview
            queryState={queryState}
            invalidArgs={invalidArgs}
          />
        </div>
      </div>
    );
    return contents;
  }
);
