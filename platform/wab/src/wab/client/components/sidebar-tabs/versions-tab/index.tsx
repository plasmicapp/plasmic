import { promptPublishProj } from "@/wab/client/components/modals/UpgradeDepModal";
import { RevisionsList } from "@/wab/client/components/sidebar-tabs/versions-tab/RevisionsList";
import { VersionsList } from "@/wab/client/components/sidebar-tabs/versions-tab/VersionsList";
import { Matcher } from "@/wab/client/components/view-common";
import PlasmicLeftVersionsPanel from "@/wab/client/plasmic/plasmic_kit/PlasmicLeftVersionsPanel";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { spawn } from "@/wab/shared/common";
import { Dropdown, Menu, Spin } from "antd";
import { observer } from "mobx-react";
import React from "react";

const FilterValueToLabel = {
  all: "All",
  revisions: "Autosaved Versions",
  versions: "Published Versions",
} as const;

type VersionsFilter = keyof typeof FilterValueToLabel;

interface VersionsTabProps {
  useVersionsCTA: boolean;
  dismissVersionsCTA: () => void;
}

export const VersionsTab = observer(function VersionsTab(
  props: VersionsTabProps
) {
  const studioCtx = useStudioCtx();
  const [query, setQuery] = React.useState("");
  const [isPublishing, setIsPublishing] = React.useState<boolean>(false);
  const [filter, setFilter] = React.useState<VersionsFilter>("all");
  const matcher = React.useMemo(() => new Matcher(query), [query]);
  const readOnly = studioCtx.getLeftTabPermission("versions") === "readable";

  async function publishProject() {
    const response = await promptPublishProj({ studioCtx });

    if (response && response.confirm) {
      setIsPublishing(true);
      await studioCtx.publish(
        response.tags,
        response.title,
        studioCtx.dbCtx().branchInfo?.id
      );
      setIsPublishing(false);
    }
  }

  const renderPublishingSkeleton = () => {
    return (
      <div
        id="publishing-version-spinner-item"
        className="SidebarSectionListItem hover-outline group pointer"
      >
        <Spin size="small" className="ml-sm" />
        <div className="flex-fill ml-sm text-ellipsis text-unselectable">
          A new version is being published
        </div>
      </div>
    );
  };

  return (
    <PlasmicLeftVersionsPanel
      leftSearchPanel={{
        searchboxProps: {
          value: query,
          onChange: (e) => setQuery(e.target.value),
          autoFocus: true,
        },
      }}
      publishButton={
        readOnly
          ? { render: () => null }
          : {
              onClick: () => spawn(publishProject()),
            }
      }
      list={filter}
      filterButton={{
        props: {
          children: FilterValueToLabel[filter],
        },
        wrap: (node) => (
          <Dropdown
            overlay={
              <Menu selectedKeys={[filter]}>
                {Object.entries(FilterValueToLabel).map(([key, label]) => (
                  <Menu.Item
                    key={key}
                    onClick={() => setFilter(key as VersionsFilter)}
                  >
                    {label}
                  </Menu.Item>
                ))}
              </Menu>
            }
          >
            {node}
          </Dropdown>
        ),
      }}
      revisionsContainer={<RevisionsList studioCtx={studioCtx} />}
      versionsContainer={
        <VersionsList studioCtx={studioCtx} matcher={matcher} />
      }
      content={{
        wrap: (node) => (
          <>
            {isPublishing && renderPublishingSkeleton()}
            {node}
          </>
        ),
      }}
      variants={
        props.useVersionsCTA
          ? {
              showAlert: "showAlert",
            }
          : {}
      }
      versionsHeader={
        props.useVersionsCTA
          ? {
              alert: (
                <div>
                  Newest changes haven't been published.{" "}
                  <a onClick={props.dismissVersionsCTA}>[Dismiss]</a>
                </div>
              ),
            }
          : {}
      }
    />
  );
});
