import {
  ERROR_PATTERNS_TO_IGNORE,
  handleError,
  normalizeError,
  shouldIgnoreError,
} from "@/wab/client/ErrorNotifications";
import { analytics, initBrowserAnalytics } from "@/wab/client/analytics";
import { initAmplitudeBrowser } from "@/wab/client/analytics/amplitude-browser";
import { initPosthogBrowser } from "@/wab/client/analytics/posthog-browser";
import { AppCtx, hideStarters } from "@/wab/client/app-ctx";
import { isProjectPath, isTopFrame } from "@/wab/client/cli-routes";
import { initClientFlags } from "@/wab/client/client-dev-flags";
import { Root } from "@/wab/client/components/root-view";
import {
  HostFrameCtxProvider,
  useHostFrameCtxIfHostFrame,
} from "@/wab/client/frame-ctx/host-frame-ctx";
import type { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { methodForwarder } from "@/wab/commons/methodForwarder";
import DeploymentFlags from "@/wab/shared/DeploymentFlags";
import { UserError } from "@/wab/shared/UserError";
import { ConsoleLogAnalytics } from "@/wab/shared/analytics/ConsoleLogAnalytics";
import {
  CustomError,
  hackyCast,
  isLiteralObject,
  swallow,
  tuple,
  withoutFalsy,
} from "@/wab/shared/common";
import { isAdminTeamEmail } from "@/wab/shared/devflag-utils";
import { DEVFLAGS, applyDevFlagOverrides } from "@/wab/shared/devflags";
import { getMaximumTier } from "@/wab/shared/pricing/pricing-utils";
import * as Sentry from "@sentry/browser";
import * as Integrations from "@sentry/integrations";
import { createBrowserHistory } from "history";
import { onReactionError } from "mobx";
import { posthog } from "posthog-js";
import * as React from "react";
import { OverlayProvider } from "react-aria";
import * as ReactDOM from "react-dom";
import { Router } from "react-router-dom";

declare const COMMITHASH: string;

const sentryOrgId = "plasmicapp";
const sentryProjId = "1840236";

const localStoragePrefixesThatAreSafeToRemove = ["__mpq_"];

function getStudioPlaceholderElement() {
  return document.querySelector(".StudioPlaceholder") as HTMLDivElement;
}

/**
 * Watch for any entries over 500KB in size - we found that mixpanel was introducing __mpq_* keys that were exhausting the 10MB limit!
 */
function reportAndFixOversizedLocalStorage() {
  let keys: string[];
  try {
    keys = Object.keys(localStorage);
  } catch (err) {
    return;
  }
  const report = keys
    .map((key) => tuple(key, localStorage[key].length))
    .filter(([_key, len]) => len > 500000);
  if (report.length > 0) {
    Sentry.captureMessage(
      `Found oversized localStorage: ${JSON.stringify(report)}`
    );
    for (const [key, _len] of report) {
      if (
        localStoragePrefixesThatAreSafeToRemove.some((prefix) =>
          key.startsWith(prefix)
        )
      ) {
        localStorage.removeItem(key);
      }
    }
  }
}

// Monkey patch console.log afterwards based on the devflags
const originalConsoleLog = console.log;
console.log = function () {};

/**
 * main needs to go in Shell rather than main.tsx since Shell is the root of
 * hot-reload, so this way hot reload works more fully.  Need to ensure that as
 * many application modules as possible are imported via this hot module and
 * there's no import path to them from the root main.tsx.
 */
export function main() {
  if (!DEVFLAGS.uncatchErrors) {
    window.onunhandledrejection = (e: PromiseRejectionEvent) => {
      handleError(normalizeError(e.reason));
    };
    window.onerror = (
      event: Event | string,
      source?: string,
      lineno?: number,
      colno?: number,
      error?: Error
    ) => {
      // We check `source` to weed out errors that come from
      // the console.
      if (source && error) {
        handleError(error, source);
      }
    };
  }

  applyDevFlagOverrides(DEVFLAGS, initClientFlags(DEVFLAGS));

  const production = DeploymentFlags.DEPLOYENV === "production";

  // Initialize analytics
  const amplitudeAnalytics = initAmplitudeBrowser();
  const posthogAnalytics = initPosthogBrowser({});
  initBrowserAnalytics(
    production
      ? methodForwarder(amplitudeAnalytics, posthogAnalytics)
      : methodForwarder(
          new ConsoleLogAnalytics(),
          amplitudeAnalytics,
          posthogAnalytics
        )
  );
  analytics().appendBaseEventProperties({
    production,
    commitHash: COMMITHASH,
  });

  // Initialize Sentry
  if (production) {
    Sentry.init({
      dsn: `https://dd4fc160e1a548609dc8db7e6c9f7a08@sentry.io/${sentryProjId}`,
      release: COMMITHASH,
      integrations: [
        new Integrations.Dedupe(),
        new posthog.SentryIntegration(
          posthogAnalytics?.ph ?? posthog,
          sentryOrgId,
          +sentryProjId
        ),
      ],
      ignoreErrors: ERROR_PATTERNS_TO_IGNORE,
      beforeSend(event, hint) {
        if (
          hint &&
          hint.originalException instanceof Error &&
          shouldIgnoreError(hint.originalException)
        ) {
          return null;
        }

        if (hint && hint.originalException instanceof UserError) {
          return null;
        }

        if (
          hint?.originalException instanceof Error &&
          hint.originalException.message.includes("XHRStatus0Error")
        ) {
          // Do not log `xhr.status === 0` AJAX failures to Sentry, because
          // that means the client stopped the request before it was fulfilled.
          return null;
        }

        // Ignore errors loading corrupted projects for certain users.
        const appCtx = hackyCast<AppCtx | undefined>(hackyCast(window).gAppCtx);
        if (
          hint &&
          hint.originalException &&
          appCtx &&
          hideStarters(appCtx) &&
          hint.originalException instanceof Error &&
          hint.originalException.message.includes("__bundleInfo")
        ) {
          return null;
        }

        event.extra = event.extra || {};
        event.tags = event.tags || {};

        if (appCtx) {
          const location = appCtx.history.location;
          event.extra.location =
            location.pathname + location.search + location.hash;
        }

        const studioCtx = hackyCast<StudioCtx | undefined>(
          hackyCast(window).studioCtx
        );
        const maybeProjectId = studioCtx?.siteInfo.id;
        if (maybeProjectId) {
          event.tags.projectId = maybeProjectId;
          const maybeRevisionNum = studioCtx.dbCtx().revisionNum;
          if (maybeRevisionNum) {
            event.tags.revisionNum = maybeRevisionNum;
          }
        }

        // Differentiate errors generated/known by Plasmic.
        if (hint && hint.originalException instanceof CustomError) {
          event.tags.errorOrigin = "plasmic";
        } else {
          event.tags.errorOrigin = "unknown";
        }

        // Tag errors with affected user tier(s).
        if (
          appCtx &&
          isAdminTeamEmail(appCtx.selfInfo?.email, appCtx.appConfig)
        ) {
          event.tags.tier = "plasmic";
        } else {
          const userTiers = withoutFalsy(
            appCtx?.teams.map((t) => t.featureTier?.name) ?? []
          );
          event.tags.tier = getMaximumTier(userTiers);
        }

        return event;
      },
    });

    onReactionError((error) => {
      Sentry.captureException(error);
    });
  }

  (window as any).commithash = COMMITHASH;

  const appContainerElement = document.querySelector(".app-container");

  monkeyPatchConsoleLog();

  if (isTopFrame()) {
    const studioPlaceholder = getStudioPlaceholderElement();

    window.addEventListener("message", ({ data }) => {
      // Studio is ready to be shown
      // if any of these messages is triggered
      if (
        [
          "addStorageListener",
          "exposeHostFrameApi",
          "setLatestPublishedVersionData",
        ].includes(data?.path?.[0]) ||
        // Include the PLASMIC_HOST_REGISTER message, so that we can
        // hide the studio placeholder as soon as the host frame is registered.
        // The skeleton is split in two phases, first the top frame,
        // then the host frame. As the host frame can open modals, about
        // untrusted hosts, sync code components, we don't want to have
        // the skeleton visible in the top frame during this operations as it
        // would hiding those modals. So we hide the skeleton as soon as the
        // host frame is registered.
        ["PLASMIC_HOST_REGISTER"].includes(data?.type)
      ) {
        studioPlaceholder.classList.add("fadeOut");
      }
    });

    ReactDOM.render(<Shell />, appContainerElement);
  } else {
    ReactDOM.render(
      <HostFrameCtxProvider>
        <Shell />
      </HostFrameCtxProvider>,
      appContainerElement
    );
  }

  reportAndFixOversizedLocalStorage();
}

export function Shell() {
  const hostFrameCtx = useHostFrameCtxIfHostFrame();
  const history = hostFrameCtx ? hostFrameCtx.history : createBrowserHistory();

  const isProjectPathRef = React.useRef(
    isProjectPath(history.location.pathname)
  );

  React.useEffect(() => {
    if (hostFrameCtx) {
      return;
    }

    const onHistoryChange = ({ pathname }) => {
      const studioPlaceholder = getStudioPlaceholderElement();
      const _isProjectPath = isProjectPath(pathname);

      if (_isProjectPath && !isProjectPathRef.current) {
        isProjectPathRef.current = true;
        studioPlaceholder.classList.add("visible");
        studioPlaceholder.classList.remove("fadeOut");
      } else if (!_isProjectPath && isProjectPathRef.current) {
        isProjectPathRef.current = false;
        studioPlaceholder.classList.remove("visible");
        studioPlaceholder.classList.remove("fadeOut");
      }
    };

    history.listen(onHistoryChange);
  }, []);

  return (
    // @ts-ignore
    <Router history={history}>
      <OverlayProvider style={{ width: "100%", height: "100%" }}>
        <Root />
      </OverlayProvider>
    </Router>
  );
}

function monkeyPatchConsoleLog() {
  // Some integrations also monkey-patch console.log and try serialize the
  // arguments which can be pretty expensive, so we make sure to override them
  // and limit their total size.
  let finalConsoleLog = console.log;
  let innerConsoleLog = false;
  const monkeyPatchConsoleLogValue = (
    previousConsoleLog: typeof console.log
  ) => {
    finalConsoleLog = (...args: any[]) => {
      if (innerConsoleLog) {
        // The args are already sanitized and the original console.log has
        // already been called
        return previousConsoleLog(...args);
      }
      if (DEVFLAGS.logToConsole) {
        // Only the native `console.log` should take the actual arguments
        originalConsoleLog(...args);
      }
      const MAX_DEPTH = 3;
      const MAX_WIDTH = 20;
      try {
        innerConsoleLog = true;
        const visitedObjects = new Map<any, any>();
        const sanitizeLogArg = (arg: any, depth: number) => {
          if (arg && typeof arg === "object") {
            if (visitedObjects.has(arg)) {
              return visitedObjects.get(arg);
            }
            if (depth >= MAX_DEPTH) {
              const filtered = Array.isArray(arg)
                ? "[ Array ]"
                : isLiteralObject(arg)
                ? "[ Object ]"
                : `[ ${
                    swallow(() => arg.typeTag as string) || arg.constructor.name
                  } ]`;
              visitedObjects.set(arg, filtered);
              return filtered;
            } else {
              if (Array.isArray(arg)) {
                const filtered: any[] = [];
                visitedObjects.set(arg, filtered);
                filtered.push(
                  ...(arg.length > MAX_WIDTH
                    ? [...arg.slice(0, MAX_WIDTH), "..."]
                    : arg
                  ).map((subArg) => sanitizeLogArg(subArg, depth + 1))
                );
                return filtered;
              } else {
                const filtered: any = {};
                visitedObjects.set(arg, filtered);
                Object.assign(
                  filtered,
                  Object.fromEntries([
                    ...Object.entries(arg)
                      .slice(0, MAX_WIDTH)
                      .map(([key, field]) => [
                        key,
                        sanitizeLogArg(field, depth + 1),
                      ]),
                    ...(isLiteralObject(arg)
                      ? []
                      : [
                          [
                            "constructorClass",
                            swallow(() => arg.typeTag as string) ||
                              arg.constructor.name,
                          ],
                        ]),
                  ])
                );
                return filtered;
              }
            }
          }
          return arg;
        };
        return previousConsoleLog(...args.map((arg) => sanitizeLogArg(arg, 0)));
      } finally {
        innerConsoleLog = false;
      }
    };
  };
  monkeyPatchConsoleLogValue(console.log);
  // Ensure new overrides to console.log will not take precedence
  Object.defineProperty(console, "log", {
    get: () => finalConsoleLog,
    set: (newConsoleLog) => monkeyPatchConsoleLogValue(newConsoleLog),
  });
}
