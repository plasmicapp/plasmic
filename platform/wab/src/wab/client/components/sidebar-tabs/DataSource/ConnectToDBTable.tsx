import {
  BottomPanelButtons,
  useBottomPanelActions,
} from "@/wab/client/components/BottomPanel";
import { currentSelection } from "@/wab/client/components/BottomPanelState";
import { EditorSession } from "@/wab/client/components/editor-sessions/editor-session";
import { reactConfirm } from "@/wab/client/components/quick-modals";
import { ChoicePropEditor } from "@/wab/client/components/sidebar-tabs/ComponentProps/ChoicePropEditor";
import { DataPickerTypesSchema } from "@/wab/client/components/sidebar-tabs/DataBinding/DataPicker";
import {
  DataSourceOpDraftPreview,
  DataSourceOpPickerProvider,
  getOpIdForDataSourceOpExpr,
  useSource,
  useSourceSchemaData,
} from "@/wab/client/components/sidebar-tabs/DataSource/DataSourceOpPicker";
import { DataSourceTablePicker } from "@/wab/client/components/sidebar-tabs/DataSource/DataSourceTablePicker";
import { LabeledItemRow } from "@/wab/client/components/sidebar/sidebar-helpers";
import Button from "@/wab/client/components/widgets/Button";
import { StudioCtx, useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { TplMgr } from "@/wab/shared/TplMgr";
import { ensureBaseVariantSetting } from "@/wab/shared/Variants";
import { toVarName } from "@/wab/shared/codegen/util";
import { ensure, ensureArray, mkShortId, swallow } from "@/wab/shared/common";
import { ExprCtx, clone } from "@/wab/shared/core/exprs";
import { flattenTpls, tryGetTplOwnerComponent } from "@/wab/shared/core/tpls";
import { getDataSourceMeta } from "@/wab/shared/data-sources-meta/data-source-registry";
import {
  DataSourceMeta,
  LookupSpecDraft,
  dataSourceTemplateToString,
  ensureDataSourceStandardQuery,
  extractFiltersFromDefaultDataSourceQueries,
} from "@/wab/shared/data-sources-meta/data-sources";
import {
  Component,
  CustomCode,
  DataSourceOpExpr,
  EventHandler,
  Expr,
  Interaction,
  NameArg,
  TplComponent,
} from "@/wab/shared/model/classes";
import { DataSourceSchema, TableSchema } from "@plasmicapp/data-sources";
import { FormType, formTypeDescription } from "@plasmicpkgs/antd5";
import { notification } from "antd";
import { mapValues, size } from "lodash";
import { observer } from "mobx-react";
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

async function mkDefaultSubmit(
  studioCtx: StudioCtx,
  tplComp: TplComponent,
  { dataOp, formType, sourceMeta, tableSchema, lookupValue }: ConnectionData,
) {
  const ownerComponent = tryGetTplOwnerComponent(tplComp);

  const submitValueDataSourceTemplate = {
    bindings: {
      "{{19000}}": new CustomCode({
        code: `($state.${toVarName(
          ensure(tplComp.name, "form components should be named"),
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
      submitValueDataSourceTemplate,
    );
  } else {
    const makeUpdateQuery = ensureDataSourceStandardQuery(sourceMeta, "update");
    submitOp = makeUpdateQuery(
      dataOp.sourceId,
      tableSchema,
      ensure(lookupValue, "update entry should have a lookup value"),
      submitValueDataSourceTemplate,
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
          ]),
        ),
        roleId: undefined,
      },
    ),
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
  eventHandler.interactions = [...eventHandler.interactions, interaction];
  return eventHandler;
}

function useTableSchema(
  sourceSchemaData: DataSourceSchema | undefined,
  tableId: string | undefined,
) {
  return React.useMemo(
    () => sourceSchemaData?.tables.find((t) => t.id === tableId),
    [sourceSchemaData, tableId],
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
  const modalActions = useBottomPanelActions();
  const panelKey = `form-data-connection-prop-editor-${tpl.uuid}`;

  const lookupSpec = React.useMemo<LookupSpecDraft | undefined>(() => {
    if (!value) {
      return undefined;
    }
    const filters = extractFiltersFromDefaultDataSourceQueries(value);
    const tableId = swallow(() => {
      const resourceValue = value?.templates.resource?.value;
      return typeof resourceValue === "string"
        ? JSON.parse(resourceValue)
        : undefined;
    });
    return {
      sourceId: value.sourceId,
      tableId,
      lookupFields: filters ? Object.keys(filters) : undefined,
      lookupValue: {
        value: filters,
        bindings: mapValues(value?.templates.filters?.bindings ?? {}, clone),
      },
    };
  }, [value]);
  const tableId = lookupSpec?.tableId;
  const { data: source } = useSource(studioCtx, lookupSpec?.sourceId);
  const { data: sourceSchemaData } = useSourceSchemaData(
    studioCtx,
    lookupSpec?.sourceId,
    source,
  );
  const tableSchema = useTableSchema(sourceSchemaData, tableId);

  const selectedFormOption = React.useMemo(
    () =>
      size(value?.templates) > 1 ? FormType.UpdateEntry : FormType.NewEntry,
    [value],
  );

  return (
    <Button
      type={["leftAligned"]}
      size="stretch"
      disabled={disabled}
      onClick={() => {
        const session = createFormConnectionSession(studioCtx, {
          lookupSpec,
          modalKey: panelKey,
          initialSelectedFormOption: selectedFormOption,
          onChange,
          env,
          schema,
          component,
          tpl,
        });
        void modalActions.open(panelKey, {
          session,
          title: "Configure form data connection",
          selection: currentSelection(studioCtx.focusedViewCtx()),
          content: {
            kind: "formConnection",
            session,
            props: {
              lookupSpec,
              modalKey: panelKey,
              initialSelectedFormOption: selectedFormOption,
              onChange,
              env,
              schema,
              component,
              tpl,
            },
          },
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

interface FormConnectionDraft {
  lookup: LookupSpecDraft | undefined;
  formType: FormType;
}
type FormDataConnectionProps = {
  lookupSpec: LookupSpecDraft | undefined;
  modalKey: string;
  initialSelectedFormOption: FormType;
  onChange: (expr: DataSourceOpExpr) => void;
  env: Record<string, any>;
  schema?: DataPickerTypesSchema;
  component?: Component;
  tpl: TplComponent;
};

async function prepareFormConnection(
  studioCtx: StudioCtx,
  state: FormConnectionDraft,
  component?: Component,
) {
  const { sourceId, tableId } = state.lookup ?? {};
  if (!sourceId) {
    throw new Error("Choose an integration before saving.");
  }
  const source = await studioCtx.appCtx.api.getDataSourceById(sourceId);
  const sourceMeta = getDataSourceMeta(source.source);
  const schemaOp = sourceMeta.studioOps.schemaOp;
  const schema = schemaOp
    ? await studioCtx.appCtx.api.executeDataSourceStudioOp(
        studioCtx.siteInfo.id,
        sourceId,
        { name: schemaOp.name },
      )
    : undefined;
  const tableSchema = schema?.tables.find((table) => table.id === tableId);
  if (typeof tableId !== "string" || !tableSchema) {
    throw new Error("Choose a table before saving.");
  }
  const lookupValue = state.lookup?.lookupValue;
  if (
    state.formType !== FormType.NewEntry &&
    (!lookupValue?.value ||
      size(lookupValue.value) === 0 ||
      !ensureArray(state.lookup?.lookupFields ?? []).every((field) =>
        Object.prototype.hasOwnProperty.call(lookupValue.value, field),
      ))
  ) {
    throw new Error("Enter a lookup value before saving.");
  }
  const dataOp =
    state.formType === FormType.NewEntry || !lookupValue
      ? ensureDataSourceStandardQuery(sourceMeta, "getSchema")(
          sourceId,
          tableId,
        )
      : ensureDataSourceStandardQuery(sourceMeta, "getOne")(
          sourceId,
          tableSchema,
          lookupValue,
        );
  dataOp.opId = await getOpIdForDataSourceOpExpr(
    studioCtx.appCtx.api,
    dataOp,
    {
      projectFlags: studioCtx.projectFlags(),
      component: component ?? null,
      inStudio: true,
    },
    studioCtx.siteInfo.id,
  );
  return { dataOp, sourceMeta, tableSchema };
}

export function createFormConnectionSession(
  studioCtx: StudioCtx,
  props: FormDataConnectionProps,
) {
  const { tpl, component, lookupSpec, onChange } = props;
  return new EditorSession<FormConnectionDraft>({
    studioCtx,
    initial: {
      lookup: props.lookupSpec,
      formType: props.initialSelectedFormOption,
    },
    target: {
      exists: () =>
        studioCtx.site.components.some((owner) =>
          flattenTpls(owner.tplTree).includes(tpl),
        ),
      read: () =>
        tpl.vsettings.flatMap((vs) =>
          vs.args.filter((arg) =>
            ["data", "dataFormItems", "onFinish"].includes(
              arg.param.variable.name,
            ),
          ),
        ),
    },
    prepare: async (state) => {
      const draft = state.lookup;
      const selectedFormOption = state.formType;
      const { dataOp, sourceMeta, tableSchema } = await prepareFormConnection(
        studioCtx,
        state,
        component,
      );
      const needsReset =
        draft?.sourceId !== lookupSpec?.sourceId ||
        draft?.tableId !== lookupSpec?.tableId ||
        selectedFormOption !== props.initialSelectedFormOption;
      if (
        needsReset &&
        !(await reactConfirm({
          message:
            "This will reset the form Fields and On submit interaction. Continue?",
        }))
      ) {
        return {
          kind: "blocked",
          message: "The form connection was not saved.",
        };
      }
      const submitExpr = needsReset
        ? await mkDefaultSubmit(studioCtx, tpl, {
            formType: selectedFormOption,
            dataOp,
            sourceMeta,
            tableSchema,
            lookupValue: draft?.lookupValue,
          })
        : undefined;
      return {
        apply: () => {
          if (submitExpr) {
            const baseVs = ensureBaseVariantSetting(tpl);
            const tplMgr = new TplMgr({ site: studioCtx.site });
            for (const vs of tpl.vsettings) {
              tplMgr.delArg(
                tpl,
                vs,
                ensure(
                  tpl.component.params.find(
                    (p) => p.variable.name === "dataFormItems",
                  ),
                  `forms should have a "dataFormItems" prop`,
                ).variable,
              );
            }
            tplMgr.setArg(
              tpl,
              baseVs,
              ensure(
                tpl.component.params.find(
                  (p) => p.variable.name === "onFinish",
                ),
                `forms should have a "onFinish" prop`,
              ).variable,
              submitExpr,
            );
          }
          onChange(dataOp);
        },
      };
    },
  });
}

export const FormDataConnectionPanel = observer(
  function FormDataConnectionPanel({
    session,
    modalKey,
    initialSelectedFormOption,
    env,
    schema,
    component,
  }: FormDataConnectionProps & {
    session: EditorSession<FormConnectionDraft>;
  }) {
    const studioCtx = useStudioCtx();
    const draft = session.draft.lookup;
    const selectedFormOption = session.draft.formType;
    const setDraft = (lookup: LookupSpecDraft | undefined) =>
      session.setDraft((previous) => ({ ...previous, lookup }));
    const setSelectedFormOption = (formType: FormType) =>
      session.setDraft((previous) => ({ ...previous, formType }));
    const [opDraft, setOpDraft] = React.useState<
      DataSourceOpExpr | undefined
    >();
    const { sourceId, tableId } = draft ?? {};
    const exprCtx: ExprCtx = {
      projectFlags: studioCtx.projectFlags(),
      component: component ?? null,
      inStudio: true,
    };
    const modalActions = useBottomPanelActions();
    const readOnly = !studioCtx.appCtx.appConfig.enableDataQueries;
    const { data: source } = useSource(studioCtx, sourceId);
    const { data: sourceSchemaData } = useSourceSchemaData(
      studioCtx,
      sourceId,
      source,
    );
    const tableSchema = useTableSchema(sourceSchemaData, tableId);
    const [hideDataTab, setHideDataTab] = React.useState(
      initialSelectedFormOption === FormType.NewEntry,
    );

    const onPreview = async () => {
      try {
        const { dataOp } = await prepareFormConnection(
          studioCtx,
          session.draft,
          component,
        );
        setOpDraft(dataOp);
        setHideDataTab(selectedFormOption === FormType.NewEntry);
      } catch (error) {
        notification.error({
          message:
            error instanceof Error
              ? error.message
              : "Could not preview the connection.",
        });
      }
    };
    const onSave = () => modalActions.saveAndClose(modalKey);
    return (
      <>
        <div className="flex flex-row p-xxlg gap-xlg">
          <div className="flex flex-col gap-xlg fill-width">
            <LabeledItemRow label={"Form Type"} tooltip={formTypeDescription}>
              <ChoicePropEditor
                readOnly={readOnly}
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
                disabled={readOnly}
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
        <BottomPanelButtons>
          <Button onClick={onSave} type="primary" disabled={readOnly}>
            Save
          </Button>
          <Button onClick={onPreview}>Preview</Button>
          <Button onClick={() => modalActions.discard(modalKey)}>Cancel</Button>
        </BottomPanelButtons>
      </>
    );
  },
);

export interface FormConnectionPanelDescriptor {
  kind: "formConnection";
  props: FormDataConnectionProps;
  session: EditorSession<FormConnectionDraft>;
}
