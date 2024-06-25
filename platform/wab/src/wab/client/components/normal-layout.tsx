import {
  AppComponent,
  NonAuthComponent,
  NonAuthComponentProps,
} from "@/wab/client/app-ctx";
import { UU } from "@/wab/client/cli-routes";
import { PublicLink } from "@/wab/client/components/PublicLink";
import { Avatar } from "@/wab/client/components/studio/Avatar";
import { HelpButton } from "@/wab/client/components/top-bar/HelpButton";
import * as widgets from "@/wab/client/components/widgets";
import { InlineIcon } from "@/wab/client/components/widgets";
import { BrowserAlertBanner } from "@/wab/client/components/widgets/BrowserAlertBanner";
import { Icon } from "@/wab/client/components/widgets/Icon";
import MarkFullColorIcon from "@/wab/client/plasmic/plasmic_kit_design_system/PlasmicIcon__MarkFullColor";
import ChevronDownsvgIcon from "@/wab/client/plasmic/q_4_icons/icons/PlasmicIcon__ChevronDownsvg";
import { ensure } from "@/wab/common";
import { Dropdown, Menu } from "antd";
import * as React from "react";
import { ReactNode } from "react";

interface NormalLayoutComponentProps {
  topBar?: ReactNode;
  children?: ReactNode;
}
class NormalLayoutComponent extends React.Component<
  NormalLayoutComponentProps,
  {}
> {
  render() {
    const { topBar } = this.props;
    return (
      <div className={"normal-layout"}>
        {topBar && (
          <div className={"normal-layout__top-bar"}>
            <div
              className={"normal-layout-content normal-layout-content--top-bar"}
            >
              <widgets.PlainLink href={"/"} className={"home-logo"}>
                <div className={"normal-layout__mark"}>
                  <MarkFullColorIcon />
                </div>
              </widgets.PlainLink>

              {topBar}
            </div>
          </div>
        )}
        <div className={"normal-layout-content"}>{this.props.children}</div>
      </div>
    );
  }
}
interface NormalNonAuthLayoutProps extends NonAuthComponentProps {
  children?: React.ReactNode;
}
export class NormalNonAuthLayout extends NonAuthComponent<
  NormalNonAuthLayoutProps,
  {}
> {
  render() {
    return <NormalLayoutComponent>{this.props.children}</NormalLayoutComponent>;
  }
}
export class NormalLayout extends AppComponent {
  render() {
    const menu = (
      <Menu>
        <Menu.Item>
          <PublicLink href={UU.userSettings.fill({})}>Settings</PublicLink>
        </Menu.Item>
        <Menu.Item
          onClick={async () => {
            await this.logout();
          }}
        >
          Sign Out
        </Menu.Item>
      </Menu>
    );
    return (
      <>
        <BrowserAlertBanner />
        <NormalLayoutComponent
          topBar={
            <div className={"normal-layout__top-bar-right"}>
              <HelpButton />
              <Dropdown overlay={menu} trigger={["click"]}>
                <div className={"normal-layout__user"}>
                  <Avatar
                    className={"user-avatar"}
                    user={ensure(this.appCtx().selfInfo, "must have selfInfo")}
                  />
                  <InlineIcon>
                    <Icon icon={ChevronDownsvgIcon} />
                  </InlineIcon>
                </div>
              </Dropdown>
            </div>
          }
        >
          {this.props.children}
        </NormalLayoutComponent>
      </>
    );
  }
}
