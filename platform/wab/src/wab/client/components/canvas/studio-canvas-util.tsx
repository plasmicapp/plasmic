import {
  getComponentByPath,
  getMatchingPagePathParams,
} from "@/wab/client/components/live/PreviewCtx";
import { PublicLink } from "@/wab/client/components/PublicLink";
import { LinkButton } from "@/wab/client/components/widgets";
import * as domMod from "@/wab/client/dom";
import { Fiber } from "@/wab/client/react-global-hook/fiber";
import {
  getMostRecentFiberVersion,
  globalHookCtx,
} from "@/wab/client/react-global-hook/globalHook";
import { ACTIONS_META } from "@/wab/client/state-management/interactions-meta";
import { RightTabKey, StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { CustomError, delay, hackyCast, unexpected } from "@/wab/common";
import { isAbsoluteUrl } from "@/wab/commons/urls";
import { PageComponent } from "@/wab/components";
import { InteractionArgLoc, InteractionLoc } from "@/wab/exprs";
import { maybePropTypeToDisplayName } from "@/wab/shared/code-components/code-components";
import { getDisplayNameOfEventHandlerKey } from "@/wab/tpls";
import { notification } from "antd";
import { when } from "mobx";
import React from "react";

export function hasLinkedSelectable(x: JQuery, viewCtx: ViewCtx) {
  return x.toArray().some((elt) => {
    const key = Object.keys(elt).find(
      (k) =>
        k.startsWith("__reactInternalInstance$") ||
        k.startsWith("__reactFiber$")
    );
    if (!key) {
      return false;
    }
    let fiber: Fiber | null = getMostRecentFiberVersion(elt[key] as Fiber);
    const hasSelectable = (node: Fiber) =>
      !!globalHookCtx.fiberToVal.get(node) ||
      !!globalHookCtx.fiberToSlotPlaceholderKeys.get(node);
    let hasInstance = hasSelectable(fiber);
    if (hasInstance) {
      return true;
    }
    // The ValNode might be passed to the enclosing component that rendered
    // this element, so go up in the Fiber tree.
    fiber = fiber.return;
    while (fiber) {
      fiber = getMostRecentFiberVersion(fiber);
      if (viewCtx.isElement(fiber.stateNode)) {
        // Exit if we hit another DOM node
        break;
      }
      hasInstance = hasSelectable(fiber);
      if (hasInstance) {
        return true;
      }
      fiber = fiber.return;
    }
    return false;
  });
}

// Nodes with `data-nonselectable` are ignored in closestTaggedNonTextDomElt
// when excludeNonSelectable opt is used. That is used to avoid hovering
// nodes inside rich text blocks that are being edited.
function isNonSelectable(x: JQuery) {
  return !!x[0].dataset.nonselectable;
}

export function closestTaggedNonTextDomElt(
  start: JQuery,
  viewCtx: ViewCtx,
  opts?: {
    dir?: "up" | "down";
    excludeNonSelectable?: boolean;
    excludeSelf?: boolean;
  }
): JQuery | null {
  opts = opts || {};
  const dir = opts.dir || "up";
  const excludeNonSelectable = opts.excludeNonSelectable || false;
  const gen = (() => {
    switch (dir) {
      case "up":
        return domMod.ancestors(start, opts.excludeSelf);
      case "down":
        return domMod.bfs(start, opts.excludeSelf);
      default:
        return unexpected();
    }
  })();
  for (const x of gen) {
    if (
      hasLinkedSelectable(x, viewCtx) &&
      (!excludeNonSelectable || !isNonSelectable(x))
    ) {
      return x;
    }
  }
  return null;
}

class NonValNodeError extends CustomError {}

export function closestNonText(x: JQuery<any>, viewCtx: ViewCtx) {
  let spanCount = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const isSpan = x.is("span");
    const isText =
      domMod.tag(x) === "" ||
      (spanCount === 0 && isSpan && x.hasClass("__wab_text"));
    if (isSpan) {
      spanCount += 1;
    }
    if (!isText) {
      break;
    }
    x = x.parent();
  }
  if (!hasLinkedSelectable(x, viewCtx)) {
    throw new NonValNodeError(
      "not a DOM element generated from a TplNode/ValNode"
    );
  }
  return x;
}

/**
 * Find nearest non-text-node
 */
export function closestTag(x: JQuery<any>) {
  while (domMod.tag(x) === "" || x.is("div.structure")) {
    x = x.parent();
  }
  return x;
}

export function absorbLinkClick(
  e: JQuery.UIEventBase | Event,
  onAnchorClick?: (href: string) => void
) {
  let cur = e.target as HTMLElement | null;
  while (cur) {
    if (cur.tagName.toLowerCase() === "a" && cur.attributes["href"]?.value) {
      onAnchorClick && onAnchorClick(cur.attributes["href"].value || "");
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    cur = cur.parentElement;
  }
}

export function studioMode(studioCtx: StudioCtx) {
  // check preview and API explorer mode first since interactive mode might also be true even though preview mode is showing on top
  if (studioCtx.previewCtx?.isLive || studioCtx.previewCtx?.popup) {
    return "preview mode";
  } else if (studioCtx.isDocs) {
    return "API explorer";
  } else if (studioCtx.isInteractiveMode) {
    return "interactive mode";
  } else {
    unexpected("studio should be in interactive mode or preview mode");
  }
}

export function showCanvasPageNavigationNotification(
  studioCtx: StudioCtx,
  href: string
) {
  const maybeFound = href ? getComponentByPath(studioCtx, href) : null;
  notification.info({
    key: "navigation-notification",
    message: `Page navigation disabled`,
    description: (
      <div>
        <p>
          The application tried to go to a different page
          {href ? (
            <>
              , <u>{href}</u>
            </>
          ) : null}
          .
        </p>
        {maybeFound ? (
          <p>
            <LinkButton
              onClick={async () => {
                await studioCtx.change(({ success }) => {
                  // Update the page param preview values on the page to match.
                  // TODO also handle query params
                  if (maybeFound.component.pageMeta) {
                    const pageComponent = hackyCast<PageComponent>(
                      maybeFound.component
                    );
                    const paramValues = getMatchingPagePathParams(
                      pageComponent.pageMeta.path,
                      href
                    );
                    if (paramValues) {
                      pageComponent.pageMeta.params = paramValues;
                    }
                  }

                  studioCtx.switchToComponentArena(maybeFound.component);
                  return success();
                });
                notification.close("navigation-notification");
              }}
            >
              Switch to editing that page
            </LinkButton>
          </p>
        ) : null}
        {href && isAbsoluteUrl(href) && (
          <p>
            <PublicLink
              href={href}
              target={"_blank"}
              onClick={async () => {
                notification.close("navigation-notification");
              }}
            >
              Open {href} in a new tab
            </PublicLink>
          </p>
        )}
      </div>
    ),
  });
}

export function showCanvasAuthNotification(
  mode: "preview mode" | "interactive mode"
) {
  notification.info({
    message: `Login and logout not supported in ${mode}`,
    description: (
      <p>
        Plasmic Studio detected and ignored a login or logout event. To view
        this artboard as a different user, click the "View as..." dropdown in
        the top bar.
      </p>
    ),
  });
}

export function trapInteractionError(
  studioCtx: StudioCtx,
  loc: InteractionLoc | InteractionArgLoc,
  error: Error
) {
  const previewCtx = studioCtx.previewCtx;
  const found = studioCtx.tplMgr().findInteractionByUuid(loc.interactionUuid);
  let title = <>Error in interaction</>;
  let details = <></>;
  if (found) {
    const { component, tpl, eventHandlerKey, eventHandler, interaction } =
      found;
    const stepName = interaction.interactionName;
    async function goToStep() {
      if (previewCtx) {
        await previewCtx.stopLiveMode();
        await when(() => !previewCtx.isLive);
      }
      if (studioCtx.isInteractiveMode) {
        studioCtx.isInteractiveMode = false;
      }
      await studioCtx.setStudioFocusOnTpl(component, tpl);
      await studioCtx.change(({ success }) => {
        studioCtx.rightTabKey = RightTabKey.settings;
        return success();
      });
      studioCtx.highlightInteractionRequested.dispatch({
        eventHandler,
        interaction,
        argName: loc.type === "InteractionArgLoc" ? loc.argName : undefined,
      });
      await delay(1000);
      notification.close("interaction-error");
    }
    title = (
      <>
        Error in{" "}
        <strong>
          {getDisplayNameOfEventHandlerKey(eventHandlerKey, { tpl })}
        </strong>{" "}
        interaction
      </>
    );
    details = (() => {
      switch (loc.type) {
        case "InteractionArgLoc": {
          const propLabel = maybePropTypeToDisplayName(
            ACTIONS_META[interaction.actionName].parameters[loc.argName]
          );
          return (
            <>
              <p>
                Error in <strong>{propLabel}</strong> of step "
                <strong>{stepName}</strong>".{" "}
                <LinkButton onClick={goToStep}>Edit step</LinkButton>.
              </p>

              <pre style={{ whiteSpace: "pre-wrap" }}>
                <code>{error.message}</code>
              </pre>
            </>
          );
        }
        case "InteractionLoc":
          return (
            <>
              <p>
                Error in step "<strong>{stepName}</strong>".{" "}
                <LinkButton onClick={goToStep}>Edit step</LinkButton>.
              </p>
              <pre style={{ whiteSpace: "pre-wrap" }}>
                <code>{error.message}</code>
              </pre>
            </>
          );
      }
    })();
  }
  notification.error({
    key: "interaction-error",
    message: title,
    description: details,
    duration: 0,
  });
}
