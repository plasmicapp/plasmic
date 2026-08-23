import { useUsersMap } from "@/wab/client/api-hooks";
import MenuItem from "@/wab/client/components/MenuItem";
import { renderContentEntryFormFields } from "@/wab/client/components/cms/CmsEntryDetails";
import {
  useCmsDatabase,
  useCmsRow,
  useCmsRowHistory,
  useCmsRowRevision,
  useCmsTable,
  useMutateRow,
} from "@/wab/client/components/cms/cms-contexts";
import { reactConfirm } from "@/wab/client/components/quick-modals";
import { Spinner } from "@/wab/client/components/widgets";
import Button from "@/wab/client/components/widgets/Button";
import { useApi } from "@/wab/client/contexts/AppContexts";
import { useHistory } from "@/wab/client/route/HistoryProvider";
import { Redirect } from "@/wab/client/route/Redirect";
import { Switch, switchCase, switchDefault } from "@/wab/client/route/Switch";
import { useMatchedRoute } from "@/wab/client/route/useMatchedRoute";
import { CmsDatabaseId, CmsRowId, CmsTableId } from "@/wab/shared/ApiSchema";
import { spawn } from "@/wab/shared/common";
import { APP_ROUTES } from "@/wab/shared/route/app-routes";
import { formatDateMediumTimeShort } from "@/wab/shared/utils/date-utils";
import { Form, message } from "antd";
import React from "react";

export function CmsEntryHistory(props: {
  databaseId: CmsDatabaseId;
  tableId: CmsTableId;
  rowId: CmsRowId;
}) {
  const { databaseId, tableId, rowId } = props;
  const revisions = useCmsRowHistory(rowId);
  const { data: userById } = useUsersMap(
    (revisions ?? []).map((rev) => rev.createdById)
  );

  if (!revisions) {
    return <Spinner />;
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "300px 1fr",
        height: "100%",
      }}
    >
      <div style={{ overflow: "auto", maxHeight: "100%" }}>
        <Switch
          cases={[
            switchCase({
              route: APP_ROUTES.cmsEntryRevision,
              render: ({ revisionId }) => (
                <>
                  {revisions.map((revision) => (
                    <MenuItem
                      selected={revisionId === revision.id}
                      href={APP_ROUTES.cmsEntryRevision.fill({
                        revisionId: revision.id,
                        tableId,
                        rowId,
                        databaseId,
                      })}
                      key={revision.id}
                    >
                      <div>
                        {formatDateMediumTimeShort(
                          new Date(revision.createdAt)
                        )}
                        <div>
                          {revision.isPublished ? (
                            <span style={{ color: "#4b4" }}>Published</span>
                          ) : (
                            <span style={{ color: "#999" }}>Autosave</span>
                          )}
                          {userById &&
                            revision.createdById &&
                            userById[revision.createdById] &&
                            ((user) => (
                              <span>
                                {" "}
                                <span style={{ color: "#999" }}>by</span>{" "}
                                {user.firstName} {user.lastName}
                              </span>
                            ))(userById[revision.createdById])}
                        </div>
                      </div>
                    </MenuItem>
                  ))}
                </>
              ),
            }),
            switchCase({
              route: APP_ROUTES.cmsEntryRevisions,
              render: () => {
                if (revisions.length === 0) {
                  return "No revision history";
                } else {
                  return (
                    <Redirect
                      to={APP_ROUTES.cmsEntryRevision.fill({
                        ...props,
                        revisionId: revisions[0].id,
                      })}
                    />
                  );
                }
              },
            }),
            switchDefault({ render: () => null }),
          ]}
        />
      </div>
      <Switch
        cases={[
          switchCase({
            exact: true,
            route: APP_ROUTES.cmsEntryRevision,
            render: ({ revisionId }) => (
              <EntryRevisionView {...props} key={revisionId} />
            ),
          }),
          switchDefault({ render: () => null }),
        ]}
      />
    </div>
  );
}

function EntryRevisionView() {
  const { databaseId, tableId, rowId, revisionId } = useMatchedRoute(
    APP_ROUTES.cmsEntryRevision
  )!.pathParams;

  const database = useCmsDatabase(databaseId);
  const table = useCmsTable(databaseId, tableId);
  const currentRow = useCmsRow(tableId, rowId);
  const revision = useCmsRowRevision(rowId, revisionId);
  const api = useApi();
  const mutateRow = useMutateRow();
  const history = useHistory();

  const [restoring, setRestoring] = React.useState(false);

  if (!revision || !database || !table || !currentRow) {
    return <Spinner />;
  }

  return (
    <div style={{ overflow: "auto", maxHeight: "100%" }}>
      <Form
        initialValues={revision.data}
        labelCol={{ span: 8 }}
        wrapperCol={{ span: 16 }}
      >
        <Form.Item wrapperCol={{ offset: 8, span: 16 }}>
          <Button
            disabled={restoring}
            onClick={async () => {
              if (
                !(await reactConfirm({
                  title: "Overwrite current draft with this revision?",
                  message:
                    "Any changes you've made to the current version will be overwritten.",
                }))
              ) {
                return;
              }
              setRestoring(true);
              spawn(
                message.loading({
                  content: "Restoring data...",
                  key: "update-message",
                  duration: undefined,
                })
              );
              await api.updateCmsRow(rowId, {
                draftData: revision.data,
                revision: currentRow?.revision,
                noMerge: true,
              });
              await mutateRow(tableId, rowId);
              setRestoring(false);
              spawn(
                message.success({
                  content: "Revision restored!",
                  key: "update-message",
                })
              );

              history.push(
                APP_ROUTES.cmsEntry.fill({ databaseId, tableId, rowId })
              );
            }}
          >
            Restore
          </Button>
        </Form.Item>
        {renderContentEntryFormFields(
          table,
          database,
          database.extraData.locales,
          true
        )}
      </Form>
    </div>
  );
}
