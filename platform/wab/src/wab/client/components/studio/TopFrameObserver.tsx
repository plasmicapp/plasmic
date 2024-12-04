import { usePreviewCtx } from "@/wab/client/components/live/PreviewCtx";
import { HostFrameApi } from "@/wab/client/frame-ctx/host-frame-api";
import { useHostFrameCtx } from "@/wab/client/frame-ctx/host-frame-ctx";
import { StudioAppUser, useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ApiBranch } from "@/wab/shared/ApiSchema";
import { isComponentArena, isPageArena } from "@/wab/shared/Arenas";
import { findAllDataSourceOpExprForComponent } from "@/wab/shared/cached-selectors";
import { getNormalizedComponentName } from "@/wab/shared/codegen/react-p/serialize-utils";
import { filterFalsy, jsonClone, spawn } from "@/wab/shared/common";
import {
  isFrameComponent,
  isPageComponent,
  isReusableComponent,
} from "@/wab/shared/core/components";
import { Component } from "@/wab/shared/model/classes";
import { notification } from "antd";
import { sortBy } from "lodash";
import { autorun, computed } from "mobx";
import { observer } from "mobx-react";
import React from "react";
import { mutate as swrMutate } from "swr";

import { useTopFrameApi } from "@/wab/client/contexts/AppContexts";

export interface TopFrameObserverProps {
  preview?: boolean;
}

export const TopFrameObserver = observer(function _TopFrameObserver({
  preview,
}: TopFrameObserverProps) {
  const hostFrameCtx = useHostFrameCtx();
  const studioCtx = useStudioCtx();
  const previewCtx = usePreviewCtx();
  const topFrameApi = useTopFrameApi();

  const hostFrameApi = React.useMemo<HostFrameApi>(
    () => ({
      switchLeftTab: async (tabKey, opts) =>
        studioCtx.switchLeftTab(tabKey, opts),
      refreshSiteInfo: async () => {
        await studioCtx.refreshSiteInfo();
      },
      calculateNextPublishVersion: async () => {
        const next = await studioCtx.calculateNextPublishVersion();
        return next
          ? {
              changeLog: next.changeLog,
              version: next.version,
              releaseType: next.releaseType,
            }
          : undefined;
      },
      getLatestPublishedVersionId: async () => studioCtx.releases[0]?.id,
      getProjectReleases: async () => studioCtx.getProjectReleases(),
      publishVersion: async (versionTags, versionDesc, branchId) =>
        studioCtx.publish(versionTags, versionDesc, branchId),
      focusOnWindow: async () => {
        window.focus();
      },
      forwardShortcut: async ({
        code,
        ctrlKey,
        key,
        metaKey,
        shiftKey,
        keyCode,
      }) => {
        document.body.dispatchEvent(
          new KeyboardEvent("keydown", {
            code,
            ctrlKey,
            key,
            metaKey,
            shiftKey,
            keyCode,
          })
        );
        document.body.dispatchEvent(
          new KeyboardEvent("keypress", {
            code,
            ctrlKey,
            key,
            metaKey,
            shiftKey,
            keyCode,
          })
        );
      },
      updateLocalizationProjectFlag: async (v) => {
        await studioCtx.change(({ success }) => {
          studioCtx.site.flags.usePlasmicTranslation = v;
          notification.info({
            message: `Localization is now ${
              studioCtx.site.flags.usePlasmicTranslation ? "on" : "off"
            }`,
          });
          return success();
        });
      },
      async switchToBranch(branch: ApiBranch | undefined): Promise<void> {
        await studioCtx.switchToBranch(branch);
      },
      async mutateSWRKeys(keys: string[]): Promise<void> {
        await Promise.all(keys.map((key) => swrMutate(key)));
      },
      async getUsedRolesInProject(): Promise<
        { component: string; roleId: string }[]
      > {
        const roleUsage: { component: string; roleId: string }[] = [];
        for (const component of studioCtx.site.components) {
          if (isPageComponent(component)) {
            if (component.pageMeta?.roleId) {
              roleUsage.push({
                component: component.name,
                roleId: component.pageMeta.roleId,
              });
            }
          }

          const componentDataOps =
            findAllDataSourceOpExprForComponent(component);
          for (const componentDataOp of componentDataOps) {
            if (componentDataOp?.roleId) {
              roleUsage.push({
                component: component.name,
                roleId: componentDataOp.roleId,
              });
            }
          }
        }
        return roleUsage;
      },
      async setDefaultPageRoleId(
        roleId: string | null | undefined
      ): Promise<void> {
        await studioCtx.change(({ success }) => {
          studioCtx.site.defaultPageRoleId = roleId;
          return success();
        });
      },
      async logAsAppUser(appUser: StudioAppUser): Promise<void> {
        await studioCtx.logAsAppUser(appUser);
        await studioCtx.refreshAppUserProperties();
      },
      async handleBranchMerged(): Promise<void> {
        await studioCtx.handleBranchMerged();
      },
    }),
    [studioCtx]
  );

  React.useEffect(() => {
    hostFrameCtx.onHostFrameApiReady(hostFrameApi);
  }, [hostFrameApi]);

  React.useEffect(() => {
    const noComponents = computed(
      () =>
        studioCtx.site.components.filter((c) => !isFrameComponent(c)).length ===
        0
    );

    // Get either (in descending preference):
    //
    // - the currently viewed or selected page/component (if mixed arena),
    // - the page at /,
    // - the first page lexicographically (by name),
    // - the first component lexicographically,
    // - or else undefined.
    const subjectComponent = computed(
      (): undefined | Component =>
        [
          isPageArena(studioCtx.currentArena)
            ? studioCtx.currentArena.component
            : isComponentArena(studioCtx.currentArena)
            ? studioCtx.currentArena.component
            : studioCtx.focusedViewCtx()?.component,
          studioCtx.site.components.find(
            (c) => isPageComponent(c) && c.pageMeta.path === "/"
          ),
          sortBy(
            studioCtx.site.components.filter((c) => isPageComponent(c)),
            (c) => c.name.toLowerCase()
          )[0],
          sortBy(
            studioCtx.site.components.filter((c) => isReusableComponent(c)),
            (c) => c.name.toLowerCase()
          )[0],
        ].filter(Boolean)[0]
    );

    const disposes = filterFalsy([
      autorun(() => {
        spawn(
          topFrameApi.setPrimitiveValues({
            noComponents: noComponents.get(),
            revisionNum: studioCtx.revisionNum,
            isLocalizationEnabled: !!studioCtx.site.flags.usePlasmicTranslation,
            defaultPageRoleId: studioCtx.site.defaultPageRoleId,
          })
        );
      }),
      autorun(() => {
        spawn(
          topFrameApi.setLatestPublishedVersionData(
            studioCtx.releases.length > 0 && studioCtx.releases[0].revisionId
              ? {
                  revisionId: studioCtx.releases[0].revisionId,
                  version: studioCtx.releases[0].version,
                }
              : undefined
          )
        );
      }),
      autorun(() => {
        const subjectComp = subjectComponent.get();
        const componentInfo = subjectComp
          ? {
              pathOrComponent:
                subjectComp.pageMeta?.path ??
                getNormalizedComponentName(subjectComp),
              componentName: getNormalizedComponentName(subjectComp),
            }
          : undefined;

        spawn(topFrameApi.setSubjectComponentInfo(componentInfo));
      }),
      studioCtx.showBranching() &&
        autorun(() => {
          const branchInfo = studioCtx.dbCtx().branchInfo;
          spawn(
            topFrameApi.setActivatedBranch(
              jsonClone(branchInfo ?? null) ?? undefined
            )
          );
        }),
    ]);
    return () => disposes.forEach((f) => f());
  }, [studioCtx, previewCtx, preview, topFrameApi]);

  return null;
});
