import { HTMLElementRefOf } from "@plasmicapp/react-web";
import { Collapse, Dropdown, Form, InputNumber, Menu, message } from "antd";
import { FormInstance, useForm } from "antd/lib/form/Form";
import L, { isEqual, sortBy } from "lodash";
import * as React from "react";
import { Prompt, useHistory } from "react-router";
import { useBeforeUnload } from "react-use";
import { ensureType, jsonClone, tuple, uniqueName } from "../../../common";
import {
  ApiCmsDatabase,
  CmsDatabaseId,
  CmsFieldMeta,
  cmsFieldMetaDefaults,
  CmsTableId,
  CmsTypeMeta,
  CmsTypeName,
  cmsTypes,
} from "../../../shared/ApiSchema";
import { useRRouteMatch, UU } from "../../cli-routes";
import { useApi } from "../../contexts/AppContexts";
import PlusIcon from "../../plasmic/plasmic_kit/PlasmicIcon__Plus";
import Trash2Icon from "../../plasmic/plasmic_kit/PlasmicIcon__Trash2";
import {
  DefaultCmsModelDetailsProps,
  PlasmicCmsModelDetails,
} from "../../plasmic/plasmic_kit_cms/PlasmicCmsModelDetails";
import Button from "../widgets/Button";
import { Icon } from "../widgets/Icon";
import Select from "../widgets/Select";
import Textbox from "../widgets/Textbox";
import { useCmsDatabase, useCmsTable, useMutateTable } from "./cms-contexts";
import {
  ContentEntryFormContext,
  renderEntryField,
  renderMaybeLocalizedInput,
  ValueSwitch,
} from "./CmsInputs";

export interface CmsModelDetailsProps extends DefaultCmsModelDetailsProps {}

function renderTypeSpecificSubform(
  database: ApiCmsDatabase,
  databaseId: CmsDatabaseId,
  form: FormInstance,
  typeName: CmsTypeName,
  localized: boolean,
  fieldPath: any[],
  locales: string[],
  typeMeta: CmsTypeMeta
): React.ReactElement {
  return (
    <>
      <ContentEntryFormContext.Provider
        value={{ disabled: false, typeMeta, database, name: fieldPath }}
      >
        {renderMaybeLocalizedInput({
          databaseId: databaseId,
          fieldPath: [...fieldPath, "defaultValueByLocale"],
          localized: localized,
          locales: locales,
          children: renderEntryField(typeName),
          fieldPathSuffix: [],
          formItemProps: { label: "Default value" },
          typeName: typeMeta.type,
          
        })}
      </ContentEntryFormContext.Provider>
      {(typeName === "text" || typeName === "long-text") && (
        <>
          <Form.Item label={"Min chars"} name={[...fieldPath, "minChars"]}>
            <InputNumber />
          </Form.Item>
          <Form.Item label={"Max chars"} name={[...fieldPath, "maxChars"]}>
            <InputNumber />
          </Form.Item>
        </>
      )}
    </>
  );
}

function renderModelFieldForm(
  database: ApiCmsDatabase,
  databaseId: CmsDatabaseId,
  tableId: CmsTableId,
  form: FormInstance,
  fieldPath: any[],
  fullFieldPath: any[],
  fieldsPath: any[],
  fullFieldsPath: any[],
  handles: any,
  locales: string[],
  hasLocalization: boolean
) {
  function moveBy(delta: number) {
    const fields = form.getFieldValue(fullFieldsPath);
    const identifier = form.getFieldValue([...fullFieldPath, "identifier"]);
    const index = fields.findIndex((f) => f.identifier === identifier);
    handles.move(index, index + delta);
  }

  const selectedType = form.getFieldValue([...fullFieldPath, "type"]);

  return (
    <div className={"vlist-gap-xlg"}>
      <Form.Item
        label={"Name"}
        name={[...fieldPath, "identifier"]}
        help={
          <>
            Unique name for this field.{" "}
            <strong>Cannot be renamed without discarding data.</strong>
          </>
        }
        required
      >
        <Textbox styleType={"bordered"} />
      </Form.Item>
      <Form.Item label={"Type"} name={[...fieldPath, "type"]} required>
        <Select
          type={"bordered"}
          onChange={(value) => {
            const meta = cmsFieldMetaDefaults as any;
            for (const key in meta) {
              meta[key] = form.getFieldValue(fullFieldPath)[key];
            }
            meta.type = value;
            // Reset all default values.
            // Both Form.setFields and .setFieldsValues will merge, not overwrite, so we have to explicitly unset!
            // (As well as L.set, but we don't have to use that.)
            // defaultValues are the most important fields to reset.
            meta.defaultValueByLocale = {
              "": undefined,
              ...(hasLocalization
                ? Object.fromEntries(
                    locales.map((locale) => tuple(locale, undefined))
                  )
                : {}),
            };
            if (meta.type === "list" || meta.type === "object") {
              meta.fields = [];
            }
            const blob = jsonClone(form.getFieldValue([]));
            L.set(blob, fullFieldPath, meta);
            form.setFieldsValue(blob);
          }}
        >
          {cmsTypes.map((type) => (
            <Select.Option key={type} value={type}>
              {type}
            </Select.Option>
          ))}
        </Select>
      </Form.Item>
      <Form.Item
        noStyle
        shouldUpdate={(prevValues, currentValues) =>
          L.get(prevValues, [...fieldPath, "type"]) !==
            L.get(currentValues, [...fieldPath, "type"]) ||
          L.get(prevValues, [...fieldPath, "localized"]) !==
            L.get(currentValues, [...fieldPath, "localized"])
        }
      >
        {({ getFieldValue }) => (
          <React.Fragment
            key={JSON.stringify({
              type: getFieldValue([...fullFieldPath, "type"]),
              localized: getFieldValue([...fullFieldPath, "localized"]),
            })}
          >
            {getFieldValue([...fullFieldPath, "type"]) === "ref" && (
              <Form.Item label={"Model"} name={[...fieldPath, "tableId"]}>
                <Select>
                  {database.tables.map((table) => (
                    <Select.Option value={table.id}>{table.name}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            )}
            {(getFieldValue([...fullFieldPath, "type"]) === "list" ||
              getFieldValue([...fullFieldPath, "type"]) === "object") && (
              <Form.Item
                label={"Nested fields"}
                help={"Nested objects should have these fields"}
              >
                <ModelFields
                  database={database}
                  tableId={tableId}
                  fieldsPath={[...fieldPath, "fields"]}
                  fullFieldsPath={[...fullFieldPath, "fields"]}
                  hasLocalization={false}
                />
              </Form.Item>
            )}
          </React.Fragment>
        )}
      </Form.Item>
      {selectedType !== "list" && selectedType !== "object" && (
        <Form.Item
          label={"Required"}
          name={[...fieldPath, "required"]}
          required
        >
          <ValueSwitch />
        </Form.Item>
      )}
      {hasLocalization && (
        <Form.Item
          label={"Localized"}
          name={[...fieldPath, "localized"]}
          required
        >
          <ValueSwitch />
        </Form.Item>
      )}
      <Form.Item
        label={"Helper text"}
        name={[...fieldPath, "helperText"]}
        help={
          "Text to display beneath this input with helpful information. Explain to content editors how the field is used and how it should be set."
        }
      >
        <Textbox styleType={"bordered"} />
      </Form.Item>
      <Form.Item
        label={"Label"}
        name={[...fieldPath, "label"]}
        help={"Override the default label for this field."}
      >
        <Textbox styleType={"bordered"} />
      </Form.Item>
      <Form.Item
        noStyle
        shouldUpdate={(prevValues, currentValues) =>
          L.get(prevValues, [...fieldPath, "type"]) !==
            L.get(currentValues, [...fieldPath, "type"]) ||
          L.get(prevValues, [...fieldPath, "localized"]) !==
            L.get(currentValues, [...fieldPath, "localized"])
        }
      >
        {({ getFieldValue }) => (
          <React.Fragment
            key={JSON.stringify({
              type: getFieldValue([...fullFieldPath, "type"]),
              localized: getFieldValue([...fullFieldPath, "localized"]),
            })}
          >
            {renderTypeSpecificSubform(
              database,
              databaseId,
              form,
              getFieldValue([...fullFieldPath, "type"]),
              getFieldValue([...fullFieldPath, "localized"]) && hasLocalization,
              fieldPath,
              locales,
              getFieldValue([...fullFieldPath])
            )}
          </React.Fragment>
        )}
      </Form.Item>
      <Form.Item label={"Hidden"} name={[...fieldPath, "hidden"]}>
        <ValueSwitch />
      </Form.Item>
      <Form.Item>
        <div className={"flex gap-sm"}>
          <Button
            startIcon={<Icon icon={Trash2Icon} />}
            onClick={() => {
              handles.remove(fieldPath[0]);
            }}
          >
            Delete
          </Button>
          <Dropdown
            // trigger={"click"}
            overlay={
              <Menu>
                <Menu.Item
                  onClick={() => {
                    moveBy(-1);
                  }}
                >
                  Move up
                </Menu.Item>
                <Menu.Item
                  onClick={() => {
                    moveBy(1);
                  }}
                >
                  Move down
                </Menu.Item>
              </Menu>
            }
          >
            <Button>More</Button>
          </Dropdown>
        </div>
      </Form.Item>
    </div>
  );
}

function CmsModelDetails_(
  props: CmsModelDetailsProps,
  ref: HTMLElementRefOf<"div">
) {
  const api = useApi();
  const match = useRRouteMatch(UU.cmsModelSchema)!;
  const history = useHistory();
  const { databaseId, tableId } = match.params;

  const database = useCmsDatabase(databaseId);

  const [form] = useForm();
  const table = useCmsTable(databaseId, tableId);
  const mutateTable = useMutateTable();

  const [hasChanged, setHasChanged] = React.useState<boolean>(false);

  const [isSaving, setSaving] = React.useState(false);

  const updateSchema = async () => {
    setSaving(true);
    await api.updateCmsTable(tableId, {
      name: form.getFieldValue("name"),
      description: form.getFieldValue("description"),
      schema: {
        fields: form.getFieldValue(["schema", "fields"]),
      },
    });
    await mutateTable(databaseId, tableId);
    setSaving(false);
    setHasChanged(false);
  };

  const hasChanges = () => {
    if ((table?.name || "") !== (form.getFieldValue("name") || "")) {
      return true;
    }
    if (
      (table?.description || "") !== (form.getFieldValue("description") || "")
    ) {
      return true;
    }

    const tableFields = [...(table?.schema.fields || [])];
    const schemaFields = [...(form?.getFieldValue(["schema", "fields"]) || [])];

    if (!isEqual(tableFields, schemaFields)) {
      return true;
    }
    const sortedSchemaFields = sortBy(tableFields, ["identifier"]);
    const sortedFields = sortBy(schemaFields, ["identifier"]);
    return !isEqual(sortedSchemaFields, sortedFields);
  };

  useBeforeUnload(() => {
    return hasChanges();
  }, "You have unsaved changes, are you sure ?");

  function computeFormValidationErrorMessage() {
    const fields: CmsFieldMeta[] = form.getFieldValue(["schema", "fields"]);
    if (new Set(fields.map((field) => field.identifier)).size < fields.length) {
      return "Field identifiers must be unique";
    } else {
      return null;
    }
  }

  const [formValidationErrorMessage, setFormValidationErrorMessage] =
    React.useState<undefined | string>(undefined);

  if (!database || !table) {
    return null;
  }

  return (
    <>
      <Prompt
        when={hasChanged}
        message={"You have unsaved changes, are you sure ?"}
      />
      <Form
        form={form}
        className={"max-scrollable fill-width"}
        layout={"vertical"}
        initialValues={table}
        labelCol={{ span: 8 }}
        wrapperCol={{ span: 16 }}
        onFinish={(values) => {
          console.log("finish", values);
        }}
        onValuesChange={(changedValues, allValues) => {
          setFormValidationErrorMessage(
            computeFormValidationErrorMessage() ?? undefined
          );
          setHasChanged(hasChanges());
        }}
        onFieldsChange={(changedFields, allFields) => {
          console.log({ changedFields, allFields });
        }}
      >
        <div style={{ color: "#a00" }}>{formValidationErrorMessage}</div>
        <PlasmicCmsModelDetails
          root={{ ref }}
          {...props}
          saveButton={{
            onClick: async () => {
              if (!computeFormValidationErrorMessage()) {
                await updateSchema();
                await message.success("Saved!");
              }
            },
            disabled: !!formValidationErrorMessage || isSaving || !hasChanged,
            children: isSaving ? "Saving..." : hasChanged ? "Save" : "Saved",
          }}
          menuButton={{
            menu: () => (
              <Menu>
                <Menu.Item
                  key="delete"
                  onClick={async () => {
                    await api.deleteCmsTable(tableId);
                    await mutateTable(databaseId, tableId);
                    history.push(UU.cmsSchemaRoot.fill({ databaseId }));
                  }}
                >
                  Delete model
                </Menu.Item>
              </Menu>
            ),
          }}
          modelNameValue={form.getFieldValue("name") ?? table.name}
          modelName={{
            wrap: (x) => (
              <Form.Item name="name" noStyle>
                {x}
              </Form.Item>
            ),
          }}
          children={
            <div className={"vlist-gap-xlg fill-width"}>
              <Form.Item
                label={<strong>Description</strong>}
                name={"description"}
                help={
                  'Explain what this model is for and give helpful context. For example, "Testimonials are shown on the homepage and checkout page."'
                }
              >
                <Textbox styleType={["bordered", "white"]} />
              </Form.Item>
              <Form.Item
                label={<strong>Unique identifier</strong>}
                name={"identifier"}
                help={"Unique name for this model in APIs"}
              >
                <Textbox styleType={["bordered", "white"]} disabled required />
              </Form.Item>
              <ModelFields
                database={database}
                tableId={tableId}
                fieldsPath={["schema", "fields"]}
                fullFieldsPath={["schema", "fields"]}
                hasLocalization={true}
              />
            </div>
          }
        />
      </Form>
    </>
  );
}

function ModelFields({
  database,
  tableId,
  fieldsPath,
  fullFieldsPath,
  hasLocalization,
}: {
  database: ApiCmsDatabase;
  tableId: CmsTableId;
  fieldsPath: any[];
  fullFieldsPath: any[];
  hasLocalization: boolean;
}) {
  const form = Form.useFormInstance();

  const databaseId = database.id;
  const [expandedKeys, setExpandedKeys] = React.useState<string[] | string>([]);

  return (
    <Form.List name={fieldsPath}>
      {(fields, handles) => {
        return (
          <>
            <Collapse
              activeKey={expandedKeys}
              onChange={(keys) => setExpandedKeys(keys)}
            >
              {fields.map(({ key, name, ...restField }) => (
                <Collapse.Panel
                  key={key}
                  header={
                    <>
                      <Form.Item
                        {...restField}
                        noStyle
                        shouldUpdate={() => true}
                      >
                        {({ getFieldValue }) => (
                          <div className={"flex justify-between flex-fill"}>
                            <div>
                              {getFieldValue([
                                ...fullFieldsPath,
                                name,
                                "identifier",
                              ])}
                            </div>
                            <div>
                              {getFieldValue([...fullFieldsPath, name, "type"])}
                            </div>
                          </div>
                        )}
                      </Form.Item>
                    </>
                  }
                >
                  <Form.Item noStyle shouldUpdate={() => true}>
                    {({ getFieldValue }) =>
                      renderModelFieldForm(
                        database,
                        databaseId,
                        tableId,
                        form,
                        [name],
                        [...fullFieldsPath, name],
                        fieldsPath,
                        fullFieldsPath,
                        handles,
                        database.extraData.locales,
                        hasLocalization
                      )
                    }
                  </Form.Item>
                </Collapse.Panel>
              ))}
            </Collapse>
            <div style={{ marginTop: 8 }}>
              <Button
                withIcons={"startIcon"}
                startIcon={<Icon icon={PlusIcon} />}
                onClick={() => {
                  handles.add(
                    ensureType<CmsFieldMeta>({
                      identifier: uniqueName(
                        form
                          .getFieldValue(fullFieldsPath)
                          .map((field) => field.identifier),
                        `newField`,
                        { separator: "" }
                      ),
                      name: "",
                      localized: false,
                      helperText: "",
                      required: false,
                      hidden: false,
                      type: "text",
                      defaultValueByLocale: {},
                    })
                  );
                }}
              >
                Add field
              </Button>
            </div>
          </>
        );
      }}
    </Form.List>
  );
}

const CmsModelDetails = React.forwardRef(CmsModelDetails_);
export default CmsModelDetails;
