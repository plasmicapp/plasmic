import { GlobalActionsProvider } from "@plasmicapp/host";
import {
  default as registerToken,
  TokenRegistration,
} from "@plasmicapp/host/registerToken";
import { addLoadingStateListener } from "@plasmicapp/query";
import ConfigProvider from "antd/es/config-provider";
import enUS from "antd/es/locale/en_US";
import type { MessageInstance } from "antd/es/message/interface";
import useMessage from "antd/es/message/useMessage";
import type {
  NotificationInstance,
  NotificationPlacement,
} from "antd/es/notification/interface";
import useNotification from "antd/es/notification/useNotification";
import theme from "antd/es/theme";
import React from "react";
import { makeRegisterGlobalContext, Registerable } from "./utils";

export interface ThemeOpts {
  fontFamily?: string;
  fontSize?: number;
  lineHeight?: number;
  colorTextBase?: string;

  colorPrimary?: string;
  colorSuccess?: string;
  colorWarning?: string;
  colorInfo?: string;
  lineWidth?: number;
  borderRadius?: number;
  controlHeight?: number;
  sizeUnit?: number;
  sizeStep?: number;
  wireframe?: boolean;
  spacing?: "small" | "middle" | "large";
}

export function themeToAntdConfig(opts: ThemeOpts) {
  const {
    colorTextBase,
    colorPrimary,
    colorSuccess,
    colorWarning,
    colorInfo,
    fontFamily,
    fontSize,
    lineWidth,
    borderRadius,
    controlHeight,
    sizeUnit,
    sizeStep,
    wireframe,
    spacing,
  } = opts;
  return {
    ...(spacing && { size: spacing }),
    theme: {
      token: Object.fromEntries(
        Object.entries({
          colorTextBase,
          colorPrimary,
          colorSuccess,
          colorWarning,
          colorInfo,
          fontFamily,
          fontSize,
          lineWidth,
          borderRadius,
          controlHeight,
          sizeUnit,
          sizeStep,
          wireframe,
        }).filter(([_key, val]) => !!val)
      ),
    },
  };
}

export function AntdConfigProvider(
  props: Omit<ThemeOpts, "fontFamily" | "fontSize" | "lineWidth"> & {
    children?: React.ReactNode;
    themeStyles: Record<string, string>;
  }
) {
  const { children, themeStyles, ...rest } = props;
  return (
    <ConfigProvider
      locale={enUS}
      {...themeToAntdConfig({
        ...rest,
        fontFamily: themeStyles.fontFamily,
        fontSize: themeStyles.fontSize
          ? parseInt(themeStyles.fontSize)
          : undefined,
        lineHeight: themeStyles.lineHeight
          ? parseInt(themeStyles.lineHeight)
          : undefined,
        colorTextBase: themeStyles.color,
      })}
    >
      <ForkedApp>
        <InnerConfigProvider>{children}</InnerConfigProvider>
      </ForkedApp>
    </ConfigProvider>
  );
}

function InnerConfigProvider(props: { children?: React.ReactNode }) {
  const { children } = props;
  const { token } = theme.useToken();
  const makeVarName = (name: string) => `--antd-${name}`;
  const cssStyles = React.useMemo(
    () => `
:root {
  ${Object.entries(token)
    .map(
      ([key, val]) =>
        `${makeVarName(key)}:${typeof val === "string" ? val.trim() : val};`
    )
    .join("\n")}
}
  `,
    [token]
  );
  const app = useAppContext();
  const actions = React.useMemo(
    () => ({
      showNotification: (opts: {
        type: "success" | "error" | "info" | "warning";
        message: React.ReactNode;
        description?: React.ReactNode;
        duration?: number;
        placement?: NotificationPlacement;
      }) => {
        const { type, ...rest } = opts;
        app.notification[opts.type ?? "info"]({ ...rest });
      },
      hideNotifications: () => {
        app.notification.destroy();
      },
    }),
    [app]
  );

  if (!GlobalActionsProvider) {
    warnOutdatedDeps();
  }
  return (
    <>
      <style>{cssStyles}</style>
      {/* GlobalActionsProvider may not exist for older host */}
      {GlobalActionsProvider ? (
        <GlobalActionsProvider
          contextName="plasmic-antd5-config-provider"
          actions={actions}
        >
          {children}
        </GlobalActionsProvider>
      ) : (
        children
      )}
      <GlobalLoadingIndicator />
    </>
  );
}

let warned = false;
function warnOutdatedDeps() {
  if (!warned) {
    console.log(
      `You are using a version of @plasmicapp/* that is too old. Please upgrade to the latest version.`
    );
    warned = true;
  }
}

function GlobalLoadingIndicator() {
  const app = useAppContext();
  React.useEffect(() => {
    if (addLoadingStateListener) {
      return addLoadingStateListener(
        (isLoading) => {
          if (isLoading) {
            app.message.open({
              content: "Loading...",
              duration: 0,
              key: `plasmic-antd5-global-loading-indicator`,
            });
          } else {
            app.message.destroy(`plasmic-antd5-global-loading-indicator`);
          }
        },
        { immediate: true }
      );
    } else {
      warnOutdatedDeps();
      return () => {};
    }
  }, [app]);
  return null;
}

const ForkedAppContext = React.createContext<
  | {
      message: MessageInstance;
      notification: NotificationInstance;
    }
  | undefined
>(undefined);

function useAppContext() {
  const context = React.useContext(ForkedAppContext);
  if (!context) {
    throw new Error("Must call useAppContext from under ForkedApp");
  }
  return context;
}

/**
 * Forking antd's App, to avoid rendering an extra <div/>
 */
function ForkedApp(props: { children?: React.ReactNode }) {
  const [messageApi, messageContextHolder] = useMessage();
  const [notificationApi, notificationContextHolder] = useNotification();

  const appContext = React.useMemo(
    () => ({
      message: messageApi,
      notification: notificationApi,
    }),
    [messageApi, notificationApi]
  );

  return (
    <ForkedAppContext.Provider value={appContext}>
      {messageContextHolder}
      {notificationContextHolder}
      {props.children}
    </ForkedAppContext.Provider>
  );
}

export function registerTokens(loader?: Registerable) {
  const regs: TokenRegistration[] = [];

  const makeColorToken = (name: string) => {
    const colorIndex = name.indexOf("color");
    const humanName = makeNiceName(
      colorIndex >= 0
        ? name.substring(name.indexOf("color") + "color".length)
        : name
    );
    return {
      name,
      displayName: `System: ${humanName}`,
      value: `var(--antd-${name})`,
      type: "color",
    } as TokenRegistration;
  };

  function makeNiceName(name: string) {
    name = name[0].toUpperCase() + name.substring(1);
    return name.replace(/([a-z])([A-Z])/g, "$1 $2");
  }

  const colorTokens: string[] = [
    // Seed tokens
    "colorPrimary",
    "colorSuccess",
    "colorWarning",
    "colorError",
    "colorInfo",

    // Map tokens
    //   - neutral
    "colorText",
    "colorTextSecondary",
    "colorTextTertiary",
    "colorTextQuaternary",
    "colorBorder",
    "colorBorderSecondary",
    "colorFill",
    "colorFillSecondary",
    "colorFillTertiary",
    "colorFillQuaternary",
    "colorBgLayout",
    "colorBgContainer",
    "colorBgElevated",
    "colorBgSpotlight",
    //    - primary
    "colorPrimaryBg",
    "colorPrimaryBgHover",
    "colorPrimaryBorder",
    "colorPrimaryBorderHover",
    "colorPrimaryHover",
    "colorPrimaryActive",
    "colorPrimaryTextHover",
    "colorPrimaryText",
    "colorPrimaryTextActive",
    //    - success
    "colorSuccessBg",
    "colorSuccessBgHover",
    "colorSuccessBorder",
    "colorSuccessBorderHover",
    "colorSuccessHover",
    "colorSuccessActive",
    "colorSuccessTextHover",
    "colorSuccessText",
    "colorSuccessTextActive",
    //    - warning
    "colorWarningBg",
    "colorWarningBgHover",
    "colorWarningBorder",
    "colorWarningBorderHover",
    "colorWarningHover",
    "colorWarningActive",
    "colorWarningTextHover",
    "colorWarningText",
    "colorWarningTextActive",
    //    - info
    "colorInfoBg",
    "colorInfoBgHover",
    "colorInfoBorder",
    "colorInfoBorderHover",
    "colorInfoHover",
    "colorInfoActive",
    "colorInfoTextHover",
    "colorInfoText",
    "colorInfoTextActive",
    //    - error
    "colorErrorBg",
    "colorErrorBgHover",
    "colorErrorBorder",
    "colorErrorBorderHover",
    "colorErrorHover",
    "colorErrorActive",
    "colorErrorTextHover",
    "colorErrorText",
    "colorErrorTextActive",
    //    - other
    "colorWhite",
    "colorBgMask",

    // Alias tokens
    "colorFillContentHover",
    "colorFillAlter",
    "colorFillContent",
    "colorBgContainerDisabled",
    "colorBgTextHover",
    "colorBgTextActive",
    "colorBorderBg",
    "colorSplit",
    "colorTextPlaceholder",
    "colorTextDisabled",
    "colorTextHeading",
    "colorTextLabel",
    "colorTextDescription",
    "colorTextLightSolid",
    "colorIcon",
    "colorIconHover",
    "colorLink",
    "colorLinkHover",
    "colorLinkActive",
    "colorLinkHighlight",
    "controlOutline",
    "controlWarningOutline",
    "controlErrorOutline",
    "controlItemBgHover",
    "controlItemBgActive",
    "controlItemBgActiveHover",
    "controlItemBgActiveDisabled",
  ];
  colorTokens.forEach((name) => regs.push(makeColorToken(name)));

  const makeGenericToken = (
    name: string,
    type: Exclude<TokenRegistration["type"], "color">
  ) => {
    return {
      name: `Sys: ${makeNiceName(name)}`,
      value: `var(--antd-${name})`,
      type,
    } as TokenRegistration;
  };

  const spacingTokens: string[] = [
    // Seed
    "lineWidth",
    "borderRadius",
    "controlHeight",

    // Map tokens
    "sizeXXL",
    "sizeXL",
    "sizeLG",
    "sizeMD",
    "sizeMS",
    "size",
    "sizeSM",
    "sizeXS",
    "sizeXXS",
    "controlHeightXS",
    "controlHeightSM",
    "controlHeightLG",
    "lineWidthBold",
    "borderRadiusXS",
    "borderRadiusSM",
    "borderRadiusLG",
    "borderRadiusOuter",

    // Alias tokens
    "controlOutlineWidth",
    "controlInteractiveSize",
    "paddingXXS",
    "paddingXS",
    "paddingSM",
    "padding",
    "paddingMD",
    "paddingLG",
    "paddingXL",
    "paddingContentHorizontalLG",
    "paddingContentHorizontal",
    "paddingContentHorizontalSM",
    "paddingContentVerticalLG",
    "paddingContentVertical",
    "paddingContentVerticalSM",
    "marginXXS",
    "marginXS",
    "marginSM",
    "margin",
    "marginMD",
    "marginLG",
    "marginXL",
    "marginXXL",
    "controlPaddingHorizontal",
    "controlPaddingHorizontalSM",
  ];
  spacingTokens.forEach((token) =>
    regs.push(makeGenericToken(token, "spacing"))
  );

  const fontSizeTokens = [
    // Seed token
    // "fontSize",

    // Map tokens
    "fontSizeSM",
    "fontSizeLG",
    "fontSizeXL",
    "fontSizeHeading1",
    "fontSizeHeading2",
    "fontSizeHeading3",
    "fontSizeHeading4",
    "fontSizeHeading5",
  ];
  fontSizeTokens.forEach((token) =>
    regs.push(makeGenericToken(token, "font-size"))
  );

  const lineHeightTokens = [
    // Map tokens
    // "lineHeight",
    "lineHeightLG",
    "lineHeightSM",
    "lineHeightHeading1",
    "lineHeightHeading2",
    "lineHeightHeading3",
    "lineHeightHeading4",
    "lineHeightHeading5",
  ];
  lineHeightTokens.forEach((token) =>
    regs.push(makeGenericToken(token, "line-height"))
  );

  if (loader) {
    regs.forEach((t) => loader.registerToken(t));
  } else {
    regs.forEach((t) => registerToken(t));
  }
}

export const registerConfigProvider = makeRegisterGlobalContext(
  AntdConfigProvider,
  {
    name: "plasmic-antd5-config-provider",
    displayName: "Ant Design System Settings",
    props: {
      colorPrimary: {
        type: "color",
        defaultValue: "#1677ff",
      },
      colorSuccess: {
        type: "color",
        defaultValue: "#52c41a",
      },
      colorWarning: {
        type: "color",
        defaultValue: "#faad14",
      },
      colorError: {
        type: "color",
        defaultValue: "#ff4d4f",
      },
      colorInfo: {
        type: "color",
        defaultValue: "#1677ff",
      },
      colorBgBase: {
        type: "color",
        defaultValue: "#ffffff",
      },
      lineWidth: {
        type: "number",
        defaultValue: 1,
      },
      borderRadius: {
        type: "number",
        defaultValue: 6,
      },
      controlHeight: {
        type: "number",
        defaultValue: 32,
      },
      sizeUnit: {
        type: "number",
        defaultValue: 4,
      },
      sizeStep: {
        type: "number",
        defaultValue: 4,
      },
      wireframe: {
        type: "boolean",
        defaultValue: false,
      },
      spacing: {
        type: "choice",
        options: ["small", "middle", "large"],
      },
      themeStyles: {
        type: "themeStyles",
      } as any,
    },
    ...({
      unstable__globalActions: {
        showNotification: {
          displayName: "Show notification",
          parameters: {
            type: {
              type: "choice",
              options: ["success", "error", "info", "warning"],
              defaultValue: "info",
            },
            message: {
              type: "string",
              defaultValue: "A message for you!",
            },
            description: {
              type: "string",
              defaultValue: "Would you like to learn more?",
            },
            duration: {
              type: "number",
              defaultValueHint: 5,
            },
            placement: {
              type: "choice",
              options: [
                "top",
                "topLeft",
                "topRight",
                "bottom",
                "bottomLeft",
                "bottomRight",
              ],
              defaultValueHint: "topRight",
            },
          },
        },
        hideNotifications: {
          displayName: "Hide notifications",
        },
      },
    } as any),
    importPath: "@plasmicpkgs/antd5/skinny/registerConfigProvider",
    importName: "AntdConfigProvider",
  }
);
