import { useRRouteMatch } from "@/wab/client/cli-routes";
import {
  useCmsDatabase,
  useCmsTable,
  useMutateTable,
} from "@/wab/client/components/cms/cms-contexts";
import {
  ContentEntryFormContext,
  renderEntryField,
  renderMaybeLocalizedInput,
  ValueSwitch,
} from "@/wab/client/components/cms/CmsInputs";
import { confirm } from "@/wab/client/components/quick-modals";
import PlasmicWebhookHeader from "@/wab/client/components/webhooks/plasmic/plasmic_kit_continuous_deployment/PlasmicWebhookHeader";
import PlasmicWebhooksItem from "@/wab/client/components/webhooks/plasmic/plasmic_kit_continuous_deployment/PlasmicWebhooksItem";
import { Spinner } from "@/wab/client/components/widgets";
import Button from "@/wab/client/components/widgets/Button";
import { Icon } from "@/wab/client/components/widgets/Icon";
import { Modal } from "@/wab/client/components/widgets/Modal";
import Select from "@/wab/client/components/widgets/Select";
import Textbox from "@/wab/client/components/widgets/Textbox";
import { useApi } from "@/wab/client/contexts/AppContexts";
import MinusIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Minus";
import PlusIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Plus";
import Trash2Icon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Trash2";
import {
  DefaultCmsModelDetailsProps,
  PlasmicCmsModelDetails,
} from "@/wab/client/plasmic/plasmic_kit_cms/PlasmicCmsModelDetails";
import {
  ApiCmsDatabase,
  CMS_TYPE_DISPLAY_NAMES,
  CmsDatabaseId,
  CmsFieldMeta,
  cmsFieldMetaDefaults,
  CmsMetaType,
  CmsTableId,
  CmsTableSettings,
  CmsTypeMeta,
  CmsTypeName,
} from "@/wab/shared/ApiSchema";
import { ALLOWED_UNIQUE_TYPES } from "@/wab/shared/cms";
import {
  ensureType,
  jsonClone,
  remove,
  spawn,
  tuple,
  uniqueName,
} from "@/wab/shared/common";
import { extractParamsFromPagePath } from "@/wab/shared/core/components";
import { DEVFLAGS } from "@/wab/shared/devflags";
import { httpMethods } from "@/wab/shared/HttpClientUtil";
import { APP_ROUTES } from "@/wab/shared/route/app-routes";
import { fillRoute } from "@/wab/shared/route/route";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import {
  Collapse,
  Dropdown,
  Form,
  Input,
  InputNumber,
  Menu,
  message,
  notification,
} from "antd";
import { FormInstance, useForm } from "antd/lib/form/Form";
import L, { isEqual, sortBy } from "lodash";
import * as React from "react";
import { Prompt, useHistory } from "react-router";
import { useBeforeUnload } from "react-use";

const NESTED_TYPES = [CmsMetaType.LIST, CmsMetaType.OBJECT];

const COLUMN_ITEM_PROPS = {
  style: { width: "150px" },
  labelCol: { span: 24 },
};

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
      {[CmsMetaType.TEXT, CmsMetaType.LONG_TEXT].includes(typeName) && (
        <div className={"flex-row gap-sm"}>
          <Form.Item
            {...COLUMN_ITEM_PROPS}
            label={"Min chars"}
            name={[...fieldPath, "minChars"]}
          >
            <InputNumber />
          </Form.Item>
          <Form.Item
            {...COLUMN_ITEM_PROPS}
            label={"Max chars"}
            name={[...fieldPath, "maxChars"]}
          >
            <InputNumber />
          </Form.Item>
        </div>
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
  isNested: boolean
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
            const meta: any = { ...cmsFieldMetaDefaults };
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
              ...(!isNested
                ? Object.fromEntries(
                    locales.map((locale) => tuple(locale, undefined))
                  )
                : {}),
            };
            if (NESTED_TYPES.includes(meta.type)) {
              meta.fields = [];
            }
            if (!ALLOWED_UNIQUE_TYPES.includes(meta.type)) {
              meta.unique = false;
            }
            const blob = jsonClone(form.getFieldValue([]));
            L.set(blob, fullFieldPath, meta);
            form.setFieldsValue(blob);
          }}
        >
          {Object.keys(CMS_TYPE_DISPLAY_NAMES).map((key) => (
            <Select.Option key={key} value={key}>
              {CMS_TYPE_DISPLAY_NAMES[key]}
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
            {getFieldValue([...fullFieldPath, "type"]) === CmsMetaType.REF && (
              <Form.Item label={"Model"} name={[...fieldPath, "tableId"]}>
                <Select>
                  {database.tables.map((table) => (
                    <Select.Option value={table.id}>{table.name}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            )}
            {NESTED_TYPES.includes(
              getFieldValue([...fullFieldPath, "type"])
            ) && (
              <Form.Item
                label={"Nested fields"}
                help={"Nested objects should have these fields"}
              >
                <ModelFields
                  database={database}
                  tableId={tableId}
                  fieldsPath={[...fieldPath, "fields"]}
                  fullFieldsPath={[...fullFieldPath, "fields"]}
                  isNested={true}
                />
              </Form.Item>
            )}
          </React.Fragment>
        )}
      </Form.Item>
      {selectedType === CmsMetaType.ENUM && (
        <Form.Item label={"Options"} name={[...fieldPath, "options"]}>
          <FieldOptions fieldsPath={[...fieldPath, "options"]} />
        </Form.Item>
      )}
      <div className={"flex-row gap-sm"}>
        {!NESTED_TYPES.includes(selectedType) && (
          <Form.Item
            {...COLUMN_ITEM_PROPS}
            label={"Required"}
            name={[...fieldPath, "required"]}
          >
            <ValueSwitch />
          </Form.Item>
        )}
        <Form.Item
          {...COLUMN_ITEM_PROPS}
          label={"Hidden"}
          name={[...fieldPath, "hidden"]}
        >
          <ValueSwitch />
        </Form.Item>
      </div>
      {!isNested && (
        <div className={"flex-row gap-sm"}>
          <Form.Item
            {...COLUMN_ITEM_PROPS}
            label={"Localized"}
            name={[...fieldPath, "localized"]}
          >
            <ValueSwitch
              disabled={form.getFieldValue([...fullFieldPath, "unique"])}
              tooltip={
                form.getFieldValue([...fullFieldPath, "unique"])
                  ? "Unique fields cannot be localized."
                  : undefined
              }
            />
          </Form.Item>
          {DEVFLAGS.cmsUniqueFields &&
            ALLOWED_UNIQUE_TYPES.includes(selectedType) && (
              <Form.Item
                {...COLUMN_ITEM_PROPS}
                label={"Unique"}
                name={[...fieldPath, "unique"]}
              >
                <ValueSwitch
                  disabled={form.getFieldValue([...fullFieldPath, "localized"])}
                  tooltip={
                    form.getFieldValue([...fullFieldPath, "localized"])
                      ? "Localized fields cannot be unique."
                      : undefined
                  }
                />
              </Form.Item>
            )}
        </div>
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
              getFieldValue([...fullFieldPath, "localized"]) && !isNested,
              fieldPath,
              locales,
              getFieldValue([...fullFieldPath])
            )}
          </React.Fragment>
        )}
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

export type CmsModelDetailsProps = DefaultCmsModelDetailsProps;

export function CmsModelDetails_(
  props: CmsModelDetailsProps,
  ref: HTMLElementRefOf<"div">
) {
  const api = useApi();
  const match = useRRouteMatch(APP_ROUTES.cmsModelSchema)!;
  const history = useHistory();
  const { databaseId, tableId } = match.params;
  const [showSettingsModal, setShowSettingsModal] = React.useState(false);

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
  }, "You have unsaved changes, are you sure?");

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
        message={"You have unsaved changes, are you sure?"}
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
                  key="settings"
                  onClick={() => {
                    setShowSettingsModal(true);
                  }}
                >
                  Configure settings
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item
                  key="archive"
                  onClick={async () => {
                    await api.updateCmsTable(tableId, {
                      isArchived: !table.isArchived,
                    });
                    await mutateTable(databaseId, tableId);
                    notification.success({
                      message: `Successfully ${
                        !table.isArchived ? "archived" : "unarchived"
                      } model`,
                    });
                  }}
                >
                  {!table.isArchived ? "Archive" : "Unarchive"} model
                </Menu.Item>
                <Menu.Item
                  key="delete"
                  onClick={async () => {
                    const confirmed = await confirm({
                      title: "Delete model",
                      message: `Are you sure you want to delete model "${table.name}"?`,
                    });
                    if (confirmed) {
                      await api.deleteCmsTable(tableId);
                      await mutateTable(databaseId, tableId);
                      history.push(
                        fillRoute(APP_ROUTES.cmsSchemaRoot, { databaseId })
                      );
                    }
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
                isNested={false}
              />
            </div>
          }
        />
      </Form>
      {showSettingsModal && (
        <ModelSettingsModal
          databaseId={databaseId}
          tableId={tableId}
          onClose={() => setShowSettingsModal(false)}
        />
      )}
    </>
  );
}

function ModelFields({
  database,
  tableId,
  fieldsPath,
  fullFieldsPath,
  isNested,
}: {
  database: ApiCmsDatabase;
  tableId: CmsTableId;
  fieldsPath: any[];
  fullFieldsPath: any[];
  isNested: boolean;
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
                              {
                                CMS_TYPE_DISPLAY_NAMES[
                                  getFieldValue([
                                    ...fullFieldsPath,
                                    name,
                                    "type",
                                  ])
                                ]
                              }
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
                        isNested
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
                      unique: false,
                      type: CmsMetaType.TEXT,
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

function FieldOptions({ fieldsPath }: { fieldsPath: any[] }) {
  return (
    <Form.List name={fieldsPath}>
      {(fields, handles) => {
        return (
          <>
            {fields?.map((_field, index) => (
              <div className="cms-option-list" key={index}>
                <Form.Item name={index} style={{ width: "100%" }}>
                  <Textbox styleType={"bordered"} />
                </Form.Item>
                <Button onClick={() => handles.remove(index)}>
                  <Icon icon={MinusIcon} />
                </Button>
              </div>
            ))}
            <Button
              withIcons={"startIcon"}
              startIcon={<Icon icon={PlusIcon} />}
              onClick={() => {
                handles.add("");
              }}
            >
              Add option
            </Button>
          </>
        );
      }}
    </Form.List>
  );
}

function ModelSettingsModal(props: {
  databaseId: CmsDatabaseId;
  tableId: CmsTableId;
  onClose: () => void;
}) {
  const { onClose, databaseId, tableId } = props;
  const table = useCmsTable(databaseId, tableId);
  const api = useApi();
  const [saving, setSaving] = React.useState(false);
  const mutateTable = useMutateTable();
  return (
    <Modal
      title={`${table?.name} Settings`}
      footer={null}
      open={true}
      onCancel={onClose}
    >
      {!table ? (
        <Spinner />
      ) : (
        <Form
          initialValues={table.settings ?? undefined}
          onFinish={async (values) => {
            console.log("FORM VALUES", values);
            setSaving(true);
            normalizeTableSettings(values);
            await api.updateCmsTable(tableId, {
              settings: values,
            });
            await mutateTable(databaseId, tableId);
            setSaving(false);
            spawn(message.success("Model settings have been saved."));
            onClose();
          }}
          disabled={saving}
        >
          <Form.Item
            label="Preview URL"
            name="previewUrl"
            extra={
              <>
                A url for previewing entries from this model. The url can
                reference model fields within <code>[brackets]</code>, and they
                will be substituted with the values from the entry you are
                looking at. For example,{" "}
                <code>https://preview.mysite.com/blogs/[slug]</code> will have{" "}
                <code>[slug]</code> filled in with the "slug" field on the model
                entry.
              </>
            }
            rules={[
              { type: "url" },
              {
                validator: (_, value, callback) => {
                  const pathParams = extractParamsFromPagePath(value);
                  const invalidParams = pathParams.filter(
                    (p) => !table.schema.fields.find((f) => f.identifier === p)
                  );
                  if (invalidParams.length > 0) {
                    callback(
                      `URL references fields that don't exist on this model: ${invalidParams.join(
                        ", "
                      )}`
                    );
                  } else {
                    callback();
                  }
                },
              },
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item label="Publish Webhooks">
            <p>
              You can specify webhooks that are triggered whenever a CMS entry
              is published.
            </p>
            <Form.List name={["webhooks"]}>
              {(fields, handles) => (
                <div className="flex-col vlist-gap-m">
                  {fields.map((field) => (
                    <WebhookForm
                      fieldPath={[field.name]}
                      onDelete={() => handles.remove(field.name)}
                    />
                  ))}
                  <Button
                    style={{ alignSelf: "flex-start" }}
                    onClick={() =>
                      handles.add({
                        method: "GET",
                        event: "publish",
                      })
                    }
                  >
                    Add webhook
                  </Button>
                </div>
              )}
            </Form.List>
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit">
              Save
            </Button>
            <Button className="ml-ch" onClick={() => onClose()}>
              Cancel
            </Button>
          </Form.Item>
        </Form>
      )}
    </Modal>
  );
}

function normalizeTableSettings(settings: CmsTableSettings) {
  if (settings.previewUrl && settings.previewUrl.trim() === "") {
    settings.previewUrl = undefined;
  }
  if (settings.webhooks) {
    for (const hook of [...settings.webhooks]) {
      if (!hook.method || !hook.url) {
        remove(settings.webhooks, hook);
      }
      if (hook.headers) {
        for (const header of [...hook.headers]) {
          if (!header.key || !header.value) {
            remove(hook.headers, header);
          }
        }
      }
    }
  }
  return settings;
}

function WebhookForm(props: {
  fieldPath: (string | number)[];
  onDelete: () => void;
}) {
  const { fieldPath, onDelete } = props;
  return (
    <>
      <PlasmicWebhooksItem
        checkbox={{ render: () => null }}
        method={{
          wrap: (x) => (
            <Form.Item name={[...fieldPath, "method"]} noStyle>
              {x}
            </Form.Item>
          ),
          props: {
            children: httpMethods.map((m) => (
              <Select.Option value={m} key={m}>
                {m}
              </Select.Option>
            )),
          },
        }}
        url={{
          wrap: (x) => (
            <Form.Item
              name={[...fieldPath, "url"]}
              noStyle
              rules={[{ type: "url" }]}
            >
              {x}
            </Form.Item>
          ),
        }}
        payload={{
          wrap: (x) => (
            <Form.Item name={[...fieldPath, "payload"]} noStyle>
              {x}
            </Form.Item>
          ),
        }}
        menuButton={{
          menu: () => (
            <Menu>
              <Menu.Item onClick={() => onDelete()}>Delete webhook</Menu.Item>
            </Menu>
          ),
        }}
        expanded={true}
        headers={
          <Form.List name={[...fieldPath, "headers"]}>
            {(fields, handles) => (
              <div className="flex-col vlist-gap-sm">
                {fields.map((field, index) => (
                  <PlasmicWebhookHeader
                    keyInput={{
                      wrap: (x) => (
                        <Form.Item name={[field.name, "key"]} noStyle>
                          {x}
                        </Form.Item>
                      ),
                    }}
                    valueInput={{
                      wrap: (x) => (
                        <Form.Item name={[field.name, "value"]} noStyle>
                          {x}
                        </Form.Item>
                      ),
                    }}
                    addButton={{
                      render: () => null,
                    }}
                    deleteButton={{
                      onClick: () => handles.remove(index),
                      tooltip: "Delete header",
                    }}
                  />
                ))}
                <Button
                  style={{ alignSelf: "flex-start", marginLeft: 126 }}
                  type={"link"}
                  onClick={() => handles.add()}
                >
                  Add header
                </Button>
              </div>
            )}
          </Form.List>
        }
        sendDataField={{
          render: () => null,
        }}
      />
      <Form.Item hidden name={[...fieldPath, "event"]}>
        <Input hidden />
      </Form.Item>
    </>
  );
}

const CmsModelDetails = React.forwardRef(CmsModelDetails_);
export default CmsModelDetails;
