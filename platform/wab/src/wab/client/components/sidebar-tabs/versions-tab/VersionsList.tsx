import { useUsersMap } from "@/wab/client/api-hooks";
import { WithContextMenu } from "@/wab/client/components/ContextMenu";
import { NoItemMessage } from "@/wab/client/components/sidebar-tabs/versions-tab/NoItemMessage";
import {
  promptLoad,
  promptVersionRevert,
} from "@/wab/client/components/sidebar-tabs/versions-tab/utils";
import VersionsListItem from "@/wab/client/components/sidebar/VersionsListItem";
import { Matcher } from "@/wab/client/components/view-common";
import { ClickStopper } from "@/wab/client/components/widgets";
import { promptTagsAndDesc } from "@/wab/client/prompts";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ApiUser, BranchId } from "@/wab/shared/ApiSchema";
import { PkgVersionInfoMeta } from "@/wab/shared/SharedApi";
import { formatDateShortTimeShort } from "@/wab/shared/utils/date-utils";
import { Menu, Tag } from "antd";
import { observer } from "mobx-react";
import React from "react";

interface VersionsListProps {
  studioCtx: StudioCtx;
  matcher: Matcher;
}

export const VersionsList = observer(function VersionsList(
  props: VersionsListProps
) {
  const { studioCtx, matcher } = props;
  const dbCtx = studioCtx.dbCtx();

  const { data: userById } = useUsersMap(
    studioCtx.releases.map((r) => r.createdById)
  );

  const filteredReleases = React.useMemo(() => {
    if (!userById) {
      return [];
    }
    return studioCtx.releases.filter((release) => {
      const title = `${release.version} : ${
        release.description ??
        formatDateShortTimeShort(new Date(release.createdAt))
      }`;
      return matcher.matches(title);
    });
  }, [userById, studioCtx.releases.length, matcher]);

  const onSelect = async (release: PkgVersionInfoMeta) => {
    const answer =
      !studioCtx.needsSaving() ||
      !studioCtx.canEditProject() ||
      (await promptLoad("Load published version"));
    if (answer) {
      studioCtx.switchToBranchVersion(release);
    }
  };

  const renderMenu =
    (release: PkgVersionInfoMeta, user?: ApiUser | null) => () =>
      (
        <Menu>
          <Menu.Item
            key="rename"
            onClick={async () => {
              const tagsAndDesc = await promptTagsAndDesc(
                release.description,
                release.tags ?? [],
                studioCtx
              );

              const { pkgId, version, branchId } = release;
              const toMerge = {
                description: tagsAndDesc?.desc,
                tags: tagsAndDesc?.tags,
              };
              await studioCtx.updatePkgVersion(
                pkgId,
                version,
                (branchId ?? null) as BranchId | null,
                toMerge
              );
            }}
          >
            Edit tags and description
          </Menu.Item>
          <Menu.Item
            key="revert"
            onClick={async () => {
              const answer = await promptVersionRevert(
                release,
                studioCtx.releases,
                studioCtx.revisions,
                studioCtx,
                user
              );
              if (answer) {
                await studioCtx.revertTo(release);
              }
            }}
          >
            Revert to this version
          </Menu.Item>
        </Menu>
      );

  if (filteredReleases.length === 0) {
    return (
      <NoItemMessage>
        {studioCtx.releases.length === 0
          ? "No Published Versions"
          : "No versions match your search"}
      </NoItemMessage>
    );
  }

  return (
    <>
      {filteredReleases.map((release) => {
        const user =
          release.createdById && userById
            ? userById[release.createdById]
            : undefined;
        const menu = renderMenu(release, user);
        const title = `${release.version} : ${
          release.description ??
          formatDateShortTimeShort(new Date(release.createdAt))
        }`;

        return (
          <WithContextMenu key={release.id} overlay={menu}>
            <VersionsListItem
              itemDate={release.createdAt}
              publish
              isSelected={dbCtx.pkgVersionInfoMeta?.id === release.id}
              onClick={() => onSelect(release)}
              versionNumber={{ children: `v${release.version}` }}
              versionTitle={{
                children: matcher.boldSnippets(release.description || title),
              }}
              author={user}
              versionsTagsContainer={
                release.tags && release.tags.length > 0
                  ? {
                      children: release.tags.map((tag: string, idx: number) => (
                        <Tag key={`${release.id}-tag-${idx}`}>{tag}</Tag>
                      )),
                    }
                  : { render: () => null }
              }
              btnMore={{
                wrap: (node) => (
                  <ClickStopper preventDefault>{node}</ClickStopper>
                ),
                props: {
                  menu,
                },
              }}
            />
          </WithContextMenu>
        );
      })}
    </>
  );
});
