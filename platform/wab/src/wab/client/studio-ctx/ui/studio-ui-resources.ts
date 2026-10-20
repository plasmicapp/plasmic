import { useFrameCtxMaybe } from "@/wab/client/frame-ctx/frame-ctx";
import type { TopFrameCtx } from "@/wab/client/frame-ctx/top-frame-ctx";
import { useStudioCtxMaybe } from "@/wab/client/studio-ctx/StudioCtx";
import { UiActionType } from "@/wab/client/studio-ctx/ui/UiActionBus";
import {
  ComponentScopedModel,
  ComponentScopedTag,
  ModelUiId,
  SiteScopedModel,
  SiteScopedTag,
  UiId,
  parseModelUiId,
} from "@/wab/client/studio-ctx/ui/studio-ui-ids";
import { getBaseVariant } from "@/wab/shared/Variants";
import {
  assertNever,
  ensure,
  maybe,
  spawn,
  switchType,
} from "@/wab/shared/common";
import {
  allComponentVariants,
  tryGetComponentByUuid,
} from "@/wab/shared/core/components";
import { siteDataTokensDirectDeps } from "@/wab/shared/core/site-data-tokens";
import { siteStyleTokensDirectDeps } from "@/wab/shared/core/site-style-tokens";
import {
  allAnimationSequencesDict,
  tryGetGlobalVariantByUuid,
} from "@/wab/shared/core/sites";
import {
  isTplNamable,
  summarizeTpl,
  summarizeTplNamable,
  tryGetTplByUuid,
} from "@/wab/shared/core/tpls";
import { getEffectiveVariantSetting } from "@/wab/shared/effective-variant-setting";
import {
  AnimationSequence,
  Component,
  ComponentDataQuery,
  ComponentServerQuery,
  DataToken,
  Param,
  Site,
  StyleToken,
  TplNode,
  Variant,
} from "@/wab/shared/model/classes";
import * as Comlink from "comlink";
import { reaction } from "mobx";
import * as React from "react";

export interface ResourceApi {
  subscribe(
    uiId: ModelUiId,
    onLabel: (label: string | undefined) => void,
  ): () => void;
  dispatch(uiId: UiId, type: UiActionType): void;
}

export function subscribeResourceLabel(
  site: Site,
  uiId: ModelUiId,
  onLabel: (label: string | undefined) => void,
): () => void {
  return reaction(
    () => resolveResourceLabel(site, uiId),
    // Forward only the label: mobx also passes the previous value and the
    // Reaction itself, which a Comlink-proxied callback cannot clone.
    (label) => onLabel(label),
    { fireImmediately: true },
  );
}

/** Resolves against the studio directly, or over the frame boundary. */
export function useResourceApi(): ResourceApi | undefined {
  const studioCtx = useStudioCtxMaybe();
  const frameCtx = useFrameCtxMaybe<TopFrameCtx>();
  const topFrameCtx =
    frameCtx && "hostFrameApi" in frameCtx ? frameCtx : undefined;
  const hostFrameApi = topFrameCtx?.hostFrameApiReady
    ? topFrameCtx.hostFrameApi
    : undefined;
  return React.useMemo(() => {
    if (studioCtx) {
      return {
        subscribe: (uiId, onLabel) =>
          subscribeResourceLabel(studioCtx.site, uiId, onLabel),
        dispatch: (uiId, type) => studioCtx.uiActionBus.dispatch(uiId, type),
      };
    }
    if (hostFrameApi) {
      return {
        subscribe: (uiId, onLabel) => {
          const proxied = Comlink.proxy(onLabel);
          const subscribed = hostFrameApi
            .subscribeResource(uiId, proxied)
            .catch((e) => {
              console.error(e);
              proxied[Comlink.releaseProxy]();
            });
          return () =>
            spawn(
              subscribed.then((unsubscribe) => {
                unsubscribe?.();
                unsubscribe?.[Comlink.releaseProxy]();
              }),
            );
        },
        dispatch: (uiId, type) =>
          spawn(hostFrameApi.dispatchUiAction(uiId, type)),
      };
    }
    return undefined;
  }, [studioCtx, hostFrameApi]);
}

interface ResolvedResource {
  resource: SiteScopedModel | ComponentScopedModel;
  owner?: Component;
}

export function resolveResource(
  site: Site,
  uiId: ModelUiId,
): ResolvedResource | undefined {
  const parsed = parseModelUiId(uiId);
  if (!parsed) {
    return undefined;
  }
  switch (parsed.type) {
    case "SiteScoped":
      return maybe(
        findSiteScoped(site, parsed.tag, parsed.uuid),
        (resource) => ({ resource }),
      );
    case "ComponentScoped": {
      const owner = tryGetComponentByUuid(site, parsed.componentUuid, {
        includeDeps: "direct",
      });
      return (
        owner &&
        maybe(
          findComponentScoped(owner, parsed.tag, parsed.uuid),
          (resource) => ({
            resource,
            owner,
          }),
        )
      );
    }
  }
}

export function resolveResourceLabel(
  site: Site,
  uiId: ModelUiId,
): string | undefined {
  return maybe(resolveResource(site, uiId), ({ resource, owner }) =>
    switchType(resource)
      .when(
        [Component, StyleToken, DataToken, AnimationSequence, Variant],
        (r) => r.name,
      )
      .when([ComponentDataQuery, ComponentServerQuery], (q) => q.name)
      .when(Param, (p) => p.variable.name)
      .when(TplNode, (tpl) => {
        const base = getBaseVariant(
          ensure(owner, "a Tpl is always component-scoped"),
        );
        const vs = getEffectiveVariantSetting(tpl, [base]);
        return isTplNamable(tpl)
          ? summarizeTplNamable(tpl, vs.rsh())
          : summarizeTpl(tpl, vs.rsh());
      })
      .result(),
  );
}

function findSiteScoped(
  site: Site,
  tag: SiteScopedTag,
  uuid: string,
): SiteScopedModel | undefined {
  switch (tag) {
    case "Component":
      return tryGetComponentByUuid(site, uuid, { includeDeps: "direct" });
    case "StyleToken":
      return siteStyleTokensDirectDeps(site).find((t) => t.uuid === uuid);
    case "DataToken":
      return siteDataTokensDirectDeps(site).find((t) => t.uuid === uuid);
    case "AnimationSequence":
      return allAnimationSequencesDict(site, { includeDeps: "direct" })[uuid];
    case "GlobalVariant":
      return tryGetGlobalVariantByUuid(site, uuid, { includeDeps: "direct" });
    default:
      return assertNever(tag);
  }
}

function findComponentScoped(
  owner: Component,
  tag: ComponentScopedTag,
  uuid: string,
): ComponentScopedModel | undefined {
  switch (tag) {
    case "Variant":
      return allComponentVariants(owner).find((v) => v.uuid === uuid);
    case "GlobalVariantGroupParam":
    case "PropParam":
    case "SlotParam":
    case "StateChangeHandlerParam":
    case "StateParam":
      return owner.params.find((p) => p.uuid === uuid);
    case "ComponentDataQuery":
      return owner.dataQueries.find((q) => q.uuid === uuid);
    case "ComponentServerQuery":
      return owner.serverQueries.find((q) => q.uuid === uuid);
    case "Tpl":
      return tryGetTplByUuid(owner, uuid);
    default:
      return assertNever(tag);
  }
}
