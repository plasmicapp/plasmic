import { BottomModalButtons } from "@/wab/client/components/BottomModal";
import { shouldShowHostLessPackage } from "@/wab/client/components/omnibar/Omnibar";
import { StringPropEditor } from "@/wab/client/components/sidebar-tabs/ComponentProps/StringPropEditor";
import { DataPickerTypesSchema } from "@/wab/client/components/sidebar-tabs/DataBinding/DataPicker";
import { PropValueEditorContextData } from "@/wab/client/components/sidebar-tabs/PropEditorRow";
import styles from "@/wab/client/components/sidebar-tabs/ServerQuery/ServerQueryOpPicker.module.scss";
import {
  getServerQueryParamRowItems,
  propTypeForParam,
} from "@/wab/client/components/sidebar-tabs/ServerQuery/ServerQueryParamRow";
import { SidebarSection } from "@/wab/client/components/sidebar/SidebarSection";
import { LabeledItemRow } from "@/wab/client/components/sidebar/sidebar-helpers";
import { createFakeHostLessComponent } from "@/wab/client/components/studio/add-drawer/AddDrawer";
import StyleSelect from "@/wab/client/components/style-controls/StyleSelect";
import { Tab, Tabs } from "@/wab/client/components/widgets";
import Button from "@/wab/client/components/widgets/Button";
import { Icon } from "@/wab/client/components/widgets/Icon";
import PlusIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Plus";
import SearchIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Search";
import { StudioCtx, useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { allCustomFunctions } from "@/wab/shared/cached-selectors";
import {
  StudioPropType,
  customFunctionId,
  getPropTypeDefaultValue,
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
  ServerQueryOpArgs,
  StatefulQueryState,
  getCustomFunctionParams,
  useServerQueryOp,
} from "@/wab/shared/core/custom-functions";
import { ExprCtx, clone, codeLit } from "@/wab/shared/core/exprs";
import { isHostlessPackageInstalledWithHidden } from "@/wab/shared/core/project-deps";
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
import { renameDataTokenInExpr } from "@/wab/shared/refactoring";
import { smartHumanize } from "@/wab/shared/strs";
import { CustomFunctionMeta } from "@plasmicapp/host";
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
    return draft.codeExpr.code.trim().length > 0;
  }
  return draft.fnExpr !== undefined;
}

function getOpFromDraft(draft: QueryDraft): ServerQueryOp | undefined {
  return draft.codeExpr ?? draft.fnExpr;
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
    const isInstalledWithHidden = isHostlessPackageInstalledWithHidden(
      meta,
      studioCtx.site.projectDependencies
    );
    // Only show packages that should be visible
    if (isInstalledWithHidden || !shouldShowHostLessPackage(studioCtx, meta)) {
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

/**
 * Create FunctionArgs for a new CustomFunction, with default values
 * for parameters that have defaultValue defined in registration metadata.
 */
function mkCustomFunctionArgs(
  customFunction: CustomFunction,
  registrationMeta: CustomFunctionMeta<any> | undefined
): FunctionArg[] {
  if (!registrationMeta?.params) {
    return [];
  }

  const args: FunctionArg[] = [];
  for (const param of customFunction.params) {
    const registeredParam = registrationMeta.params?.find(
      (p) => p.name === param.argName
    );
    if (!registeredParam || typeof registeredParam === "string") {
      continue;
    }

    const defaultValue = getPropTypeDefaultValue(
      registeredParam as StudioPropType<any>
    );
    if (defaultValue != null) {
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
    } = props;
    const studioCtx = useStudioCtx();
    const viewCtx = studioCtx.focusedViewCtx();

    const cleanedEnvData = React.useMemo(
      () =>
        cleanDataForPreview(
          prepareEnvForDataPicker(
            viewCtx,
            data,
            exprCtx.component ?? undefined
          ) ?? {}
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
      () => getAllCustomFunctions(studioCtx.site),
      [studioCtx.site.projectDependencies.length]
    );

    const argsMap = React.useMemo(
      () => groupBy(value.fnExpr?.args ?? [], (arg) => arg.argType.argName),
      [value.fnExpr?.args]
    );
    const evaluatedArgs = React.useMemo(() => {
      if (!value.fnExpr || !value.fnExpr.func || !value.fnExpr.args) {
        return [];
      }
      return getCustomFunctionParams(value.fnExpr, data, exprCtx);
    }, [value]);

    const getRegistrationMeta = (fn: CustomFunction) => {
      return studioCtx.getRegisteredFunctionsMap().get(customFunctionId(fn))
        ?.meta;
    };

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
      const registration = studioCtx.getRegisteredFunctionsMap().get(funcId);
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
          exprCtx,
          schema,
          env: data,
        };
      }, [schema, data, funcParamsValues, exprCtx, ccContextData]);

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
      const meta = getRegistrationMeta(firstFunc);
      if (!value?.fnExpr) {
        const args = mkCustomFunctionArgs(firstFunc, meta);
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
              args: mkCustomFunctionArgs(firstFunc, meta),
            }),
          });
        }
      }
    }, [value?.fnExpr?.func?.uid, availableFunctions, isCustomCodeMode]);

    const groupedCustomFunctions = groupBy(
      availableFunctions,
      (fn) => fn.namespace ?? null
    );

    const handlePropEditorRowChange = React.useCallback(
      (param: ArgType, newExpr: Expr) => {
        if (value.fnExpr) {
          const newFnExpr = new CustomFunctionExpr({
            ...value.fnExpr,
            args: [...value.fnExpr.args],
          });
          const changedArg = newFnExpr.args.find(
            (arg) => arg.argType === param
          );
          if (changedArg) {
            changedArg.expr = newExpr;
            onChange({
              queryName: value.queryName,
              fnExpr: newFnExpr,
            });
          } else {
            newFnExpr.args.push(
              new FunctionArg({
                uuid: mkShortId(),
                expr: newExpr,
                argType: param,
              })
            );
            onChange({
              queryName: value.queryName,
              fnExpr: newFnExpr,
            });
          }
        }
      },
      [onChange, value]
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
              args: mkCustomFunctionArgs(newFunc, getRegistrationMeta(newFunc)),
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
          codeExpr: new CustomCode({
            code: newCode,
            fallback: undefined,
          }),
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
                      args: mkCustomFunctionArgs(
                        func,
                        getRegistrationMeta(func)
                      ),
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
                Custom code query...
              </StyleSelect.Option>
            </StyleSelect.OptionGroup>
          </StyleSelect>
        </LabeledItemRow>
        {isCustomCodeMode ? (
          <DataQueryCodeEditorLayout
            data={cleanedEnvData}
            defaultValue={value.codeExpr?.code ?? ""}
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
                      onParamChange: handlePropEditorRowChange,
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
}) {
  const { queryState } = props;
  const previewValue = React.useMemo(() => {
    if (!queryState) {
      return "Not executed"; // this value should never actually be shown
    }
    switch (queryState.state) {
      case "initial":
      case "loading":
        return "Loading...";
      case "done":
        if ("data" in queryState) {
          return queryState.data;
        } else {
          return queryState.error;
        }
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
              !queryState ? (
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
      schema,
      allowedOps,
      exprCtx,
    } = props;
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

    // Query executes (useServerQueryOp) when executeArgs changes.
    // undefined query will not be run.
    const [executeArgs, setExecuteArgs] = React.useState<ServerQueryOpArgs>();
    const executeResult = useServerQueryOp(executeArgs);
    const validDraft = isValidQueryDraft(draft) && draft;
    const saveOp = validDraft
      ? async () => {
          const op = getOpFromDraft(validDraft);
          if (op) {
            onSave(op, validDraft.queryName);
          }
        }
      : undefined;

    const executeOp = validDraft
      ? () => {
          const queryName = validDraft.queryName || "untitled";
          if (validDraft.fnExpr) {
            const registeredFn = studioCtx
              .getRegisteredFunctionsMap()
              .get(customFunctionId(validDraft.fnExpr.func));
            if (registeredFn) {
              setExecuteArgs({
                fnId: queryName,
                fn: registeredFn.function,
                expr: clone(validDraft.fnExpr) as CustomFunctionExpr,
                env,
                exprCtx,
              });
            }
          } else if (validDraft.codeExpr) {
            setExecuteArgs({
              fnId: queryName,
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
                schema={schema}
                isDisabled={readOnly}
                allowedOps={allowedOps}
                showQueryName={!!parentQuery}
                exprCtx={exprCtx}
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
          <ServerQueryOpPreview queryState={executeResult?.queryState} />
        </div>
      </div>
    );
    return contents;
  }
);
