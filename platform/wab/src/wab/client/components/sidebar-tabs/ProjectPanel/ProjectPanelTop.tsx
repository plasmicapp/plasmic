import { apiKey } from "@/wab/client/api";
import { SEARCH_PARAM_BRANCH, UU } from "@/wab/client/cli-routes";
import { menuSection } from "@/wab/client/components/menu-builder";
import {
  reactConfirm,
  reactPrompt,
} from "@/wab/client/components/quick-modals";
import FolderItem from "@/wab/client/components/sidebar-tabs/ProjectPanel/FolderItem";
import styles from "@/wab/client/components/sidebar-tabs/ProjectPanel/ProjectPanelTop.module.scss";
import { Matcher } from "@/wab/client/components/view-common";
import { Spinner } from "@/wab/client/components/widgets";
import { useTopFrameApi } from "@/wab/client/contexts/AppContexts";
import { DefaultFolderItemProps } from "@/wab/client/plasmic/project_panel/PlasmicFolderItem";
import PlasmicProjectPanel from "@/wab/client/plasmic/project_panel/PlasmicProjectPanel";
import PlasmicSearchInput from "@/wab/client/plasmic/project_panel/PlasmicSearchInput";
import {
  StudioCtx,
  calculateNextVersionKey,
  useStudioCtx,
} from "@/wab/client/studio-ctx/StudioCtx";
import { testIds } from "@/wab/client/test-helpers/test-ids";
import {
  ApiBranch,
  BranchId,
  ListBranchesResponse,
  MainBranchId,
} from "@/wab/shared/ApiSchema";
import { validateBranchName } from "@/wab/shared/ApiSchemaUtil";
import { assert, ensure, spawnWrapper, withoutNils } from "@/wab/shared/common";
import { Menu, Tooltip, notification } from "antd";
import { trimStart } from "lodash";
import { observer } from "mobx-react";
import React, { ReactNode, useRef, useState } from "react";
import { useDebounce } from "react-use";
import { FixedSizeList } from "react-window";
import useSWR, { mutate } from "swr";

export const BranchPanelTop = observer(React.forwardRef(BranchPanelTop_));

function BranchPanelTop_(
  { onClose }: { onClose: () => void },
  outerRef: React.Ref<HTMLDivElement>
) {
  const topFrameApi = useTopFrameApi();
  const studioCtx = useStudioCtx();
  const projectId = studioCtx.siteInfo.id;
  const api = studioCtx.appCtx.api;
  const { data: branchesResponse } = useSWR<ListBranchesResponse>(
    apiKey(`listBranchesForProject`, projectId),
    () => api.listBranchesForProject(projectId),
    { revalidateOnMount: true, focusThrottleInterval: 0, dedupingInterval: 0 }
  );

  const { data: unpublishedChangesResponse } = useSWR(
    calculateNextVersionKey(studioCtx),
    async () => ({
      mainHasUnpublishedChanges: await studioCtx.branchHasUnpublishedChanges({
        branchId: null,
      }),
    }),
    { revalidateOnMount: true, focusThrottleInterval: 0, dedupingInterval: 0 }
  );

  const searchInputRef = studioCtx.projectSearchInputRef;
  const [queryMatcher, setQueryMatcher] = useState(mkMatcher());
  const [query, setQuery] = useState("");
  const listRef = useRef<FixedSizeList>(null);
  const [renamingItem, setRenamingItem] = useState<
    ApiBranch | MainBranchId | undefined
  >();
  const [fetchingData, setFetchingData] = useState(false);

  useDebounce(() => setQueryMatcher(mkMatcher(query)), 200, [query]);

  if (!branchesResponse || !unpublishedChangesResponse || fetchingData) {
    return (
      <div className={styles.root} ref={outerRef} {...testIds.projectPanel}>
        <Spinner />
      </div>
    );
  }

  // The `undefined` branch is the main branch, in both items and activeBranch (which are compared later).

  const allBranches = branchesResponse.branches;
  const focusedBranch = allBranches.find(
    (branch) => branch.id === studioCtx.dbCtx().branchInfo?.id
  );
  const activeBranches = allBranches.filter(
    (branch) => branch.status === "active"
  );
  const archivedBranches = allBranches.filter(
    (branch) => branch.status === "abandoned" || branch.status === "merged"
  );

  function queryBranches(branches: (ApiBranch | undefined)[]) {
    return branches
      .filter((branch) => queryMatcher.matches(branch?.name ?? "main"))
      .map((branch) => ({
        type: "branch",
        branch,
        nameWithQueryHighlighting: queryMatcher.boldSnippets(
          branch?.name ?? "main"
        ),
      }));
  }

  const shownActiveBranches = queryBranches([undefined, ...activeBranches]);
  const shownArchivedBranches = queryBranches(archivedBranches);
  const items = withoutNils([
    shownActiveBranches.length > 0 && { label: "Active Branches" },
    ...shownActiveBranches,
    shownArchivedBranches.length > 0 && { label: "Archived Branches" },
    ...shownArchivedBranches,
  ]);

  const dismissSearch = () => {
    setQuery("");
  };

  async function promptBranchName(defaultValue: string) {
    const name = await reactPrompt({
      message: "Name for branch",
      placeholder: "feat/branchname",
      defaultValue,
      rules: [
        {
          async validator(_, value) {
            const msg = validateBranchName(
              value,
              allBranches.filter((b) => b.name !== defaultValue)
            );
            if (msg) {
              throw new Error(msg);
            }
          },
        },
      ],
    });
    return name;
  }

  function refresh() {
    return mutate(apiKey("listBranchesForProject", projectId));
  }

  async function onRename(branch: ApiBranch) {
    const name = await promptBranchName(branch.name);
    if (!name) {
      return;
    }
    await api.updateBranch(projectId, branch.id, { name });
    await refresh();
    // Refresh the branch and repalce the URL if we're renaming the currently focused branch
    if (focusedBranch?.id === branch.id) {
      const branches = await api.listBranchesForProject(projectId);
      const updatedBranch = branches.branches.find((b) => b.id === branch.id);
      studioCtx.switchToBranch(updatedBranch, undefined, { replace: true });
    }
  }

  async function checkMainCommitted() {
    const hasCommits = studioCtx.releases.length > 0;
    if (!hasCommits || unpublishedChangesResponse?.mainHasUnpublishedChanges) {
      if (
        await reactConfirm({
          title: "Publish the main branch",
          message:
            "Branches must start from a published version, and the main branch has unpublished changes. Publish a version first in order to start the branch from the most recent changes.",
          confirmLabel: "Publish a version first",
          cancelLabel: hasCommits ? "Use last published version" : "Cancel",
        })
      ) {
        await topFrameApi.setShowPublishModal(true);
        onClose();
        return false;
      }
      if (!hasCommits) {
        return false;
      }
    }
    assert(
      hasCommits,
      "Must have some commits at this point in creating a branch"
    );
    return true;
  }

  async function checkUnpublishedChanges(sourceBranchId: BranchId) {
    setFetchingData(true);
    const hasUnpublishedChanges = await studioCtx.branchHasUnpublishedChanges({
      branchId: sourceBranchId,
    });
    setFetchingData(false);
    if (hasUnpublishedChanges) {
      if (
        await reactConfirm({
          title: "Publish latest changes",
          message:
            "The branch you selected has some unpublished changes. Would you like to publish the latest changes before creating a new branch it?",
          confirmLabel: "Publish a version first",
          cancelLabel: "Use last published version",
        })
      ) {
        if (sourceBranchId !== studioCtx.branchInfo()?.id) {
          studioCtx.switchToBranch(
            ensure(
              allBranches.find((branch) => branch.id === sourceBranchId),
              () => `Couldn't find branch ${sourceBranchId}`
            )
          );
        }
        await topFrameApi.setShowPublishModal(true);
        onClose();
        return false;
      }
    }
    return true;
  }

  async function handleCreateBranch(sourceBranchId?: BranchId) {
    if (studioCtx.appCtx.appConfig.disableBranching) {
      return notification.error({
        message: "Branch creation in maintenance",
        duration: 0,
        description: (
          <>
            <p>
              We are debugging some issues with the branching functionality
              that's in early access, and out of an abundance of caution, we're
              disabling creation of new branches at the moment. We are taking
              the feature into maintenance to iron things out, and currently
              estimate it will take several weeks before we are comfortable
              re-enabling the functionality.
            </p>
            <p>
              If necessary, you can continue accessing and merging the branches
              you currently have open, but we generally recommend avoiding
              unnecessary merges if possible.
            </p>
            <p>
              Sorry for the inconvenience - we know branching is an important
              part of the workflow, and we wouldn't disrupt things unless we
              felt it was needed to guarantee reliability. We're working on it.
              Thank you for bearing with us!
            </p>
          </>
        ),
      });
    }

    // If we're cloning the main branch but the main branch was never committed....
    if (!sourceBranchId && !(await checkMainCommitted())) {
      return undefined;
    }

    if (sourceBranchId && !(await checkUnpublishedChanges(sourceBranchId))) {
      return undefined;
    }

    const name = await promptBranchName("");
    if (!name) {
      return undefined;
    }
    const { branch: newBranch } = await api.createBranch(projectId, {
      name,
      sourceBranchId: sourceBranchId,
    });
    await refresh();
    await studioCtx.switchToBranch(newBranch);
    return newBranch;
  }

  return (
    <div className={styles.root} ref={outerRef} {...testIds.projectPanel}>
      <PlasmicProjectPanel
        style={{ zIndex: 0 }}
        plusButton={{
          props: {
            tooltip: "Create new branch",
            onClick: async () => {
              await handleCreateBranch();
            },
          },
        }}
        searchInput={{
          wrap: () => (
            <PlasmicSearchInput
              overrides={{
                searchInput: {
                  autoFocus: true,
                  ref: searchInputRef,
                  value: query,
                  onChange: (e) => setQuery(e.target.value),
                  onKeyUp: (e) => {
                    if (e.key === "Escape") {
                      if (query.trim().length === 0) {
                        onClose();
                      } else {
                        dismissSearch();
                      }
                    }
                  },
                },

                clearFieldIcon: {
                  style: { display: query ? "block" : "none" },
                  onClick: () => dismissSearch(),
                },
              }}
            />
          ),
        }}
      >
        <FixedSizeList
          ref={listRef}
          itemData={{
            items,
            renamingItem,
            setQuery,
            setRenamingItem,
            focusedBranch,
          }}
          itemCount={items.length}
          itemSize={32}
          width="100%"
          height={window.innerHeight * 0.4}
          overscanCount={2}
        >
          {({
            data: {
              items: _items,
              renamingItem: _renamingItem,
              setRenamingItem: _setRenamingItem,
              focusedBranch: _focusedBranch,
              setQuery: _setQuery,
            },
            index,
            style,
          }) => {
            const currentItem = _items[index] as {
              label?: ReactNode;
              branch?: ApiBranch;
              nameWithQueryHighlighting: ReactNode;
              type?: DefaultFolderItemProps["type"];
            };

            if (!currentItem.type) {
              return (
                <div className={styles.sectionHeader} style={style}>
                  {currentItem.label}
                </div>
              );
            }

            const branch = currentItem.branch;
            const onSwitch = async () => {
              dismissSearch();
              if (
                studioCtx.isLiveMode &&
                UU.projectPreview.parse(
                  studioCtx.appCtx.history.location.pathname
                )
              ) {
                // Avoid navigating back to dev mode
                const hashParams = new URLSearchParams(
                  trimStart(studioCtx.appCtx.history.location.hash, "#")
                );
                hashParams.set(
                  SEARCH_PARAM_BRANCH,
                  branch?.name || MainBranchId
                );
                studioCtx.appCtx.history.push({
                  hash: `#${hashParams.toString()}`,
                });
              } else {
                studioCtx.switchToBranch(branch);
              }
              onClose();
            };

            return (
              <FolderItem
                style={style}
                type={currentItem.type}
                isSelected={branch === _focusedBranch}
                cleanName={branch?.name ?? "main"}
                name={currentItem.nameWithQueryHighlighting}
                renaming={_renamingItem === (branch ?? MainBranchId)}
                menu={getBranchMenuRenderer({
                  branch: branch,
                  onRename: async () => {
                    assert(branch, "Should not be able to rename main branch");
                    await onRename(branch);
                  },
                  onSwitch,
                  onDuplicate: async () => {
                    if (await handleCreateBranch(branch?.id)) {
                      dismissSearch();
                    }
                  },
                  studioCtx,
                  onClose,
                  onToggleProtectionMainBranch: async () => {
                    await api.setMainBranchProtection(
                      projectId,
                      !studioCtx.siteInfo.isMainBranchProtected
                    );
                    await studioCtx.refreshSiteInfo();
                    notification.success({
                      message: `Main branch is now ${
                        studioCtx.siteInfo.isMainBranchProtected
                          ? "protected"
                          : "unprotected"
                      }`,
                    });
                    studioCtx.handleBranchProtectionAlert();
                  },
                })}
                renamingDisabled
                onRename={spawnWrapper(async (newName) => {
                  assert(branch, "Renaming should be disabled for main branch");
                  _setRenamingItem(undefined);
                  await api.updateBranch(projectId, branch.id, {
                    name: newName,
                  });
                })}
                onClick={onSwitch}
                tooltipActions={
                  currentItem.type === "page" ? "Page settings" : undefined
                }
              />
            );
          }}
        </FixedSizeList>
      </PlasmicProjectPanel>
    </div>
  );
}

function getBranchMenuRenderer({
  branch: _branch,
  studioCtx,
  onRename,
  onSwitch,
  onDuplicate,
  onToggleProtectionMainBranch,
}: {
  branch: ApiBranch | undefined;
  onClose: () => void;
  onRename: () => Promise<void>;
  onSwitch: () => Promise<void>;
  onDuplicate: () => Promise<void>;
  onToggleProtectionMainBranch: () => Promise<void>;
  studioCtx: StudioCtx;
}) {
  return () => {
    const branch = _branch;
    const projectId = studioCtx.siteInfo.id;
    const isMainBranchProtected = studioCtx.siteInfo.isMainBranchProtected;
    const api = studioCtx.appCtx.api;

    function refresh() {
      return mutate(apiKey("listBranchesForProject", projectId));
    }

    return (
      <Menu
        onClick={(e) => {
          e.domEvent.stopPropagation();
        }}
        id="proj-item-menu"
      >
        {menuSection(
          "branch-protect",
          !branch && (
            <Menu.Item
              key="protect"
              onClick={async () => {
                await onToggleProtectionMainBranch();
              }}
            >
              <Tooltip title="When the main branch is in a protected state it's not possible to do direct changes to it.">
                <strong>
                  {isMainBranchProtected ? "Unprotect" : "Protect"}
                </strong>{" "}
                main branch
              </Tooltip>
            </Menu.Item>
          )
        )}
        {menuSection(
          "branch-switch",
          <Menu.Item key="switch" onClick={onSwitch}>
            <strong>Switch</strong> to branch
          </Menu.Item>
        )}
        {menuSection(
          "branch-name",
          branch && (
            <Menu.Item
              key="rename"
              onClick={async (e) => {
                e.domEvent.stopPropagation();
                await onRename();
              }}
            >
              <strong>Rename</strong> branch
            </Menu.Item>
          ),
          <Menu.Item key="duplicate" onClick={onDuplicate}>
            <strong>Duplicate</strong> branch
          </Menu.Item>
        )}
        {branch &&
          menuSection(
            "branch-state",
            <Menu.Item
              key="archive"
              onClick={async () => {
                await api.updateBranch(projectId, branch.id, {
                  status: branch.status === "active" ? "abandoned" : "active",
                });
                await refresh();
              }}
            >
              <strong>
                {branch.status === "active" ? "Archive" : "Unarchive"}
              </strong>{" "}
              branch
            </Menu.Item>,
            <Menu.Item
              key="delete"
              onClick={async () => {
                if (
                  await reactConfirm({
                    title: "Are you sure you want to delete this branch?",
                    message: "This cannot be undone.",
                    confirmLabel: "Delete branch",
                  })
                ) {
                  if (studioCtx.dbCtx().branchInfo?.id === branch.id) {
                    // Switch to main branch if this was the focused branch
                    await studioCtx.switchToBranch(undefined);
                  }
                  await api.deleteBranch(projectId, branch.id);
                  await refresh();
                }
              }}
            >
              <strong>Delete</strong> branch
            </Menu.Item>
          )}
      </Menu>
    );
  };
}

function mkMatcher(q: string = "") {
  return new Matcher(q, { matchMiddleOfWord: true });
}
