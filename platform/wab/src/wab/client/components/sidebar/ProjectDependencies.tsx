import { openNewTab, U } from "@/wab/client/cli-routes";
import { WithContextMenu } from "@/wab/client/components/ContextMenu";
import { MenuBuilder } from "@/wab/client/components/menu-builder";
import {
  promptDeleteDep,
  promptUpgradeDep,
  promptUpgradeDeps,
} from "@/wab/client/components/modals/UpgradeDepModal";
import {
  reactConfirm,
  reactPrompt,
} from "@/wab/client/components/quick-modals";
import { Matcher } from "@/wab/client/components/view-common";
import { IFrameAwareDropdownMenu } from "@/wab/client/components/widgets";
import { Icon } from "@/wab/client/components/widgets/Icon";
import IconButton from "@/wab/client/components/widgets/IconButton";
import { showError } from "@/wab/client/ErrorNotifications";
import { VERT_MENU_ICON } from "@/wab/client/icons";
import PlasmicLeftImportsPanel, {
  PlasmicLeftImportsPanel__VariantsArgs,
} from "@/wab/client/plasmic/plasmic_kit/PlasmicLeftImportsPanel";
import AlertIcon from "@/wab/client/plasmic/plasmic_kit_icons/icons/PlasmicIcon__WarningTriangleSvg";
import { ProjectDependencyData } from "@/wab/client/ProjectDependencyManager";
import { StudioCtx, useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { swallowClick } from "@/wab/commons/components/ReactUtil";
import { spawn } from "@/wab/shared/common";
import { isHostLessPackage } from "@/wab/shared/core/sites";
import { unbundleProjectDependency } from "@/wab/shared/core/tagged-unbundle";
import { isAdminTeamEmail } from "@/wab/shared/devflag-utils";
import { ProjectDependency } from "@/wab/shared/model/classes";
import { extractProjectIdFromUrlOrId, getPublicUrl } from "@/wab/shared/urls";
import { areEquivalentScreenVariants } from "@/wab/shared/Variants";
import { Menu, notification, Tooltip } from "antd";
import { observer } from "mobx-react";
import React from "react";

function isDevUser(studioCtx: StudioCtx) {
  return (
    getPublicUrl().startsWith("http://localhost:3003") &&
    isAdminTeamEmail(
      studioCtx.appCtx.selfInfo?.email,
      studioCtx.appCtx.appConfig
    )
  );
}

const DependencyItem = observer(function DependencyItem(props: {
  studioCtx: StudioCtx;
  matcher: Matcher;
  data: ProjectDependencyData;
  readOnly?: boolean;
}) {
  const { studioCtx, matcher, data, readOnly } = props;
  const isHostLessPkg = isHostLessPackage(data.model.site);

  const renderMenu = () => {
    const builder = new MenuBuilder();
    builder.genSection(undefined, (push) => {
      const targetProjectId = data.latestPkgVersionMeta?.pkg?.projectId;
      if (!!targetProjectId && (!isHostLessPkg || isDevUser(studioCtx))) {
        push(
          <Menu.Item
            key="jump-newtab"
            onClick={() => {
              openNewTab(
                U.project({
                  projectId: targetProjectId,
                })
              );
            }}
          >
            Open project in new tab
          </Menu.Item>
        );
      }

      if (!readOnly) {
        push(
          <Menu.Item
            key="delete"
            onClick={async () => {
              const hostLessDependents =
                studioCtx.projectDependencyManager.getHostLessPackageDependents(
                  data.model.pkgId
                );

              if (hostLessDependents.length > 0) {
                notification.error({
                  message: `Cannot remove package, the package is a dependency of the following packages: ${hostLessDependents.join(
                    ","
                  )}`,
                });
                return;
              }

              const answer = await promptDeleteDep({
                studioCtx: studioCtx,
                curDep: data.model,
              });

              if (answer) {
                await studioCtx.projectDependencyManager.removeByPkgId(
                  data.model.pkgId
                );
              }
            }}
          >
            Remove imported project
          </Menu.Item>
        );
      }
    });
    return builder.build({
      onMenuClick: (e) => e.domEvent.stopPropagation(),
      menuName: "project-dep-item-menu",
    });
  };

  return (
    <WithContextMenu
      overlay={renderMenu}
      key={data.model.pkgId}
      className={"SidebarSectionListItem hover-outline"}
    >
      <Tooltip title={data.model.pkgId}>
        <label className={"flex-fill"}>
          {matcher.boldSnippets(
            isHostLessPkg
              ? `Package ${data.model.name}`
              : `${data.model.name} v${data.model.version}`
          )}
        </label>
      </Tooltip>
      {(!isHostLessPkg || isDevUser(studioCtx)) &&
        !readOnly &&
        data.latestPkgVersionMeta &&
        data.latestPkgVersionMeta.version !== data.model.version && (
          <Tooltip
            title={`Newer version ${data.latestPkgVersionMeta.version} exists. Click to update.`}
          >
            <IconButton
              onClick={async () => {
                const { pkg: latest, depPkgs } =
                  await studioCtx.appCtx.api.getPkgVersion(
                    data.model.pkgId,
                    data.latestPkgVersionMeta?.version
                  );

                const { projectDependency } = unbundleProjectDependency(
                  studioCtx.bundler(),
                  latest,
                  depPkgs
                );

                const answer = await promptUpgradeDep({
                  studioCtx: studioCtx,
                  targetDep: projectDependency,
                });

                if (answer) {
                  await studioCtx.projectDependencyManager.upgradeProjectDeps([
                    projectDependency,
                  ]);
                }
              }}
            >
              <Icon icon={AlertIcon} />
            </IconButton>
          </Tooltip>
        )}

      <IFrameAwareDropdownMenu menu={renderMenu}>
        <div
          className="SidebarSectionListItem__actionIcon pointer"
          onClick={swallowClick}
        >
          {VERT_MENU_ICON}
        </div>
      </IFrameAwareDropdownMenu>
    </WithContextMenu>
  );
});

export async function importProjectWithPrompt(sc: StudioCtx) {
  const rawProjectUrlOrId = await reactPrompt({
    message: `Enter the ID or URL of the project you want to import.`,
    actionText: "Import",
    placeholder: "4zXYeWKYisHVeJAByWgxCM",
    defaultValue: undefined,
  });

  if (!rawProjectUrlOrId) {
    return;
  }
  const projectId = extractProjectIdFromUrlOrId(rawProjectUrlOrId);
  try {
    const dependency = await sc.projectDependencyManager.addByProjectId(
      projectId
    );
    if (dependency.site.activeScreenVariantGroup?.variants.length) {
      // Offer to switch screen variant if exists
      await trySwitchScreenVariant(sc, dependency);
    }
  } catch (e) {
    showError(e, { title: "Error importing project." });
  }
}

async function updateProjectsWithPrompt(
  studioCtx: StudioCtx,
  dependenciesWithUpdates: ProjectDependencyData[]
) {
  const targetDeps = await Promise.all(
    dependenciesWithUpdates.map(async (dep) => {
      const { pkg: latest, depPkgs } = await studioCtx.appCtx.api.getPkgVersion(
        dep.model.pkgId,
        dep.latestPkgVersionMeta?.version
      );

      return unbundleProjectDependency(studioCtx.bundler(), latest, depPkgs)
        .projectDependency;
    })
  );

  const shouldUpdate = await promptUpgradeDeps({ studioCtx, targetDeps });
  if (!shouldUpdate) {
    return;
  }
  await studioCtx.projectDependencyManager.upgradeProjectDeps(targetDeps);
}

async function trySwitchScreenVariant(
  studioCtx: StudioCtx,
  dependency: ProjectDependency
) {
  const prevGroup = studioCtx.site.activeScreenVariantGroup;
  const newGroup = dependency.site.activeScreenVariantGroup;

  if (!newGroup) {
    return;
  }

  let switchGroup: boolean | undefined = true;

  if (prevGroup) {
    const missingVariants = prevGroup.variants.filter(
      (prevV) =>
        !newGroup.variants.find((newV) =>
          areEquivalentScreenVariants(prevV, newV)
        )
    );

    switchGroup = await reactConfirm({
      message: (
        <div>
          <p>
            Only one set of responsive breakpoints can be used in a project.
            This imported project also has responsive breakpoints associated;
            would you like to switch to them, so that the imported components
            can be responsive? We will preserve styles for your existing
            breakpoints that match up with imported breakpoints.
          </p>
          {missingVariants.length > 0 && (
            <p>
              But <strong>you will lose changes</strong> associated with
              breakpoints{" "}
              {" " + missingVariants.map((v) => `"${v.name}"`).join(", ")},
              because there are no imported breakpoints that match them exactly.
            </p>
          )}
        </div>
      ),
      confirmLabel: `Switch to breakpoints from "${dependency.name}"`,
      cancelLabel: `Keep using my existing breakpoints`,
    });
  }

  if (switchGroup) {
    await studioCtx
      .siteOps()
      .updateActiveScreenVariantGroup(
        dependency.site.activeScreenVariantGroup!
      );
  }
}

function _ProjectDependenciesPanel() {
  const sc = useStudioCtx();
  const [query, setQuery] = React.useState("");
  const [state, setState] =
    React.useState<PlasmicLeftImportsPanel__VariantsArgs["state"]>();

  const readOnly = sc.getLeftTabPermission("imports") === "readable";
  const matcher = new Matcher(query);

  // Function called when a user clicks the "+" icon
  // Create the list of dependencies
  const renderItems = () => {
    const items = sc.projectDependencyManager.getDependencies();
    const filteredItems = items.filter((d) => matcher.matches(d.model.name));

    return filteredItems.map((entry) => (
      <DependencyItem
        key={entry.model.pkgId}
        studioCtx={sc}
        matcher={matcher}
        data={entry}
        readOnly={readOnly}
      />
    ));
  };

  const dependenciesWithUpdates = sc.projectDependencyManager
    .getDependencies()
    .filter(
      (dep) =>
        dep.latestPkgVersionMeta &&
        dep.latestPkgVersionMeta.version !== dep.model.version &&
        (!isHostLessPackage(dep.model.site) || isDevUser(sc))
    );

  const rendered = renderItems();
  return (
    <PlasmicLeftImportsPanel
      leftSearchPanel={{
        searchboxProps: {
          value: query,
          onChange: (e) => setQuery(e.target.value),
          autoFocus: true,
        },
      }}
      importButton={
        readOnly
          ? { render: () => null }
          : {
              props: {
                onClick: () => spawn(importProjectWithPrompt(sc)),
                "data-test-id": "import-btn",
              },
            }
      }
      refreshButton={
        readOnly
          ? { render: () => null }
          : {
              onClick: () => {
                setState("refreshing");
                spawn(sc.projectDependencyManager.refreshDeps());
                setState(undefined);
              },
            }
      }
      updateButton={
        readOnly
          ? { render: () => null }
          : {
              onClick: () =>
                spawn(updateProjectsWithPrompt(sc, dependenciesWithUpdates)),
            }
      }
      state={state}
      withUpdateAll={dependenciesWithUpdates.length > 1}
      content={<div className="overflow-scroll-y">{rendered}</div>}
    />
  );
}

export const ProjectDependenciesPanel = observer(_ProjectDependenciesPanel);
