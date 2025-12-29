/** @format */
import { useContextMenu } from "@/wab/client/components/ContextMenu";
import { PublicLink } from "@/wab/client/components/PublicLink";
import { usePreviewCtx } from "@/wab/client/components/live/PreviewCtx";
import {
  MenuBuilder,
  TextAndShortcut,
} from "@/wab/client/components/menu-builder";
import { AvatarGallery } from "@/wab/client/components/studio/Avatar";
import { Icon } from "@/wab/client/components/widgets/Icon";
import Select from "@/wab/client/components/widgets/Select";
import { useAppCtx, useTopFrameApi } from "@/wab/client/contexts/AppContexts";
import ComponentIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Component";
import PageIcon from "@/wab/client/plasmic/plasmic_kit_design_system/icons/PlasmicIcon__Page";
import PlasmicTopBar from "@/wab/client/plasmic/plasmic_kit_top_bar/PlasmicTopBar";
import { getComboForAction } from "@/wab/client/shortcuts/studio/studio-shortcuts";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import {
  STUDIO_ONBOARDING_TUTORIALS,
  STUDIO_ONBOARDING_TUTORIALS_LIST,
} from "@/wab/client/tours/tutorials/tutorials-meta";
import { ensure, spawn, withoutNils } from "@/wab/shared/common";
import {
  isCodeComponent,
  isFrameComponent,
  isPageComponent,
  isReusableComponent,
} from "@/wab/shared/core/components";
import { isAdminTeamEmail } from "@/wab/shared/devflag-utils";
import { pruneUnusedImageAssets } from "@/wab/shared/prune-site";
import { APP_ROUTES } from "@/wab/shared/route/app-routes";
import { fillRoute } from "@/wab/shared/route/route";
import { naturalSort } from "@/wab/shared/sort";
import {
  canEditProjectConfig,
  canPublishProject,
} from "@/wab/shared/ui-config-utils";
import { fixPageHrefsToLocal } from "@/wab/shared/utils/split-site-utils";
import { Menu, Tooltip, notification } from "antd";
import { observer } from "mobx-react";
import React from "react";
import useSWR from "swr";

export const outlineModes = ["blocks", "inlines", "all"];

interface TopBarProps {
  preview?: boolean;
}

function _TopBar({ preview }: TopBarProps) {
  const studioCtx = useStudioCtx();
  const appCtx = useAppCtx();
  const previewCtx = usePreviewCtx();
  const topFrameApi = useTopFrameApi();
  const { data } = useSWR("top-bar-config", async () => {
    const [team, canEditUiConfig] = await Promise.all([
      topFrameApi.getCurrentTeam(),
      topFrameApi.canEditProjectUiConfig(),
    ]);
    return {
      team,
      canEditUiConfig,
    };
  });
  const team = data?.team;
  const canEditUiConfig = data?.canEditUiConfig;
  const isWhiteLabelUser = appCtx.isWhiteLabelUser();
  const isObserver = appCtx.selfInfo?.isObserver;

  const uiConfig = studioCtx.getCurrentUiConfig();

  const menu = canEditProjectConfig(uiConfig)
    ? () => {
        const builder = new MenuBuilder();
        builder.genSection(undefined, (push) => {
          builder.genSection(undefined, (push2) => {
            if (
              studioCtx.canEditProject() &&
              canEditProjectConfig(uiConfig, "rename")
            ) {
              push2(
                <Menu.Item
                  key="rename"
                  onClick={() => topFrameApi.setShowProjectNameModal(true)}
                >
                  Rename project
                </Menu.Item>
              );
            }

            if (!isWhiteLabelUser) {
              push2(
                <Menu.Item
                  key="duplicate"
                  onClick={() => topFrameApi.setShowCloneProjectModal(true)}
                >
                  Duplicate project
                </Menu.Item>
              );
            }
          });

          if (studioCtx.canEditProject() && !studioCtx.contentEditorMode) {
            builder.genSection("Configuration", (push2) => {
              push2(
                <Menu.Item
                  key="configure"
                  data-test-id="configure-project"
                  onClick={() => {
                    spawn(topFrameApi.setShowHostModal(true));
                  }}
                >
                  Configure custom app host
                </Menu.Item>
              );
              // After RSCs are released, only show auth config if the app already uses it
              const showAuth =
                (!appCtx.appConfig.rscRelease ||
                  studioCtx.siteInfo.hasAppAuth) &&
                !isWhiteLabelUser;
              if (showAuth) {
                push2(
                  <Menu.Item
                    key="app-auth"
                    onClick={() => {
                      spawn(topFrameApi.setShowAppAuthModal(true));
                    }}
                  >
                    Configure app authentication
                  </Menu.Item>
                );
              }

              if (canEditProjectConfig(uiConfig, "localization")) {
                push2(
                  <Menu.Item
                    key="localization"
                    onClick={() => {
                      spawn(topFrameApi.setShowLocalizationModal(true));
                    }}
                  >
                    {studioCtx.site.flags.usePlasmicTranslation
                      ? "Disable"
                      : "Enable"}{" "}
                    localization framework integration
                  </Menu.Item>
                );
              }

              if (
                appCtx.appConfig.secretApiTokenTeams?.includes(
                  studioCtx.siteInfo.teamId ?? ""
                )
              ) {
                push2(
                  <Menu.Item
                    key="secret"
                    onClick={() => {
                      spawn(topFrameApi.showRegenerateSecretTokenModal());
                    }}
                  >
                    Regenerate secret project API token
                  </Menu.Item>
                );
              }

              if (canEditUiConfig) {
                push2(
                  <Menu.Item
                    key="ui-config"
                    onClick={() => {
                      spawn(topFrameApi.setShowUiConfigModal(true));
                    }}
                  >
                    Configure Studio UI for project
                  </Menu.Item>
                );
              }
            });

            const isAdmin = isAdminTeamEmail(
              appCtx.selfInfo?.email,
              appCtx.appConfig
            );
            if (isAdmin || appCtx.appConfig.debug) {
              builder.genSection("Debug", (push2) => {
                builder.genSub("Optimization", (push3) => {
                  push3(
                    <Menu.Item
                      key="cleanup"
                      onClick={() => {
                        spawn(
                          studioCtx.change(({ success }) => {
                            studioCtx.tplMgr().cleanRedundantOverrides();
                            return success();
                          })
                        );
                        notification.info({
                          message: `Redundant overrides have been cleaned. You can run this again every time you want to clean them.`,
                        });
                      }}
                    >
                      Remove redundant overrides
                    </Menu.Item>
                  );
                  push3(
                    <Menu.Item
                      key="prune-images"
                      onClick={async () => {
                        spawn(
                          studioCtx.change(({ success }) => {
                            const pruned = pruneUnusedImageAssets(
                              studioCtx.site
                            );
                            notification.success({
                              message: `Pruned ${pruned.size} assets`,
                            });
                            return success();
                          })
                        );
                      }}
                    >
                      Remove unused image assets
                    </Menu.Item>
                  );
                  push3(
                    <Menu.Item
                      key="cleanup-invisible"
                      onClick={async () => {
                        spawn(
                          studioCtx.change(({ success }) => {
                            const result = studioCtx
                              .tplMgr()
                              .lintElementVisibilities({
                                performUpdates: true,
                              });

                            console.log(result);

                            notification.success({
                              message: `Fixed ${Object.keys(
                                result.total
                              )} invisible elements in ${
                                Object.keys(result.changesByComponent).length
                              }`,
                            });
                            return success();
                          })
                        );
                      }}
                    >
                      Lint and fix invisible elements
                    </Menu.Item>
                  );
                });
                if (isAdmin) {
                  push2(
                    <Menu.Item
                      key="admin-mode"
                      onClick={() => {
                        spawn(
                          topFrameApi.toggleAdminMode(
                            !appCtx.selfInfo?.adminModeDisabled
                          )
                        );
                      }}
                    >
                      <strong>
                        {appCtx.selfInfo!.adminModeDisabled
                          ? "Enable"
                          : "Disable"}
                      </strong>{" "}
                      admin mode
                    </Menu.Item>
                  );

                  push2(
                    <Menu.SubMenu
                      title={
                        <span>
                          <strong>Start</strong> onboarding tour
                        </span>
                      }
                    >
                      {STUDIO_ONBOARDING_TUTORIALS_LIST.map((tour) => {
                        return (
                          <Menu.Item
                            key={tour}
                            onClick={() => {
                              studioCtx.setOnboardingTourState({
                                run: true,
                                stepIndex: 0,
                                tour,
                                flags: {},
                                results: {},
                                triggers: [],
                              });
                            }}
                          >
                            {tour} - {STUDIO_ONBOARDING_TUTORIALS[tour].length}{" "}
                            steps
                          </Menu.Item>
                        );
                      })}
                    </Menu.SubMenu>
                  );

                  builder.genSub("Site-splitting utils", (push3) => {
                    push3(
                      <Menu.Item
                        key="fix-page-hrefs-to-local"
                        onClick={async () =>
                          studioCtx.changeUnsafe(() => {
                            fixPageHrefsToLocal(studioCtx.site);
                          })
                        }
                      >
                        Convert page hrefs to local pages
                      </Menu.Item>
                    );
                  });
                }
              });
            }
          }
        });

        return builder.build({
          menuName: "project-menu",
        });
      }
    : undefined;

  const contextMenuProps = useContextMenu({ menu });

  const brand =
    uiConfig.brand ??
    appCtx.appConfig.brands?.[studioCtx.siteInfo.teamId ?? ""] ??
    appCtx.appConfig.brands?.[""];

  const previewPages = previewCtx.studioCtx.site.components.filter((c) =>
    isPageComponent(c)
  );
  const previewComponents = previewCtx.studioCtx.site.components.filter(
    (c) => isReusableComponent(c) && !isCodeComponent(c)
  );
  const previewArtboards = previewCtx.studioCtx.site.components.filter((c) =>
    isFrameComponent(c)
  );

  return (
    <>
      <PlasmicTopBar
        root={
          isObserver
            ? {
                className: "topbar--isObserver",
              }
            : undefined
        }
        mode={preview ? "preview" : undefined}
        hideAvatar
        freeTrial={{
          team,
        }}
        logoLink={{
          render: (props) => (
            <Tooltip title={brand.logoTooltip ?? "Back to dashboard"}>
              <PublicLink
                {...props}
                href={brand.logoHref ?? fillRoute(APP_ROUTES.dashboard, {})}
              >
                {brand.logoImgSrc ? (
                  <img src={brand.logoImgSrc} style={{ maxHeight: 40 }} />
                ) : (
                  props.children
                )}
              </PublicLink>
            </Tooltip>
          ),
        }}
        projectTitle={{
          onClick: () => {
            if (studioCtx.canEditProject() && canEditProjectConfig(uiConfig)) {
              spawn(topFrameApi.setShowProjectNameModal(true));
            }
          },
          children: studioCtx.siteInfo.name,
        }}
        projectMenu={{
          props: { ...contextMenuProps, "data-test-id": "project-menu-btn" },
          wrap: (n) =>
            studioCtx.canEditProject() && canEditProjectConfig(uiConfig)
              ? n
              : null,
        }}
        saveIndicator={{
          wrap: (n) => (studioCtx.canEditProject() ? n : null),
        }}
        branchSeparator={{
          wrap: (n) => (studioCtx.showBranching() ? n : null),
        }}
        branchSegment={{
          wrap: (n) => (studioCtx.showBranching() ? n : null),
        }}
        publishButton={{
          props: {
            enable: studioCtx.canEditProject() && canPublishProject(uiConfig),
          },
        }}
        avatar={{
          render: () => (
            <AvatarGallery users={withoutNils([appCtx.selfInfo])} />
          ),
        }}
        play={{
          onClick: () => {
            void studioCtx.changeUnsafe(() => studioCtx.toggleDevControls());
          },
          tooltip: (
            <TextAndShortcut
              shortcut={getComboForAction("TOGGLE_PREVIEW_MODE")}
            >
              Preview the current artboard
            </TextAndShortcut>
          ),
          disabled: !studioCtx.currentArena || studioCtx.currentArenaEmpty,
          ...{ "data-test-id": "enter-live-mode-btn" },
        }}
        stop={{
          onClick: () => {
            void studioCtx.changeUnsafe(() => studioCtx.toggleDevControls());
          },
          tooltip: (
            <TextAndShortcut shortcut={"esc"}>
              Go back to edit mode
            </TextAndShortcut>
          ),

          ...{ "data-test-id": "exit-live-mode-btn" },
        }}
        codeButton={
          studioCtx.contentEditorMode || isWhiteLabelUser
            ? {
                render: () => null,
              }
            : {}
        }
        zoomButton={{}}
        viewButton={{}}
        shareButton={
          isWhiteLabelUser
            ? {
                render: () => null,
              }
            : {}
        }
        commentButton={{
          wrap: studioCtx.showComments() ? undefined : () => null,
          props: {
            active: studioCtx.showCommentsPanel,
            onClick: () => studioCtx.toggleCommentsPanel(),
            "data-test-id": "top-comment-icon",
          },
        }}
        aiButton={{
          wrap: studioCtx.uiCopilotEnabled() ? undefined : () => null,
          props: {
            active: studioCtx.showUiCopilot,
            onClick: () =>
              studioCtx.openUiCopilotDialog(!studioCtx.showUiCopilot),
          },
        }}
        // TODO: We are currently not showing the live popout button on
        // preview mode. That will require abstracting LivePreview out of
        // it, so that when it is unmounted and mounted again (on route change)
        // things continue working.
        livePopOutButton={preview ? { wrap: () => null } : undefined}
        previewSelect={
          preview
            ? {
                "aria-label": "Select component",
                children: (
                  <>
                    {previewPages.length > 0 && (
                      <Select.OptionGroup title="Pages">
                        {naturalSort(previewPages, (c) => c.name).map((c) => (
                          <Select.Option key={c.uuid} value={c.uuid}>
                            <Icon icon={PageIcon} style={{ marginRight: 4 }} />
                            {c.name}{" "}
                            <span style={{ fontSize: "0.9em", opacity: 0.7 }}>
                              (
                              {
                                ensure(
                                  c.pageMeta,
                                  "Page component is expected to have page meta"
                                ).path
                              }
                              )
                            </span>
                          </Select.Option>
                        ))}
                      </Select.OptionGroup>
                    )}
                    {previewComponents.length > 0 && (
                      <Select.OptionGroup title="Components">
                        {naturalSort(previewComponents, (c) => c.name).map(
                          (c) => (
                            <Select.Option key={c.uuid} value={c.uuid}>
                              <Icon
                                icon={ComponentIcon}
                                style={{ marginRight: 4 }}
                              />
                              {c.name}
                            </Select.Option>
                          )
                        )}
                      </Select.OptionGroup>
                    )}
                    {previewArtboards.length > 0 && (
                      <Select.OptionGroup title="Artboards">
                        {previewArtboards.map((c) => (
                          <Select.Option key={c.uuid} value={c.uuid}>
                            {c.name || "Unnamed artboard"}
                          </Select.Option>
                        ))}
                      </Select.OptionGroup>
                    )}
                  </>
                ),
                value: previewCtx.component?.uuid,
                onChange: (uuid) => {
                  const component = ensure(
                    previewCtx.studioCtx.site.components.find(
                      (c) => c.uuid == uuid
                    ),
                    "Could not find component with selected UUID"
                  );
                  void previewCtx.pushComponent(component);
                },
              }
            : null
        }
        variantsComboSelect={{}}
        plasmicAdminMode={
          isAdminTeamEmail(appCtx.selfInfo?.email, appCtx.appConfig) &&
          appCtx.selfInfo?.adminModeDisabled
        }
      />
    </>
  );
}

export const TopBar = observer(_TopBar);
