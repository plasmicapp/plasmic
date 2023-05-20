import { LogoutOutlined } from "@ant-design/icons";
import type { MenuDataItem, ProLayoutProps } from "@ant-design/pro-components";
import { ProConfigProvider, ProLayout } from "@ant-design/pro-components";
import { Dropdown, theme } from "antd";
import React, { ReactNode, useContext, useEffect, useState } from "react";
import { useIsClient } from "../common";
import { omitUndefined } from "@ant-design/pro-utils/lib";
import { ConfigContext } from "antd/es/config-provider";

interface NavMenuItem extends Omit<MenuDataItem, "routes"> {
  routes?: NavMenuItem[];
}

export interface SimpleNavTheme {
  scheme?: "light" | "dark" | "accent";
}

export interface RichLayoutProps extends ProLayoutProps {
  navMenuItems?: NavMenuItem[];
  rootUrl?: string;
  actionsChildren?: ReactNode;
  footerChildren?: ReactNode;
  avatarLabel?: string;
  avatarImage?: string;
  showAvatarMenu?: boolean;
  simpleNavTheme?: SimpleNavTheme;
}

function ensureArray<T>(xs: T | T[]): T[] {
  return Array.isArray(xs) ? xs : [xs];
}

export function RichLayout({
  children,
  navMenuItems,
  rootUrl = "/",
  actionsChildren,
  footerChildren,
  avatarLabel,
  avatarImage,
  showAvatarMenu,
  className,
  simpleNavTheme,
  ...layoutProps
}: RichLayoutProps) {
  const isClient = useIsClient();
  const [pathname, setPathname] = useState<string | undefined>(undefined);
  useEffect(() => {
    if (typeof location !== "undefined") {
      setPathname(location.pathname);
    }
  }, []);
  const { locale, theme: th, ...rest } = useContext(ConfigContext);
  const { token } = theme.useToken();
  const inDarkMode = ensureArray(th?.algorithm).includes(theme.darkAlgorithm);
  const bgColor =
    simpleNavTheme?.scheme === "accent"
      ? token.colorPrimary
      : simpleNavTheme?.scheme === "dark"
      ? // This is the default dark Menu color in Ant.
        "#011528"
      : inDarkMode
      ? // Just use this sorta ugly gray if using 'light' scheme in 'dark' mode....
        "rgba(0,0,0,0.6)"
      : // Using 'light' scheme in 'light' mode
        undefined;
  if (!isClient) {
    return null;
  }
  return (
    <div className={className}>
      {/* Remove the always-on fixed gradient background layer. */}
      <style>
        {`.ant-pro-layout-bg-list {
            display: none;
        }`}
      </style>
      <ProLayout
        {...layoutProps}
        // Theme just the header. If you simply pass in navTheme=realDark, it affects all main content as well.
        headerRender={(props, defaultDom) => (
          <ProConfigProvider dark={simpleNavTheme?.scheme !== "light"}>
            {defaultDom}
          </ProConfigProvider>
        )}
        token={{
          header: omitUndefined({
            colorBgHeader: bgColor,
          }),
          // Ideally, we'd do something similar to headerRender above, and just specify general dark mode to specify
          // whether all components/text should be light.
          // But for some reason it doesn't work, causing the bg color to be ignored (just the default dark Menu color),
          // *and* the text is just dark as well.
          // Haven't bothered debugging the pro components code to figure out the proper way to do this, so just
          // bluntly specifying tokens here.
          sider:
            !inDarkMode && simpleNavTheme?.scheme === "light"
              ? undefined
              : {
                  colorBgCollapsedButton: "#fff",
                  colorTextCollapsedButtonHover: "rgba(0,0,0,0.65)",
                  colorTextCollapsedButton: "rgba(0,0,0,0.45)",
                  colorMenuBackground: bgColor,
                  colorBgMenuItemCollapsedHover: "rgba(0,0,0,0.06)",
                  colorBgMenuItemCollapsedSelected: "rgba(0,0,0,0.15)",
                  colorBgMenuItemCollapsedElevated: "rgba(0,0,0,0.85)",
                  colorMenuItemDivider: "rgba(255,255,255,0.15)",
                  colorBgMenuItemHover: "rgba(0,0,0,0.06)",
                  colorBgMenuItemSelected: "rgba(0,0,0,0.15)",
                  colorTextMenuSelected: "#fff",
                  colorTextMenuItemHover: "rgba(255,255,255,0.75)",
                  colorTextMenu: "rgba(255,255,255,0.75)",
                  colorTextMenuSecondary: "rgba(255,255,255,0.65)",
                  colorTextMenuTitle: "rgba(255,255,255,0.95)",
                  colorTextMenuActive: "rgba(255,255,255,0.95)",
                  colorTextSubMenuSelected: "#fff",
                },
        }}
        // Tweak defaults. ProLayout is janky and has terrible docs!
        layout={layoutProps.layout ?? "top"}
        fixedHeader={layoutProps.fixedHeader ?? false}
        fixSiderbar={
          // Doesn't stretch full height if you set this to false and you're in mix mode.
          layoutProps.layout === "mix"
            ? undefined
            : layoutProps.fixSiderbar ?? false
        }
        // This is always needed if you want layout mix to have effect and look any different from layout side - not clear why this should ever be false.
        splitMenus={layoutProps.layout === "mix"}
        route={{
          path: rootUrl,
          routes: navMenuItems,
        }}
        location={{
          pathname,
        }}
        menu={{
          // collapsedShowGroupTitle: true,
          defaultOpenAll: true,
          // hideMenuWhenCollapsed: true,
        }}
        avatarProps={
          showAvatarMenu && 0 / 1
            ? {
                src: avatarImage,
                size: "small",
                title: avatarLabel,
                render: (_props, dom) => {
                  return (
                    <Dropdown
                      menu={{
                        items: [
                          {
                            key: "logout",
                            icon: <LogoutOutlined />,
                            label: "Sign out",
                          },
                        ],
                      }}
                    >
                      {dom}
                    </Dropdown>
                  );
                },
              }
            : undefined
        }
        actionsRender={(_props) => {
          return [actionsChildren];
        }}
        menuFooterRender={(props) => {
          if (props?.collapsed) return undefined;
          return footerChildren;
        }}
        onMenuHeaderClick={(e) => console.log(e)}
        menuItemRender={(item, dom) => <a href={item.path}>{dom}</a>}
        headerTitleRender={(logo, title, _) => {
          return (
            <a href={rootUrl}>
              {logo}
              {title}
            </a>
          );
        }}
      >
        {children}
      </ProLayout>
    </div>
  );
}
