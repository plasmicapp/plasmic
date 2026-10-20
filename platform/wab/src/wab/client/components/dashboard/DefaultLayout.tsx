import { PublicLink } from "@/wab/client/components/PublicLink";
import NavButton from "@/wab/client/components/dashboard/NavButton";
import { promptNewWorkspace } from "@/wab/client/components/dashboard/dashboard-actions";
import { getDefaultOrg } from "@/wab/client/components/dashboard/org-utils";
import { Avatar } from "@/wab/client/components/studio/Avatar";
import { useAppCtx } from "@/wab/client/contexts/AppContexts";
import {
  DefaultDefaultLayoutProps,
  PlasmicDefaultLayout,
  PlasmicDefaultLayout__OverridesType,
} from "@/wab/client/plasmic/plasmic_kit_dashboard/PlasmicDefaultLayout";
import DotSvgIcon from "@/wab/client/plasmic/plasmic_kit_icons/icons/PlasmicIcon__DotSvg";
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

export type DashboardNav =
  "allProjects" | "myProjects" | "orgProjects" | "orgSettings";

export type DefaultLayoutProps = DefaultDefaultLayoutProps &
  PlasmicDefaultLayout__OverridesType & {
    /** Currently active team, if any. */
    team?: ApiTeam;
    /** Currently active workspace, if any. */
    workspace?: ApiWorkspace;
    activeNav?: DashboardNav;
  };

function DefaultLayout_(
  props: DefaultLayoutProps,
  ref: HTMLElementRefOf<"div">,
) {
  const { team, workspace, activeNav, ...rest } = props;
  const history = useHistory();
  const appCtx = useAppCtx();
  const userInfo = ensure(
    appCtx.selfInfo,
    "DefaultLayout requires appCtx to contain user information",
  );

  const orgs = appCtx.getAllTeams();
  const selectedOrg = team ?? getDefaultOrg(appCtx);
  const workspaces = _.sortBy(
    appCtx.workspaces.filter((w) => w.team.id === selectedOrg?.id),
    (w) => w.name,
  );

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
      userButton={{
        props: {
          children: userInfo.firstName,
          "data-test-id": "btn-dashboard-user",
        },
        wrap: (node) => (
          <Dropdown
            overlay={userMenu}
            placement="bottomRight"
            trigger={["click"]}
          >
            {node}
          </Dropdown>
        ),
      }}
      avatar={<Avatar size="small" user={userInfo} />}
      hasNoOrg={!selectedOrg}
      allProjectsButton={{
        props: {
          href: APP_ROUTES.allProjects.fill({}),
          selected: activeNav === "allProjects",
        },
      }}
      myProjectsButton={{
        props: {
          href: APP_ROUTES.playground.fill({}),
          selected: activeNav === "myProjects",
        },
      }}
      orgSwitcher={{ props: { selectedOrg, orgs } }}
      workspaces={{
        children: workspaces.map((w) => (
          <NavButton
            key={w.id}
            href={APP_ROUTES.workspace.fill({ workspaceId: w.id })}
            selected={workspace?.id === w.id}
            startIcon={<DotSvgIcon role="img" />}
          >
            {w.name}
          </NavButton>
        )),
      }}
      orgProjectsButton={{
        props: {
          href: selectedOrg && APP_ROUTES.org.fill({ teamId: selectedOrg.id }),
          selected: activeNav === "orgProjects",
        },
      }}
      settingsButton={{
        props: {
          href:
            selectedOrg &&
            APP_ROUTES.orgSettings.fill({ teamId: selectedOrg.id }),
          selected: activeNav === "orgSettings",
        },
      }}
      helpButton={
        selectedOrg
          ? {
              props: {
                href: APP_ROUTES.orgSupport.fill({ teamId: selectedOrg.id }),
              },
            }
          : { render: () => null }
      }
      newWorkspaceButton={{
        onClick: async () => {
          if (selectedOrg) {
            await promptNewWorkspace(appCtx, history, selectedOrg.id);
          }
        },
      }}
    />
  );
}

const DefaultLayout = observer(React.forwardRef(DefaultLayout_));
export default DefaultLayout;
