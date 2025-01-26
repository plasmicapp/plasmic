import { UU } from "@/wab/client/cli-routes";
import {
  useCmsDatabase,
  useCmsRow,
  useCmsTable,
  useMutateRow,
  useMutateTableRows,
} from "@/wab/client/components/cms/cms-contexts";
import { CmsEntryCloneModal } from "@/wab/client/components/cms/CmsEntryCloneModal";
import { CmsEntryHistory } from "@/wab/client/components/cms/CmsEntryHistory";
import {
  ContentEntryFormContext,
  deriveFormItemPropsFromField,
  renderEntryField,
  renderMaybeLocalizedInput,
} from "@/wab/client/components/cms/CmsInputs";
import { isCmsTextLike } from "@/wab/client/components/cms/utils";
import { useApi } from "@/wab/client/contexts/AppContexts";
import {
  DefaultCmsEntryDetailsProps,
  PlasmicCmsEntryDetails,
} from "@/wab/client/plasmic/plasmic_kit_cms/PlasmicCmsEntryDetails";
import {
  ApiCmsDatabase,
  ApiCmseRow,
  ApiCmsTable,
  CmsDatabaseId,
  CmsFieldMeta,
  CmsMetaType,
  CmsRowId,
  CmsTableId,
} from "@/wab/shared/ApiSchema";
import { Dict } from "@/wab/shared/collections";
import { spawn } from "@/wab/shared/common";
import { DEVFLAGS } from "@/wab/shared/devflags";
import { substituteUrlParams } from "@/wab/shared/utils/url-utils";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import { Drawer, Form, Menu, message, notification, Tooltip } from "antd";
import { useForm } from "antd/lib/form/Form";
import { isEqual, isNil, mapValues, pickBy } from "lodash";
import * as React from "react";
import { Prompt, Route, useHistory, useRouteMatch } from "react-router";
import { useBeforeUnload, useInterval } from "react-use";

export type CmsEntryDetailsProps = DefaultCmsEntryDetailsProps;

function getRowIdentifierText(
  table: ApiCmsTable,
  row: ApiCmseRow,
  formIdentifier?: string
) {
  const identifier = formIdentifier ?? row.identifier;
  if (identifier) {
    return { identifier };
  }

  const firstTextField = table.schema.fields.find((field, _) =>
    [CmsMetaType.TEXT, CmsMetaType.LONG_TEXT].includes(field.type)
  )?.identifier;
  if (firstTextField) {
    const placeholder = (row.draftData?.[""]?.[firstTextField] ||
      row.data?.[""]?.[firstTextField]) as string | undefined;
    if (placeholder) {
      return { placeholder };
    }
  }

  return {};
}

export function getRowIdentifierNode(
  table: ApiCmsTable,
  row: ApiCmseRow,
  formIdentifier?: string
) {
  const { identifier, placeholder } = getRowIdentifierText(
    table,
    row,
    formIdentifier
  );
  return (
    identifier ?? <div className="dimfg">{placeholder || "Untitled entry"}</div>
  );
}

function CmsEntryDetails_(
  props: CmsEntryDetailsProps,
  ref: HTMLElementRefOf<"div">
) {
  const { ...rest } = props;
  const match = useRouteMatch<{
    databaseId: CmsDatabaseId;
    tableId: CmsTableId;
    rowId: CmsRowId;
  }>();
  const { tableId, rowId, databaseId } = match.params;
  const database = useCmsDatabase(databaseId);
  const row = useCmsRow(tableId, rowId);
  const table = useCmsTable(databaseId, tableId);

  if (!row || !table || !database) {
    return null;
  } else {
    return (
      <CmsEntryDetailsForm
        table={table}
        row={row}
        database={database}
        key={rowId}
        {...rest}
        ref={ref}
      />
    );
  }
}

export function renderContentEntryFormFields(
  table: ApiCmsTable,
  database: ApiCmsDatabase,
  locales: string[],
  disabled: boolean
) {
  return (
    <>
      {table.schema.fields
        .filter((field: CmsFieldMeta) => !field.hidden)
        .map((field: CmsFieldMeta, index) => (
          <React.Fragment key={field.identifier}>
            <ContentEntryFormContext.Provider
              value={{
                disabled,
                typeMeta: field,
                database,
                name: [field.identifier],
              }}
            >
              {renderMaybeLocalizedInput({
                databaseId: database.id,
                fieldPath: [],
                localized: field.localized,
                locales: locales,
                children: renderEntryField(field.type),
                fieldPathSuffix: [field.identifier],
                formItemProps: deriveFormItemPropsFromField(field),
                typeName: field.type,
                required: field.required,
                ...(isCmsTextLike(field)
                  ? {
                      maxChars: field.maxChars,
                      minChars: field.minChars,
                    }
                  : {}),
              })}
            </ContentEntryFormContext.Provider>
          </React.Fragment>
        ))}
    </>
  );
}

const CmsEntryDetails = React.forwardRef(CmsEntryDetails_);
export default CmsEntryDetails;

function CmsEntryDetailsForm_(
  props: {
    database: ApiCmsDatabase;
    table: ApiCmsTable;
    row: ApiCmseRow;
  },
  ref: HTMLElementRefOf<"div">
) {
  const { database, table, row, ...rest } = props;
  const api = useApi();

  const [isSaving, setSaving] = React.useState(false);
  const [isPublishing, setPublishing] = React.useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = React.useState(false);
  const [hasUnpublishedChanges, setHasUnpublishedChanges] = React.useState(
    !!row?.draftData
  );
  const [showDuplicateModal, setShowDuplicateModal] = React.useState(false);
  const [isDuplicating, setDuplicating] = React.useState(false);

  const [revision, setRevision] = React.useState(row.revision);
  const [inConflict, setInConflict] = React.useState(false);
  const mutateRow_ = useMutateRow();
  const mutateTableRows = useMutateTableRows();

  const mutateRow = async () => {
    const newRow = await mutateRow_(table.id, row.id);
    if (newRow) {
      setRevision(newRow.revision);
    }
  };

  const history = useHistory();

  const [form] = useForm();

  const hasFormError = React.useCallback(() => {
    return form.getFieldsError().some((f) => f.errors.length > 0);
  }, [form]);

  const dataEquals = (
    data1: Dict<Dict<unknown>> | null | undefined,
    data2: Dict<Dict<unknown>> | null | undefined
  ) => {
    const fields = table.schema.fields
      .filter((f) => !f.hidden)
      .map((f) => f.identifier);
    return isEqual(
      mapValues(
        pickBy(data1, (v, k) => !isNil(v)),
        (v) => pickBy(v, (v2, k) => !isNil(v2) && fields?.includes(k))
      ),
      mapValues(
        pickBy(data2, (v, k) => !isNil(v)),
        (v) => pickBy(v, (v2, k) => !isNil(v2) && fields?.includes(k))
      )
    );
  };

  function removeUndefined(obj) {
    if (Array.isArray(obj)) {
      return obj.map(removeUndefined);
    } else if (typeof obj === "object" && obj !== null) {
      return Object.fromEntries(
        Object.entries(obj)
          .map(([key, value]) => [key, removeUndefined(value)])
          .filter(([key, value]) => value !== undefined)
      );
    } else {
      return obj;
    }
  }

  const hasChanges = () => {
    const { identifier, ...draftData } = form.getFieldsValue();
    return (
      row.identifier !== (identifier ?? row.identifier) ||
      (Object.keys(draftData).length > 0 &&
        !dataEquals(row.draftData ?? row.data, removeUndefined(draftData)))
    );
  };

  const hasPublishableChanges = () => {
    const { identifier, ...draftData } = form.getFieldsValue();
    return (
      row.identifier !== (identifier ?? row.identifier) ||
      (Object.keys(draftData).length > 0 && !dataEquals(row.data, draftData))
    );
  };

  const resetFormByRow = async () => {
    form.resetFields();
    setHasUnsavedChanges(false);
    setHasUnpublishedChanges(hasPublishableChanges());
    await validateFields();
  };

  const warnConflict = () => {
    notification.error({
      message: "Update conflict detected",
      key: "cms-row-conflict",
      description: (
        <div>
          Someone just updated this entry, so your edits have been blocked.
          Please{" "}
          <a
            onClick={async () => {
              spawn(
                message.loading({
                  content: "Refreshing data...",
                  key: "update-message",
                  duration: undefined,
                })
              );
              await mutateRow();
              notification.close("cms-row-conflict");
              await resetFormByRow();
              message.destroy("update-message");
              setInConflict(false);
            }}
          >
            reload this entry
          </a>{" "}
          and try editing again.
        </div>
      ),
      duration: 0,
    });
    setInConflict(true);
  };

  async function performSave() {
    const { identifier, ...draftData } = form.getFieldsValue();
    try {
      setSaving(true);
      await api.updateCmsRow(row.id, {
        identifier,
        draftData,
        revision,
      });
      await mutateRow();
      setSaving(false);
      setHasUnsavedChanges(false);
    } catch (err) {
      setSaving(false);
      if (err.statusCode === 400) {
        warnConflict();
      }
    }
  }

  const validateFields = React.useCallback(async () => {
    const isValidated = async () => {
      try {
        await form.validateFields();
        return true;
      } catch (err) {
        console.error("Validation failed:", err);
        return !(err.errorFields?.length > 0);
      }
    };
    const validated = await isValidated();
    return validated;
  }, [form]);

  useInterval(async () => {
    if (revision !== row.revision) {
      if (hasUnsavedChanges) {
        warnConflict();
      } else {
        spawn(
          message.info({
            content: "Updated to latest changes",
            key: "update-message",
          })
        );
        setRevision(row.revision);
        await resetFormByRow();
      }
    } else if (hasChanges() && !hasFormError()) {
      if (!isSaving) {
        spawn(performSave());
      }
    }
  }, 2000);

  React.useEffect(() => {
    spawn(validateFields());
  }, [row, validateFields]);

  useBeforeUnload(() => {
    return hasChanges();
  }, "You have unsaved changes, are you sure?");

  const { identifier: entryIdenfitier, placeholder: entryPlaceholder } =
    getRowIdentifierText(table, row);
  const entryDisplayName =
    entryIdenfitier || entryPlaceholder
      ? `"${entryIdenfitier || entryPlaceholder}" entry`
      : "untitled entry";

  return (
    <>
      <Prompt
        when={hasUnsavedChanges}
        message={"You have unsaved changes, are you sure?"}
      />
      <Route
        path={UU.cmsEntryRevisions.pattern}
        render={() => (
          <Drawer
            title={"Entry revisions"}
            placement="right"
            onClose={() =>
              history.push(
                UU.cmsEntry.fill({
                  databaseId: database.id,
                  tableId: table.id,
                  rowId: row.id,
                })
              )
            }
            visible={true}
            width={"80%"}
          >
            <CmsEntryHistory
              databaseId={database.id}
              tableId={table.id}
              rowId={row.id}
            />
          </Drawer>
        )}
      />
      <Form
        form={form}
        layout={"vertical"}
        name={"number"}
        initialValues={{
          ...(row ? row.draftData ?? row.data ?? {} : undefined),
          identifier: row.identifier,
        }}
        labelCol={{ span: 8 }}
        wrapperCol={{ span: 16 }}
        onValuesChange={(changedValues, allValues) => {
          if (Object.keys(changedValues).length > 0) {
            setHasUnsavedChanges(hasChanges());
            setHasUnpublishedChanges(hasPublishableChanges());
            console.log({ changedFields: changedValues, allFields: allValues });
          }
        }}
        className={"max-scrollable fill-width"}
      >
        {DEVFLAGS.debugCmsForms && (
          <Form.Item shouldUpdate={() => true}>
            {(theform) => (
              <pre>
                Data: {JSON.stringify(theform.getFieldsValue(), null, 2)}
              </pre>
            )}
          </Form.Item>
        )}{" "}
        <PlasmicCmsEntryDetails
          root={{ ref }}
          {...rest}
          saveStatus={
            <Form.Item noStyle shouldUpdate>
              {() =>
                inConflict ? (
                  <span className="light-error">Conflict detected.</span>
                ) : hasFormError() ? (
                  <span className="light-error">Some fields are invalid.</span>
                ) : isSaving ? (
                  "Saving draft..."
                ) : hasUnsavedChanges ? (
                  "Edited."
                ) : (
                  "Auto-saved."
                )
              }
            </Form.Item>
          }
          previewButton={
            table.settings?.previewUrl
              ? {
                  props: {
                    href: substituteUrlParams(
                      table.settings.previewUrl,
                      (row.draftData?.[""] ?? row.data?.[""] ?? {}) as Record<
                        string,
                        string
                      >
                    ),
                    target: "_blank",
                  },
                }
              : {
                  render: () => null,
                }
          }
          publishButton={{
            render: (ps, Comp) => (
              // Wrap in Form.Item so it can react to form error state
              <Form.Item noStyle shouldUpdate>
                {() => (
                  <Comp
                    {...ps}
                    onClick={async () => {
                      console.log("Publish", form.getFieldsValue());
                      if (row.revision !== revision) {
                        warnConflict();
                      } else if (row && !hasFormError()) {
                        setPublishing(true);
                        const { identifier, ...draftData } =
                          form.getFieldsValue();
                        await api.updateCmsRow(row.id, {
                          identifier,
                          data: draftData,
                          draftData: null,
                          revision,
                        });
                        await mutateRow();
                        setPublishing(false);
                        setHasUnpublishedChanges(false);
                        await message.success({
                          content: "Your changes have been published.",
                          duration: 5,
                        });
                        const hooks = table.settings?.webhooks?.filter(
                          (hook) => hook.event === "publish"
                        );
                        if (hooks && hooks.length > 0) {
                          const hooksResp = await api.triggerCmsTableWebhooks(
                            table.id,
                            "publish"
                          );
                          const failed = hooksResp.responses.filter(
                            (r) => r.status !== 200
                          );
                          if (failed.length > 0) {
                            await message.warning({
                              content: "Some publish hooks failed.",
                              duration: 5,
                            });
                          }
                        }
                      }
                    }}
                    disabled={
                      !hasUnpublishedChanges ||
                      isPublishing ||
                      isSaving ||
                      hasUnsavedChanges ||
                      hasFormError()
                    }
                    tooltip={
                      hasFormError()
                        ? "Cannot publish because some fields are invalid"
                        : !hasUnpublishedChanges
                        ? "All changes have been published"
                        : "Publish this entry publicly"
                    }
                    children={
                      isPublishing
                        ? "Publishing..."
                        : !hasUnpublishedChanges
                        ? "Published"
                        : "Publish"
                    }
                  />
                )}
              </Form.Item>
            ),
          }}
          menuButton={{
            menu: () => (
              <Menu>
                {row.data && (
                  <>
                    <Menu.Item
                      key="unpublish"
                      onClick={async () => {
                        await message.loading({
                          key: "unpublish-message",
                          content: "Unpublishing...",
                        });
                        await api.updateCmsRow(row.id, {
                          data: null,
                          revision,
                        });
                        await mutateRow();
                        setHasUnpublishedChanges(hasPublishableChanges());
                        await validateFields();
                        await message.success({
                          key: "unpublish-message",
                          content: "Unpublished.",
                        });
                      }}
                      disabled={isSaving || isPublishing}
                    >
                      <Tooltip title="Unpublishing removes the published status of the entry">
                        <span>Unpublish entry</span>
                      </Tooltip>
                    </Menu.Item>
                    {row.data && row.draftData && (
                      <Menu.Item
                        key="revert"
                        onClick={async () => {
                          await message.loading({
                            key: "revert-message",
                            content: "Reverting...",
                          });
                          await api.updateCmsRow(row.id, {
                            draftData: null,
                            revision,
                          });
                          await mutateRow();
                          await resetFormByRow();
                          setHasUnpublishedChanges(hasPublishableChanges());
                          await validateFields();
                          await message.success({
                            key: "revert-message",
                            content: "Reverted.",
                          });
                        }}
                        disabled={isSaving}
                      >
                        <Tooltip title="Reverts draft data to previously-published data">
                          <span>Revert to published entry</span>
                        </Tooltip>
                      </Menu.Item>
                    )}
                  </>
                )}
                <Menu.Item
                  key="duplicate"
                  onClick={() => setShowDuplicateModal(true)}
                  disabled={isSaving || isPublishing}
                >
                  <span>Duplicate entry</span>
                </Menu.Item>
                <Menu.Item
                  key="delete"
                  onClick={async () => {
                    await api.deleteCmsRow(row.id);
                    await mutateRow();
                    history.push(
                      UU.cmsModelContent.fill({
                        databaseId: database.id,
                        tableId: table.id,
                      })
                    );
                  }}
                >
                  Delete entry
                </Menu.Item>
              </Menu>
            ),
          }}
          historyButton={{
            href: UU.cmsEntryRevisions.fill({
              databaseId: database.id,
              tableId: table.id,
              rowId: row.id,
            }),
            tooltip: "Show revision history",
          }}
          children={
            <div className={"vlist-gap-xlg fill-width"}>
              {renderContentEntryFormFields(
                table!,
                database,
                database.extraData.locales,
                inConflict
              )}
            </div>
          }
          entryNameValue={getRowIdentifierNode(
            table,
            row,
            form.getFieldValue("identifier")
          )}
          entryName={{
            wrap: (x) => (
              <Form.Item name="identifier" noStyle>
                {x}
              </Form.Item>
            ),
          }}
        />
      </Form>
      <CmsEntryCloneModal
        open={showDuplicateModal}
        disabled={isDuplicating}
        defaultIdentifier={
          row.identifier ? `Duplicate of ${row.identifier}` : ""
        }
        entryDisplayName={entryDisplayName}
        placeholderIdentifier={entryPlaceholder}
        onClone={async (newIdentifier) => {
          await message.loading({
            key: "duplicate-message",
            content: `Duplicating ${entryDisplayName}...`,
          });
          try {
            setDuplicating(true);
            const clonedRow = await api.cloneCmsRow(row.id, {
              identifier: newIdentifier,
            });
            await mutateTableRows(table.id);
            setShowDuplicateModal(false);
            history.push(
              UU.cmsEntry.fill({
                databaseId: database.id,
                tableId: table.id,
                rowId: clonedRow.id,
              })
            );
            await message.success({
              key: "duplicate-message",
              content: `A duplicate of ${entryDisplayName} has been created. You are now viewing the duplicated entry.`,
            });
          } finally {
            setDuplicating(false);
          }
        }}
        onCancel={() => setShowDuplicateModal(false)}
      />
    </>
  );
}

const CmsEntryDetailsForm = React.forwardRef(CmsEntryDetailsForm_);
