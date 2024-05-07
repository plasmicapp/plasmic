import {
  Component,
  CustomCode,
  DataSourceOpExpr,
  EventHandler,
  Expr,
  Interaction,
  NameArg,
  TplComponent,
} from "@/wab/classes";
import {
  BottomModalButtons,
  useBottomModalActions,
} from "@/wab/client/components/BottomModal";
import {
  reactConfirm,
  showTemporaryPrompt,
} from "@/wab/client/components/quick-modals";
import { ChoicePropEditor } from "@/wab/client/components/sidebar-tabs/ComponentProps/ChoicePropEditor";
import { DataPickerTypesSchema } from "@/wab/client/components/sidebar-tabs/DataBinding/DataPicker";
import {
  DataSourceOpDraftPreview,
  DataSourceOpPickerProvider,
  getOpIdForDataSourceOpExpr,
  useSource,
  useSourceSchemaData,
} from "@/wab/client/components/sidebar-tabs/DataSource/DataSourceOpPicker";
import {
  DataSourceTablePicker,
  INVALID_DATA_SOURCE_MESSAGE,
} from "@/wab/client/components/sidebar-tabs/DataSource/DataSourceTablePicker";
import { useSourceOp } from "@/wab/client/components/sidebar-tabs/useSourceOp";
import { LabeledItemRow } from "@/wab/client/components/sidebar/sidebar-helpers";
import Button from "@/wab/client/components/widgets/Button";
import { providesAppCtx } from "@/wab/client/contexts/AppContexts";
import {
  providesStudioCtx,
  StudioCtx,
  useStudioCtx,
} from "@/wab/client/studio-ctx/StudioCtx";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { ensure, ensureArray, mkShortId, spawn, swallow } from "@/wab/common";
import { ExprCtx, serCompositeExprMaybe } from "@/wab/exprs";
import { toVarName } from "@/wab/shared/codegen/util";
import { getDataSourceMeta } from "@/wab/shared/data-sources-meta/data-source-registry";
import {
  DataSourceMeta,
  dataSourceTemplateToString,
  ensureDataSourceStandardQuery,
  ensureLookupSpecFromDraft,
  extractFiltersFromDefaultDataSourceQueries,
  LookupSpecDraft,
} from "@/wab/shared/data-sources-meta/data-sources";
import { TplMgr } from "@/wab/shared/TplMgr";
import { ensureBaseVariantSetting } from "@/wab/shared/Variants";
import { tryGetTplOwnerComponent } from "@/wab/tpls";
import { DataSourceSchema, TableSchema } from "@plasmicapp/data-sources";
import { FormType, formTypeDescription } from "@plasmicpkgs/antd5";
import { notification } from "antd";
import Modal from "antd/lib/modal/Modal";
import { isString, size } from "lodash";
import React from "react";

type ConnectionData = {
  formType: FormType;
  dataOp: DataSourceOpExpr;
  sourceMeta: DataSourceMeta;
  tableSchema: TableSchema;
  lookupValue: LookupSpecDraft["lookupValue"];
};

const formOptions = [
  { label: "New Entry", value: FormType.NewEntry },
  { label: "Update Entry", value: FormType.UpdateEntry },
];

export function ConnectToDBTable({
  viewCtx,
  tpl,
  onSubmit,
  onCancel,
}: {
  viewCtx: ViewCtx;
  tpl: TplComponent;
  onSubmit: (val: ConnectionData) => void;
  onCancel: () => void;
}) {
  const studioCtx = useStudioCtx();
  const [selectedFormOption, setSelectedFormOption] = React.useState<
    FormType | undefined
  >(undefined);
  const [lookupDraft, setLookupDraft] = React.useState<
    LookupSpecDraft | undefined
  >(undefined);
  const { source } = useSourceOp(lookupDraft?.sourceId, undefined);
  const { data: sourceSchemaData } = useSourceSchemaData(
    viewCtx.studioCtx,
    lookupDraft?.sourceId,
    source
  );
  const ownerComponent = tryGetTplOwnerComponent(tpl);
  const exprCtx: ExprCtx = {
    projectFlags: studioCtx.projectFlags(),
    component: ownerComponent ?? null,
    inStudio: true,
  };
  const tableSchema = useTableSchema(sourceSchemaData, lookupDraft?.tableId);
  const isSaveDisabled = React.useMemo(() => {
    if (
      selectedFormOption === undefined ||
      lookupDraft === undefined ||
      lookupDraft.sourceId === undefined ||
      lookupDraft.tableId === undefined ||
      tableSchema === undefined
    ) {
      return true;
    }
    if (selectedFormOption === FormType.NewEntry) {
      return false;
    }
    if (lookupDraft.lookupValue?.value === undefined) {
      return true;
    }
    return !ensureArray(lookupDraft.lookupFields).every(
      (field) =>
        field in ensure(lookupDraft.lookupValue, "checked before").value
    );
  }, [lookupDraft, selectedFormOption]);

  const onSave = async () => {
    if (
      !source ||
      selectedFormOption === undefined ||
      !lookupDraft ||
      isSaveDisabled ||
      !tableSchema
    ) {
      return;
    }
    const lookupSpec = ensureLookupSpecFromDraft(lookupDraft);
    const sourceMeta = getDataSourceMeta(source.source);
    let dataOp: DataSourceOpExpr;
    if (selectedFormOption === FormType.NewEntry) {
      const makeSchemaQuery = ensureDataSourceStandardQuery(
        sourceMeta,
        "getSchema"
      );
      dataOp = makeSchemaQuery(lookupSpec.sourceId, lookupSpec.tableId);
    } else {
      const makeGetOneQuery = ensureDataSourceStandardQuery(
        sourceMeta,
        "getOne"
      );
      dataOp = makeGetOneQuery(
        lookupSpec.sourceId,
        tableSchema,
        ensure(
          lookupSpec.lookupValue,
          "update entry should have a lookup value"
        )
      );
    }
    dataOp.opId = await studioCtx.appCtx.app.withSpinner(
      getOpIdForDataSourceOpExpr(
        viewCtx.studioCtx.appCtx.api,
        dataOp,
        exprCtx,
        studioCtx.siteInfo.id
      )
    );
    onSubmit({
      formType: selectedFormOption,
      dataOp,
      sourceMeta,
      tableSchema,
      lookupValue: lookupSpec.lookupValue,
    });
  };

  return (
    <Modal
      open={true}
      title={"Connect to DB Table"}
      closable={false}
      footer={
        <div className="flex gap-m justify-end">
          <Button onClick={onCancel}>Cancel</Button>
          <Button type="primary" onClick={onSave} disabled={isSaveDisabled}>
            Save
          </Button>
        </div>
      }
      forceRender={true}
    >
      <div className="flex flex-col gap-xlg">
        <LabeledItemRow label={"Form Type"} tooltip={formTypeDescription}>
          <ChoicePropEditor
            attr="formType"
            options={formOptions}
            value={selectedFormOption}
            onChange={(value) => {
              setSelectedFormOption(value);
            }}
            defaultValueHint={"Select the form type..."}
            valueSetState={
              selectedFormOption !== undefined ? "isSet" : undefined
            }
          />
        </LabeledItemRow>
        {selectedFormOption !== undefined && (
          <DataSourceTablePicker
            studioCtx={viewCtx.studioCtx}
            requireLookupValue={selectedFormOption === FormType.UpdateEntry}
            env={viewCtx.getCanvasEnvForTpl(tpl)}
            schema={viewCtx.customFunctionsSchema()}
            draft={lookupDraft}
            onChange={(newDraft) => setLookupDraft(newDraft)}
            onlySchema={selectedFormOption === FormType.NewEntry}
            requiredStandardQueries={["getOne", "getSchema"]}
            invalidDataSourceMessage={INVALID_DATA_SOURCE_MESSAGE.schemaForms}
            exprCtx={exprCtx}
          />
        )}
      </div>
    </Modal>
  );
}

async function mkDefaultSubmit(
  studioCtx: StudioCtx,
  tplComp: TplComponent,
  { dataOp, formType, sourceMeta, tableSchema, lookupValue }: ConnectionData
) {
  const ownerComponent = tryGetTplOwnerComponent(tplComp);

  const submitValueDataSourceTemplate = {
    bindings: {
      "{{19000}}": new CustomCode({
        code: `($state.${toVarName(
          ensure(tplComp.name, "form components should be named")
        )}.value)`,
        fallback: null,
      }),
    },
    value: "{{19000}}",
  };
  let submitOp: DataSourceOpExpr;
  if (formType === FormType.NewEntry) {
    const makeCreateQuery = ensureDataSourceStandardQuery(sourceMeta, "create");
    submitOp = makeCreateQuery(
      dataOp.sourceId,
      tableSchema,
      submitValueDataSourceTemplate
    );
  } else {
    const makeUpdateQuery = ensureDataSourceStandardQuery(sourceMeta, "update");
    submitOp = makeUpdateQuery(
      dataOp.sourceId,
      tableSchema,
      ensure(lookupValue, "update entry should have a lookup value"),
      submitValueDataSourceTemplate
    );
  }
  const { opId } = await studioCtx.appCtx.app.withSpinner(
    studioCtx.appCtx.api.getDataSourceOpId(
      studioCtx.siteInfo.id,
      dataOp.sourceId,
      {
        name: submitOp.opName,
        templates: Object.fromEntries(
          Object.entries(submitOp.templates).map(([templateName, template]) => [
            templateName,
            dataSourceTemplateToString(template, {
              projectFlags: studioCtx.projectFlags(),
              component: ownerComponent ?? null,
              inStudio: true,
            }),
          ])
        ),
        roleId: undefined,
      }
    )
  );
  submitOp.opId = opId;
  const eventHandler = new EventHandler({
    interactions: [],
  });
  const interaction = new Interaction({
    actionName: "dataSourceOp",
    condExpr: null,
    conditionalMode: "always",
    interactionName: "Default submit",
    parent: eventHandler,
    uuid: mkShortId(),
    args: [
      new NameArg({
        name: "dataOp",
        expr: submitOp,
      }),
    ],
  });
  eventHandler.interactions.push(interaction);
  return eventHandler;
}

export function ConnectToDBTableModal({
  viewCtx,
  tpl,
}: {
  viewCtx: ViewCtx;
  tpl: TplComponent;
}) {
  const onConnectToDbTable = async (connectionData: ConnectionData) => {
    const baseVs = ensureBaseVariantSetting(tpl);
    const dataParam = ensure(
      tpl.component.params.find((p) => p.variable.name === "data"),
      `Form component should have a "data" prop`
    );
    const formItemsParam = ensure(
      tpl.component.params.find((p) => p.variable.name === "formItems"),
      `Form component should have a "formItems" prop`
    );
    const submitParam = ensure(
      tpl.component.params.find((p) => p.variable.name === "onFinish"),
      `Form component should have a "onFinish" prop`
    );
    const tplMgr = viewCtx.studioCtx.tplMgr();

    const submitExpr = await mkDefaultSubmit(
      viewCtx.studioCtx,
      tpl,
      connectionData
    );
    await viewCtx.studioCtx.change(({ success }) => {
      tplMgr.setArg(
        tpl,
        baseVs,
        formItemsParam.variable,
        serCompositeExprMaybe([])
      );
      tplMgr.setArg(tpl, baseVs, dataParam.variable, connectionData.dataOp);
      tplMgr.setArg(tpl, baseVs, submitParam.variable, submitExpr);
      return success();
    });
  };

  return (
    <>
      <Button
        onClick={async () => {
          const connectionData = await showTemporaryPrompt<ConnectionData>(
            (onSubmit, onCancel) =>
              providesStudioCtx(viewCtx.studioCtx)(
                providesAppCtx(viewCtx.studioCtx.appCtx)(
                  <ConnectToDBTable
                    viewCtx={viewCtx}
                    tpl={tpl}
                    onSubmit={onSubmit}
                    onCancel={onCancel}
                  />
                )
              )
          );
          if (connectionData) {
            await onConnectToDbTable(connectionData);
          }
        }}
      >
        Connect to Table
      </Button>
    </>
  );
}

function useTableSchema(
  sourceSchemaData: DataSourceSchema | undefined,
  tableId: string | undefined
) {
  return React.useMemo(
    () => sourceSchemaData?.tables.find((t) => t.id === tableId),
    [sourceSchemaData, tableId]
  );
}

export function FormDataConnectionPropEditor({
  value,
  env,
  schema,
  onChange,
  component,
  tpl,
  disabled,
}: {
  value: DataSourceOpExpr | undefined;
  env: Record<string, any>;
  schema?: DataPickerTypesSchema;
  onChange: (expr: Expr) => void;
  component?: Component;
  tpl: TplComponent;
  disabled?: boolean;
}) {
  const studioCtx = useStudioCtx();
  const modalActions = useBottomModalActions();
  const bottomModalKey = `form-data-connection-prop-editor-${value?.opId}`;

  const lookupSpec = React.useMemo<LookupSpecDraft | undefined>(() => {
    if (!value) {
      return undefined;
    }
    const filters = extractFiltersFromDefaultDataSourceQueries(value);
    const tableId = swallow(() => {
      const resourceValue = value?.templates.resource?.value;
      return isString(resourceValue) ? JSON.parse(resourceValue) : undefined;
    });
    return {
      sourceId: value.sourceId,
      tableId,
      lookupFields: filters ? Object.keys(filters) : undefined,
      lookupValue: {
        value: filters,
        bindings: value?.templates.filters?.bindings ?? {},
      },
    };
  }, [value]);
  const tableId = lookupSpec?.tableId;
  const { data: source } = useSource(studioCtx, lookupSpec?.sourceId);
  const { data: sourceSchemaData } = useSourceSchemaData(
    studioCtx,
    lookupSpec?.sourceId,
    source
  );
  const tableSchema = useTableSchema(sourceSchemaData, tableId);

  const selectedFormOption = React.useMemo(
    () =>
      size(value?.templates) > 1 ? FormType.UpdateEntry : FormType.NewEntry,
    [value]
  );

  return (
    <Button
      type={["leftAligned"]}
      size="stretch"
      disabled={disabled}
      onClick={() => {
        modalActions.open(bottomModalKey, {
          children: (
            <FormDataConnectionBottomModal
              lookupSpec={lookupSpec}
              modalKey={bottomModalKey}
              initialSelectedFormOption={selectedFormOption}
              onChange={onChange}
              env={env}
              schema={schema}
              component={component}
              tpl={tpl}
            />
          ),
        });
      }}
      data-test-id="form-data"
    >
      {tableSchema
        ? `${
            selectedFormOption === FormType.NewEntry
              ? "New Entry"
              : "Update Entry"
          }: ${tableSchema.label ?? tableSchema.id}`
        : "Loading..."}
    </Button>
  );
}

function FormDataConnectionBottomModal({
  lookupSpec,
  modalKey,
  initialSelectedFormOption,
  onChange,
  env,
  schema,
  component,
  tpl,
}: {
  lookupSpec: LookupSpecDraft | undefined;
  modalKey: string;
  initialSelectedFormOption: FormType;
  onChange: (expr: DataSourceOpExpr) => void;
  env: Record<string, any>;
  schema?: DataPickerTypesSchema;
  component?: Component;
  tpl: TplComponent;
}) {
  const studioCtx = useStudioCtx();
  const [draft, setDraft] = React.useState(lookupSpec);
  const [opDraft, setOpDraft] = React.useState<DataSourceOpExpr | undefined>(
    undefined
  );
  const [selectedFormOption, setSelectedFormOption] = React.useState(
    initialSelectedFormOption
  );
  const { sourceId, tableId } = draft ?? {};
  const exprCtx: ExprCtx = {
    projectFlags: studioCtx.projectFlags(),
    component: component ?? null,
    inStudio: true,
  };
  const modalActions = useBottomModalActions();
  const { data: source } = useSource(studioCtx, sourceId);
  const { data: sourceSchemaData } = useSourceSchemaData(
    studioCtx,
    sourceId,
    source
  );
  const tableSchema = useTableSchema(sourceSchemaData, tableId);
  const sourceMeta = React.useMemo(
    () => (source ? getDataSourceMeta(source.source) : undefined),
    [source]
  );
  const [hideDataTab, setHideDataTab] = React.useState(
    initialSelectedFormOption === FormType.NewEntry
  );

  const makeQueryFromDraft = async () => {
    if (!sourceId) {
      notification.error({
        message: `Missing required fields: Integration`,
      });
      return;
    }
    if (!isString(tableId) || !tableSchema || !sourceMeta) {
      notification.error({
        message: `Missing required fields: Table`,
      });
      return undefined;
    }
    let dataOp: DataSourceOpExpr;
    if (selectedFormOption === FormType.NewEntry) {
      const makeSchemaQuery = ensureDataSourceStandardQuery(
        sourceMeta,
        "getSchema"
      );
      dataOp = makeSchemaQuery(sourceId, tableId);
    } else {
      if (!draft?.lookupValue) {
        notification.error({
          message: `Missing required fields: Lookup value`,
        });
        return undefined;
      }
      const makeGetOneQuery = ensureDataSourceStandardQuery(
        sourceMeta,
        "getOne"
      );
      dataOp = makeGetOneQuery(sourceId, tableSchema, draft.lookupValue);
    }
    dataOp.opId = await getOpIdForDataSourceOpExpr(
      studioCtx.appCtx.api,
      dataOp,
      exprCtx,
      studioCtx.siteInfo.id
    );
    return dataOp;
  };
  const onPreview = async () => {
    const dataOp = await makeQueryFromDraft();
    if (dataOp) {
      setOpDraft(dataOp);
      setHideDataTab(selectedFormOption === FormType.NewEntry);
    }
  };
  const onSave = async () => {
    if (!sourceMeta || !tableSchema) {
      return;
    }
    const needsReset = draft?.tableId !== lookupSpec?.tableId;
    const proceed =
      !needsReset ||
      (await reactConfirm({
        message: (
          <>
            <p>
              This will reset your form configuration (specifically, the Fields
              prop and the On submit interaction)
            </p>
            <p>Are you sure you want to proceed?</p>
          </>
        ),
      }));
    if (!proceed) {
      return;
    }
    const dataOp = await makeQueryFromDraft();
    if (!dataOp) {
      return;
    }
    if (needsReset) {
      const baseVs = ensureBaseVariantSetting(tpl);
      const tplMgr = new TplMgr({ site: studioCtx.site });
      const submitExpr = await mkDefaultSubmit(studioCtx, tpl, {
        formType: selectedFormOption,
        dataOp,
        sourceMeta,
        tableSchema,
        lookupValue: draft?.lookupValue,
      });
      spawn(
        studioCtx.change(({ success }) => {
          for (const vs of tpl.vsettings) {
            tplMgr.delArg(
              tpl,
              vs,
              ensure(
                tpl.component.params.find(
                  (p) => p.variable.name === "dataFormItems"
                ),
                `forms should have a "dataFormItems" prop`
              ).variable
            );
          }
          tplMgr.setArg(
            tpl,
            baseVs,
            ensure(
              tpl.component.params.find((p) => p.variable.name === "onFinish"),
              `forms should have a "onFinish" prop`
            ).variable,
            submitExpr
          );
          return success();
        })
      );
    }
    onChange(dataOp);
    modalActions.close(modalKey);
  };
  return (
    <>
      <div className="flex flex-row p-xxlg gap-xlg">
        <div className="flex flex-col gap-xlg fill-width">
          <LabeledItemRow label={"Form Type"} tooltip={formTypeDescription}>
            <ChoicePropEditor
              attr="formType"
              options={formOptions}
              value={selectedFormOption}
              onChange={(newFormOption) => {
                setSelectedFormOption(newFormOption);
                setDraft({
                  ...draft,
                  lookupValue: undefined,
                });
              }}
              defaultValueHint={"Select the form type..."}
              valueSetState={
                selectedFormOption !== undefined ? "isSet" : undefined
              }
            />
          </LabeledItemRow>
          {selectedFormOption !== undefined && (
            <DataSourceTablePicker
              draft={draft}
              onChange={(newDraft) => setDraft(newDraft)}
              studioCtx={studioCtx}
              env={env}
              schema={schema}
              requireLookupValue={selectedFormOption === FormType.UpdateEntry}
              onlySchema={selectedFormOption === FormType.NewEntry}
              exprCtx={exprCtx}
            />
          )}
        </div>
        <div className="fill-width">
          {opDraft && (
            <DataSourceOpPickerProvider
              hideDataTab={hideDataTab}
              preferredTab={
                selectedFormOption === FormType.NewEntry ? "schema" : "data"
              }
            >
              <DataSourceOpDraftPreview
                env={env}
                tableSchema={tableSchema}
                opType={"read"}
                value={opDraft}
                exprCtx={exprCtx}
                projectId={studioCtx.siteInfo.id}
              />
            </DataSourceOpPickerProvider>
          )}
        </div>
      </div>
      <BottomModalButtons>
        <Button onClick={onSave} type="primary">
          Save
        </Button>
        <Button onClick={onPreview}>Preview</Button>
        <Button onClick={() => modalActions.close(modalKey)}>Cancel</Button>
      </BottomModalButtons>
    </>
  );
}
