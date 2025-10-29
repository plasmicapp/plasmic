import TeamMemberListItem from "@/wab/client/components/dashboard/TeamMemberListItem";
import { Matcher } from "@/wab/client/components/view-common";
import { Modal } from "@/wab/client/components/widgets/Modal";
import ShareDialogContent from "@/wab/client/components/widgets/plasmic/ShareDialogContent";
import Select from "@/wab/client/components/widgets/Select";
import { useAppCtx } from "@/wab/client/contexts/AppContexts";
import {
  DefaultTeamMemberListProps,
  PlasmicTeamMemberList,
} from "@/wab/client/plasmic/plasmic_kit_dashboard/PlasmicTeamMemberList";
import {
  ApiFeatureTier,
  ApiPermission,
  ApiTeam,
  TeamMember,
} from "@/wab/shared/ApiSchema";
import { fullName } from "@/wab/shared/ApiSchemaUtil";
import { accessLevelRank, GrantableAccessLevel } from "@/wab/shared/EntUtil";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import { sortBy } from "lodash";
import * as React from "react";

interface TeamMemberListProps extends DefaultTeamMemberListProps {
  team?: ApiTeam;
  members: TeamMember[];
  perms: ApiPermission[];
  tier: ApiFeatureTier;
  onChangeRole: (email: string, role?: GrantableAccessLevel) => Promise<void>;
  onRemoveUser: (email: string) => Promise<void>;
  onReload: () => Promise<void>;
  disabled?: boolean;
}

function TeamMemberList_(
  props: TeamMemberListProps,
  ref: HTMLElementRefOf<"div">
) {
  const {
    members,
    perms,
    onChangeRole,
    onRemoveUser,
    onReload,
    disabled,
    team,
    tier,
    ...rest
  } = props;
  const appCtx = useAppCtx();

  // Shared Modal
  const [sharedModal, setSharedModal] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const matcher = new Matcher(query);

  // Team member filters + search
  const [filterSelect, setFilterSelect] = React.useState<string | null>("all");
  let displayedMembers = members
    .filter(
      (m) =>
        (m.type === "user" && matcher.matches(fullName(m))) ||
        matcher.matches(m.email)
    )
    .filter((m) => {
      if (filterSelect === "all") {
        return true;
      }
      if (filterSelect === "none") {
        return !perms.some((p) => p.user?.email === m.email);
      }

      return perms.some(
        (p) =>
          (p.user?.email || p?.email) === m.email &&
          p.accessLevel === filterSelect
      );
    });
  // The following lines perform 2 stable sorts so the members are sorted by
  // access level rank -> name (or email, if it's a member with no user).
  displayedMembers = sortBy(displayedMembers, (m) =>
    m.type === "user" ? fullName(m) : m.email
  );
  displayedMembers = sortBy(
    displayedMembers,
    (m) =>
      -accessLevelRank(
        perms.find((p) => p.user?.email === m.email)?.accessLevel ?? "blocked"
      )
  );
  return (
    <>
      <PlasmicTeamMemberList
        {...rest}
        root={{ ref }}
        newButton={{
          onClick: async () => {
            setSharedModal(true);
          },
        }}
        memberSearch={{
          value: query,
          onChange: (e) => setQuery(e.target.value),
          autoFocus: true,
        }}
        filterSelect={{
          value: filterSelect,
          onChange: setFilterSelect,
          children: [
            <Select.Option value="all">All Roles</Select.Option>,
            <Select.Option value="owner">Owners</Select.Option>,
            <Select.Option value="editor">Developers</Select.Option>,
            ...(appCtx.appConfig.contentOnly ||
            perms.some(
              (perm) =>
                perm.accessLevel === "designer" ||
                perm.accessLevel === "content"
            )
              ? [
                  <Select.Option value="designer">Designers</Select.Option>,
                  <Select.Option value="content">
                    Content Creators
                  </Select.Option>,
                ]
              : []),
            ...(perms.some((perm) => perm.accessLevel === "commenter")
              ? [<Select.Option value="commenter">Commenters</Select.Option>]
              : []),
            <Select.Option value="viewer">Viewers</Select.Option>,
            <Select.Option value="none">None</Select.Option>,
          ],
        }}
      >
        {displayedMembers.map((user) => (
          <TeamMemberListItem
            key={user.email}
            user={user}
            matcher={matcher}
            perm={perms.find(
              (p) => p.user?.email === user.email || p.email === user.email
            )}
            tier={tier}
            changeRole={onChangeRole}
            removeUser={onRemoveUser}
            disabled={disabled}
            teamId={team?.id}
          />
        ))}
      </PlasmicTeamMemberList>
      {sharedModal && team && (
        <Modal
          visible={true}
          onCancel={() => setSharedModal(false)}
          modalRender={() => (
            <ShareDialogContent
              className="ant-modal-content"
              resource={{ type: "team", resource: team }}
              perms={perms}
              closeDialog={() => setSharedModal(false)}
              reloadPerms={onReload}
              updateResourceCallback={onReload}
            />
          )}
        />
      )}
    </>
  );
}

const TeamMemberList = React.forwardRef(TeamMemberList_);
export default TeamMemberList;
