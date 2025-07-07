import TextWithInfo from "@/wab/client/components/TextWithInfo";
import PermissionsTab from "@/wab/client/components/app-auth/PermissionsTab";
import { useAppAuthConfig } from "@/wab/client/components/app-auth/app-auth-contexts";
import {
  maybeShowPaywall,
  PaywallError,
} from "@/wab/client/components/modals/PricingModal";
import {
  ClickStopper,
  Spinner,
  Tab,
  Tabs,
} from "@/wab/client/components/widgets";
import Select from "@/wab/client/components/widgets/Select";
import PermissionItem, {
  commenterTooltip,
  contentCreatorTooltip,
  contentRoleHelp,
  designerRoleHelp,
  designerTooltip,
  developerTooltip,
  viewerTooltip,
} from "@/wab/client/components/widgets/plasmic/PermissionItem";
import PP__ShareDialogContent from "@/wab/client/components/widgets/plasmic/PlasmicShareDialogContent";
import { useAppCtx } from "@/wab/client/contexts/AppContexts";
import { useTopFrameCtxMaybe } from "@/wab/client/frame-ctx/top-frame-ctx";
import { analytics } from "@/wab/client/observability";
import {
  ApiPermission,
  ApiResource,
  ApiTeam,
  Grant,
  GrantRevokeRequest,
  Revoke,
} from "@/wab/shared/ApiSchema";
import { getUserEmail } from "@/wab/shared/ApiSchemaUtil";
import { accessLevelRank, GrantableAccessLevel } from "@/wab/shared/EntUtil";
import { ORGANIZATION_LOWER } from "@/wab/shared/Labels";
import {
  assert,
  ensure,
  isValidEmail,
  spawn,
  unexpected,
  withoutFalsy,
} from "@/wab/shared/common";
import { DEVFLAGS } from "@/wab/shared/devflags";
import {
  convertToTaggedResourceId,
  filterDirectResourcePerms,
  getAccessLevelToResource,
  resourceTypeIdField,
} from "@/wab/shared/perms";
import { APP_ROUTES } from "@/wab/shared/route/app-routes";
import { fillRoute } from "@/wab/shared/route/route";
import { getPublicUrl } from "@/wab/shared/urls";
import { Menu, notification } from "antd";
import copy from "copy-to-clipboard";
import L from "lodash";
import React, { useEffect, useState } from "react";

export const personalProjectPaywallMessage = (
  <>
    This project is a personal project that is not in any {ORGANIZATION_LOWER}{" "}
    workspace, so it is limited to {DEVFLAGS.freeTier.maxUsers} editors and no
    A/B testing or custom targeting. Please move the project into a{" "}
    {ORGANIZATION_LOWER} whose plan supports a larger number of seats, or{" "}
    <a href="https://www.plasmic.app/pricing" target="_blank">
      create such a {ORGANIZATION_LOWER}
    </a>
    .
  </>
);

export function getTeamInviteLink(team: ApiTeam) {
  const url = new URL(
    fillRoute(APP_ROUTES.org, {
      teamId: team.id,
    }),
    getPublicUrl()
  );
  url.searchParams.set("inviteId", team.inviteId);
  return url.toString();
}

interface ShareDialogContentProps {
  className?: string;
  closeDialog: () => void;
  resource: ApiResource;
  perms: ApiPermission[];
  reloadPerms: (perms: ApiPermission[]) => Promise<void>;
  updateResourceCallback?: (data: any) => Promise<void>;
}

function getTierFromResource(r: ApiResource) {
  switch (r.type) {
    case "project":
    case "team":
      return r.resource.featureTier;
    case "workspace":
      return r.resource.team.featureTier;
    default:
      throw unexpected();
  }
}

function ShareDialogContent(props: ShareDialogContentProps) {
  const {
    className,
    resource,
    perms,
    closeDialog,
    reloadPerms,
    updateResourceCallback,
  } = props;
  const appCtx = useAppCtx();
  const hasTopFrameCtx = !!useTopFrameCtxMaybe();

  const tier = getTierFromResource(resource) ?? DEVFLAGS.freeTier;
  const ownAccessLevel = getAccessLevelToResource(
    resource,
    appCtx.selfInfo,
    perms
  );
  const teamId =
    resource.type === "project"
      ? resource.resource.teamId
      : resource.type === "workspace"
      ? resource.resource.team.id
      : resource.resource.id;

  const ownAccessLevelRank = accessLevelRank(ownAccessLevel);
  // Anyone can invite to a resource if they have at least content access
  // but it will require editor access to update invite by link
  const canInvite = ownAccessLevelRank >= accessLevelRank("content");
  const canEdit = ownAccessLevelRank >= accessLevelRank("editor");
  const canHaveCommenterRole =
    canEdit &&
    (appCtx.appConfig.comments ||
      (teamId && appCtx.appConfig.commentsTeamIds.includes(teamId)));
  const [inviteAccessLevel, setInviteAccessLevel] =
    React.useState<GrantableAccessLevel>(canEdit ? "editor" : "viewer");
  const [email, setEmail] = React.useState("");
  const [isEmailInvalid, setEmailInvalid] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const isLoggedIn = appCtx.selfInfo != null;

  const isPersonalProject =
    resource.type === "project" &&
    appCtx.personalWorkspace?.id === resource.resource.workspaceId;

  function withResourceId(grantsOrRevokes: Grant[] | Revoke[]) {
    return grantsOrRevokes.map((p) => {
      p[resourceTypeIdField(resource.type)] = resource.resource.id;
      return p;
    });
  }

  async function doGrantRevoke(
    data: GrantRevokeRequest
  ): Promise<{ enqueued?: boolean }> {
    data.grants = withResourceId(data.grants);
    data.revokes = withResourceId(data.revokes);
    try {
      const { perms: newPerms, enqueued } = await maybeShowPaywall(
        appCtx,
        async () => await appCtx.api.grantRevoke(data),
        {
          title: "Upgrade to grant new permissions",
          description: `This ${ORGANIZATION_LOWER} does not have enough seats to grant permissions to new users. Please increase the number of seats to be able to perform this action.`,
        }
      );
      await reloadPerms(newPerms);
      return { enqueued };
    } catch (err) {
      if (err instanceof PaywallError && err.type === "requireTeam") {
        notification.warn({
          message: personalProjectPaywallMessage,
          duration: 0,
        });
        return {};
      } else {
        throw err;
      }
    }
  }

  async function invite() {
    const cleaned = email.trim();
    if (!isValidEmail(cleaned)) {
      setEmailInvalid(true);
      notification.error({ message: "Insert a valid email to invite" });
      return;
    }
    setEmailInvalid(false);
    setSubmitting(true);
    try {
      const { enqueued } = await doGrantRevoke({
        grants: [{ email: cleaned, accessLevel: inviteAccessLevel }],
        revokes: [],
      });

      if (enqueued) {
        notification.info({
          message: "User has been waitlisted",
          description:
            "Plasmic is currently in private alpha, so we've waitlisted the user you just tried to invite.  Thanks for bearing with us!",
          placement: "bottomRight",
        });
      }
      setEmail("");
    } finally {
      setSubmitting(false);
    }
  }

  const shareByLinkAllowed =
    resource.type === "team" ? !!resource.resource.defaultAccessLevel : false;
  const noShareByLink =
    resource.type === "team" && !!resource.resource.defaultAccessLevel
      ? ownAccessLevelRank <
        accessLevelRank(resource.resource.defaultAccessLevel)
      : false;

  const parsedQueryParams = new URLSearchParams(appCtx.history.location.search);
  const arenaId = parsedQueryParams.get("arena");
  const arenaType = parsedQueryParams.get("arena_type");

  const updateProject = async (inviteOnly: boolean) => {
    assert(resource.type === "project", 'Resource type must be "project"');
    const data = await maybeShowPaywall(
      appCtx,
      async () =>
        await appCtx.api.setSiteInfo(resource.resource.id, {
          inviteOnly,
        })
    );
    await updateResourceCallback?.(data);
  };

  const updateTeam = async (
    defaultAccessLevel: GrantableAccessLevel | null
  ) => {
    assert(resource.type === "team", 'Resource type must be "team"');
    const data = await appCtx.api.updateTeam(resource.resource.id, {
      defaultAccessLevel,
    });
    await updateResourceCallback?.(data);
  };

  const collaboratorShareDialog = (
    <PP__ShareDialogContent
      className={className}
      resourceType={resource.type}
      existingPermItems={L.sortBy(
        filterDirectResourcePerms(perms, convertToTaggedResourceId(resource)),
        (p) =>
          `${p.accessLevel === "owner" ? 0 : 1}_${
            p.email ||
            ensure(p.user, "Permission with no email must have an user").email
          }`
      ).map((perm) => {
        const permEmail =
          perm.email ||
          ensure(perm.user, "Permission with no email must have an user").email;
        const displayEmail =
          perm.email ||
          getUserEmail(
            ensure(perm.user, "Permission with no email must have an user")
          );
        return (
          <PermissionItem
            key={permEmail}
            email={displayEmail}
            accessLevel={perm.accessLevel}
            tier={tier}
            canEdit={canEdit}
            onGrant={async (accessLevel) => {
              await doGrantRevoke({
                grants: [{ email: permEmail, accessLevel }],
                revokes: [],
              });
            }}
            canHaveCommenterRole={!!canHaveCommenterRole}
            onRevoke={async () => {
              await doGrantRevoke({
                revokes: [{ email: permEmail }],
                grants: [],
              });
            }}
          />
        );
      })}
      state={
        !isLoggedIn
          ? "unlogged"
          : submitting
          ? "submitting"
          : isEmailInvalid
          ? "invalidEmail"
          : !canInvite
          ? "noPermToShare"
          : undefined
      }
      shareByLinkAllowed={shareByLinkAllowed ? "yes" : "no"}
      newUserRoleDropdown={{
        value: inviteAccessLevel,
        "aria-label": `Permission level for new user`,
        onChange: (key) => setInviteAccessLevel(key as GrantableAccessLevel),
        children: [
          <Select.Option value="viewer">{viewerTooltip}</Select.Option>,
          ...(canHaveCommenterRole
            ? [
                <Select.Option value="commenter">
                  {commenterTooltip}
                </Select.Option>,
              ]
            : []),
          <Select.Option
            value="content"
            style={{
              display: appCtx.appConfig.contentOnly ? undefined : "none",
            }}
            isDisabled={
              !tier.contentRole ||
              ownAccessLevelRank < accessLevelRank("content")
            }
          >
            {tier.contentRole ? (
              contentCreatorTooltip
            ) : (
              <TextWithInfo tooltip={contentRoleHelp}>
                {contentCreatorTooltip}
              </TextWithInfo>
            )}
          </Select.Option>,
          <Select.Option
            value="designer"
            style={{
              display: appCtx.appConfig.contentOnly ? undefined : "none",
            }}
            isDisabled={
              !tier.designerRole ||
              ownAccessLevelRank < accessLevelRank("designer")
            }
          >
            {tier.designerRole ? (
              designerTooltip
            ) : (
              <TextWithInfo tooltip={designerRoleHelp}>
                {designerTooltip}
              </TextWithInfo>
            )}
          </Select.Option>,
          <Select.Option
            value="editor"
            isDisabled={ownAccessLevelRank < accessLevelRank("editor")}
          >
            {developerTooltip}
          </Select.Option>,
        ],
        isDisabled: submitting || !canInvite,
      }}
      shareByLinkPermDropdown={
        resource.type === "team" && resource.resource.defaultAccessLevel
          ? {
              "aria-label": "Default permission for link sharing",
              value: resource.resource.defaultAccessLevel,
              onChange: (value) => updateTeam(value as GrantableAccessLevel),
              children: [
                <Select.Option value="viewer">{viewerTooltip}</Select.Option>,
                ...(canHaveCommenterRole
                  ? [
                      <Select.Option value="commenter">
                        {commenterTooltip}
                      </Select.Option>,
                    ]
                  : []),

                <Select.Option
                  value="content"
                  style={{
                    display: appCtx.appConfig.contentOnly ? undefined : "none",
                  }}
                  isDisabled={!tier.contentRole}
                >
                  {tier.contentRole ? (
                    contentCreatorTooltip
                  ) : (
                    <TextWithInfo tooltip={contentRoleHelp}>
                      {contentCreatorTooltip}
                    </TextWithInfo>
                  )}
                </Select.Option>,
                <Select.Option
                  value="designer"
                  style={{
                    display: appCtx.appConfig.contentOnly ? undefined : "none",
                  }}
                  isDisabled={!tier.designerRole}
                >
                  {tier.designerRole ? (
                    designerTooltip
                  ) : (
                    <TextWithInfo tooltip={designerRoleHelp}>
                      {designerTooltip}
                    </TextWithInfo>
                  )}
                </Select.Option>,
                <Select.Option value="editor">
                  {developerTooltip}
                </Select.Option>,
              ],
              isDisabled: !canEdit,
            }
          : undefined
      }
      everyoneElseDropdown={{
        value:
          resource.type === "project" && resource.resource.inviteOnly
            ? "none"
            : "viewer",
        "aria-label": `Everyone else permission`,
        onChange: (key) => {
          const inviteOnly = key === "none" ? true : false;
          spawn(updateProject(inviteOnly));
        },
        isDisabled: !canEdit,
        children: [
          <Select.Option key="none" value="none">
            None
          </Select.Option>,
          <Select.Option key="viewer" value="viewer">
            {viewerTooltip}
          </Select.Option>,
        ],
      }}
      newUserEmail={{
        onChange: (e) => {
          setEmail(e.target.value);
          if (isEmailInvalid && isValidEmail(e.target.value)) {
            setEmailInvalid(false);
          }
        },
        value: email,
        onEnter: invite,
      }}
      sendInviteButton={{
        onClick: invite,
      }}
      copyLink={
        resource.type === "team"
          ? {
              onClick: () => copy(getTeamInviteLink(resource.resource)),
            }
          : undefined
      }
      noShareByLink={noShareByLink}
      shareByLinkSwitch={
        resource.type === "team"
          ? {
              isDisabled: !canEdit,
              onChange: (checked: boolean) => {
                if (checked) {
                  spawn(updateTeam("viewer"));
                } else {
                  spawn(updateTeam(null));
                }
              },
            }
          : undefined
      }
      permsCascade={{
        showWorkspace: !!(
          resource.type === "project" &&
          resource.resource.workspaceId &&
          !isPersonalProject
        ),
        showTeam: !!(
          (resource.type === "project" &&
            resource.resource.teamId &&
            !isPersonalProject) ||
          resource.type === "workspace"
        ),
      }}
      workspaceName={
        resource.type === "project" &&
        resource.resource.workspaceId &&
        resource.resource.workspaceName
          ? {
              props: {
                children: resource.resource.workspaceName,
              },
            }
          : undefined
      }
      workspaceLink={
        resource.type === "project" &&
        resource.resource.workspaceId &&
        resource.resource.workspaceName
          ? {
              props: {
                href: fillRoute(APP_ROUTES.workspace, {
                  workspaceId: resource.resource.workspaceId,
                }),
                target: "_blank",
              },
              wrap: (node) => <ClickStopper>{node}</ClickStopper>,
            }
          : undefined
      }
      teamLink={{
        props: {
          href:
            resource.type === "project" && resource.resource.teamId
              ? fillRoute(APP_ROUTES.org, { teamId: resource.resource.teamId })
              : resource.type === "workspace"
              ? fillRoute(APP_ROUTES.org, { teamId: resource.resource.team.id })
              : undefined,
          target: "_blank",
        },
        wrap: (node) => <ClickStopper>{node}</ClickStopper>,
      }}
      teamName={{
        props: {
          children:
            resource.type === "project" && resource.resource.teamName
              ? resource.resource.teamName
              : resource.type === "workspace"
              ? resource.resource.team.name
              : undefined,
        },
      }}
      projectActionMenu={{
        onClick: () => {
          analytics().track("project-copy-menu", {
            item: "button-copy-project-link",
          });
          copy(
            new URL(
              fillRoute(APP_ROUTES.project, {
                projectId: resource.resource.id,
              }),
              getPublicUrl()
            ).toString()
          );
        },
        menu: () => (
          <Menu>
            <Menu.Item
              onClick={() => {
                analytics().track("project-copy-menu", {
                  item: "copy-project-link",
                });
                copy(
                  new URL(
                    fillRoute(APP_ROUTES.project, {
                      projectId: resource.resource.id,
                    }),
                    getPublicUrl()
                  ).toString()
                );
              }}
            >
              Copy project link
            </Menu.Item>
            <Menu.Item
              onClick={() => {
                analytics().track("project-copy-menu", {
                  item: "copy-current-arena-link",
                });
                copy(window.location.href);
              }}
            >
              Copy link to current arena
            </Menu.Item>
            {arenaId && arenaType !== "custom" && (
              <Menu.Item
                onClick={() => {
                  analytics().track("project-copy-menu", {
                    item: "copy-current-arena-preview-link",
                  });
                  copy(
                    new URL(
                      fillRoute(APP_ROUTES.projectPreview, {
                        projectId: resource.resource.id,
                        previewPath: arenaId,
                      }),
                      getPublicUrl()
                    ).toString()
                  );
                }}
              >
                Copy current arena preview link
              </Menu.Item>
            )}
          </Menu>
        ),
      }}
    />
  );

  const { config, loading: loadingAuthConfig } =
    resource.type === "project"
      ? useAppAuthConfig(appCtx, resource.resource.id)
      : { config: undefined, loading: false };
  const showEndUsersTab =
    hasTopFrameCtx && resource.type === "project" && config;

  const [currentTab, setCurrentTab] = useState<"end-users" | "collaborators">(
    showEndUsersTab ? "end-users" : "collaborators"
  );

  useEffect(() => {
    setCurrentTab(showEndUsersTab ? "end-users" : "collaborators");
  }, [loadingAuthConfig]);

  if (loadingAuthConfig) {
    return <Spinner />;
  }

  const TabsWrapper = () => {
    return (
      <Tabs
        onSwitch={(tabKey) => {
          setCurrentTab(tabKey);
        }}
        barWrapper={(bar) => (
          <div
            style={{
              fontSize: 12,
              paddingLeft: 16,
            }}
          >
            {bar}
          </div>
        )}
        tabKey={currentTab}
        useDefaultClasses={false}
        tabClassName="hilite-tab"
        activeTabClassName="hilite-tab--active"
        tabs={withoutFalsy([
          showEndUsersTab &&
            new Tab({
              name: "End users",
              key: "end-users",
              contents: () => {
                return (
                  <PermissionsTab
                    appCtx={appCtx}
                    project={resource.resource}
                    directoryId={config.directoryId!}
                  />
                );
              },
            }),
          new Tab({
            name: "Collaborators",
            key: "collaborators",
            contents: () => {
              return collaboratorShareDialog;
            },
          }),
        ])}
      ></Tabs>
    );
  };

  return (
    <div style={{ width: 500 }}>
      {" "}
      {showEndUsersTab ? TabsWrapper() : collaboratorShareDialog}{" "}
    </div>
  );
}

export default ShareDialogContent;
