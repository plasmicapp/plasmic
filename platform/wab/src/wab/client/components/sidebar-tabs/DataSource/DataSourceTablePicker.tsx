import { EnumPropEditor } from "@/wab/client/components/sidebar-tabs/ComponentProps/EnumPropEditor";
import { DataPickerTypesSchema } from "@/wab/client/components/sidebar-tabs/DataBinding/DataPicker";
import {
  DataSourcePicker,
  getPreferredDataSource,
  JsonWithSchemaEditor,
  orderFieldsByRanking,
  rankedFieldsForTableCols,
  useSource,
  useSourceSchemaData,
} from "@/wab/client/components/sidebar-tabs/DataSource/DataSourceOpPicker";
import { LabeledItemRow } from "@/wab/client/components/sidebar/sidebar-helpers";
import { Spinner } from "@/wab/client/components/widgets";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { StandardMarkdown } from "@/wab/client/utils/StandardMarkdown";
import { ensure } from "@/wab/shared/common";
import { ExprCtx } from "@/wab/shared/core/exprs";
import { getDataSourceMeta } from "@/wab/shared/data-sources-meta/data-source-registry";
import {
  dataSourceHasRequiredStandardQueries,
  LookupSpecDraft,
  StandardQueries,
} from "@/wab/shared/data-sources-meta/data-sources";
import { DATA_SOURCE_CAP } from "@/wab/shared/Labels";
import { TableFieldSchema, TableSchema } from "@plasmicapp/data-sources";
import { isEqual, size } from "lodash";
import React from "react";

export const MULTIPLE_PRIMARY_KEY_VALUE = "__plasmic_mpk";

export const INVALID_DATA_SOURCE_MESSAGE = {
  dynamicPages: `The dynamic page wizard only supports integrations where Plasmic can understand the data table schema.

  For the selected integration type, you will need to [manually create a dynamic page](https://docs.plasmic.app/learn/dynamic-pages/#creating-dynamic-pages-manually) instead.`,
  schemaForms: `The form connect-to-table wizard only supports integrations where Plasmic can understand the data table schema.

  For the selected integration type, you will need to [manually configure your form](https://docs.plasmic.app/learn/forms/#configuring-fields) instead.`,
  default: `This operation only supports integrations where Plasmic can understand the data schema.`,
};

interface DataSourceTablePickerProps {
  studioCtx: StudioCtx;
  env?: Record<string, any>;
  schema?: DataPickerTypesSchema;
  requireLookupValue?: boolean;
  onlySchema?: boolean;
  draft: LookupSpecDraft | undefined;
  onChange: (newDraft: LookupSpecDraft) => void;
  requiredStandardQueries?: (keyof StandardQueries)[];
  invalidDataSourceMessage?: string;
  exprCtx: ExprCtx;
}

export function DataSourceTablePicker(props: DataSourceTablePickerProps) {
  const {
    studioCtx,
    env,
    schema,
    requireLookupValue,
    onlySchema,
    onChange,
    draft = { sourceId: getPreferredDataSource(studioCtx.site) },
    requiredStandardQueries,
    exprCtx,
  } = props;
  const sourceId = draft?.sourceId;
  const tableId = draft?.tableId;
  const lookupValue = draft?.lookupValue;
  const [lookupField, setLookupField] = React.useState<string | undefined>(
    size(draft?.lookupFields) > 1
      ? MULTIPLE_PRIMARY_KEY_VALUE
      : size(draft?.lookupFields) === 1
      ? draft.lookupFields?.[0]
      : undefined
  );
  const { data: source } = useSource(studioCtx, sourceId);
  const { data: sourceSchemaData } = useSourceSchemaData(
    studioCtx,
    sourceId,
    source
  );

  const sourceMeta = React.useMemo(
    () => (source ? getDataSourceMeta(source.source) : undefined),
    [source]
  );
  const tableOptions = React.useMemo(() => {
    if (!sourceMeta || !sourceSchemaData) {
      return undefined;
    }
    for (const op of sourceMeta.ops) {
      for (const arg in op.args) {
        const argMeta = op.args[arg];
        if (argMeta.type === "table") {
          return argMeta.options(sourceSchemaData);
        }
      }
    }
    return [];
  }, [sourceMeta, sourceSchemaData]);
  const table = React.useMemo(
    () =>
      sourceSchemaData?.tables.find((t) => t.id === tableId) as
        | TableSchema
        | undefined,
    [sourceSchemaData, tableId]
  );
  const tableFields = React.useMemo(() => {
    if (!tableId || !sourceSchemaData || !table) {
      return undefined;
    }
    const primaryKeys = table.fields.filter((f) => f.primaryKey);
    return [
      ...(primaryKeys.length > 1
        ? [
            {
              label: primaryKeys.map((f) => f.label ?? f.id).join(","),
              value: MULTIPLE_PRIMARY_KEY_VALUE,
              id: MULTIPLE_PRIMARY_KEY_VALUE,
            },
          ]
        : []),
      ...table.fields.map((f) => ({
        label: f.label ?? f.id,
        value: f.id,
        id: f.id,
      })),
    ];
  }, [tableId, table]);
  const lookupFieldMeta = React.useMemo(() => {
    if (!lookupField) {
      return undefined;
    }
    if (!table) {
      return undefined;
    }
    if (lookupField === MULTIPLE_PRIMARY_KEY_VALUE) {
      return Object.fromEntries(
        table.fields.filter((f) => f.primaryKey).map((f) => [f.id, f])
      );
    } else {
      const field = ensure(
        table.fields.find((f) => f.id === lookupField) as TableFieldSchema,
        `field "${lookupField}" doesn't exist in "${table.id}"`
      );
      return { [field.id]: field };
    }
  }, [lookupField]);
  React.useEffect(() => {
    if (lookupField || !table || table.fields.length === 0) {
      return;
    }
    // If there's a single primary key, select that.
    // Otherwise, best-effort via heuristics.
    // (Don't feel confident in pushing a multi-primary key, might be confusing as a URL scheme.)
    const primaryKeys = table.fields.filter((f) => f.primaryKey);
    if (primaryKeys.length === 1) {
      setLookupField(primaryKeys[0].id);
    } else {
      setLookupField(
        orderFieldsByRanking(table.fields, rankedFieldsForTableCols)[0].id
      );
    }
  }, [table]);
  React.useEffect(() => {
    if (!lookupFieldMeta) {
      return;
    }
    const lookupFields = Object.keys(lookupFieldMeta);
    if (!isEqual(lookupFields, draft.lookupFields)) {
      onChange({
        ...draft,
        lookupFields,
      });
    }
  }, [draft, lookupFieldMeta]);
  return (
    <div className="flex flex-col gap-m">
      <LabeledItemRow label={DATA_SOURCE_CAP}>
        <DataSourcePicker
          sourceId={sourceId}
          sourceType={undefined}
          onChange={(newId) => {
            onChange({
              ...draft,
              sourceId: newId,
              tableId: undefined,
              tableLabel: undefined,
              lookupFields: undefined,
              lookupValue: undefined,
            });
          }}
          readOpsOnly={true}
        />
      </LabeledItemRow>
      {(() => {
        if (!sourceId) {
          return null;
        } else if (
          sourceMeta &&
          requiredStandardQueries &&
          !dataSourceHasRequiredStandardQueries(
            sourceMeta,
            requiredStandardQueries
          )
        ) {
          return (
            <p className="pt-xlg light-error">
              <StandardMarkdown>
                {props.invalidDataSourceMessage ??
                  INVALID_DATA_SOURCE_MESSAGE.default}
              </StandardMarkdown>
            </p>
          );
        } else if (!tableOptions) {
          return <Spinner />;
        } else {
          return (
            <LabeledItemRow label={"Table"}>
              <EnumPropEditor
                name={"dataTablePickerTable"}
                valueSetState={tableId ? "isSet" : undefined}
                value={tableId}
                options={tableOptions}
                onChange={(newTable) => {
                  const selectedTable = sourceSchemaData.tables.find(
                    (t) => t.id === newTable
                  ) as TableSchema | undefined;
                  onChange({
                    ...draft,
                    sourceType: source?.source,
                    tableId: selectedTable?.id,
                    tableLabel: selectedTable?.label,
                    lookupFields: undefined,
                    lookupValue: { value: undefined, bindings: {} },
                  });
                  setLookupField(undefined);
                }}
              />
            </LabeledItemRow>
          );
        }
      })()}
      {tableId && tableFields && !onlySchema && (
        <LabeledItemRow label={"Lookup field"}>
          <EnumPropEditor
            name={"dataTablePickerLookupField"}
            valueSetState={lookupField ? "isSet" : undefined}
            value={lookupField}
            options={tableFields}
            onChange={(newField) => setLookupField(newField)}
          />
        </LabeledItemRow>
      )}
      {lookupFieldMeta && lookupField && requireLookupValue && (
        <LabeledItemRow
          label={"Lookup value"}
          layout={
            lookupField === MULTIPLE_PRIMARY_KEY_VALUE
              ? "vertical"
              : "horizontal"
          }
        >
          <JsonWithSchemaEditor
            value={lookupValue?.value}
            bindings={lookupValue?.bindings ?? {}}
            fields={lookupFieldMeta ?? {}}
            data={env ?? {}}
            schema={schema}
            onChange={(newVal, bindings) => {
              onChange({
                ...draft,
                lookupFields: Object.keys(lookupFieldMeta),
                lookupValue: {
                  value: newVal,
                  bindings,
                },
              });
            }}
            hideLabel={true}
            hideDefinedIndicator={true}
            showAsIndentedRow={lookupField === MULTIPLE_PRIMARY_KEY_VALUE}
            exprCtx={exprCtx}
          />
        </LabeledItemRow>
      )}
    </div>
  );
}
