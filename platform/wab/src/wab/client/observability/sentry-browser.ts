import {
  ERROR_PATTERNS_TO_IGNORE,
  shouldIgnoreError,
} from "@/wab/client/ErrorNotifications";
import { AppCtx } from "@/wab/client/app-ctx";
import { PostHogAnalytics } from "@/wab/client/observability/posthog-browser";
import type { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { UserError } from "@/wab/shared/UserError";
import { CustomError, hackyCast, withoutFalsy } from "@/wab/shared/common";
import { isAdminTeamEmail } from "@/wab/shared/devflag-utils";
import { getMaximumTier } from "@/wab/shared/pricing/pricing-utils";
import * as Sentry from "@sentry/browser";
import * as Integrations from "@sentry/integrations";
import { onReactionError } from "mobx";
import { posthog } from "posthog-js";

export function initSentryBrowser(opts: {
  production: boolean;
  commitHash: string;
  dsn: string;
  orgId: string;
  projId: number;
  posthogAnalytics: PostHogAnalytics;
}) {
  if (!opts.production) {
    return;
  }
  Sentry.init({
    dsn: opts.dsn,
    release: opts.commitHash,
    integrations: [
      new Integrations.Dedupe(),
      new posthog.SentryIntegration(
        opts.posthogAnalytics.ph,
        opts.orgId,
        opts.projId
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
