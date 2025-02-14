import TextWithInfo from "@/wab/client/components/TextWithInfo";
import { Matcher } from "@/wab/client/components/view-common";
import { ClickStopper } from "@/wab/client/components/widgets";
import {
  commenterTooltip,
  contentCreatorTooltip,
  contentRoleHelp,
  designerRoleHelp,
  designerTooltip,
  developerTooltip,
  viewerTooltip,
} from "@/wab/client/components/widgets/plasmic/PermissionItem";
import Select from "@/wab/client/components/widgets/Select";
import { useAppCtx } from "@/wab/client/contexts/AppContexts";
import {
  DefaultTeamMemberListItemProps,
  PlasmicTeamMemberListItem,
} from "@/wab/client/plasmic/plasmic_kit_dashboard/PlasmicTeamMemberListItem";
import {
  ApiFeatureTier,
  ApiPermission,
  TeamMember,
} from "@/wab/shared/ApiSchema";
import { fullName, getUserEmail } from "@/wab/shared/ApiSchemaUtil";
import { GrantableAccessLevel } from "@/wab/shared/EntUtil";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import { Menu, Tooltip } from "antd";
import moment from "moment";
import * as React from "react";

interface TeamMemberListItemProps extends DefaultTeamMemberListItemProps {
  user: TeamMember;
  matcher: Matcher;
  perm?: ApiPermission;
  tier: ApiFeatureTier;
  changeRole: (email: string, role?: GrantableAccessLevel) => Promise<void>;
  removeUser: (email: string) => Promise<void>;
  disabled?: boolean;
}

function TeamMemberListItem_(
  props: TeamMemberListItemProps,
  ref: HTMLElementRefOf<"div">
) {
  const {
    user,
    matcher,
    perm,
    tier,
    changeRole,
    removeUser,
    disabled,
    ...rest
  } = props;
  const appCtx = useAppCtx();
  const roleValue =
    !!perm &&
    ["owner", "editor", "designer", "content", "commenter", "viewer"].includes(
      perm.accessLevel
    )
      ? perm.accessLevel
      : "none";
  const noneDesc =
    "'None' means that the user has no team-wide permissions, but may have individual workspace or project permissions. Users with `None` will still count towards your seat count.";
  return (
    <PlasmicTeamMemberListItem
      root={{ ref }}
      {...rest}
      name={matcher.boldSnippets(
        user.type === "user" ? fullName(user) : user.email
      )}
      email={matcher.boldSnippets(
        user.type === "user" ? getUserEmail(user) : user.email
      )}
      lastActive={
        user.type === "user" && user.lastActive
          ? moment(user.lastActive).fromNow()
          : "never"
      }
      numProjects={`${
        user.type === "user" && user.projectsCreated ? user.projectsCreated : 0
      }`}
      role={{
        value: roleValue,
        isDisabled: disabled || perm?.accessLevel === "owner",
        onChange: async (e) => {
          if (e !== roleValue && e !== null) {
            if (e === "none") {
              await changeRole(user.email);
            } else if (
              ["editor", "designer", "content", "commenter", "viewer"].includes(
                e
              )
            ) {
              await changeRole(user.email, e as GrantableAccessLevel);
            }
          }
        },
        children: [
          <Select.Option
            style={{
              display: "none",
            }}
            value="owner"
          >
            Owner
          </Select.Option>,
          <Select.Option value="editor">{developerTooltip}</Select.Option>,
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
          ...(appCtx.appConfig.comments
            ? [
                <Select.Option value="commenter">
                  {commenterTooltip}
                </Select.Option>,
              ]
            : []),
          <Select.Option value="viewer">{viewerTooltip}</Select.Option>,
          <Select.Option
            style={{
              display: "none",
            }}
            value="none"
          >
            None
          </Select.Option>,
        ],
      }}
      roleHelp={{
        wrap: (node) =>
          roleValue === "none" ? (
            <Tooltip title={noneDesc}>{node}</Tooltip>
          ) : null,
      }}
      menuButton={{
        wrap: (node) => (
          <ClickStopper preventDefault>{disabled ? null : node}</ClickStopper>
        ),
        props: {
          menu: (
            <Menu>
              <Menu.Item
                onClick={async () => {
                  await removeUser(user.email);
                }}
              >
                <strong>Remove</strong> member
              </Menu.Item>
            </Menu>
          ),
          style: {
            visibility:
              !!perm && perm.accessLevel === "owner" ? "hidden" : "visible",
          },
        },
      }}
    />
  );
}

const TeamMemberListItem = React.forwardRef(TeamMemberListItem_);
export default TeamMemberListItem;
