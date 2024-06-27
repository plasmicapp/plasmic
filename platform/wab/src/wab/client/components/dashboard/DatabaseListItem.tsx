import { UU } from "@/wab/client/cli-routes";
import { promptMoveToWorkspace } from "@/wab/client/components/dashboard/dashboard-actions";
import EditableResourceName from "@/wab/client/components/EditableResourceName";
import { PublicLink } from "@/wab/client/components/PublicLink";
import { reactConfirm } from "@/wab/client/components/quick-modals";
import { Matcher } from "@/wab/client/components/view-common";
import { ClickStopper } from "@/wab/client/components/widgets";
import Textbox from "@/wab/client/components/widgets/Textbox";
import { useAppCtx } from "@/wab/client/contexts/AppContexts";
import { PlasmicDatabaseListItem } from "@/wab/client/plasmic/plasmic_kit_dashboard/PlasmicDatabaseListItem";
import { assert } from "@/wab/shared/common";
import { InlineEdit } from "@/wab/commons/components/InlineEdit";
import { OnClickAway } from "@/wab/commons/components/OnClickAway";
import { Stated } from "@/wab/commons/components/Stated";
import {
  ApiCmsDatabase,
  ApiPermission,
  ApiWorkspace,
} from "@/wab/shared/ApiSchema";
import { accessLevelRank } from "@/wab/shared/EntUtil";
import { getAccessLevelToResource } from "@/wab/shared/perms";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import { Menu, notification } from "antd";
import moment from "moment";
import * as React from "react";

export interface DatabaseListItemProps {
  className?: string;
  database: ApiCmsDatabase;
  workspace: ApiWorkspace;
  matcher?: Matcher;
  perms: ApiPermission[];
  onUpdate: () => void;
}

function DatabaseListItem_(
  props: DatabaseListItemProps,
  ref: HTMLElementRefOf<"a">
) {
  const { className, database, matcher, perms, workspace, onUpdate, ...rest } =
    props;
  const appCtx = useAppCtx();

  const accessLevel = getAccessLevelToResource(
    { type: "workspace", resource: workspace },
    appCtx.selfInfo,
    perms
  );

  return (
    <PlasmicDatabaseListItem
      root={{
        as: PublicLink,
        props: {
          ref,
          className,
          href: UU.cmsRoot.fill({
            databaseId: database.id,
          }),
        },
      }}
      timestamp={`updated ${moment(database.updatedAt).fromNow()}`}
      shared={{ render: () => null }}
      editableName={{
        render: () => (
          <InlineEdit
            render={({ onDone, editing, onStart }) =>
              editing ? (
                <div className={props.className} style={{ width: 300 }}>
                  <ClickStopper preventDefault>
                    <Stated defaultValue={false}>
                      {(submitting, setSubmitting) => (
                        <OnClickAway onDone={onDone}>
                          <Textbox
                            autoFocus
                            selectAllOnFocus
                            defaultValue={database.name}
                            onEdit={async (val) => {
                              setSubmitting(true);
                              await appCtx.api.updateCmsDatabase(database.id, {
                                name: val,
                              });
                              // Just update this rather than re-fetching data.
                              database.name = val;
                              setSubmitting(false);
                              onDone();
                            }}
                            onEscape={onDone}
                            onBlur={onDone}
                            disabled={submitting}
                          />
                        </OnClickAway>
                      )}
                    </Stated>
                  </ClickStopper>
                </div>
              ) : (
                <EditableResourceName
                  {...props}
                  {...(accessLevelRank(accessLevel) < accessLevelRank("editor")
                    ? { cantEdit: true }
                    : {})}
                  {...{
                    onEdit: onStart,
                    name:
                      matcher?.boldSnippets(database.name, "yellow-snippet") ||
                      database.name,
                  }}
                />
              )
            }
          />
        ),
      }}
      menuButton={
        accessLevelRank(accessLevel) >= accessLevelRank("editor")
          ? {
              menu: () => (
                <Menu>
                  <Menu.Item
                    key="move"
                    onClick={async () => {
                      const response = await promptMoveToWorkspace(
                        appCtx,
                        workspace.id,
                        false,
                        "Move"
                      );
                      if (response === undefined) {
                        return;
                      }
                      assert(
                        response.result === "workspace",
                        "Expected workspace to move CMS into."
                      );
                      await appCtx.api.updateCmsDatabase(database.id, {
                        workspaceId: response.workspace.id,
                      });
                      notification.info({
                        message: `CMS moved to ${response.workspace.name}.`,
                      });
                      onUpdate();
                    }}
                  >
                    <strong>Move</strong> to workspace
                  </Menu.Item>
                  <Menu.Item
                    key="delete"
                    onClick={async () => {
                      const confirm = await reactConfirm({
                        title: `Delete CMS Database`,
                        message: (
                          <>
                            Are you sure you want to delete the database{" "}
                            <strong>{database.name}</strong>?
                          </>
                        ),
                      });
                      if (!confirm) {
                        return;
                      }
                      await appCtx.api.deleteCmsDatabase(database.id);
                      onUpdate();
                    }}
                  >
                    <strong>Delete</strong> CMS
                  </Menu.Item>
                </Menu>
              ),
            }
          : {
              wrap: () => null,
            }
      }
      {...rest}
    />
  );
}

const DatabaseListItem = React.forwardRef(DatabaseListItem_);
export default DatabaseListItem;
