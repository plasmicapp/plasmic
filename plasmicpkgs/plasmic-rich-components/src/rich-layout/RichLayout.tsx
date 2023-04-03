import { LogoutOutlined } from "@ant-design/icons";
import type { MenuDataItem, ProLayoutProps } from "@ant-design/pro-components";
import { ProLayout } from "@ant-design/pro-components";
import { Dropdown } from "antd";
import React, { ReactNode } from "react";

interface NavMenuItem extends Omit<MenuDataItem, "routes"> {
  routes?: NavMenuItem[];
}

export interface RichLayoutProps extends ProLayoutProps {
  navMenuItems?: NavMenuItem[];
  rootUrl?: string;
  actionsChildren?: ReactNode;
  footerChildren?: ReactNode;
  avatarLabel?: string;
  avatarImage?: string;
  showAvatarMenu?: boolean;
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
  ...layoutProps
}: RichLayoutProps) {
  const { pathname } = location;
  return (
    <div className={className}>
      <ProLayout
        {...layoutProps}
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
