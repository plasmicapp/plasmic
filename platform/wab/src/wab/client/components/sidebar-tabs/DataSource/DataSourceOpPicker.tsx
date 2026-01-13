import { Modal } from "@/wab/client/components/widgets/Modal";
import "@graphiql/plugin-explorer/dist/style.css";
import type { CrudSorting } from "@pankod/refine-core";
import {
  DataSourceSchema,
  executePlasmicDataOp,
  makeCacheKey,
  ManyRowsResult,
  SingleRowResult,
  TableFieldSchema,
  TableSchema,
  usePlasmicDataOp,
} from "@plasmicapp/react-web/lib/data-sources";
import { Input, Menu, notification, Tooltip } from "antd";
import { GraphiQLProvider } from "graphiql";
import "graphiql/graphiql.css";
import { isArray, isNil, isString, mapValues, omit } from "lodash";
import { observer } from "mobx-react";
import React, {
  createContext,
  Dispatch,
  SetStateAction,
  useContext,
  useMemo,
  useState,
} from "react";
// eslint-disable-next-line no-restricted-imports
import { AppCtx } from "@/wab/client/app-ctx";
import { useAppRoles } from "@/wab/client/components/app-auth/app-auth-contexts";
import {
  BottomModalButtons,
  useBottomModalActions,
} from "@/wab/client/components/BottomModal";
import { WithContextMenu } from "@/wab/client/components/ContextMenu";
import ContextMenuIndicator from "@/wab/client/components/ContextMenuIndicator/ContextMenuIndicator";
import { MenuBuilder } from "@/wab/client/components/menu-builder";
import { createPortalTunnel } from "@/wab/client/components/portal-tunnel";
import {
  DynamicValueWidget,
  mkUndefinedObjectPath,
} from "@/wab/client/components/QueryBuilder/Components/DataPickerWidgetFactory";
import { QueryBuilderConfig } from "@/wab/client/components/QueryBuilder/QueryBuilderConfig";
import { DataPickerEditor } from "@/wab/client/components/sidebar-tabs/ComponentProps/DataPickerEditor";
import { EnumPropEditor } from "@/wab/client/components/sidebar-tabs/ComponentProps/EnumPropEditor";
import { InvalidationEditor } from "@/wab/client/components/sidebar-tabs/ComponentProps/InvalidationEditor";
import { StringPropEditor } from "@/wab/client/components/sidebar-tabs/ComponentProps/StringPropEditor";
import { IndentedRow } from "@/wab/client/components/sidebar-tabs/ComponentPropsSection";
import { ValuePreview } from "@/wab/client/components/sidebar-tabs/data-tab";
import { DataPickerTypesSchema } from "@/wab/client/components/sidebar-tabs/DataBinding/DataPicker";
import styles from "@/wab/client/components/sidebar-tabs/DataSource/DataSourceOpPicker.module.scss";
import DataSourceQueryBuilder from "@/wab/client/components/sidebar-tabs/DataSource/DataSourceQueryBuilder";
import {
  GqlComponents,
  GqlDoc,
} from "@/wab/client/components/sidebar-tabs/DataSource/specific-data-source-ui/GqlComponents";
import {
  TemplatedTextEditorWithMenuIndicator,
  TemplatedTextWidget,
} from "@/wab/client/components/sidebar-tabs/DataSource/TemplatedTextWidget";
import { useSourceOp } from "@/wab/client/components/sidebar-tabs/useSourceOp";
import {
  FullRow,
  LabeledItemRow,
  SectionSeparator,
} from "@/wab/client/components/sidebar/sidebar-helpers";
import { useMaybeCollapsibleRows } from "@/wab/client/components/sidebar/SidebarSection";
import StyleSelect from "@/wab/client/components/style-controls/StyleSelect";
import StyleToggleButton from "@/wab/client/components/style-controls/StyleToggleButton";
import StyleToggleButtonGroup from "@/wab/client/components/style-controls/StyleToggleButtonGroup";
import {
  ListBox,
  ListBoxItem,
  Spinner,
  Tab,
  Tabs,
  VerticalFillTable,
} from "@/wab/client/components/widgets";
import Button from "@/wab/client/components/widgets/Button";
import { Icon } from "@/wab/client/components/widgets/Icon";
import IconButton from "@/wab/client/components/widgets/IconButton";
import Switch from "@/wab/client/components/widgets/Switch";
import {
  useApi,
  useDataSource,
  useTopFrameApi,
} from "@/wab/client/contexts/AppContexts";
import { reportSilentErrorMessage } from "@/wab/client/ErrorNotifications";
import { useAsyncStrict } from "@/wab/client/hooks/useAsyncStrict";
import PlusIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Plus";
import SearchIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Search";
import TrashIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Trash";
import TreeIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Tree";
import RefreshsvgIcon from "@/wab/client/plasmic/plasmic_kit_icons/icons/PlasmicIcon__RefreshSvg";
import {
  BLOCKED_RUN_INTERACTION_MESSAGE,
  extractDataCtx,
} from "@/wab/client/state-management/interactions-meta";
import { doesCodeDependsOnPreviousStepsOrEventArgs } from "@/wab/client/state-management/preview-steps";
import {
  StudioAppUser,
  StudioCtx,
  useStudioCtx,
} from "@/wab/client/studio-ctx/StudioCtx";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { TutorialEventsType } from "@/wab/client/tours/tutorials/tutorials-events";
import { MaybeWrap } from "@/wab/commons/components/ReactUtil";
import { Stated } from "@/wab/commons/components/Stated";
import { ApiDataSource } from "@/wab/shared/ApiSchema";
import { siteToUsedDataSources } from "@/wab/shared/cached-selectors";
import {
  arrayEq,
  assert,
  ensure,
  ensureArray,
  ensureInstance,
  ensureString,
  maybe,
  maybes,
  randUint16,
  removeAtIndexes,
  sortBy,
  spawn,
  swallow,
  unreachable,
  withoutFalsy,
} from "@/wab/shared/common";
import {
  asCode,
  createExprForDataPickerValue,
  ExprCtx,
  extractValueSavedFromDataPicker,
  getRawCode,
  hasUnsafeCurrentUserBinding,
} from "@/wab/shared/core/exprs";
import { EventHandlerKeyType } from "@/wab/shared/core/tpls";
import {
  DataSourceType,
  getDataSourceMeta,
  getDataSourceQueryBuilderConfig,
} from "@/wab/shared/data-sources-meta/data-source-registry";
import {
  ALL_QUERIES,
  ArgMeta,
  coerceArgValueToString,
  DataSourceMeta,
  DataSourceOpDraftValue,
  dataSourceTemplateToString,
  exprToDataSourceString,
  Fields,
  getTemplateFieldType,
  isJsonType,
  JsonSchemaArgMeta,
  JsonSchemaArrayArgMeta,
  mkDataSourceOpExpr,
  mkDataSourceTemplate,
  OperationMeta,
} from "@/wab/shared/data-sources-meta/data-sources";
import { HttpBodyEncodingType } from "@/wab/shared/data-sources-meta/http-meta";
import { isDynamicValue } from "@/wab/shared/dynamic-bindings";
import { tryEvalExpr } from "@/wab/shared/eval";
import {
  A_DATA_SOURCE_LOWER,
  DATA_QUERY_CAP,
  DATA_SOURCE_CAP,
  DATA_SOURCE_LOWER,
  DATA_SOURCE_OPERATION_LOWER,
  DATA_SOURCE_PLURAL_LOWER,
} from "@/wab/shared/Labels";
import {
  Component,
  ComponentDataQuery,
  CustomCode,
  DataSourceOpExpr,
  ensureKnownTemplatedString,
  Interaction,
  isKnownComponentDataQuery,
  isKnownDataSourceOpExpr,
  isKnownExpr,
  isKnownTemplatedString,
  ObjectPath,
  QueryInvalidationExpr,
  QueryRef,
  Site,
  TemplatedString,
  TplNode,
} from "@/wab/shared/model/classes";
import { APP_ROUTES } from "@/wab/shared/route/app-routes";
import { fillRoute } from "@/wab/shared/route/route";
import { smartHumanize } from "@/wab/shared/strs";
import { explorerPlugin } from "@graphiql/plugin-explorer";
import {
  PrettifyIcon,
  QueryEditor,
  usePrettifyEditors,
  useTheme,
} from "@graphiql/react";
import { Fetcher } from "@graphiql/toolkit";
import { PlasmicDataSourceContextProvider } from "@plasmicapp/react-web";
import cx from "classnames";
import constate from "constate";
import { useMountedState } from "react-use";
import useSWR from "swr";

interface DataSourceOpPickerInputs {
  onRowSelected?: (row: any) => void;
  isRowSelector?: boolean;
  selectedRowKey?: string | string[];
  rowKey?: string | string[];
  livePreview?: boolean;
  hideDataTab?: boolean;
  preferredTab?: PreviewTabKey;
}

interface DataSourceOpPickerContext extends DataSourceOpPickerInputs {
  tabKey: PreviewTabKey;
  setTabKey: (key: PreviewTabKey) => void;
}

function useDataSourceOpPicker(
  props: DataSourceOpPickerInputs
): DataSourceOpPickerContext {
  const [tabKey, setTabKey] = React.useState<PreviewTabKey>("data");
  return {
    ...props,
    tabKey,
    setTabKey,
  };
}

export const [DataSourceOpPickerProvider, useDataSourceOpPickerContext] =
  constate(useDataSourceOpPicker);

interface DataSourceDraftContext {
  sourceMeta?: DataSourceMeta;
  schemaTunnel?: ReturnType<typeof createPortalTunnel>;
}

const DataSourceDraftContext = createContext<DataSourceDraftContext>({});

const LazyCodePreview = React.lazy(
  () => import("@/wab/client/components/coding/CodePreview")
);

const INVALID_CURRENT_USER_OPERATION_MESSAGE = () => (
  <span>
    This {DATA_SOURCE_OPERATION_LOWER} can't be saved because of unsafe usage of
    the current user. Refer to{" "}
    <a
      target="_blank"
      href="https://docs.plasmic.app/learn/auth/#using-the-logged-in-user-in-dynamic-values"
    >
      docs
    </a>{" "}
    for more information.
  </span>
);

/**
 * DataSourceOpPicker takes a `env` OR a tuple `{ viewCtx, tpl,
 * eventHandlerKey }` which the bottom modal uses to get the canvas
 * env. The latter is preferred because with the former the modal
 * does not react to changes in canvas env.
 */
type DataSourceOpPickerProps = {
  queryKey: string;
  queryName?: string;
  value?: DataSourceOpExpr;
  sourceType?: DataSourceType;
  shouldOpenModal?: boolean;
  onChange: (value: DataSourceOpExpr) => void;
  readOnly?: boolean;
  schema?: DataPickerTypesSchema;
  parent?: ComponentDataQuery | TplNode;
  showPreview?: boolean;
  /**
   * Whether only read operations are allowed
   */
  livePreview?: boolean;
  readOpsOnly?: boolean;
  isRowSelector?: boolean;
  onRowSelected?: (row: any) => void;
  selectedRowKey?: string | string[];
  rowKey?: string | string[];
  onClose?: () => void;
  allowedOps?: string[];
  component?: Component;
  interaction?: Interaction;
} & (
  | {
      env: Record<string, any> | undefined;
    }
  | {
      viewCtx: ViewCtx | undefined;
      tpl: TplNode | undefined;
      eventHandlerKey: EventHandlerKeyType | undefined;
    }
);

export const DataSourceOpPicker = observer((props: DataSourceOpPickerProps) => {
  const {
    queryKey,
    value,
    onChange,
    schema,
    isRowSelector,
    onRowSelected,
    selectedRowKey,
    rowKey,
    onClose,
    livePreview,
    allowedOps,
    component,
    ...rest
  } = props;
  const { open, close } = useDataSourceOpExprBottomModal(queryKey);
  const studioCtx = useStudioCtx();
  const exprCtx: ExprCtx = {
    projectFlags: studioCtx.projectFlags(),
    component: component ?? null,
    inStudio: true,
  };

  const env =
    "env" in props
      ? props.env
      : props.viewCtx && props.tpl
      ? extractDataCtx(
          props.viewCtx,
          props.tpl,
          undefined,
          props.interaction,
          props.eventHandlerKey
        )
      : undefined;

  return (
    <DataSourceOpPickerProvider
      {...{
        isRowSelector,
        onRowSelected,
        selectedRowKey,
        rowKey,
        livePreview,
      }}
    >
      <div className="flex-col fill-width">
        <Button
          id="configure-operation-btn"
          type="leftAligned"
          onClick={() => {
            open({
              value,
              onSave: (newExpr) => {
                onChange(newExpr);
                close();
                onClose?.();
              },
              onCancel: () => {
                close();
                onClose?.();
              },
              schema,
              allowedOps,
              exprCtx,
              ...rest,
            });
            studioCtx.tourActionEvents.dispatch({
              type: TutorialEventsType.ConfigureDataOperation,
            });
          }}
          data-plasmic-prop="data-source-open-modal-btn"
        >
          {!value ? (
            "Configure an operation"
          ) : (
            <DataSourceOpExprSummary expr={value} />
          )}
        </Button>
        <DataSourceOpValuePreview expr={value} env={env} exprCtx={exprCtx} />
      </div>
    </DataSourceOpPickerProvider>
  );
});

/** For managing multiple query modals or an unknown/dynamic query. */
export function useDataSourceOpExprBottomModals() {
  const ctx = useDataSourceOpPickerContext();
  const modalActions = useBottomModalActions();
  return {
    open: (
      queryKey: string,
      {
        title,
        ...props
      }: {
        title?: string;
      } & DataSourceOpExprBottomModalContentProps
    ) => {
      modalActions.open(queryKey, {
        title:
          title ||
          (ctx.isRowSelector
            ? `Switch to a different record`
            : `Configure ${DATA_SOURCE_OPERATION_LOWER}`),
        children: <DataSourceOpExprBottomModalContent {...props} />,
      });
    },
    close: (queryKey: string) => {
      modalActions.close(queryKey);
    },
  };
}

/** For managing a single query modal with a known query key. */
export function useDataSourceOpExprBottomModal(queryKey: string) {
  const dataSourceModals = useDataSourceOpExprBottomModals();
  return {
    open: (
      props: {
        title?: string;
      } & DataSourceOpExprBottomModalContentProps
    ) => {
      dataSourceModals.open(queryKey, props);
    },
    close: () => {
      dataSourceModals.close(queryKey);
    },
  };
}

interface DataSourceOpExprBottomModalContentProps {
  value?: DataSourceOpExpr;
  sourceType?: DataSourceType;
  onSave: (expr: DataSourceOpExpr, opExprName?: string) => unknown;
  onCancel: () => unknown;
  readOnly?: boolean;
  readOpsOnly?: boolean;
  userPropsMode?: boolean;
  parent?: ComponentDataQuery | TplNode;
  env?: Record<string, any>;
  schema?: DataPickerTypesSchema;
  allowedOps?: string[];
  livePreview?: boolean;
  isRowSelector?: boolean;
  onRowSelected?: (row: any) => unknown;
  selectedRowKey?: string;
  rowKey?: string | string[];
  exprCtx: ExprCtx;
  interaction?: Interaction;
  viewCtx?: ViewCtx;
  tpl?: TplNode;
  eventHandlerKey?: EventHandlerKeyType;
}

const DataSourceOpExprBottomModalContent = observer(
  function DataSourceOpExprBottomModal({
    value,
    sourceType,
    onSave,
    onCancel,
    readOnly,
    readOpsOnly,
    userPropsMode,
    parent,
    schema,
    allowedOps,
    livePreview,
    isRowSelector,
    onRowSelected,
    selectedRowKey,
    rowKey,
    interaction,
    exprCtx,
    viewCtx,
    tpl,
    eventHandlerKey,
    ...rest
  }: DataSourceOpExprBottomModalContentProps) {
    const studioCtx = useStudioCtx();
    const wrappedOnSave = React.useCallback(
      (newExpr: DataSourceOpExpr, opExprName?: string) => {
        if (hasUnsafeCurrentUserBinding(newExpr, exprCtx)) {
          notification.warn({
            message: INVALID_CURRENT_USER_OPERATION_MESSAGE(),
          });
          return;
        }
        onSave(newExpr, opExprName);
      },
      [onSave]
    );

    const env = rest.env
      ? rest.env
      : viewCtx && tpl
      ? extractDataCtx(viewCtx, tpl, undefined, interaction, eventHandlerKey)
      : undefined;

    return (
      <PlasmicDataSourceContextProvider
        value={{ userAuthToken: studioCtx.currentAppUserCtx.fakeAuthToken }}
      >
        <DataSourceOpPickerProvider
          {...{
            isRowSelector,
            onRowSelected,
            selectedRowKey,
            livePreview,
            rowKey,
          }}
        >
          <DataSourceOpExprFormAndPreview
            value={value}
            sourceType={sourceType}
            onSave={wrappedOnSave}
            onCancel={onCancel}
            env={env}
            schema={schema}
            parent={parent}
            readOnly={readOnly}
            readOpsOnly={readOpsOnly}
            userPropsMode={userPropsMode}
            allowedOps={allowedOps}
            exprCtx={exprCtx}
            interaction={interaction}
          />
        </DataSourceOpPickerProvider>
      </PlasmicDataSourceContextProvider>
    );
  }
);

export const DataSourceOpExprSummary = observer(
  function DataSourceOpExprSummary(props: { expr: DataSourceOpExpr }) {
    const { expr } = props;
    const sourceId = expr.sourceId;
    const opName = expr.opName;
    const { source, opMeta, sourceError } = useSourceOp(sourceId, opName);
    if (sourceError) {
      return <ValuePreview err={sourceError} />;
    }
    if (!source || !opMeta) {
      return <div>Loading...</div>;
    }
    return (
      <div className={styles.dataSourceExprValue}>
        {opMeta.name === "getTableSchema"
          ? `Table: ${source.name}`
          : `${source.name}: ${opMeta.label ?? opMeta.name}`}
      </div>
    );
  }
);

export async function getOpIdForDataSourceOpExpr(
  api: AppCtx["api"],
  { sourceId, templates, opName, roleId }: DataSourceOpExpr,
  exprCtx: ExprCtx,
  projectId: string
) {
  const { opId } = await api.getDataSourceOpId(projectId, sourceId, {
    name: opName,
    templates: mapValues(templates, (v) =>
      dataSourceTemplateToString(v, exprCtx)
    ),
    roleId,
  });
  return opId;
}

async function getDataSourceExprFromDraft(props: {
  sourceId?: string;
  opName?: string;
  templates?: DataSourceOpDraftValue["templates"];
  roleId?: string | null;
  api: AppCtx["api"];
  exprCtx: ExprCtx;
  projectId: string;
}) {
  const { sourceId, opName, templates, roleId, api, exprCtx, projectId } =
    props;
  if (sourceId && opName) {
    const { opId } = await api.getDataSourceOpId(projectId, sourceId, {
      name: opName,
      templates: mapValues(templates, (v) =>
        dataSourceTemplateToString(
          mkDataSourceTemplate({
            fieldType: v.type,
            value: v.value,
            bindings: v.bindings,
          }),
          exprCtx
        )
      ),
      roleId,
    });
    return mkDataSourceOpExpr({
      sourceId: sourceId,
      opId: opId,
      opName: opName,
      templates: mapValues(templates, (v) =>
        mkDataSourceTemplate({
          fieldType: v.type,
          value: v.value,
          bindings: v.bindings,
        })
      ),
      roleId: roleId ?? undefined,
    });
  }
  return undefined;
}

async function clearDataOpCache(
  studioCtx: StudioCtx,
  op: DataSourceOpDraftValue | undefined,
  env: Record<string, any> | undefined,
  exprCtx: ExprCtx
) {
  const expr = await getDataSourceExprFromDraft({
    ...(op ?? {}),
    api: studioCtx.appCtx.api,
    exprCtx,
    projectId: studioCtx.siteInfo.id,
  });
  const evaledDataOp =
    (expr &&
      swallow(() => tryEvalExpr(asCode(expr, exprCtx).code, env ?? {}))) ||
    undefined;
  if (evaledDataOp?.val) {
    const key = makeCacheKey(evaledDataOp.val, {
      userAuthToken: studioCtx.currentAppUserCtx.fakeAuthToken,
    });
    studioCtx.refreshFetchedDataFromPlasmicQuery(key);
  }
}

export function useSource(studioCtx: StudioCtx, sourceId: string | undefined) {
  return useSWR(
    () => (sourceId ? `/data-sources/${sourceId}` : null),
    async () => {
      return await studioCtx.appCtx.api
        .getDataSourceById(sourceId!)
        .catch((err) => {
          console.log(`Error fetching data-source ${sourceId}`, err);
          throw err;
        });
    }
  );
}

export function useSourceSchemaData(
  studioCtx: StudioCtx,
  sourceId: string | undefined,
  source: ApiDataSource | undefined
) {
  const sourceMeta = source ? getDataSourceMeta(source.source) : undefined;
  return useSWR(
    () =>
      sourceId && sourceMeta?.studioOps.schemaOp
        ? JSON.stringify({
            sourceId: sourceId,
            schemaOp: sourceMeta.studioOps.schemaOp,
          })
        : null,
    async () => {
      return await studioCtx.appCtx.api
        .executeDataSourceStudioOp(studioCtx.siteInfo.id, sourceId!, {
          name: sourceMeta!.studioOps.schemaOp!.name,
        })
        .catch((err) => {
          console.log(`Error fetching data-source schema for ${sourceId}`, err);
          throw err;
        });
    }
  );
}

export function getMissingRequiredArgsFromDraft(
  draft: DataSourceOpDraftValue,
  sourceSchemaData: DataSourceSchema,
  exprCtx: ExprCtx
) {
  return Object.entries(draft.opMeta?.args ?? {}).filter(
    ([argName, argMeta]) => {
      if (argMeta.type === "json-schema") {
        const requiredFields =
          typeof argMeta.requiredFields === "function"
            ? argMeta.requiredFields(
                sourceSchemaData,
                getSelectedTable(draft, draft.opMeta, exprCtx),
                draft
              )
            : argMeta.requiredFields;
        if (!requiredFields || requiredFields.length === 0) {
          return false;
        }
        const template = draft.templates?.[argName];
        if (!template) {
          return true;
        }
        assert(
          !isKnownTemplatedString(template.value),
          "we should use bindings for json-schema arg"
        );
        try {
          const jsonValue = JSON.parse(template.value);
          return requiredFields.some(
            (requiredField) => jsonValue[requiredField] == null
          );
        } catch {
          return false;
        }
      } else {
        return argMeta.required && draft.templates?.[argName] == null;
      }
    }
  );
}

export async function mkDataSourceOpExprFromDraft(
  draft: DataSourceOpDraftValue,
  studioCtx: StudioCtx,
  sourceSchemaData: DataSourceSchema,
  exprCtx: ExprCtx,
  parent?: ComponentDataQuery | TplNode
) {
  if (!draft.sourceId || !draft.opName || !draft.opMeta) {
    return undefined;
  }
  const missingRequiredArgs = getMissingRequiredArgsFromDraft(
    draft,
    sourceSchemaData,
    exprCtx
  );
  if (missingRequiredArgs.length > 0) {
    return undefined;
  }

  const { opId } = await studioCtx.appCtx.api.getDataSourceOpId(
    studioCtx.siteInfo.id,
    draft.sourceId,
    {
      name: draft.opName,
      templates: mapValues(draft.templates, (v) =>
        dataSourceTemplateToString(
          mkDataSourceTemplate({
            fieldType: v.type,
            value: v.value,
            bindings: v.bindings,
          }),
          exprCtx
        )
      ),
      roleId: draft.roleId,
    }
  );
  return new DataSourceOpExpr({
    sourceId: draft.sourceId,
    opId,
    opName: draft.opName,
    templates: mapValues(draft.templates, (v) =>
      mkDataSourceTemplate({
        fieldType: v.type,
        value: v.value,
        bindings: v.bindings,
      })
    ),
    roleId: draft.roleId,
    cacheKey: draft.opMeta.type === "read" ? draft.cacheKey : undefined,
    queryInvalidation:
      draft.opMeta.type === "write" ? draft.queryInvalidation : undefined,
    parent: parent !== undefined ? new QueryRef({ ref: parent }) : undefined,
  });
}

type ExecuteDataOperationQueueItem = {
  opExpr: DataSourceOpExpr;
  source: ApiDataSource | undefined;
};

const DataOpExecuteQueueContext = React.createContext<{
  executeQueue: ExecuteDataOperationQueueItem[];
  setExecuteQueue: React.Dispatch<
    React.SetStateAction<ExecuteDataOperationQueueItem[]>
  >;
}>({
  executeQueue: [],
  setExecuteQueue: () => {},
});

function useDataOpExecuteQueue() {
  const ctx = useContext(DataOpExecuteQueueContext);
  return ctx;
}

function getArgLabel(argMeta: ArgMeta, codeName: string) {
  return argMeta.label ?? smartHumanize(codeName);
}

const DataSourceOpExprFormAndPreview = observer(
  function DataSourceOpExprFormAndPreview(props: {
    value?: DataSourceOpExpr;
    sourceType?: DataSourceType;
    onSave: (value: DataSourceOpExpr, opExprName?: string) => void;
    onCancel: () => void;
    readOnly?: boolean;
    env: Record<string, any> | undefined;
    schema?: DataPickerTypesSchema;
    parent?: ComponentDataQuery | TplNode;
    /**
     * Whether only read operations are allowed
     */
    readOpsOnly?: boolean;
    /**
     * Whether we are configuring a user props operation or not
     */
    userPropsMode?: boolean;
    allowedOps?: string[];
    exprCtx: ExprCtx;
    interaction?: Interaction;
  }) {
    const {
      value,
      sourceType,
      onSave,
      onCancel,
      readOnly,
      env,
      schema,
      parent,
      readOpsOnly,
      userPropsMode,
      allowedOps,
      exprCtx,
      interaction,
    } = props;
    const studioCtx = useStudioCtx();
    const api = useApi();
    const isMounted = useMountedState();
    const [showControls, setShowControls] = useState(false);
    const [draft, setDraft] = React.useState<DataSourceOpDraftValue>(() =>
      value
        ? {
            sourceId: value.sourceId,
            opName: value.opName,
            roleId: value.roleId,
            cacheKey: value?.cacheKey ?? undefined,
            queryInvalidation: value.queryInvalidation ?? undefined,
            templates: mapValues(
              value?.templates ?? {},
              (v) =>
                ({
                  type: getTemplateFieldType(v),
                  value: v.value,
                  bindings: v.bindings,
                } as const)
            ),
            queryName: isKnownComponentDataQuery(parent)
              ? parent.name
              : undefined,
          }
        : {
            // In all data op expr, we init the roleId with the defaultPageRoleId, inclusive in component data queries
            roleId: studioCtx.site.defaultPageRoleId,
            queryInvalidation: new QueryInvalidationExpr({
              invalidationQueries: [ALL_QUERIES.value],
              invalidationKeys: undefined,
            }),
            sourceId: getPreferredDataSource(studioCtx.site),
            queryName: isKnownComponentDataQuery(parent)
              ? parent.name
              : undefined,
          }
    );
    const [previewOperation, setPreviewOperation] = React.useState<
      DataSourceOpDraftValue | undefined
    >(value ? draft : undefined);

    const sourceId = draft.sourceId;
    const opName = draft.opName;
    const { data: source } = useSource(studioCtx, sourceId);
    const sourceMeta = source ? getDataSourceMeta(source.source) : undefined;
    const { data: sourceSchemaData } = useSourceSchemaData(
      studioCtx,
      sourceId,
      source
    );
    const opMeta = React.useMemo(
      () =>
        sourceMeta && opName
          ? sourceMeta.ops.find((op) => op.name === opName)
          : undefined,
      [sourceMeta, opName]
    );
    const missingRequiredArgs = getMissingRequiredArgsFromDraft(
      draft,
      sourceSchemaData,
      exprCtx
    ).map(([argName, argMeta]) => getArgLabel(argMeta, argName));
    const [isGettingOpId, setGettingOpId] = React.useState(false);

    const { isRowSelector, livePreview, setTabKey, preferredTab } =
      useDataSourceOpPickerContext();

    const saveOpExpr = async () => {
      setGettingOpId(true);
      const pickedSourceId = ensure(
        draft.sourceId,
        `sourceId must be set for this button to be clickable`
      );
      const pickedOpName = ensure(
        draft.opName,
        `opName must be set for this button to be clickable`
      );
      const { opId } = await api.getDataSourceOpId(
        studioCtx.siteInfo.id,
        pickedSourceId,
        {
          name: pickedOpName,
          templates: mapValues(draft.templates, (v) =>
            dataSourceTemplateToString(
              mkDataSourceTemplate({
                fieldType: v.type,
                value: v.value,
                bindings: v.bindings,
              }),
              exprCtx
            )
          ),
          roleId: draft.roleId,
        }
      );
      if (isMounted()) {
        if (missingRequiredArgs.length === 0) {
          onSave(
            new DataSourceOpExpr({
              sourceId: pickedSourceId,
              opId,
              opName: pickedOpName,
              templates: mapValues(draft.templates, (v) =>
                mkDataSourceTemplate({
                  fieldType: v.type,
                  value: v.value,
                  bindings: v.bindings,
                })
              ),
              roleId: draft.roleId,
              cacheKey: opMeta?.type === "read" ? draft.cacheKey : undefined,
              queryInvalidation:
                opMeta?.type === "write" ? draft.queryInvalidation : undefined,
              parent:
                parent !== undefined
                  ? new QueryRef({ ref: parent })
                  : undefined,
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
        setGettingOpId(false);
      }
    };

    const [selectedTableSchema, setSelectedTableSchema] =
      React.useState<TableSchema>();
    const [sourceFetchError, setSourceFetchError] = React.useState<
      Error | undefined
    >(undefined);
    const [isExecuting, setIsExecuting] = React.useState(false);
    const [executeQueue, setExecuteQueue] = React.useState<
      ExecuteDataOperationQueueItem[]
    >([]);
    const dataOpExecuteContextValue = React.useMemo(
      () => ({ executeQueue, setExecuteQueue }),
      [executeQueue, setExecuteQueue]
    );

    function refresh(newDraft: DataSourceOpDraftValue) {
      setPreviewOperation(newDraft);
      spawn(clearDataOpCache(studioCtx, newDraft, env, exprCtx));
    }

    const schemaTunnel = React.useMemo(() => createPortalTunnel(), []);
    const dataSourceDraftContextValue = React.useMemo(
      () => ({ schemaTunnel, sourceMeta }),
      [schemaTunnel, sourceMeta]
    );

    const enablePreviewSteps = studioCtx.appCtx.appConfig.previewSteps;

    const contents = (
      <div className="fill-height">
        {isRowSelector && (
          <BottomModalButtons>
            <Switch
              className={"mr-lg"}
              onChange={() => {
                setShowControls(!showControls);
              }}
            >
              Show filters
            </Switch>
          </BottomModalButtons>
        )}
        <div className="flex-row fill-height">
          <div
            className={cx({
              "flex-col fill-height fill-width": true,
              "display-none": !showControls && isRowSelector,
            })}
            style={{ width: 500, flexShrink: 0 }}
          >
            <div className="flex-col fill-width fill-height overflow-scroll p-xxlg flex-children-no-shrink">
              <DataSourceOpDraftForm
                value={draft}
                onChange={(getNewDraft) => {
                  setDraft((old) => {
                    const newDraft =
                      typeof getNewDraft === "function"
                        ? getNewDraft(old)
                        : getNewDraft;
                    if (livePreview) {
                      refresh(newDraft);
                    }
                    return newDraft;
                  });
                }}
                sourceType={sourceType}
                readOnly={readOnly}
                env={env}
                schema={schema}
                isDisabled={isGettingOpId || readOnly}
                readOpsOnly={readOpsOnly}
                onSelectedTableSchema={setSelectedTableSchema}
                onUpdateSourceFetchError={setSourceFetchError}
                userPropsMode={userPropsMode}
                allowedOps={allowedOps}
                showQueryName={isKnownComponentDataQuery(parent)}
                exprCtx={exprCtx}
              />
            </div>
            {!isRowSelector ? (
              <BottomModalButtons>
                <Button
                  id="data-source-modal-save-btn"
                  type="primary"
                  disabled={
                    !draft.sourceId ||
                    !draft.opName ||
                    isGettingOpId ||
                    !!sourceFetchError
                  }
                  onClick={saveOpExpr}
                >
                  {isGettingOpId ? "Saving..." : "Save"}
                </Button>
                <Button
                  onClick={async () => {
                    if (opMeta?.type === "read") {
                      setTabKey(preferredTab ?? "data");
                      refresh(draft);
                    } else {
                      if (isExecuting || executeQueue.length > 0) {
                        return;
                      }
                      setTabKey(preferredTab ?? "data");
                      setIsExecuting(true);
                      const opExpr = await getDataSourceExprFromDraft({
                        ...draft,
                        api: studioCtx.appCtx.api,
                        exprCtx,
                        projectId: studioCtx.siteInfo.id,
                      });
                      if (opExpr) {
                        const code = `(${getRawCode(opExpr, exprCtx)})`;
                        if (
                          interaction &&
                          enablePreviewSteps &&
                          doesCodeDependsOnPreviousStepsOrEventArgs(
                            code,
                            interaction,
                            exprCtx,
                            studioCtx
                          )
                        ) {
                          notification.error({
                            message: BLOCKED_RUN_INTERACTION_MESSAGE,
                          });
                        } else {
                          setExecuteQueue([
                            ...executeQueue,
                            { opExpr, source },
                          ]);
                        }
                      }
                      setIsExecuting(false);
                    }
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
                  {opMeta?.type === "read"
                    ? "Preview"
                    : isExecuting || executeQueue.length > 0
                    ? "Executing..."
                    : "Execute"}
                </Button>
                <Button onClick={onCancel}>Cancel</Button>
              </BottomModalButtons>
            ) : (
              <BottomModalButtons>
                <Button onClick={onCancel}>Cancel</Button>
              </BottomModalButtons>
            )}
          </div>
          <DataOpExecuteQueueContext.Provider value={dataOpExecuteContextValue}>
            <DataSourceOpDraftPreview
              value={previewOperation}
              env={env}
              tableSchema={selectedTableSchema}
              opType={opMeta?.type}
              exprCtx={exprCtx}
              projectId={studioCtx.siteInfo.id}
            />
          </DataOpExecuteQueueContext.Provider>
        </div>
      </div>
    );
    return (
      <DataSourceDraftContext.Provider value={dataSourceDraftContextValue}>
        {contents}
      </DataSourceDraftContext.Provider>
    );
  }
);

const getTemplateVal = (
  draft: DataSourceOpDraftValue | undefined,
  arg: string
) => {
  return maybe(
    draft?.templates?.[arg],
    ({ value: templateVal }) => templateVal
  );
};

const getStringTemplateVal = (
  draft: DataSourceOpDraftValue | undefined,
  arg: string,
  fieldType: ArgMeta["type"],
  exprCtx: ExprCtx
) => {
  const templateVal = getTemplateVal(draft, arg);
  if (templateVal) {
    const templateString = isString(templateVal)
      ? templateVal
      : exprToDataSourceString(templateVal, exprCtx);
    return isJsonType(fieldType) ? JSON.parse(templateString) : templateString;
  }
  return undefined;
};

const getSelectedTable = (
  draft: DataSourceOpDraftValue | undefined,
  opMeta: OperationMeta | undefined,
  exprCtx: ExprCtx
) => {
  if (draft && opMeta) {
    const tableArgMeta = Object.entries(opMeta.args).find(
      ([_, argMeta]) => argMeta.type === "table"
    );
    if (tableArgMeta) {
      return getStringTemplateVal(draft, tableArgMeta[0], "table", exprCtx);
    }
  }
  return undefined;
};

export function DataSourceOpDraftForm(props: {
  value?: DataSourceOpDraftValue;
  sourceType?: DataSourceType;
  onChange: Dispatch<SetStateAction<DataSourceOpDraftValue>>; // (value: DataSourceOpDraftValue) => void;
  readOnly?: boolean;
  env: Record<string, any> | undefined;
  schema?: DataPickerTypesSchema;
  onSelectedTableSchema?: (tableSchema: TableSchema | undefined) => void;
  onUpdateSourceFetchError?: (error: Error | undefined) => void;
  isDisabled?: boolean;
  showQueryName?: boolean;
  /**
   * Whether only read operations are allowed
   */
  readOpsOnly?: boolean;
  /**
   * Whether we are configuring a user props operation or not
   */
  userPropsMode?: boolean;
  allowedOps?: string[];
  hideCacheKey?: boolean;
  exprCtx: ExprCtx;
}) {
  const {
    value,
    sourceType,
    isDisabled,
    onChange,
    readOnly,
    env: data,
    schema,
    readOpsOnly,
    onSelectedTableSchema,
    onUpdateSourceFetchError,
    userPropsMode,
    allowedOps,
    hideCacheKey,
    showQueryName,
    exprCtx,
  } = props;
  const api = useApi();
  const studioCtx = useStudioCtx();
  const sourceId = value?.sourceId;
  const opName = value?.opName;
  const templates = value?.templates ?? {};
  const selectedRole = value?.roleId ?? null;
  const cacheKey = value?.cacheKey ?? undefined;
  const queryInvalidation = value?.queryInvalidation ?? undefined;

  const {
    data: source,
    error: sourceError,
    isLoading: isLoadingSource,
    mutate: refreshSource,
  } = useSWR(
    () => (sourceId ? `/data-sources/${sourceId}` : null),
    async () => {
      return await api.getDataSourceById(sourceId!).catch((err) => {
        console.log(`Error fetching data-source ${sourceId}`, err);
        throw err;
      });
    }
  );
  const { roles } = useAppRoles(studioCtx.appCtx, studioCtx.siteInfo.id, false);
  const sourceMeta = source ? getDataSourceMeta(source.source) : undefined;

  const {
    data: sourceSchemaData,
    error: schemaError,
    isLoading: isLoadingSchema,
    mutate: refreshSourceSchema,
  } = useSWR(
    () =>
      sourceId && sourceMeta?.studioOps.schemaOp
        ? JSON.stringify({
            sourceId: sourceId,
            schemaOp: sourceMeta.studioOps.schemaOp,
          })
        : null,
    async () => {
      return await api
        .executeDataSourceStudioOp(studioCtx.siteInfo.id, sourceId!, {
          name: sourceMeta!.studioOps.schemaOp!.name,
        })
        .catch((err) => {
          console.log(`Error fetching data-source schema for ${sourceId}`, err);
          throw err;
        });
    }
  );
  const availableDataOps = sourceMeta
    ? sourceMeta.ops.filter((op) => {
        if (allowedOps) {
          return allowedOps.includes(op.name);
        }
        return (op.type === "read" || !readOpsOnly) && !op.hidden;
      })
    : [];

  const opMeta =
    sourceMeta && opName
      ? sourceMeta.ops.find((op) => op.name === opName)
      : undefined;

  const isLoading = sourceId && (isLoadingSource || isLoadingSchema);

  React.useEffect(() => {
    if (value?.opMeta?.name !== opMeta?.name) {
      onChange({
        ...value,
        opMeta,
      });
    }
  }, [sourceMeta, opName, opMeta]);

  React.useEffect(() => {
    if (!isNil(opName)) {
      return;
    }
    if (availableDataOps.length > 0) {
      onChange({
        ...value,
        opName: availableDataOps[0].name,
        templates: {},
        opMeta,
      });
    }
  }, [sourceMeta, opName, opMeta]);

  const getTemplatedStringVal = (arg: string) => {
    const templateVal = getTemplateVal(value, arg);
    return templateVal ? ensureKnownTemplatedString(templateVal) : undefined;
  };
  const getTemplateBindings = (arg: string) => {
    return maybe(
      templates[arg],
      ({ bindings: templateBindings }) => templateBindings ?? undefined
    );
  };

  const omitTableDependentArgs = (v: {}) => {
    if (!opMeta?.args) {
      return v;
    }
    const tableDependentArgs = new Set(
      Object.entries(opMeta.args)
        .filter(([_k, arg]) => !!arg["fields"])
        .map(([argName]) => argName)
    );
    return Object.fromEntries(
      Object.entries(v).filter(([arg]) => !tableDependentArgs.has(arg))
    );
  };

  const getArgMetaRequiredFields = (
    argMeta: JsonSchemaArgMeta | JsonSchemaArrayArgMeta
  ) => {
    return typeof argMeta.requiredFields === "function"
      ? argMeta.requiredFields(
          sourceSchemaData,
          getSelectedTable(value, opMeta, exprCtx),
          value
        )
      : argMeta.requiredFields;
  };

  const setNewTemplate = (
    arg: string,
    fieldType: ArgMeta["type"],
    newValue: any,
    bindings?: Record<string, TemplatedString | CustomCode | ObjectPath>
  ) => {
    const newTemplates = {
      ...(fieldType === "table"
        ? omitTableDependentArgs(value?.templates ?? {})
        : value?.templates ?? {}),
      [arg]: {
        type: fieldType,
        value:
          bindings !== undefined
            ? JSON.stringify(newValue)
            : isKnownTemplatedString(newValue)
            ? newValue
            : new TemplatedString({
                text: isJsonType(fieldType)
                  ? [JSON.stringify(newValue)]
                  : [newValue.toString()],
              }),
        bindings: bindings,
      },
    };
    if (isNil(newValue)) {
      delete newTemplates[arg];
    }
    onChange({
      ...value,
      templates: newTemplates,
    });
  };

  const selectedTableIdentifier = getSelectedTable(value, opMeta, exprCtx);
  const selectedTableSchema =
    selectedTableIdentifier &&
    (sourceSchemaData as DataSourceSchema | undefined)?.tables.find(
      (table) => table.id === selectedTableIdentifier
    );

  React.useEffect(() => {
    onSelectedTableSchema?.(selectedTableSchema);
  }, [selectedTableSchema]);
  React.useEffect(() => {
    onUpdateSourceFetchError?.(sourceError || schemaError);
  }, [sourceError, schemaError]);
  const { isRowSelector, setTabKey } = useDataSourceOpPickerContext();

  const { renderMaybeCollapsibleRows } = useMaybeCollapsibleRows({});
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
      {!isRowSelector && (
        <LabeledItemRow
          label={DATA_SOURCE_CAP}
          menu={
            studioCtx.siteInfo.workspaceId ? (
              <Menu>
                <Menu.Item>
                  <a
                    target={"_blank"}
                    href={
                      fillRoute(APP_ROUTES.workspace, {
                        workspaceId: studioCtx.siteInfo.workspaceId,
                      }) + "#tab=dataSources"
                    }
                  >
                    Manage workspace {DATA_SOURCE_PLURAL_LOWER}
                  </a>
                </Menu.Item>
              </Menu>
            ) : undefined
          }
        >
          <DataSourcePicker
            sourceId={sourceId}
            sourceType={sourceType}
            disabled={isDisabled || readOnly}
            onChange={(newId) => {
              onChange({
                ...value,
                sourceId: newId,
                opName: undefined,
                templates: {},
              });
            }}
            readOpsOnly={readOpsOnly}
            showRefreshButton={sourceError || schemaError}
            onRefreshClick={() => {
              if (sourceError) {
                spawn(refreshSource());
              }
              if (schemaError) {
                spawn(refreshSourceSchema());
              }
            }}
          />
        </LabeledItemRow>
      )}
      {isLoading && <Spinner />}
      {sourceMeta && (sourceSchemaData || !sourceMeta.studioOps.schemaOp) && (
        <>
          {!isRowSelector && availableDataOps.length > 1 && (
            <LabeledItemRow label="Operation">
              <StyleSelect
                id="data-source-modal-pick-operation-btn"
                aria-label="Operation"
                value={opName}
                placeholder={
                  maybes(opName)((name) =>
                    sourceMeta.ops.find((op) => op.name === name)
                  )((opm) => opm.label ?? opm.name)() ?? "Select an operation"
                }
                onChange={(newOpName) => {
                  onChange({
                    ...value,
                    opName: newOpName ?? undefined,
                    templates: {},
                  });
                }}
                isDisabled={isDisabled}
                isReadOnly={readOnly}
                valueSetState={opName ? "isSet" : "isUnset"}
                data-plasmic-prop="data-source-modal-pick-operation-btn"
              >
                {availableDataOps.map((opm) => (
                  <StyleSelect.Option value={opm.name} key={opm.name}>
                    {opm.label ?? opm.name}
                  </StyleSelect.Option>
                ))}
              </StyleSelect>
            </LabeledItemRow>
          )}{" "}
          {opMeta &&
            (sourceSchemaData || !sourceMeta.studioOps.schemaOp) &&
            Object.entries(opMeta.args)
              .filter(
                ([_k, argMeta]) =>
                  !argMeta.hidden?.(
                    sourceSchemaData,
                    getSelectedTable(value, opMeta, exprCtx)
                  ) &&
                  (!(argMeta.type === "filter[]") ||
                    Object.keys(
                      argMeta.fields(
                        sourceSchemaData,
                        getSelectedTable(value, opMeta, exprCtx)
                      )
                    ).length) &&
                  (!isRowSelector ||
                    argMeta.type === "sort[]" ||
                    argMeta.type === "filter[]")
              )
              .map(([key, argMeta]) => {
                const argLabel = getArgLabel(argMeta, key);

                const renderProp = () => {
                  switch (argMeta.type) {
                    case "table":
                      return (
                        <EnumPropEditor
                          value={
                            getStringTemplateVal(
                              value,
                              key,
                              argMeta.type,
                              exprCtx
                            ) ??
                            ((argMeta.default
                              ? coerceArgValueToString(argMeta.default, argMeta)
                              : undefined) as string | undefined)
                          }
                          options={argMeta.options(sourceSchemaData)}
                          onChange={(newVal) =>
                            setNewTemplate(key, argMeta.type, newVal)
                          }
                          valueSetState={
                            key in templates &&
                            getStringTemplateVal(
                              value,
                              key,
                              argMeta.type,
                              exprCtx
                            ) !== undefined
                              ? "isSet"
                              : "isUnset"
                          }
                          readOnly={readOnly}
                          data-plasmic-prop="data-source-modal-pick-resource-btn"
                        />
                      );
                    case "pagination":
                      return (
                        <PaginationEditor
                          onChange={(newVal, bindings) => {
                            setNewTemplate(key, argMeta.type, newVal, bindings);
                          }}
                          data={data}
                          schema={schema}
                          value={getStringTemplateVal(
                            value,
                            key,
                            argMeta.type,
                            exprCtx
                          )}
                          // Creating a new object here so that we don't reference the model with this value
                          exprCtx={exprCtx}
                          bindings={{ ...getTemplateBindings(key) }}
                          disabled={isDisabled}
                          readOnly={readOnly}
                        />
                      );
                    case "sort[]":
                      return (
                        <SortEditor
                          value={getStringTemplateVal(
                            value,
                            key,
                            argMeta.type,
                            exprCtx
                          )}
                          onChange={(newVal) => {
                            setNewTemplate(key, argMeta.type, newVal);
                          }}
                          fields={argMeta.fields(
                            sourceSchemaData,
                            getSelectedTable(value, opMeta, exprCtx)
                          )}
                        />
                      );
                    case "json-schema":
                      return (
                        <JsonWithSchemaEditor
                          key={opMeta.name + key}
                          value={getStringTemplateVal(
                            value,
                            key,
                            argMeta.type,
                            exprCtx
                          )}
                          onChange={(newVal, bindings) =>
                            setNewTemplate(key, argMeta.type, newVal, bindings)
                          }
                          fields={argMeta.fields(
                            sourceSchemaData,
                            getSelectedTable(value, opMeta, exprCtx),
                            value
                          )}
                          data={data}
                          schema={schema}
                          bindings={{ ...getTemplateBindings(key) }}
                          partial={argMeta.partial}
                          requiredFields={getArgMetaRequiredFields(argMeta)}
                          showInputToggle={!argMeta.hideInputToggle}
                          showAsIndentedRow={argMeta.showAsIndentedRow}
                          exprCtx={exprCtx}
                          data-plasmic-prop={key}
                        />
                      );
                    case "json-schema[]":
                      return (
                        <JsonArrayWithSchemaEditor
                          key={opMeta.name + key}
                          value={getStringTemplateVal(
                            value,
                            key,
                            argMeta.type,
                            exprCtx
                          )}
                          onChange={(newVal, bindings) =>
                            setNewTemplate(key, argMeta.type, newVal, bindings)
                          }
                          fields={argMeta.fields(
                            sourceSchemaData,
                            getSelectedTable(value, opMeta, exprCtx),
                            value
                          )}
                          data={data}
                          schema={schema}
                          bindings={{ ...getTemplateBindings(key) }}
                          partial={argMeta.partial}
                          requiredFields={getArgMetaRequiredFields(argMeta)}
                          exprCtx={exprCtx}
                          {...argMeta.renderProps?.(ensure(source, ""))}
                        />
                      );
                    case "filter[]":
                      return (
                        <FilterPropEditor
                          key={`${getSelectedTable(
                            value,
                            opMeta,
                            exprCtx
                          )}-${key}`}
                          data={data}
                          schema={schema}
                          source={ensure(
                            source?.source,
                            "Source must be defined to filter fields"
                          )}
                          value={getStringTemplateVal(
                            value,
                            key,
                            argMeta.type,
                            exprCtx
                          )}
                          exprCtx={exprCtx}
                          // Creating a new object here so that we don't reference the model with this value
                          bindings={{ ...getTemplateBindings(key) }}
                          fields={argMeta.fields(
                            sourceSchemaData,
                            getSelectedTable(value, opMeta, exprCtx)
                          )}
                          onChange={(newVal, bindings) =>
                            setNewTemplate(key, argMeta.type, newVal, bindings)
                          }
                        />
                      );

                    case "dict-string":
                      return (
                        <StringDictPropEditor
                          data={data}
                          schema={schema}
                          value={getStringTemplateVal(
                            value,
                            key,
                            argMeta.type,
                            exprCtx
                          )}
                          exprCtx={exprCtx}
                          bindings={{ ...getTemplateBindings(key) }}
                          onChange={(newVal, bindings) =>
                            setNewTemplate(key, argMeta.type, newVal, bindings)
                          }
                          data-plasmic-prop={`data-source-modal-${key}`}
                        />
                      );
                    case "http-body":
                      return (
                        <HttpBodyEditor
                          data={data}
                          schema={schema}
                          value={getTemplateVal(value, key)}
                          exprCtx={exprCtx}
                          bindings={{ ...getTemplateBindings(key) }}
                          onChange={(newVal, bindings) =>
                            setNewTemplate(key, argMeta.type, newVal, bindings)
                          }
                          data-plasmic-prop={`data-source-modal-${key}`}
                        />
                      );
                    case "graphql-query":
                      return (
                        <GraphqlQueryField
                          sourceId={sourceId}
                          exprCtx={exprCtx}
                          onClickReference={() => setTabKey("schema")}
                          value={ensureString(
                            getStringTemplateVal(
                              value,
                              key,
                              "graphql-query",
                              exprCtx
                            ) ?? ""
                          )}
                          onChange={(query, extraState) => {
                            setNewTemplate(key, argMeta.type, query);
                            onChange((oldVal) => ({
                              ...oldVal,
                              extraState,
                            }));
                          }}
                        />
                      );
                    case "string":
                    case "string[]": // TODO string[] should probably have more specialized UI!
                    case "boolean": // TODO These next ones should have more specialized UI! But are not currently used in production data sources
                    case "number":
                    case "dict":
                    case "dict[]":
                    case "enum": // TODO Should have more specialized UI! But not used in production at all.
                    case "plasmic-cms-id": // TODO These next ones not used in production
                    case "plasmic-cms-token":
                      return (
                        <TemplatedTextEditorWithMenuIndicator
                          value={getTemplatedStringVal(key)}
                          data={data}
                          schema={schema}
                          onChange={(newVal) =>
                            setNewTemplate(key, argMeta.type, newVal)
                          }
                          disabled={isDisabled}
                          exprCtx={exprCtx}
                          readOnly={readOnly}
                          sql={argMeta.isSql}
                          {...(argMeta.isSql
                            ? {
                                dataSourceSchema: sourceSchemaData,
                              }
                            : {})}
                          {...argMeta.renderProps?.(source!)}
                          data-plasmic-prop={`data-source-modal-${key}`}
                        />
                      );
                    // These never appear in the main UI, only in the auth setup.
                    case "base":
                    case "oauth2":
                      throw new Error();
                  }
                };

                return (
                  <LabeledItemRow
                    label={argLabel}
                    key={key}
                    data-test-id={`data-source-draft-${key}`}
                    layout={argMeta.layout}
                  >
                    {/* TODO: Use real editors */}
                    {renderProp()}
                  </LabeledItemRow>
                );
              })}
          {!isRowSelector &&
            !userPropsMode &&
            !hideCacheKey &&
            renderMaybeCollapsibleRows([
              {
                collapsible: !cacheKey,
                content: opMeta && opMeta.type === "read" && (
                  <LabeledItemRow
                    label={"Query group"}
                    key={"cacheKey"}
                    tooltip={`Assign this query to a query group. Then from interactions, you can refresh entire query groups.`}
                  >
                    <TemplatedTextEditorWithMenuIndicator
                      value={cacheKey}
                      data={data}
                      schema={schema}
                      onChange={(newVal) =>
                        onChange({ ...value, cacheKey: newVal })
                      }
                      disabled={isDisabled}
                      exprCtx={exprCtx}
                      readOnly={readOnly}
                    />
                  </LabeledItemRow>
                ),
              },
              {
                collapsible: !queryInvalidation?.invalidationQueries,
                content: opMeta && opMeta.type === "write" && (
                  <InvalidationEditor
                    key={sourceMeta.id + opMeta.name}
                    value={queryInvalidation}
                    onChange={(newVal) =>
                      onChange({ ...value, queryInvalidation: newVal })
                    }
                    data={data}
                    schema={schema}
                    disabled={isDisabled}
                    component={exprCtx.component}
                  />
                ),
              },
              ...(roles.length > 0
                ? [
                    {
                      collapsible: !studioCtx.site.defaultPageRoleId,
                      content: (
                        <LabeledItemRow
                          label="Min Role"
                          tooltip="Require the user to be in a certain role or higher"
                        >
                          <StyleSelect
                            aria-label="Select a role"
                            placeholder="Select a role"
                            value={selectedRole ?? "anon"}
                            onChange={(newId) => {
                              if (newId === "anon") {
                                onChange({
                                  ...value,
                                  roleId: null,
                                });
                              } else {
                                onChange({
                                  ...value,
                                  roleId: newId,
                                });
                              }
                            }}
                          >
                            {roles.map((role) => (
                              <StyleSelect.Option
                                value={role.order === 0 ? "anon" : role.id}
                                key={role.id}
                              >
                                {role.name}
                              </StyleSelect.Option>
                            ))}
                          </StyleSelect>
                        </LabeledItemRow>
                      ),
                    },
                  ]
                : []),
            ])}
        </>
      )}
      {(schemaError || sourceError) && (
        <div className="pt-m light-error flex flex-col">
          <div>
            We're sorry, but we were unable to connect with your integration at
            this time.
            <br />
            Please check your connection and credentials and try again later.
          </div>
        </div>
      )}
    </div>
  );
}

function _DataSourceOpDraftPreview(props: {
  value?: DataSourceOpDraftValue | DataSourceOpExpr;
  env?: Record<string, any>;
  tableSchema?: TableSchema;
  exprCtx: ExprCtx;
  opType: "read" | "write" | undefined;
  projectId: string;
}) {
  const { value, env, opType, tableSchema, exprCtx, projectId } = props;

  const api = useApi();
  const { sourceId, opName, templates, roleId } = value ?? {};

  const draftOpExpr = useAsyncStrict(async () => {
    if (isKnownDataSourceOpExpr(value)) {
      return value;
    }
    return getDataSourceExprFromDraft({
      sourceId,
      opName,
      templates: value?.templates,
      roleId,
      api,
      exprCtx,
      projectId,
    });
  }, [sourceId, opName, templates, roleId, api]);

  const draftOpExprValue = draftOpExpr.value;

  return (
    <DataSourceOpDataPreview
      expr={draftOpExprValue}
      env={env}
      opType={opType}
      tableSchema={tableSchema}
      exprCtx={exprCtx}
    />
  );
}

export const DataSourceOpDraftPreview = React.memo(_DataSourceOpDraftPreview);

function simplifyName(x: string) {
  return x.replace(/[\W]+/g, "").toLowerCase();
}

export const rankedFieldsForTableCols = [
  "id",
  "slug",
  "name",
  "title",
  "email",
  "username",
  "handle",
  "displayname",
  "firstname",
  "lastname",
  "label",
  "description",
  "created",
  "updated",
];

export function getFieldRank(field: string, rankedFieldNames: string[]) {
  const rank = rankedFieldNames.indexOf(field);
  if (rank >= 0) {
    return rank;
  }
  const secondRank = rankedFieldNames.findIndex(
    (name) => name !== "id" && field.search(new RegExp(name))
  );
  if (secondRank >= 0) {
    return secondRank + rankedFieldNames.length;
  }
  return Infinity;
}

export function orderFieldsByRanking(
  fields: TableFieldSchema[],
  rankedFieldNames: string[],
  excludeOthers = false
) {
  if (excludeOthers) {
    fields = fields.filter((f) => rankedFieldNames.includes(f.id));
  }
  return sortBy(fields, (f) =>
    getFieldRank(simplifyName(f.label ?? f.id), rankedFieldNames)
  );
}

type DataSourceOpResults = ReturnType<typeof useDataSourceOpData>;

type PreviewTabKey = "data" | "schema" | "response";

function DataSourceOpDataPreview(props: {
  expr?: DataSourceOpExpr;
  env?: Record<string, any>;
  tableSchema?: TableSchema;
  opType: "read" | "write" | undefined;
  exprCtx: ExprCtx;
}) {
  const { expr, env, opType, tableSchema, exprCtx } = props;
  const isReadOp = opType === "read";

  const dataOpResults = useDataSourceOpData(
    isReadOp ? expr : undefined,
    env,
    exprCtx
  );
  const [mutateOpResults, setMutateOpResults] = React.useState<
    DataSourceOpResults | undefined
  >(undefined);

  const opResults = isReadOp ? dataOpResults : mutateOpResults;

  const studioCtx = useStudioCtx();
  const { executeQueue, setExecuteQueue } = useDataOpExecuteQueue();

  const [schemaReference, setSchemaReference] = React.useState<
    TableFieldSchema[] | undefined
  >(undefined);
  const [expandLevel, setExpandLevel] = React.useState(3);

  function convertResultsToRenderable(results: DataSourceOpResults) {
    return results && isArray(results.data)
      ? results.data.map((result) =>
          Object.entries(result).reduce((mappedObject, [key, val]) => {
            mappedObject[key] = ["object", "boolean"].includes(typeof val)
              ? JSON.stringify(val)
              : val;
            return mappedObject;
          }, {})
        )
      : results?.data;
  }

  const renderableResults = convertResultsToRenderable(opResults);

  const {
    isRowSelector,
    selectedRowKey,
    onRowSelected,
    rowKey,
    tabKey,
    setTabKey,
    hideDataTab: alwaysHideDataTab,
    preferredTab,
  } = useDataSourceOpPickerContext();

  const hideDataTab =
    alwaysHideDataTab ||
    !!(
      opResults &&
      (!renderableResults ||
        !opResults.schema ||
        !Array.isArray(renderableResults))
    );

  const popExecuteQueue = React.useCallback(async () => {
    if (executeQueue.length > 0) {
      const [nextOp, ...rest] = executeQueue;
      const { opExpr, source } = nextOp;
      try {
        const result = await executeDataSourceOp(opExpr, env, exprCtx, {
          userAuthToken: studioCtx.currentAppUserCtx.fakeAuthToken,
          user: studioCtx.currentAppUser,
        });
        setMutateOpResults(result);
      } catch (err) {
        const sourceMeta = source && getDataSourceMeta(source.source);
        notification.error({
          message: `Operation "${
            sourceMeta?.ops.find((op) => op.name === opExpr.opName)?.label ??
            opExpr.opName
          }" failed`,
          description: err.message,
        });
      }
      setExecuteQueue(rest);
    }
  }, [executeQueue, setExecuteQueue]);

  React.useEffect(() => {
    spawn(popExecuteQueue());
  }, [executeQueue, setExecuteQueue]);

  React.useEffect(() => {
    if (isReadOp) {
      if (dataOpResults?.schema?.fields) {
        setSchemaReference(dataOpResults.schema.fields);
      }
      if (preferredTab) {
        setTabKey(preferredTab);
      } else if (hideDataTab && tabKey === "data") {
        setTabKey("response");
      } else if (!hideDataTab && tabKey === "response") {
        setTabKey("data");
      }
    } else {
      if (mutateOpResults) {
        if (hideDataTab) {
          setTabKey(preferredTab ?? "response");
        } else {
          setTabKey(preferredTab ?? "data");
        }
      } else if (tableSchema) {
        setTabKey(preferredTab ?? "schema");
        setSchemaReference(
          tableSchema.fields.map((f) => ({ ...f, id: f.label || f.id }))
        );
      }
    }
  }, [dataOpResults, hideDataTab, isReadOp, tableSchema, mutateOpResults]);

  const extraContent = React.useMemo(() => {
    if (tabKey !== "response") {
      return null;
    }
    return (
      <div className="flex-row fill-height mr-m flex-vcenter">
        <a onClick={() => setExpandLevel(50)}>Expand All</a>
      </div>
    );
  }, [tabKey]);

  const rowKeys = rowKey ? ensureArray(rowKey) : ["id"];

  const { schemaTunnel } = useContext(DataSourceDraftContext);

  return (
    <div
      id="data-source-modal-preview-section"
      className={cx(
        "fill-width fill-height overflow-hidden ph-lg",
        styles.container
      )}
    >
      {(opResults || schemaReference) && (
        <Tabs
          tabKey={tabKey}
          onSwitch={(newKey) => setTabKey(newKey)}
          className="fill-height"
          tabBarClassName="hilite-tabs justify-between"
          tabClassName="hilite-tab"
          activeTabClassName="hilite-tab--active"
          tabBarExtraContent={extraContent}
          tabs={withoutFalsy([
            !hideDataTab &&
              opResults &&
              new Tab({
                name: "Data",
                key: "data",
                contents: () => (
                  <VerticalFillTable
                    className="data-table"
                    pagination={{
                      position: ["bottomLeft"],
                      hideOnSinglePage: true,
                      pageSizeOptions: [10, 20, 50, 100, 500, 1000],
                    }}
                    rowKey={(record) =>
                      rowKeys.map((iRowKey) => record[iRowKey]).join("#")
                    }
                    columns={orderFieldsByRanking(
                      opResults.schema!.fields,
                      rankedFieldsForTableCols
                    ).map((field) => ({
                      title: field.label || field.id,
                      dataIndex: field.id,
                      key: field.id,
                    }))}
                    dataSource={renderableResults}
                    scroll={{
                      x: "max-content",
                    }}
                    rowSelection={
                      isRowSelector
                        ? {
                            selectedRowKeys: ensureArray(selectedRowKey),
                            type: "radio",
                            renderCell: (_a, row, _c) => (
                              <Button
                                onClick={() => onRowSelected?.(row)}
                                type={"clearPrimary"}
                              >
                                View
                              </Button>
                            ),
                          }
                        : undefined
                    }
                  />
                ),
              }),
            !isRowSelector &&
              new Tab({
                name: "Schema Reference",
                key: "schema",
                contents: () =>
                  schemaReference ? (
                    <VerticalFillTable
                      rowKey={"id"}
                      columns={[
                        {
                          title: "Field Name",
                          dataIndex: "id",
                          key: "name",
                        },
                        {
                          title: "Type",
                          dataIndex: "type",
                          key: "type",
                        },
                      ]}
                      dataSource={schemaReference}
                      pagination={{
                        position: ["bottomLeft"],
                        hideOnSinglePage: true,
                      }}
                    />
                  ) : (
                    schemaTunnel && <schemaTunnel.Out />
                  ),
              }),
            opResults &&
              !isRowSelector &&
              new Tab({
                name: "Response",
                key: "response",
                contents: () => (
                  <React.Suspense>
                    <LazyCodePreview
                      value={JSON.stringify({
                        ...opResults,
                        ...(opResults.error instanceof Error // eslint-disable-line
                          ? {
                              error: {
                                ...opResults.error,
                                // `JSON.stringify` removes error message, so we
                                // force add it here
                                name: opResults.error.name,
                                message: opResults.error.message,
                              },
                            }
                          : {}),
                      })}
                      data={{}}
                      className="code-preview-inner"
                      opts={{
                        expandLevel: expandLevel,
                      }}
                    />
                  </React.Suspense>
                ),
              }),
          ])}
        />
      )}
    </div>
  );
}

export function DataSourcePickerButton(props: {
  sourceId: string | undefined;
  sourceType?: DataSourceType;
  onChange: (sourceId: string | undefined) => void;
  disabled?: boolean;
  readOpsOnly?: boolean;
}) {
  const { sourceId, readOpsOnly, onChange, sourceType, disabled } = props;
  const topFrameApi = useTopFrameApi();
  const { data: source } = useDataSource(sourceId);
  return (
    <Button
      className="fill-width"
      id="data-source-modal-pick-integration-btn"
      disabled={disabled}
      onClick={async () => {
        const result = await topFrameApi.pickDataSource({
          existingSourceId: sourceId,
          sourceType,
          readOpsOnly,
        });
        if (result && result !== "CANCELED") {
          onChange(result.sourceId);
        }
      }}
    >
      {!sourceId
        ? `Pick an ${DATA_SOURCE_LOWER}`
        : !source
        ? "Loading..."
        : source.name}
    </Button>
  );
}

export const FilterPropEditor = (props: {
  value?: Record<string, any>;
  source: DataSourceType;
  fields: Fields;
  data: Record<string, any> | undefined;
  schema?: DataPickerTypesSchema;
  bindings?: Record<string, TemplatedString | CustomCode | ObjectPath>;
  onChange: (
    value: any,
    binds: Record<string, TemplatedString | CustomCode | ObjectPath>
  ) => void;
  exprCtx: ExprCtx;
}) => {
  const {
    value,
    source,
    fields,
    data,
    schema,
    bindings = {},
    onChange,
    exprCtx,
  } = props;

  return fields && Object.keys(fields).length ? (
    <DataSourceQueryBuilder
      data={data}
      schema={schema}
      bindings={bindings}
      logic={value?.logic}
      tree={value?.tree}
      saveTree={(newVal, binds) => onChange(newVal, binds)}
      fields={fields}
      dataSourceConfig={getDataSourceQueryBuilderConfig(source)}
      exprCtx={exprCtx}
    />
  ) : null;
};

const PaginationEditor = observer(function PaginationEditor({
  onChange,
  bindings,
  value,
  data,
  schema,
  disabled,
  readOnly,
  exprCtx,
}: {
  value?: { pageIndex?: string; pageSize?: string };
  bindings?: {
    [key: string]: ObjectPath | CustomCode | TemplatedString;
  };
  onChange: (
    value: any,
    binds: Record<string, ObjectPath | CustomCode | TemplatedString>
  ) => void;
  data?: Record<string, any>;
  schema?: DataPickerTypesSchema;
  readOnly?: boolean;
  disabled?: boolean;
  exprCtx: ExprCtx;
}) {
  const pageSize =
    (value?.pageSize && bindings && bindings[value.pageSize]) || undefined;
  const pageIndex =
    (value?.pageIndex && bindings && bindings[value.pageIndex]) || undefined;
  const fixBindingsAndChange = (
    newValue: { pageIndex?: string; pageSize?: string },
    newBindings: { [key: string]: ObjectPath | CustomCode | TemplatedString }
  ) => {
    [...Object.keys(newBindings)].forEach((key) => {
      if (newValue.pageSize !== key && newValue.pageIndex !== key) {
        delete newBindings[key];
      }
    });
    onChange(newValue, newBindings);
  };
  const changeVal = (
    prop: "pageSize" | "pageIndex",
    templatedStr: TemplatedString
  ) => {
    if (templatedStr.text.length === 1 && templatedStr.text[0] === "") {
      const newBindings = bindings ? { ...bindings } : {};
      const newValue = value ? { ...value } : {};
      newValue[prop] = undefined;
      fixBindingsAndChange(newValue, newBindings);
      return;
    }
    const newBindings = bindings ? { ...bindings } : {};
    const bind = mkBindingId();
    newBindings[bind] = templatedStr;
    const newValue = value ? { ...value } : {};
    newValue[prop] = bind;
    newBindings[bind] = templatedStr;
    fixBindingsAndChange(newValue, newBindings);
  };
  return (
    <div className={"flex-row fill-width"}>
      <TemplatedTextEditorWithMenuIndicator
        value={pageSize ? ensureKnownTemplatedString(pageSize) : undefined}
        placeholder="Items per page"
        data={data}
        schema={schema}
        onChange={(newVal) => changeVal("pageSize", newVal)}
        disabled={disabled}
        exprCtx={exprCtx}
        readOnly={readOnly}
        data-plasmic-prop={"data-source-pagination-size"}
      />
      <div className="flex-row fill-width ml-m">
        <TemplatedTextEditorWithMenuIndicator
          value={pageIndex ? ensureKnownTemplatedString(pageIndex) : undefined}
          placeholder="Page number (starts from 0)"
          data={data}
          onChange={(newVal) => changeVal("pageIndex", newVal)}
          exprCtx={exprCtx}
          disabled={disabled}
          readOnly={readOnly}
          data-plasmic-prop={"data-source-pagination-offset"}
        />
      </div>
    </div>
  );
});

export const SortEditor = observer(function SortEditor({
  fields,
  onChange,
  value,
}: {
  value?: CrudSorting;
  onChange: (value: CrudSorting) => void;
  fields: Fields;
}) {
  // TODO: Support sorting by multiple fields (mostly UI)
  const singleValue = value?.[0];
  const isAscending = singleValue?.order !== "desc";
  // Required to avoid StyleSelect from running invalid DOM queries like:
  // .querySelector(`[data-key]=""blah""`)
  const sanitizeFieldId = (fieldId: string) => fieldId.replace(/"/g, "");
  return (
    <div className={"flex-row flex-fill justify-between"}>
      <StyleSelect
        aria-label="Sort by"
        value={maybe(singleValue?.field, (f) => sanitizeFieldId(f))}
        onChange={(v) =>
          onChange(
            v
              ? [
                  {
                    field: ensure(
                      Object.keys(fields).find(
                        (fieldId) => sanitizeFieldId(fieldId) === v
                      ),
                      () => `Failed to find field ${v}`
                    ),
                    order: isAscending ? "asc" : "desc",
                  },
                ]
              : []
          )
        }
        placeholder="Select a field"
        valueSetState={singleValue ? "isSet" : "isUnset"}
        data-plasmic-prop={"data-source-sort"}
      >
        {
          <StyleSelect.Option value="" key="">
            (Unset)
          </StyleSelect.Option>
        }
        {Object.entries(fields).map(([fieldId, field]) => (
          <StyleSelect.Option value={sanitizeFieldId(fieldId)} key={fieldId}>
            {field.label || fieldId}
          </StyleSelect.Option>
        ))}
      </StyleSelect>
      <Switch
        isDisabled={!singleValue}
        isChecked={isAscending}
        onChange={(v) =>
          singleValue &&
          onChange([{ ...singleValue, order: v ? "asc" : "desc" }])
        }
        children="Ascending?"
        className="ml-m"
      />
    </div>
  );
});

const configWidgets = QueryBuilderConfig.widgets;

export function clearUnusedBindings(
  bindings: React.MutableRefObject<
    Record<string, ObjectPath | CustomCode | TemplatedString>
  >,
  newValStr: string
) {
  const keys = [...Object.keys(bindings.current)];
  for (const key of keys) {
    if (!newValStr.includes(key)) {
      delete bindings.current[key];
    }
  }
}

export function mkBindingId() {
  return `{{${randUint16().toString()}}}`;
}

const StringDictPropEditor = observer(function StringDictPropEditor({
  onChange,
  value,
  bindings: defaultBindings,
  data,
  schema,
  exprCtx,
  "data-plasmic-prop": dataPlasmicProp,
}: {
  value?: Record<string, any>;
  onChange: (
    value: any,
    bindings: Record<string, ObjectPath | CustomCode | TemplatedString>
  ) => void;
  data: Record<string, any> | undefined;
  schema?: DataPickerTypesSchema;
  bindings: Record<string, ObjectPath | CustomCode | TemplatedString>;
  exprCtx: ExprCtx;
  "data-plasmic-prop"?: string;
}) {
  const bindings = React.useRef({ ...defaultBindings });

  const [currentValues, setCurrentValues] = React.useState(
    value !== undefined && Object.keys(value).length > 0
      ? Object.entries(value).map(([k, v]) => ({
          key: k,
          value: v,
        }))
      : [{ key: "", value: "" }]
  );

  const getUsedBindings = (newValStr: string) => {
    const usedBindings = {};
    for (const key in bindings.current) {
      if (newValStr.includes(key)) {
        usedBindings[key] = bindings.current[key];
      }
    }
    return usedBindings;
  };

  const handleChange = (idx: number, newVal: { key: string; value: any }) => {
    const newCurrentValues = [...currentValues];
    newCurrentValues[idx] = newVal;
    const newObject = currentValues.reduce((acc, cur, curIdx) => {
      const [curKey, curValue] =
        curIdx === idx ? [newVal.key, newVal.value] : [cur.key, cur.value];
      if (curKey && curValue) {
        acc[curKey] = curValue;
      }
      return acc;
    }, {}) as Record<string, any>;

    setCurrentValues(newCurrentValues);
    onChange(newObject, getUsedBindings(JSON.stringify(newObject)));
  };

  return (
    <div className="flex-col gap-xsm fill-width flex-align-start">
      {currentValues.map(({ key: fieldName, value: fieldValue }, idx) => {
        return (
          <div key={idx} className="flex-row gap-xsm rel fill-width">
            <Input
              className={styles.stringDictKeyInput}
              name="key"
              value={fieldName}
              onChange={(event) => {
                const newVal = event.target.value;
                handleChange(idx, { key: newVal, value: fieldValue });
              }}
              placeholder="Name"
              data-plasmic-prop={`${dataPlasmicProp}-key`}
            />
            {(() => {
              const setValue = (newVal: string | undefined) => {
                handleChange(idx, { key: fieldName, value: newVal });
              };
              return (
                <TemplatedTextWidget
                  key={`${fieldName}-${idx}-input`}
                  data={data}
                  schema={schema}
                  exprCtx={exprCtx}
                  bindings={{ ...defaultBindings, ...bindings.current }}
                  setValue={(expr) => {
                    const binding = mkBindingId();
                    bindings.current = {
                      ...defaultBindings,
                      ...bindings.current,
                      [binding]: ensureKnownTemplatedString(expr),
                    };
                    if (
                      isKnownTemplatedString(expr) &&
                      arrayEq(expr.text, [""])
                    ) {
                      setValue(undefined);
                    } else {
                      setValue(binding);
                    }
                  }}
                  value={fieldValue}
                  placeholder={"Value"}
                  data-plasmic-prop={`${dataPlasmicProp}-value`}
                />
              );
            })()}
            {currentValues.length > 1 && (
              <TrashIcon
                className={styles.trashIcon}
                onClick={() => {
                  handleChange(idx, { key: fieldName, value: undefined });
                  setCurrentValues(currentValues.filter((_, i) => i !== idx));
                }}
              />
            )}
          </div>
        );
      })}
      <div
        style={{ color: "blue" }}
        onClick={() => {
          setCurrentValues([...currentValues, { key: "", value: "" }]);
        }}
      >
        <PlusIcon /> Add new
      </div>
    </div>
  );
});

const INPUT_TOGGLE_OPTIONS = [
  {
    value: "editor",
    label: "Specify individual fields",
    tooltip:
      "Specify separately the fields and values you want to update in a simple structured editor.",
  },
  {
    value: "code",
    label: "Specify whole bundle",
    tooltip:
      "Specify a single JSON object of the fields and values to update. Useful for forms and for more custom/advanced control.",
  },
];

export const JsonWithSchemaEditor = observer(function JsonWithSchemaEditor({
  fields,
  onChange,
  value,
  bindings: defaultBindings,
  data,
  schema,
  showInputToggle,
  showAsIndentedRow,
  hideLabel,
  hideDefinedIndicator,
  exprCtx,
  "data-plasmic-prop": dataPlasmicProp,
}: {
  value?: Record<string, any> | string;
  onChange: (
    value: any,
    binds: Record<string, ObjectPath | CustomCode | TemplatedString>
  ) => void;
  fields: Fields;
  data: Record<string, any> | undefined;
  schema?: DataPickerTypesSchema;
  bindings: Record<string, ObjectPath | CustomCode | TemplatedString>;
  partial?: boolean;
  requiredFields?: string[];
  showInputToggle?: boolean;
  showAsIndentedRow?: boolean;
  hideLabel?: boolean;
  hideDefinedIndicator?: boolean;
  exprCtx: ExprCtx;
  "data-plasmic-prop"?: string;
}) {
  const bindings = React.useRef({ ...defaultBindings });

  const [defaultOpenDataPicker, setDefaultOpenDataPicker] =
    React.useState<string>();

  const inputType = typeof value === "string" ? "code" : "editor";

  const handleChange = (newVal: {} | string, usedType: "editor" | "code") => {
    if (usedType === "code") {
      assert(
        typeof newVal === "string",
        () => `Expected newVal to be a string`
      );
      assert(
        bindings.current[newVal],
        () => `No corresponding binding for: ${newVal}`
      );
      bindings.current = {
        [newVal]: bindings.current[newVal],
      };
    } else {
      clearUnusedBindings(bindings, JSON.stringify(newVal));
    }
    onChange(newVal, bindings.current);
  };

  const handleCodeChange = (expr: CustomCode | ObjectPath) => {
    const binding = mkBindingId();
    bindings.current = {
      [binding]: ensureInstance(expr, CustomCode, ObjectPath),
    };
    handleChange(binding, "code");
  };

  const isStringType = (type: string) => {
    return type === "string" || type === "datetime";
  };

  const wrapListContent = (label: string, children: React.ReactNode) =>
    showAsIndentedRow ? (
      <IndentedRow label={label}>{children}</IndentedRow>
    ) : !hideLabel ? (
      <LabeledItemRow label={label} className="max-full-width">
        {children}
      </LabeledItemRow>
    ) : (
      children
    );

  return (
    <MaybeWrap
      cond={!!showInputToggle}
      wrapper={(children) => (
        <InputToggleWrapper
          value={inputType}
          options={INPUT_TOGGLE_OPTIONS}
          onChange={(val) => {
            if (val === "code") {
              handleCodeChange(mkUndefinedObjectPath());
            } else if (val === "editor") {
              handleChange({}, val);
            }
          }}
        >
          {children}
        </InputToggleWrapper>
      )}
    >
      {typeof value !== "string" && inputType === "editor" ? (
        <ListBox>
          {[...Object.entries(fields)].map(([fieldName, field], idx) => {
            const val = value?.[fieldName] ?? undefined;
            const fieldSettings = field.fieldSettings ?? {};
            const fieldType = field.type === "enum" ? "select" : field.type;
            const setValue = (
              newVal: string | number | boolean | undefined
            ) => {
              if (newVal == null) {
                handleChange(omit(value ?? {}, fieldName), "editor");
              } else {
                handleChange(
                  { ...(value ?? {}), [fieldName]: newVal },
                  "editor"
                );
              }
            };
            const setExprValue = (newVal: any) => {
              // `newVal` can either be a scalar value or an Expr.
              // In the former case, we just set it. In the latter,
              // we use it as a binding.
              if (!isKnownExpr(newVal)) {
                // Once we have two curly braces, we assume it's a binding
                // and open the data picker
                if (newVal === "{{") {
                  setValue("{{}}");
                  setDefaultOpenDataPicker(fieldName);
                  return;
                }
                setValue(newVal);
                return;
              }

              const binding = mkBindingId();
              bindings.current = {
                ...defaultBindings,
                ...bindings.current,
                [binding]: ensureInstance(
                  newVal,
                  CustomCode,
                  ObjectPath,
                  TemplatedString
                ),
              };
              setValue(binding);
            };
            const menu = () => {
              const builder = new MenuBuilder();
              if (val != null) {
                builder.genSection(undefined, (push) => {
                  push(
                    <Menu.Item
                      key="unset"
                      onClick={() => {
                        setValue(undefined);
                      }}
                    >
                      <strong>Unset</strong> {field.label ?? fieldName}
                    </Menu.Item>
                  );
                });
              }
              builder.genSection(undefined, (push) => {
                push(
                  <Menu.Item
                    key="set-null"
                    onClick={() => {
                      setExprValue(createExprForDataPickerValue("null"));
                    }}
                  >
                    <strong>Set</strong> {field.label ?? fieldName} to{" "}
                    <code>null</code>
                  </Menu.Item>
                );
              });
              return builder.build({
                menuName: `field-${fieldName}-menu`,
              });
            };
            return (
              <WithContextMenu overlay={menu}>
                <div className="flex-row fill-width flex-vcenter">
                  {!hideDefinedIndicator && (
                    <div className={styles.blueIndicatorContainer}>
                      {value && fieldName in value && (
                        <div className={styles.blueIndicator} />
                      )}
                    </div>
                  )}
                  <div className="flex-col fill-width">
                    <ListBoxItem
                      menu={menu}
                      truncate={false}
                      mainContent={wrapListContent(
                        field.label ?? fieldName,
                        (() => {
                          const allBindings = {
                            ...defaultBindings,
                            ...bindings.current,
                          };
                          if (
                            isKnownTemplatedString(allBindings[val]) ||
                            (fieldType === "string" &&
                              (!val || !allBindings?.[val]))
                          ) {
                            return (
                              <TemplatedTextWidget
                                data={data}
                                schema={schema}
                                bindings={{ ...allBindings }}
                                setValue={setExprValue}
                                value={val}
                                exprCtx={exprCtx}
                                data-plasmic-prop={`data-source-modal-${
                                  (dataPlasmicProp
                                    ? `${dataPlasmicProp}-`
                                    : "") + fieldName
                                }-json-editor`}
                              />
                            );
                          } else if (isString(val) && isDynamicValue(val)) {
                            return (
                              <DynamicValueWidget
                                value={
                                  allBindings[val] ?? mkUndefinedObjectPath()
                                }
                                setValue={setExprValue}
                                data={data}
                                schema={schema}
                                defaultOpenDataPicker={
                                  defaultOpenDataPicker === fieldName
                                }
                                exprCtx={exprCtx}
                              />
                            );
                          } else if (fieldType === "json") {
                            return (
                              <DataPickerEditor
                                value={extractValueSavedFromDataPicker(
                                  allBindings[val],
                                  exprCtx
                                )}
                                onChange={(v) => {
                                  const newVal =
                                    v != null
                                      ? createExprForDataPickerValue(v)
                                      : v;
                                  setExprValue(newVal);
                                }}
                                data={data}
                              />
                            );
                          } else {
                            return (
                              <ContextMenuIndicator
                                fullWidth
                                showDynamicValueButton
                                onIndicatorClickDefault={() => {
                                  setDefaultOpenDataPicker(fieldName);
                                  if (isStringType(fieldType)) {
                                    setExprValue(
                                      new TemplatedString({
                                        text: [mkUndefinedObjectPath()],
                                      })
                                    );
                                  } else {
                                    setExprValue(mkUndefinedObjectPath());
                                  }
                                }}
                                className="qb-custom-widget"
                              >
                                {configWidgets[fieldType].factory(
                                  {
                                    config: { ...QueryBuilderConfig },
                                    setValue: setExprValue,
                                    value: val,
                                    customProps: {
                                      "data-plasmic-prop": fieldName,
                                    },
                                    ...field.fieldSettings,
                                  } as any,
                                  QueryBuilderConfig.ctx
                                )}
                              </ContextMenuIndicator>
                            );
                          }
                        })()
                      )}
                      index={idx}
                      showDelete={false}
                      showGrip={false}
                      isDragDisabled={true}
                    />
                  </div>
                </div>
              </WithContextMenu>
            );
          })}
        </ListBox>
      ) : (
        <div className="flex-col fill-width">
          <DynamicValueWidget
            setValue={(expr) => expr && handleCodeChange(expr)}
            value={
              bindings.current[ensureString(value)] ??
              defaultBindings[ensureString(value)] ??
              mkUndefinedObjectPath()
            }
            data={data}
            schema={schema}
            deleteIcon={false}
            exprCtx={exprCtx}
          />
        </div>
      )}
    </MaybeWrap>
  );
});

const JsonArrayWithSchemaEditor = observer(function JsonArrayWithSchemaEditor({
  onChange,
  value: initValue,
  bindings: defaultBindings,
  data,
  schema,
  codeOnly: initialCodeOnly,
  expectedValues,
  ...rest
}: {
  value?: Record<string, any>[] | string;
  onChange: (
    value: any[] | string,
    binds: Record<string, ObjectPath | CustomCode | TemplatedString>
  ) => void;
  fields: Fields;
  data: Record<string, any> | undefined;
  schema?: DataPickerTypesSchema;
  bindings: Record<string, ObjectPath | CustomCode | TemplatedString>;
  partial?: boolean;
  requiredFields?: string[];
  codeOnly?: boolean;
  expectedValues?: string;
  exprCtx: ExprCtx;
}) {
  const value = initValue ?? (initialCodeOnly ? undefined : []);
  const bindings = React.useRef({ ...defaultBindings });
  const inputType = typeof value === "object" ? "editor" : "code";
  const codeOnly = React.useMemo(
    () => !!initialCodeOnly && inputType === "code",
    [initialCodeOnly, inputType]
  );

  const handleChange = (
    // eslint-disable-next-line @typescript-eslint/ban-types
    newVal: Object[] | string,
    usedType: "editor" | "code"
  ) => {
    if (usedType === "code") {
      assert(
        typeof newVal === "string",
        () => `Expected newVal to be a string`
      );
      assert(
        bindings.current[newVal],
        () => `No corresponding binding for: ${newVal}`
      );
      bindings.current = {
        [newVal]: bindings.current[newVal],
      };
    } else {
      clearUnusedBindings(bindings, JSON.stringify(newVal));
    }
    onChange(newVal, bindings.current);
  };

  const handleCodeChange = (expr: ObjectPath | CustomCode) => {
    const binding = mkBindingId();
    bindings.current = {
      [binding]: ensureInstance(expr, ObjectPath, CustomCode),
    };
    handleChange(binding, "code");
  };

  React.useEffect(() => {
    if (initValue == null && codeOnly) {
      handleCodeChange(mkUndefinedObjectPath());
    }
  }, [initValue, codeOnly]);

  return (
    <MaybeWrap
      cond={!codeOnly}
      wrapper={(children) => (
        <InputToggleWrapper
          value={inputType}
          options={INPUT_TOGGLE_OPTIONS}
          onChange={(val) => {
            if (val === "code") {
              handleCodeChange(mkUndefinedObjectPath());
            } else if (val === "editor") {
              handleChange([], "editor");
            }
          }}
        >
          {" "}
          {children}
        </InputToggleWrapper>
      )}
    >
      {typeof value === "object" ? (
        <div className="flex-col fill-width gap-lg">
          {value.map((v, i) => (
            <>
              {i !== 0 && <SectionSeparator></SectionSeparator>}
              <div className="flex-row fill-width gap-lg flex-vcenter">
                <TrashIcon
                  onClick={() =>
                    handleChange(removeAtIndexes([...value], [i]), "editor")
                  }
                  width={16}
                  height={16}
                />
                <JsonWithSchemaEditor
                  value={v}
                  bindings={{ ...defaultBindings, ...bindings.current }}
                  key={i}
                  onChange={(newVal, newBindings) => {
                    bindings.current = {
                      ...defaultBindings,
                      ...bindings.current,
                      ...newBindings,
                    };
                    const newVals = [...value];
                    newVals[i] = newVal;
                    handleChange(newVals, "editor");
                  }}
                  data={data}
                  schema={schema}
                  {...rest}
                />
              </div>
            </>
          ))}
          {Object.keys(rest.fields).length > 0 && (
            <FullRow className="flex-hcenter">
              <div
                className={"flex"}
                style={{ color: "blue" }}
                onClick={() => handleChange([...value, {}], "editor")}
              >
                <div className={"baseline-friendly-centered-block-container"}>
                  <PlusIcon />
                </div>{" "}
                Add row
              </div>
            </FullRow>
          )}
        </div>
      ) : (
        value && (
          <div className="flex-col fill-width">
            <DynamicValueWidget
              setValue={(expr) => expr && handleCodeChange(expr)}
              value={
                bindings.current[ensureString(value)] ??
                defaultBindings[ensureString(value)] ??
                mkUndefinedObjectPath()
              }
              data={data}
              schema={schema}
              deleteIcon={false}
              expectedValues={expectedValues}
              exprCtx={rest.exprCtx}
            />
          </div>
        )
      )}
    </MaybeWrap>
  );
});

function deserializeHttpBody(val?: TemplatedString | string) {
  if (isNil(val)) {
    return { value: undefined, encoding: "json" as const };
  } else if (isKnownTemplatedString(val)) {
    if (val.text[0] === "@binary") {
      return {
        value: new TemplatedString({ text: val.text.slice(1) }),
        encoding: "binary" as const,
      };
    } else {
      return { value: val, encoding: "raw" as const };
    }
  } else {
    const parsed = JSON.parse(val);
    if (typeof parsed === "string") {
      return {
        value: Object.fromEntries(new URLSearchParams(parsed)),
        encoding: "form" as const,
      };
    } else {
      return { value: parsed as object, encoding: "json" as const };
    }
  }
}

function serializeHttpBody(
  val: TemplatedString | object | undefined,
  encoding: HttpBodyEncodingType
): string | object | TemplatedString | undefined {
  if (isNil(val)) {
    return undefined;
  }
  if (encoding === "binary") {
    return new TemplatedString({
      text: ["@binary", ...ensureKnownTemplatedString(val).text],
    });
  } else if (encoding === "raw") {
    return ensureKnownTemplatedString(val);
  } else if (encoding === "form") {
    return new URLSearchParams(ensureString(val)).toString();
  } else if (encoding === "json") {
    // Note for json encoding, we need to return the object to be stringified
    // by setNewTemplate. So this is different from deserializeHttpBody, which
    // expects json encoding to be from a string value.
    return val;
  } else {
    unreachable(encoding);
  }
}

const HttpBodyEditor = observer(function HttpBodyEditor({
  onChange,
  value: defaultValue,
  data,
  schema,
  bindings: defaultBindings,
  exprCtx,
  "data-plasmic-prop": dataPlasmicProp,
}: {
  value?: TemplatedString | string;
  onChange: (
    value: any,
    binds?: Record<string, ObjectPath | CustomCode | TemplatedString>
  ) => void;
  data: Record<string, any> | undefined;
  schema?: DataPickerTypesSchema;
  bindings?: Record<string, ObjectPath | CustomCode | TemplatedString>;
  exprCtx: ExprCtx;
  "data-plasmic-prop"?: string;
}) {
  const { value, encoding: derivedEncodingType } =
    deserializeHttpBody(defaultValue);

  const [encodingType, setEncodingType] = React.useState(derivedEncodingType);
  const bindings = React.useRef({ ...defaultBindings });

  const handleChange = (
    newVal: TemplatedString | object | undefined,
    clearBindings: boolean,
    useEncode?: HttpBodyEncodingType
  ) => {
    const currentEncodingType = useEncode ?? encodingType;
    const encodedValue = serializeHttpBody(newVal, currentEncodingType);
    if (clearBindings) {
      bindings.current = {};
      onChange(encodedValue, undefined);
    } else {
      clearUnusedBindings(bindings, JSON.stringify(newVal));
      onChange(encodedValue, bindings.current);
    }
  };

  return (
    <InputToggleWrapper
      value={encodingType}
      options={[
        {
          value: "json",
          label: "Json",
          tooltip: "JSON Encoded",
        },
        {
          value: "form",
          label: "Form Encoded",
          tooltip: "Form URL Encoded",
        },
        {
          value: "raw",
          label: "Raw",
          tooltip: "Raw value",
        },
        {
          value: "binary",
          label: "Binary",
          tooltip: "Base64 Encoded Binary",
        },
      ]}
      onChange={(newEncoding_: string) => {
        const newEncoding = newEncoding_ as HttpBodyEncodingType;
        if (newEncoding === "json" && encodingType === "form") {
          handleChange(value, false, newEncoding);
        } else if (newEncoding === "form" && encodingType === "json") {
          handleChange(value, false, newEncoding);
        } else {
          handleChange(undefined, true);
        }
        setEncodingType(newEncoding);
      }}
      data-plasmic-prop={dataPlasmicProp}
    >
      {encodingType === "raw" || encodingType === "binary" ? (
        <TemplatedTextEditorWithMenuIndicator
          value={value ? ensureKnownTemplatedString(value) : undefined}
          data={data}
          schema={schema}
          exprCtx={exprCtx}
          onChange={(newVal) => handleChange(newVal, true)}
          multiLine={"always"}
          data-plasmic-prop={dataPlasmicProp}
        />
      ) : (
        <StringDictPropEditor
          value={
            typeof value === "string"
              ? Object.fromEntries(new URLSearchParams(value))
              : value
          }
          data={data}
          schema={schema}
          bindings={{ ...defaultBindings, ...bindings.current }}
          exprCtx={exprCtx}
          onChange={(newVal, newBindings) => {
            bindings.current = {
              ...defaultBindings,
              ...bindings.current,
              ...newBindings,
            };
            handleChange(newVal, false);
          }}
        />
      )}
    </InputToggleWrapper>
  );
});

const InputToggleWrapper = observer(function InputToggleWrapper({
  value,
  onChange,
  options,
  children,
  "data-plasmic-prop": dataPlasmicProp,
}: {
  value?: string;
  onChange: (value: string) => void;
  options: { value: string; label: string; tooltip?: string }[];
  children: React.ReactNode;
  "data-plasmic-prop"?: string;
}) {
  return (
    <div className="flex-col gap-sm flex-align-start fill-width">
      <StyleToggleButtonGroup
        value={value}
        onChange={(val) => onChange(val)}
        autoWidth
      >
        {options.map((op) => (
          <StyleToggleButton
            key={op.value}
            value={op.value}
            label={op.label}
            tooltip={op.tooltip}
            showLabel
            noIcon
            data-plasmic-prop={`${dataPlasmicProp}-${op.value}`}
          />
        ))}
      </StyleToggleButtonGroup>
      {children}
    </div>
  );
});

export const DataSourceOpValuePreview = observer(
  function DataSourceOpValuePreview(props: {
    title?: React.ReactNode;
    expr?: DataSourceOpExpr;
    env?: Record<string, any>;
    exprCtx: ExprCtx;
  }) {
    const { expr, env, title, exprCtx } = props;
    const opMeta = useSourceOp(expr?.sourceId, expr?.opName);
    const isPreviewable = opMeta.opMeta?.type === "read";
    const result = useDataSourceOpData(
      isPreviewable ? expr : undefined,
      env,
      exprCtx
    );
    const [showModal, setShowModal] = React.useState(false);
    if (!result) {
      return null;
    } else if (result.isLoading) {
      return <ValuePreview isLoading />;
    } else if (result.error) {
      return <ValuePreview err={result.error} />;
    } else if (result.data) {
      return (
        <>
          <ValuePreview
            val={result.data}
            onClick={() => {
              setShowModal(true);
            }}
          />
          {showModal && (
            <DataSourceOpPickerProvider>
              <DataSourceOpDataPreviewModal
                title={title}
                expr={expr}
                env={env}
                onClose={() => setShowModal(false)}
                opType={opMeta.opMeta?.type}
                exprCtx={exprCtx}
              />
            </DataSourceOpPickerProvider>
          )}
        </>
      );
    } else {
      return null;
    }
  }
);

function useDataSourceOpData(
  expr: DataSourceOpExpr | undefined,
  env: Record<string, any> | undefined,
  exprCtx: ExprCtx
) {
  const maybeEvalResult =
    (expr &&
      swallow(() => tryEvalExpr(asCode(expr, exprCtx).code, env ?? {}))) ||
    undefined;

  const dataResult = usePlasmicDataOp(maybeEvalResult?.val, {
    noUndefinedDataProxy: true,
  } as any);

  if (!maybeEvalResult) {
    return undefined;
  }
  if (maybeEvalResult.err) {
    return {
      error: maybeEvalResult.err,
    };
  }

  return dataResult;
}

export async function executeDataSourceOp(
  expr: DataSourceOpExpr | undefined,
  env: Record<string, any> | undefined,
  exprCtx: ExprCtx,
  opts: {
    userAuthToken?: string;
    user?: StudioAppUser;
  } = {}
) {
  const maybeEvalResult =
    (expr &&
      swallow(() => tryEvalExpr(asCode(expr, exprCtx).code, env ?? {}))) ||
    undefined;

  let result: Partial<SingleRowResult<any> | ManyRowsResult<any>> & {
    error?: any;
  };
  try {
    result = await executePlasmicDataOp(
      maybeEvalResult?.val ?? {},
      opts as Parameters<typeof executePlasmicDataOp>[1]
    );
  } catch (err) {
    result = { error: err };
  }

  return result;
}

export function DataSourceOpDataPreviewModal(props: {
  title?: React.ReactNode;
  expr?: DataSourceOpExpr;
  opType: "read" | "write" | undefined;
  env?: Record<string, any>;
  onClose: () => void;
  exprCtx: ExprCtx;
}) {
  const { title, expr, env, onClose, opType, exprCtx } = props;
  return (
    <Modal
      title={title ?? `${DATA_QUERY_CAP} result`}
      onCancel={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onClose();
      }}
      closable
      maskClosable
      footer={null}
      open
      width={700}
      bodyStyle={{
        padding: 0,
      }}
    >
      <div
        style={{
          height: 500,
        }}
        onClick={(e) => {
          e.stopPropagation();
        }}
        onContextMenu={(e) => {
          e.stopPropagation();
        }}
      >
        <DataSourceOpDataPreview
          expr={expr}
          env={env}
          opType={opType}
          exprCtx={exprCtx}
        />
      </div>
    </Modal>
  );
}

const PICK_DIFFERENT_INTEGRATION_VALUE = "plasmic.new_integration";

interface DataSourcePickerProps {
  sourceId: string | undefined;
  sourceType?: DataSourceType;
  readOpsOnly?: boolean;
  onChange: (sourceId: string | undefined) => void;
  disabled?: boolean;
  showRefreshButton?: boolean;
  onRefreshClick?: () => void;
}

export function DataSourcePicker({
  sourceId,
  sourceType,
  readOpsOnly,
  onChange,
  disabled,
  showRefreshButton,
  onRefreshClick,
}: DataSourcePickerProps) {
  const studioCtx = useStudioCtx();
  const topFrameApi = useTopFrameApi();

  const usedDataSources = siteToUsedDataSources(studioCtx.site);

  const sourceOptions = React.useMemo(() => {
    if (!sourceId || usedDataSources.includes(sourceId)) {
      return usedDataSources;
    } else {
      // selecting a new integration so it's not part of the used data sources yet
      return [...usedDataSources, sourceId];
    }
  }, [usedDataSources, sourceId]);
  const { data: sources, isLoading } = useSWR(sourceOptions, async () => {
    const _sources: ApiDataSource[] = [];
    for (const id of sourceOptions) {
      const source = await studioCtx.getDataSource(id);
      _sources.push(source);
    }
    return _sources;
  });
  if (usedDataSources.length === 0) {
    return (
      <DataSourcePickerButton
        sourceId={sourceId}
        onChange={(newSourceId) => onChange(newSourceId)}
        sourceType={sourceType}
        readOpsOnly={readOpsOnly}
        disabled={disabled}
      />
    );
  } else {
    return (
      <>
        <StyleSelect
          value={sourceId}
          onChange={async (selectedId) => {
            if (selectedId === PICK_DIFFERENT_INTEGRATION_VALUE) {
              const result = await topFrameApi.pickDataSource({
                existingSourceId: sourceId,
                sourceType,
                readOpsOnly,
              });
              if (result && result !== "CANCELED") {
                onChange(result.sourceId);
              }
            } else {
              onChange(selectedId ?? undefined);
            }
          }}
          placeholder={
            isLoading
              ? "Loading"
              : `Select ${A_DATA_SOURCE_LOWER} from your workspace to use`
          }
          valueSetState={sourceId ? "isSet" : undefined}
          isDisabled={disabled || isLoading}
          data-plasmic-prop="data-source-modal-pick-integration-btn"
        >
          {sources?.map((source) => (
            <StyleSelect.Option value={source.id}>
              {source.name}
            </StyleSelect.Option>
          ))}
          <StyleSelect.Option value={PICK_DIFFERENT_INTEGRATION_VALUE}>
            Pick a different {DATA_SOURCE_LOWER}...
          </StyleSelect.Option>
        </StyleSelect>
        {showRefreshButton && (
          <IconButton onClick={onRefreshClick}>
            <Icon icon={RefreshsvgIcon} />
          </IconButton>
        )}
      </>
    );
  }
}

export function getPreferredDataSource(site: Site) {
  const sourceIds = siteToUsedDataSources(site);
  return sourceIds.length > 0 ? sourceIds[0] : undefined;
}

function GraphqlQueryField(props: {
  sourceId: string | undefined;
  exprCtx: ExprCtx;
  onClickReference: () => void;
  value: string;
  onChange: (query: string, extraState: any) => void;
}) {
  const { sourceId, exprCtx, onClickReference, value, onChange } = props;
  const { schemaTunnel } = useContext(DataSourceDraftContext);
  return (
    <GqlProvider sourceId={sourceId} exprCtx={exprCtx} query={value}>
      <GraphqlQueryFieldInner
        onClickReference={onClickReference}
        onChange={onChange}
      />
      {schemaTunnel && (
        <schemaTunnel.In>
          <div className={"overflow-scroll fill-height"}>
            <div className={"graphiql-container custom-gql-ui p-xlg"}>
              <div className={"fill-width"}>
                <GqlDoc />
              </div>
            </div>
          </div>
        </schemaTunnel.In>
      )}
    </GqlProvider>
  );
}

function GraphqlQueryFieldInner(props: {
  onClickReference: () => void;
  onChange: (query: string, extraState: any) => void;
}) {
  const { onClickReference, onChange } = props;

  // We need GraphqlQueryFieldInner because @graphiql/react hooks
  // need to be in a component inside <GraphiQLProvider/>
  const { theme } = useTheme("light");
  const prettify = usePrettifyEditors();

  return (
    <Stated defaultValue={true}>
      {(showExplorer, setShowExplorer) => (
        <div className={"graphiql-container custom-gql-ui"}>
          <div className={"flex fill-width"}>
            {showExplorer && (
              <div className={"fill-width"}>
                <GqlComponents />
              </div>
            )}
            <div className={"fill-width rel"}>
              <QueryEditor
                onClickReference={onClickReference}
                onEdit={(newValue, documentAST) => {
                  const variableNames =
                    documentAST?.definitions
                      .flatMap((def) =>
                        "variableDefinitions" in def
                          ? def.variableDefinitions ?? []
                          : []
                      )
                      .map((varDef) => [
                        varDef.variable.name.value,
                        varDef.type.kind === "NonNullType",
                      ]) ?? [];
                  const fields = Object.fromEntries(
                    variableNames.map(([vname]) => [
                      vname,
                      {
                        type: "text",
                        label: vname,
                      },
                    ])
                  );
                  const requiredFields = variableNames.flatMap(
                    ([vname, required]) => (required ? [vname] : [])
                  );

                  onChange(newValue, {
                    fields,
                    requiredFields,
                  });
                }}
              />
              <div className={"floating-inset-toolbar"}>
                <Tooltip title={"Toggle explorer sidebar"}>
                  <IconButton
                    className={"white-bg-unimp"}
                    withBackgroundHover
                    onClick={() => setShowExplorer(!showExplorer)}
                  >
                    <TreeIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title={"Prettify code"}>
                  <IconButton
                    className={"white-bg-unimp"}
                    withBackgroundHover
                    onClick={prettify}
                  >
                    <PrettifyIcon style={{ width: 16, height: 16 }} />
                  </IconButton>
                </Tooltip>
              </div>
            </div>
          </div>
        </div>
      )}
    </Stated>
  );
}

function GqlProvider(props: {
  sourceId: string | undefined;
  children?: React.ReactNode;
  exprCtx: ExprCtx;
  query: string;
}) {
  const studioCtx = useStudioCtx();
  const { sourceId, children, exprCtx, query } = props;
  const { sourceMeta } = useContext(DataSourceDraftContext);

  // pass the explorer props here if you want
  const explorer = useMemo(
    () =>
      explorerPlugin({
        showAttribution: false,
        explorerIsOpen: true,
      }),
    []
  );

  const gqlFetcher: Fetcher = useMemo(
    () => async (graphqlParams) => {
      if (!sourceId) {
        reportSilentErrorMessage("gqlFetcher: Expected sourceId to exist");
        return;
      }
      if (sourceMeta?.id !== "graphql") {
        return;
      }
      const result = await executeDataSourceOp(
        await getDataSourceExprFromDraft({
          sourceId: sourceId,
          opName: "query",
          templates: {
            query: {
              type: "graphql-query",
              value: graphqlParams.query,
              bindings: undefined,
            },
          },
          api: studioCtx.appCtx.api,
          exprCtx,
          projectId: studioCtx.siteInfo.id,
        }),
        {},
        exprCtx
      );
      return result.data.response;
    },
    [sourceId]
  );
  return (
    <GraphiQLProvider fetcher={gqlFetcher} plugins={[explorer]} query={query}>
      {children}
    </GraphiQLProvider>
  );
}
