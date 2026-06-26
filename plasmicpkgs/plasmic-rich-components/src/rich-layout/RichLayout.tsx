import { LogoutOutlined } from "@ant-design/icons";
import type { MenuDataItem, ProLayoutProps } from "@ant-design/pro-components";
import { ProConfigProvider, ProLayout } from "@ant-design/pro-components";
import { useDataEnv, usePlasmicLink } from "@plasmicapp/host";
import { ConfigProvider, Dropdown, theme } from "antd";
import React, { ReactNode, useEffect, useRef, useState } from "react";
import { isLight, useIsClient } from "../common";
import { AnchorLink } from "../widgets";

function omitUndefined(x: object) {
  return Object.fromEntries(
    Object.entries(x).filter(([_k, v]) => v !== undefined)
  );
}

interface NavMenuItem extends Omit<MenuDataItem, "routes"> {
  routes?: NavMenuItem[];
}

export interface SimpleNavTheme {
  scheme?: "default" | "light" | "dark" | "custom" | "primary";
  customBgColor?: string;
}

/**
 * Filter items by condition, and add missing paths so that any added items are visible.
 */
function processNavItems(navMenuItems: NavMenuItem[]): NavMenuItem[] {
  return navMenuItems
    .filter((item) => item.condition === undefined || item.condition)
    .map((item) => ({
      ...item,
      // We fill a default path because otherwise the item doesn't appear at all.
      path: item.path || "/",
      routes: item.routes ? processNavItems(item.routes) : undefined,
    }));
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
  logoElement?: ReactNode;
}

// width: 100% needed because parent is display: flex, which is needed for the min-height behavior.
const baseStyles = `
.ant-pro-layout-bg-list {
  display: none;
}
.ant-pro-layout {
  display: flex;
  width: 100%;
}
.ant-pro-layout .ant-pro-layout-content {
  padding: 0;
}
`;

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
  logo,
  logoElement,
  ...layoutProps
}: RichLayoutProps) {
  const $ctx = useDataEnv();
  const ref = useRef<HTMLDivElement>(null);
  const isClient = useIsClient();
  const [pathname, setPathname] = useState<string | undefined>(undefined);
  const [openKeys, setOpenKeys] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setTimeout(() => {
      setReady(true);
    }, 500);

    if (typeof location !== "undefined") {
      setPathname(location.pathname);
    }
  }, []);

  useEffect(() => {
    if (!ready) {
      return;
    }
    if (!ref.current) {
      return;
    }
    // open selected submenu (only opens the last one in the list!)
    const selectedSubmenus: string[] =
      (Array.from(
        ref.current.querySelectorAll(
          "ul > li.ant-menu-submenu.ant-menu-submenu-selected > div"
        )
      )
        .map((el) => el.getAttribute("data-menu-id")?.split("/").pop())
        .filter((i) => i)
        .map((i) => `/${i}`) as string[]) || [];
    setOpenKeys(selectedSubmenus);
  }, [ready]);

  // The usePlasmicLink function may be undefined, if host is not up to date
  const PlasmicLink = usePlasmicLink?.() ?? AnchorLink;
  const { token } = theme.useToken();
  const origTextColor = token.colorTextBase;
  function getNavBgColor(): string {
    const scheme = simpleNavTheme?.scheme ?? "default";
    switch (scheme) {
      case "primary":
        return token.colorPrimary;
      case "dark":
        // Ant default dark blue Menu color.
        return "#011528";
      case "custom":
        return simpleNavTheme?.customBgColor ?? token.colorBgBase;
      case "light":
        // Just use this sorta ugly gray if using 'light' scheme in 'dark' mode.
        // Otherwise using light scheme in light mode.
        return "#fff";
      case "default":
        return token.colorBgBase || "#fff";
    }
  }
  const navBgColor = getNavBgColor();
  // Dynamically determine whether we need to change the text to black/white or not, based on background color.
  // We don't want light-on-light or dark-on-dark, so if both isNavBgLight and isOrigTextLight are the same, then need to change.
  // If no need to change, we leave text color as is.
  const isNavBgLight = isLight(navBgColor);
  const isOrigTextLight = isLight(origTextColor);
  // Ant will interpret "" as defaulting to "#fff" for dark mode and "#000" in light mode.
  const navTextColor = isNavBgLight !== isOrigTextLight ? undefined : "";
  if (!isClient) {
    return null;
  }

  const layoutColorOverrides = isNavBgLight
    ? undefined
    : {
        colorBgCollapsedButton: navBgColor,
        colorTextCollapsedButtonHover: "rgba(255,255,255,0.85)",
        colorTextCollapsedButton: "rgba(255,255,255,0.65)",
        colorMenuBackground: navBgColor,
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
      };
  return (
    <div ref={ref} className={className} style={{ display: "flex" }}>
      {/* Remove the always-on fixed gradient background layer. */}
      <style>{baseStyles}</style>
      <ProLayout
        {...layoutProps}
        // This prevents setting a document title. Normally tries to set to either app title or page title (from routes meta).
        pageTitleRender={() => ""}
        logo={logo ?? logoElement}
        // Theme just the header. If you simply pass in navTheme=realDark, it affects all main content as well.
        //
        // What we're doing is telling Ant to use the dark mode algorithm. However, dark mode algorithm doesn't change
        // the seed tokens for colorTextBase and colorBgBase - it only fills in #fff and #000 for these if they are
        // unset (""). So that's why further up we may be setting the text color to "".
        //
        // I think it doesn't matter too much what is the colorBgBase, since we are setting (Pro-specific) `tokens`
        // further down for actually setting the fill of the nav sections. What matters is the text color - if we're
        // showing a dark background, then we want the text to be white.
        //
        // We could specify darkAlgorithm to ConfigProvider, but IIRC Pro might be setting some of its own tokens
        // based on whether dark is being specified to the ProConfigProvider. So that's why we need that.
        //
        // ProConfigProvider does first read/inherit the theme/tokens from the surrounding ConfigProvider.
        headerRender={(_props, defaultDom) => (
          <ConfigProvider
            theme={{ token: omitUndefined({ colorTextBase: navTextColor }) }}
          >
            <ProConfigProvider dark={!isNavBgLight}>
              {defaultDom}
            </ProConfigProvider>
          </ConfigProvider>
        )}
        token={{
          header: omitUndefined({
            colorBgHeader: navBgColor,
            ...layoutColorOverrides,
          }),
          // Ideally, we'd do something similar to headerRender above, and just specify general dark mode to specify
          // whether all components/text should be light.
          // But for some reason it doesn't work, causing the bg color to be ignored (just the default dark Menu color),
          // *and* the text is just dark as well.
          // Haven't yet been able to unravel the pro components code to figure out the proper way to do this, so just
          // bluntly specifying tokens here, as recommended in some GitHub issue.
          sider: omitUndefined({
            colorMenuBackground: navBgColor,
            ...layoutColorOverrides,
          }),
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
          routes: navMenuItems ? processNavItems(navMenuItems) : undefined,
        }}
        location={{
          pathname,
        }}
        menu={{
          // collapsedShowGroupTitle: true,
          defaultOpenAll: false,
          // hideMenuWhenCollapsed: true,
        }}
        avatarProps={
          showAvatarMenu
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
          if (props?.collapsed) {
            return undefined;
          }
          return footerChildren;
        }}
        onMenuHeaderClick={(e) => console.log(e)}
        openKeys={openKeys}
        onOpenChange={(keys) =>
          keys === false || !ready ? [] : setOpenKeys(keys)
        }
        selectedKeys={[$ctx?.pagePath]}
        menuItemRender={(item, dom) => (
          <PlasmicLink href={item.path}>{dom}</PlasmicLink>
        )}
        headerTitleRender={(logoEl, title, _) => {
          return (
            <PlasmicLink href={rootUrl}>
              {logoEl}
              {title}
            </PlasmicLink>
          );
        }}
      >
        {children}
      </ProLayout>
    </div>
  );
}
