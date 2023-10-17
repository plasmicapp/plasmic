import { GlobalActionsProvider, useSelector } from "@plasmicapp/host";
import {
  default as registerToken,
  TokenRegistration,
} from "@plasmicapp/host/registerToken";
import { addLoadingStateListener } from "@plasmicapp/query";
import { ConfigProvider, message, notification, theme } from "antd";
import type { ConfigProviderProps } from "antd/es/config-provider";
import type { MessageInstance } from "antd/es/message/interface";
import type {
  NotificationInstance,
  NotificationPlacement,
} from "antd/es/notification/interface";
import type { Locale } from "antd/lib/locale";
import enUS from "antd/lib/locale/en_US.js";
import React from "react";
import { useIsMounted } from "./react-utils";
import { makeRegisterGlobalContext, Registerable } from "./utils";

// enUS is a CJS file, and it doesn't always import correctly in
// esm mode (nextjs does it right, but create-react-app does it wrong).
// We normalize it ourselves here 😬😬😬
let defaultLocale = enUS;
if ("default" in enUS) {
  defaultLocale = (enUS as any).default as typeof enUS;
}

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

  defaultDark?: boolean;

  /**
   * `locale` is a prop that can be set by code, but is not registered,
   * i.e. exposed to Plasmic studio.
   */
  locale?: Locale;
}

export function themeToAntdConfig(opts: ThemeOpts): ConfigProviderProps {
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
    defaultDark = false,
  } = opts;
  return {
    theme: {
      algorithm: defaultDark ? theme.darkAlgorithm : undefined,
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
    loadingText?: string;
    removeLoading?: boolean;
  }
) {
  const { children, locale, themeStyles, loadingText, removeLoading, ...rest } =
    props;
  return (
    <ConfigProvider
      locale={locale ?? defaultLocale}
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
        <InnerConfigProvider
          loadingText={loadingText}
          removeLoading={removeLoading}
        >
          {children}
        </InnerConfigProvider>
      </ForkedApp>
    </ConfigProvider>
  );
}

function normTokenValue(val: any) {
  if (typeof val === "string") {
    return val.trim();
  } else if (typeof val === "number") {
    return `${val}px`;
  } else {
    return val;
  }
}

function InnerConfigProvider(props: {
  children?: React.ReactNode;
  loadingText?: string;
  removeLoading?: boolean;
}) {
  const { children, loadingText, removeLoading } = props;
  const { token } = theme.useToken();
  const makeVarName = (name: string) => `--antd-${name}`;
  const cssStyles = React.useMemo(
    () => `
:root {
  ${Object.entries(token)
    .map(([key, val]) => `${makeVarName(key)}:${normTokenValue(val)};`)
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
        app.notification[opts.type ?? "info"]({
          ...rest,
          message: rest.message?.toString(),
          description: rest.description?.toString(),
        });
      },
      hideNotifications: () => {
        app.notification.destroy();
      },
    }),
    [app]
  );
  const enableLoadingBoundary = !!useSelector(
    "plasmicInternalEnableLoadingBoundary"
  );

  if (!GlobalActionsProvider) {
    warnOutdatedDeps();
  }

  let content = GlobalActionsProvider ? (
    <GlobalActionsProvider
      contextName="plasmic-antd5-config-provider"
      actions={actions}
    >
      {children}
    </GlobalActionsProvider>
  ) : (
    children
  );
  if (!removeLoading && enableLoadingBoundary) {
    // If we're using the GlobalLoadingIndicator, and loading boundary is
    // enabled, then we wrap the content in Suspense so that we don't propagate
    // loading promises beyond this ConfigProvider, and instead will keep
    // this ConfigProvider mounted, so it can render the loading indicator
    content = <React.Suspense>{content}</React.Suspense>;
  }
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: cssStyles }} />
      {content}
      {!removeLoading && <GlobalLoadingIndicator loadingText={loadingText} />}
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

function GlobalLoadingIndicator(props: { loadingText?: string }) {
  const { loadingText } = props;
  const app = useAppContext();

  const isLoadingRef = React.useRef(false);
  const isMounted = useIsMounted();
  const showLoading = React.useCallback(() => {
    if (isMounted() && isLoadingRef.current) {
      app.message.open({
        content: loadingText ?? "Loading...",
        duration: 0,
        key: `plasmic-antd5-global-loading-indicator`,
      });
    }
  }, [app, loadingText, isMounted, isLoadingRef]);

  const hideLoading = React.useCallback(() => {
    // Delay hiding loading message, to avoid quick churns of loading / not loading
    setTimeout(() => {
      if (isMounted() && !isLoadingRef.current) {
        app.message.destroy(`plasmic-antd5-global-loading-indicator`);
      }
    }, 500);
  }, [app, isMounted, isLoadingRef]);

  React.useEffect(() => {
    if (addLoadingStateListener) {
      // Upon mount, we show any loading message that has been queued up before
      // we were mounted
      if (isLoadingRef.current) {
        showLoading();
      } else {
        hideLoading();
      }
      return addLoadingStateListener(
        (isLoading) => {
          isLoadingRef.current = isLoading;
          if (isMounted()) {
            if (isLoading) {
              showLoading();
            } else {
              hideLoading();
            }
          }
        },
        // Disabled immediat because it's creating an infinite rendering
        // https://app.shortcut.com/plasmic/story/36991
        { immediate: false }
      );
    } else {
      warnOutdatedDeps();
      return () => {
        // noop
      };
    }
  }, [app, isMounted, isLoadingRef, showLoading, hideLoading]);
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
  const [messageApi, messageContextHolder] = message.useMessage();
  const [notificationApi, notificationContextHolder] =
    notification.useNotification();

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

  const withoutPrefix = (name: string, prefix?: string) => {
    if (!prefix) {
      return name;
    }
    const index = name.indexOf(prefix);
    return index === 0 ? name.substring(prefix.length) : name;
  };

  function makeNiceName(name: string) {
    name = name[0].toUpperCase() + name.substring(1);
    return name.replace(/([a-z])([A-Z])/g, "$1 $2");
  }

  const makeGenericToken = (
    name: string | [string, string],
    type: TokenRegistration["type"],
    removePrefix?: string
  ) => {
    const tokenName = Array.isArray(name) ? name[0] : name;
    const displayName = Array.isArray(name)
      ? name[1]
      : makeNiceName(withoutPrefix(name, removePrefix));
    return {
      name: tokenName,
      displayName: `System: ${displayName}`,
      value: `var(--antd-${tokenName})`,
      type,
    } as TokenRegistration;
  };

  // TODO: Commenting out a lot of tokens for now until we decide to make them
  // available

  const colorTokens: (string | [string, string])[] = [
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
    // "colorFillContentHover",
    // "colorFillAlter",
    // "colorFillContent",
    // "colorBgContainerDisabled",
    // "colorBgTextHover",
    // "colorBgTextActive",
    // "colorBorderBg",
    // "colorSplit",
    // "colorTextPlaceholder",
    // "colorTextDisabled",
    // "colorTextHeading",
    // "colorTextLabel",
    // "colorTextDescription",
    // "colorTextLightSolid",
    "colorIcon",
    "colorIconHover",
    "colorLink",
    "colorLinkHover",
    // "colorLinkActive",
    // "colorLinkHighlight",
    // "controlOutline",
    // "controlWarningOutline",
    // "controlErrorOutline",
    // "controlItemBgHover",
    // "controlItemBgActive",
    // "controlItemBgActiveHover",
    // "controlItemBgActiveDisabled",
  ];
  colorTokens.forEach((name) =>
    regs.push(makeGenericToken(name, "color", "color"))
  );

  const spacingTokens: (string | [string, string])[] = [
    // Seed
    // "lineWidth",
    // "borderRadius",
    // "controlHeight",
    // Map tokens
    // "sizeXXL",
    // "sizeXL",
    // "sizeLG",
    // "sizeMD",
    // "sizeMS",
    // "size",
    // "sizeSM",
    // "sizeXS",
    // "sizeXXS",
    // "controlHeightXS",
    // "controlHeightSM",
    // "controlHeightLG",
    // "lineWidthBold",
    // "borderRadiusXS",
    // "borderRadiusSM",
    // "borderRadiusLG",
    // "borderRadiusOuter",

    // Alias tokens
    // "controlOutlineWidth",
    // "controlInteractiveSize",
    "paddingXXS",
    "paddingXS",
    "paddingSM",
    ["padding", "Padding M"],
    "paddingMD",
    "paddingLG",
    "paddingXL",
    // "paddingContentHorizontalLG",
    // "paddingContentHorizontal",
    // "paddingContentHorizontalSM",
    // "paddingContentVerticalLG",
    // "paddingContentVertical",
    // "paddingContentVerticalSM",
    "marginXXS",
    "marginXS",
    "marginSM",
    ["margin", "Margin M"],
    "marginMD",
    "marginLG",
    "marginXL",
    "marginXXL",
    // "controlPaddingHorizontal",
    // "controlPaddingHorizontalSM",
  ];
  spacingTokens.forEach((token) =>
    regs.push(makeGenericToken(token, "spacing"))
  );

  const fontSizeTokens: (string | [string, string])[] = [
    // Seed token
    ["fontSize", "M"],
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
    regs.push(makeGenericToken(token, "font-size", "fontSize"))
  );

  const lineHeightTokens: (string | [string, string])[] = [
    // Map tokens
    ["lineHeight", "M"],
    "lineHeightLG",
    "lineHeightSM",
    "lineHeightHeading1",
    "lineHeightHeading2",
    "lineHeightHeading3",
    "lineHeightHeading4",
    "lineHeightHeading5",
  ];
  lineHeightTokens.forEach((token) =>
    regs.push(makeGenericToken(token, "line-height", "lineHeight"))
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
        disableTokens: true,
      },
      colorSuccess: {
        type: "color",
        defaultValue: "#52c41a",
        disableTokens: true,
      },
      colorWarning: {
        type: "color",
        defaultValue: "#faad14",
        disableTokens: true,
      },
      colorError: {
        type: "color",
        defaultValue: "#ff4d4f",
        disableTokens: true,
      },
      colorInfo: {
        type: "color",
        defaultValue: "#1677ff",
        disableTokens: true,
      },
      colorBgBase: {
        type: "color",
        defaultValue: "#ffffff",
        disableTokens: true,
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
      loadingText: {
        type: "string",
        defaultValueHint: "Loading...",
      },
      removeLoading: {
        type: "boolean",
        defaultValueHint: false,
      },
      wireframe: {
        type: "boolean",
        defaultValue: false,
      },
      defaultDark: {
        type: "boolean",
        defaultValue: false,
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
