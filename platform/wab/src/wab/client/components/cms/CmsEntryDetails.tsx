import { Api } from "@/wab/client/api";
import { CmsEntryCloneModal } from "@/wab/client/components/cms/CmsEntryCloneModal";
import { CmsEntryHistory } from "@/wab/client/components/cms/CmsEntryHistory";
import {
  ContentEntryFormContext,
  deriveFormItemPropsFromField,
  renderEntryField,
  renderMaybeLocalizedInput,
} from "@/wab/client/components/cms/CmsInputs";
import {
  useCmsDatabase,
  useCmsRow,
  useCmsTable,
  useMutateRow,
  useMutateTableRows,
} from "@/wab/client/components/cms/cms-contexts";
import { isCmsTextLike } from "@/wab/client/components/cms/utils";
import { confirm } from "@/wab/client/components/quick-modals";
import { useApi } from "@/wab/client/contexts/AppContexts";
import {
  DefaultCmsEntryDetailsProps,
  PlasmicCmsEntryDetails,
} from "@/wab/client/plasmic/plasmic_kit_cms/PlasmicCmsEntryDetails";
import { PromisifyMethods } from "@/wab/commons/promisify-methods";
import { isUniqueViolationError } from "@/wab/shared/ApiErrors/cms-errors";
import {
  ApiCmsDatabase,
  ApiCmsTable,
  ApiCmseRow,
  CmsDatabaseId,
  CmsFieldMeta,
  CmsMetaType,
  CmsRowData,
  CmsRowId,
  CmsTableId,
  UniqueFieldCheck,
} from "@/wab/shared/ApiSchema";
import { getUniqueFieldsData } from "@/wab/shared/cms";
import { Dict } from "@/wab/shared/collections";
import { spawn } from "@/wab/shared/common";
import { DEVFLAGS } from "@/wab/shared/devflags";
import { APP_ROUTES } from "@/wab/shared/route/app-routes";
import { fillRoute } from "@/wab/shared/route/route";
import { substituteUrlParams } from "@/wab/shared/utils/url-utils";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import { Drawer, Form, Menu, Tooltip, message, notification } from "antd";
import { useForm } from "antd/lib/form/Form";
import { isEqual, isNil, mapValues, pickBy } from "lodash";
import * as React from "react";
import { Prompt, Route, useHistory, useRouteMatch } from "react-router";
import { useBeforeUnload, useInterval } from "react-use";

export type CmsEntryDetailsProps = DefaultCmsEntryDetailsProps;
export type UniqueFieldStatus =
  | {
      value: unknown;
      status: "not started" | "pending" | "ok";
    }
  | {
      value: unknown;
      status: "violation";
      conflictRowId: CmsRowId;
    };

function dataToUniqueStatus(
  uniqueData: Dict<unknown>,
  status: "not started" | "pending" | "ok"
): Dict<UniqueFieldStatus> {
  const uniqueStatus: Dict<UniqueFieldStatus> = {};
  Object.entries(uniqueData).forEach(([fieldIdentifier, fieldValue]) => {
    uniqueStatus[fieldIdentifier] = {
      value: fieldValue,
      status: status,
    };
  });
  return uniqueStatus as Dict<UniqueFieldStatus>;
}

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
  disabled: boolean,
  uniqueFieldStatus?: Dict<UniqueFieldStatus>
) {
  return (
    <>
      {table.schema.fields
        .filter((field: CmsFieldMeta) => !field.hidden)
        .map((field: CmsFieldMeta) => (
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
                uniqueStatus: uniqueFieldStatus
                  ? uniqueFieldStatus[field.identifier]
                  : undefined,
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

  const [uniqueFieldsStatus, setUniqueFieldsStatus] = React.useState<
    Dict<UniqueFieldStatus>
  >(() => {
    if (row.draftData) {
      const uniqueDraftFields = getUniqueFieldsData(table, row.draftData);
      return dataToUniqueStatus(uniqueDraftFields, "not started");
    } else if (row.data) {
      const uniquePublishedFields = getUniqueFieldsData(table, row.data);
      return dataToUniqueStatus(uniquePublishedFields, "ok");
    }
    return {};
  });
  const handleUniqueFieldChecks = React.useCallback(
    (checks: UniqueFieldCheck[]) => {
      setUniqueFieldsStatus((prev) => {
        const copy = { ...prev };
        checks.forEach((check) => {
          if (check.conflictRowId) {
            copy[check.fieldIdentifier] = {
              value: check.value,
              status: "violation",
              conflictRowId: check.conflictRowId,
            };
          } else {
            copy[check.fieldIdentifier] = {
              value: check.value,
              status: "ok",
            };
          }
        });
        return copy;
      });
    },
    [setUniqueFieldsStatus]
  );

  const isSomeUniqueStatus = (status: string) => {
    return Object.values(uniqueFieldsStatus).some(
      (fieldStatus) => fieldStatus.status === status
    );
  };
  const isUniqueFieldUpdated = React.useMemo(
    () => isSomeUniqueStatus("not started"),
    [uniqueFieldsStatus]
  );
  const isCheckingUniqueness = React.useMemo(
    () => isSomeUniqueStatus("pending"),
    [uniqueFieldsStatus]
  );
  const hasUniqueViolation = React.useMemo(
    () => isSomeUniqueStatus("violation"),
    [uniqueFieldsStatus]
  );

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
    data1: CmsRowData | null | undefined,
    data2: CmsRowData | null | undefined
  ) => {
    const fields = table.schema.fields
      .filter((f) => !f.hidden)
      .map((f) => f.identifier);
    return isEqual(
      mapValues(
        pickBy(data1, (v, _k) => !isNil(v)),
        (v) => pickBy(v, (v2, k) => !isNil(v2) && fields?.includes(k))
      ),
      mapValues(
        pickBy(data2, (v, _k) => !isNil(v)),
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
          .filter(([_key, value]) => value !== undefined)
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

  async function checkUniqueness() {
    const updatedUniqueFields = Object.entries(uniqueFieldsStatus).reduce(
      (acc, [fieldIdentifier, fieldStatus]) => {
        if (fieldStatus.status === "not started") {
          acc[fieldIdentifier] = fieldStatus.value;
        }
        return acc;
      },
      {}
    );

    if (Object.keys(updatedUniqueFields).length === 0) {
      return;
    }

    setUniqueFieldsStatus((prev) => {
      const copy = { ...prev };
      Object.keys(updatedUniqueFields).forEach((fieldIdentifier) => {
        copy[fieldIdentifier] = { ...copy[fieldIdentifier], status: "pending" };
      });
      return copy;
    });

    const hideLoadingMessage = message.loading({
      key: "uniqueness-message",
      content: `Checking uniqueness violation...`,
    });

    const checks = await api.checkUniqueFields(table.id, {
      rowId: row.id,
      uniqueFieldsData: updatedUniqueFields,
    });
    hideLoadingMessage();

    handleUniqueFieldChecks(checks);
    try {
      await form.validateFields();
    } catch (err) {
      /* The validateFields function throws an error with details if any field has an error.
       We are ignoring this error because we just want to trigger the field validation and
       antd will automatically show warnings/errors to the user. */
    }
  }

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
      if (err.statusCode === 409) {
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
    } else {
      if (!hasFormError()) {
        if (hasChanges() && !isSaving) {
          spawn(performSave());
        }
      }
      if (isUniqueFieldUpdated && !isCheckingUniqueness) {
        spawn(checkUniqueness());
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
        path={APP_ROUTES.cmsEntryRevisions.pattern}
        render={() => (
          <Drawer
            title={"Entry revisions"}
            placement="right"
            onClose={() =>
              history.push(
                fillRoute(APP_ROUTES.cmsEntry, {
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
        onValuesChange={(changedValues: CmsRowData, allValues) => {
          if (Object.keys(changedValues).length > 0) {
            setHasUnsavedChanges(hasChanges());
            setHasUnpublishedChanges(hasPublishableChanges());
            console.log({ changedFields: changedValues, allFields: allValues });
            setUniqueFieldsStatus((prev) => {
              const changedUniqueData = getUniqueFieldsData(
                table,
                changedValues
              );
              const nullUniqueData = getUniqueFieldsData(table, changedValues, {
                nulls: "only",
              });
              return {
                ...prev,
                ...dataToUniqueStatus(changedUniqueData, "not started"),
                ...dataToUniqueStatus(nullUniqueData, "ok"),
              };
            });
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
                        try {
                          await api.updateCmsRow(row.id, {
                            identifier,
                            data: draftData,
                            draftData: null,
                            revision,
                          });
                          await mutateRow();
                          setHasUnpublishedChanges(false);
                          spawn(
                            message.success({
                              content: "Your changes have been published.",
                              duration: 5,
                            })
                          );
                          await triggerPublishWebhooksAndNotify(api, table);
                        } catch (err) {
                          if (isUniqueViolationError(err)) {
                            handleUniqueFieldChecks(err.violations);
                            await form.validateFields();
                          } else {
                            throw err;
                          }
                        } finally {
                          setPublishing(false);
                        }
                      }
                    }}
                    disabled={
                      !hasUnpublishedChanges ||
                      isPublishing ||
                      isSaving ||
                      hasUnsavedChanges ||
                      hasFormError() ||
                      isCheckingUniqueness ||
                      hasUniqueViolation
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
                        spawn(
                          message.loading({
                            key: "unpublish-message",
                            content: `Unpublishing ${entryDisplayName}...`,
                          })
                        );
                        await api.updateCmsRow(row.id, {
                          data: null,
                          revision,
                        });
                        spawn(
                          message.success({
                            key: "unpublish-message",
                            content: `Unpublished ${entryDisplayName}.`,
                            duration: 5,
                          })
                        );
                        await mutateRow();
                        setHasUnpublishedChanges(hasPublishableChanges());
                        await validateFields();
                        await triggerPublishWebhooksAndNotify(api, table);
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
                          spawn(
                            message.loading({
                              key: "revert-message",
                              content: `Reverting ${entryDisplayName}...`,
                            })
                          );
                          await api.updateCmsRow(row.id, {
                            draftData: null,
                            revision,
                          });
                          spawn(
                            message.success({
                              key: "revert-message",
                              content: `Reverted ${entryDisplayName}.`,
                              duration: 5,
                            })
                          );
                          await mutateRow();
                          await resetFormByRow();
                          setHasUnpublishedChanges(hasPublishableChanges());
                          await validateFields();
                          await triggerPublishWebhooksAndNotify(api, table);
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
                    const confirmed = await confirm({
                      title: "Delete entry",
                      message: `Are you sure you want to delete ${entryDisplayName}?`,
                    });
                    if (confirmed) {
                      spawn(
                        message.loading({
                          key: "delete-message",
                          content: `Deleting ${entryDisplayName}...`,
                        })
                      );
                      await api.deleteCmsRow(row.id);
                      spawn(
                        message.success({
                          key: "delete-message",
                          content: `Deleted ${entryDisplayName}.`,
                          duration: 5,
                        })
                      );
                      await mutateRow();
                      history.push(
                        fillRoute(APP_ROUTES.cmsModelContent, {
                          databaseId: database.id,
                          tableId: table.id,
                        })
                      );
                      await triggerPublishWebhooksAndNotify(api, table);
                    }
                  }}
                >
                  Delete entry
                </Menu.Item>
              </Menu>
            ),
          }}
          historyButton={{
            href: fillRoute(APP_ROUTES.cmsEntryRevisions, {
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
                inConflict,
                uniqueFieldsStatus
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
          spawn(
            message.loading({
              key: "duplicate-message",
              content: `Duplicating ${entryDisplayName}...`,
            })
          );
          try {
            setDuplicating(true);
            const clonedRow = await api.cloneCmsRow(row.id, {
              identifier: newIdentifier,
            });
            await mutateTableRows(table.id);
            setShowDuplicateModal(false);
            history.push(
              fillRoute(APP_ROUTES.cmsEntry, {
                databaseId: database.id,
                tableId: table.id,
                rowId: clonedRow.id,
              })
            );
            spawn(
              message.success({
                key: "duplicate-message",
                content: `A duplicate of ${entryDisplayName} has been created. You are now viewing the duplicated entry.`,
                duration: 5,
              })
            );
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

/**
 * Triggers webhooks and notifies user of success/failure.
 */
async function triggerPublishWebhooksAndNotify(
  api: PromisifyMethods<Api>,
  table: ApiCmsTable
): Promise<void> {
  const hooks = table.settings?.webhooks?.filter(
    (hook) => hook.event === "publish"
  );
  if (!hooks) {
    return;
  }

  const hooksResp = await api.triggerCmsTableWebhooks(table.id, "publish");
  const failures = hooksResp.responses.filter(
    (r) => r.status < 200 || r.status >= 300
  );
  if (failures.length === 0) {
    spawn(
      message.success({ content: `Publish webhook(s) succeeded.`, duration: 5 })
    );
  } else {
    spawn(
      message.error({
        content: `${failures.length} publish webhook(s) responded with non-2xx response code.`,
        duration: 5,
      })
    );
  }
}
