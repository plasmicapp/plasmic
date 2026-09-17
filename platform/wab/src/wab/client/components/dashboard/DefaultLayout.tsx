import { PublicLink } from "@/wab/client/components/PublicLink";
import NavSeparator from "@/wab/client/components/dashboard/NavSeparator";
import NavTeamSection from "@/wab/client/components/dashboard/NavTeamSection";
import NavWorkspaceButton from "@/wab/client/components/dashboard/NavWorkspaceButton";
import { promptNewTeam } from "@/wab/client/components/dashboard/dashboard-actions";
import { Avatar } from "@/wab/client/components/studio/Avatar";
import { useAppCtx } from "@/wab/client/contexts/AppContexts";
import {
  DefaultDefaultLayoutProps,
  PlasmicDefaultLayout,
  PlasmicDefaultLayout__OverridesType,
} from "@/wab/client/plasmic/plasmic_kit_dashboard/PlasmicDefaultLayout";
import { useHistory } from "@/wab/client/route/HistoryProvider";
import { useBrowserNotification } from "@/wab/client/utils/useBrowserNotification";
import { ApiTeam, ApiWorkspace } from "@/wab/shared/ApiSchema";
import { ensure } from "@/wab/shared/common";
import { APP_ROUTES } from "@/wab/shared/route/app-routes";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import { Dropdown, Menu } from "antd";
import * as _ from "lodash";
import { observer } from "mobx-react";
import * as React from "react";

export type DefaultLayoutProps = DefaultDefaultLayoutProps &
  PlasmicDefaultLayout__OverridesType & {
    /** Currently active team, if any. */
    team?: ApiTeam;
    /** Currently active workspace, if any. */
    workspace?: ApiWorkspace;
  };

function DefaultLayout_(
  props: DefaultLayoutProps,
  ref: HTMLElementRefOf<"div">
) {
  const { team, workspace, freeTrial, upgradeButton, helpButton, ...rest } =
    props;
  const history = useHistory();
  const appCtx = useAppCtx();
  const userInfo = ensure(
    appCtx.selfInfo,
    "DefaultLayout requires appCtx to contain user information"
  );

  const teams = appCtx.getAllTeams();
  const workspaces = _.sortBy(appCtx.workspaces, (w) => w.name);

  useBrowserNotification();

  const userMenu = (
    <Menu>
      <Menu.Item>
        <PublicLink href={APP_ROUTES.settings.fill({})}>Settings</PublicLink>
      </Menu.Item>
      <Menu.Item
        onClick={async () => {
          await appCtx.logout();
        }}
      >
        Sign Out
      </Menu.Item>
    </Menu>
  );

  const brand =
    appCtx.appConfig.brands?.[team?.id ?? ""] ?? appCtx.appConfig.brands?.[""];

  return (
    <PlasmicDefaultLayout
      root={{ ref }}
      {...rest}
      headerLogoLink={{
        as: PublicLink,
        props: brand.logoHref
          ? {
              href: brand.logoHref,
            }
          : {},
      }}
      headerLogo={
        brand.logoImgSrc
          ? {
              render: () => <img src={brand.logoImgSrc} />,
            }
          : undefined
      }
      freeTrial={freeTrial ?? { render: () => null }}
      teams={teams.map((t) => (
        <React.Fragment key={t.id}>
          <NavSeparator />
          <NavTeamSection
            name={t.name}
            href={APP_ROUTES.org.fill({ teamId: t.id })}
            selected={team?.id === t.id}
            freeTrial={t.onTrial}
          >
            {workspaces
              .filter((w) => w.team.id === t.id)
              .map((w) => (
                <NavWorkspaceButton
                  key={w.id}
                  name={w.name}
                  href={APP_ROUTES.workspace.fill({
                    workspaceId: w.id,
                  })}
                  selected={workspace?.id === w.id}
                />
              ))}
          </NavTeamSection>
        </React.Fragment>
      ))}
      upgradeButton={upgradeButton ?? { render: () => null }}
      helpButton={helpButton}
      newTeamButton={{
        onClick: async () => {
          await promptNewTeam(appCtx, history);
        },
      }}
      userButton={{
        props: {
          children: userInfo.firstName,
          "data-test-id": "btn-dashboard-user",
        },
        wrap: (node) => (
          <Dropdown overlay={userMenu} placement="topLeft" trigger={["click"]}>
            {node}
          </Dropdown>
        ),
      }}
      avatar={<Avatar size="small" user={userInfo} />}
    />
  );
}

const DefaultLayout = observer(React.forwardRef(DefaultLayout_));
export default DefaultLayout;
