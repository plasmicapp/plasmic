import { useUsersMap } from "@/wab/client/api-hooks";
import { WithContextMenu } from "@/wab/client/components/ContextMenu";
import { NoItemMessage } from "@/wab/client/components/sidebar-tabs/versions-tab/NoItemMessage";
import {
  getFormattedDate,
  promptLoad,
  promptVersionRevert,
  VersionsItemData,
} from "@/wab/client/components/sidebar-tabs/versions-tab/utils";
import VersionsListItem from "@/wab/client/components/sidebar/VersionsListItem";
import { Matcher } from "@/wab/client/components/view-common";
import { ClickStopper } from "@/wab/client/components/widgets";
import { promptTagsAndDesc } from "@/wab/client/prompts";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { BranchId } from "@/wab/shared/ApiSchema";
import { Menu, Tag } from "antd";
import L from "lodash";
import { observer } from "mobx-react";
import moment from "moment";
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

  const sortedItems = React.useMemo(() => {
    if (!userById) {
      return [];
    }

    const items: VersionsItemData[] = studioCtx.releases.map((release) => {
      return {
        id: release.id,
        sortIndex: moment(release.createdAt).valueOf(),
        title: `${release.version} : ${
          release.description ?? getFormattedDate(release.createdAt)
        }`,
        tags: release.tags ?? [],
        release,
        user: release.createdById ? userById[release.createdById] : undefined,
      };
    });

    // In reverse chronological order
    return L.reverse(L.sortBy(items, [(o) => o.sortIndex]));
  }, [userById, studioCtx.releases.length]);

  const filteredItems = React.useMemo(
    () => sortedItems.filter((i) => matcher.matches(i.title)),
    [sortedItems, matcher]
  );

  const onSelect = async (data: VersionsItemData) => {
    const answer =
      !studioCtx.needsSaving() ||
      !studioCtx.canEditProject() ||
      (await promptLoad("Load published version"));
    if (answer) {
      studioCtx.switchToBranchVersion(data.release);
    }
  };

  const renderMenu = (item: VersionsItemData) => () =>
    (
      <Menu>
        <Menu.Item
          key="rename"
          onClick={async () => {
            const tagsAndDesc = await promptTagsAndDesc(
              item.release.description,
              item.release.tags ?? [],
              studioCtx
            );

            const { pkgId, version, branchId } = item.release;
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
              item,
              studioCtx.releases,
              studioCtx.revisions,
              studioCtx
            );
            if (answer) {
              await studioCtx.revertTo(item.release);
            }
          }}
        >
          Revert to this version
        </Menu.Item>
      </Menu>
    );

  if (filteredItems.length === 0) {
    return (
      <NoItemMessage>
        {sortedItems.length === 0
          ? "No Published Versions"
          : "No versions match your search"}
      </NoItemMessage>
    );
  }

  return (
    <>
      {filteredItems.map((item) => {
        const menu = renderMenu(item);

        return (
          <WithContextMenu key={item.id} overlay={menu}>
            <VersionsListItem
              itemDate={item.release.createdAt}
              publish
              isSelected={dbCtx.pkgVersionInfoMeta?.id === item.id}
              onClick={() => onSelect(item)}
              versionNumber={{ children: `v${item.release.version}` }}
              versionTitle={{
                children: matcher.boldSnippets(
                  item.release.description || item.title
                ),
              }}
              author={item.user}
              versionsTagsContainer={
                item.tags && item.tags.length > 0
                  ? {
                      children: item.tags.map((tag: string, idx: number) => (
                        <Tag key={`${item.id}-tag-${idx}`}>{tag}</Tag>
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
