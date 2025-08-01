import { useUsersMap } from "@/wab/client/api-hooks";
import { WithContextMenu } from "@/wab/client/components/ContextMenu";
import { MenuBuilder } from "@/wab/client/components/menu-builder";
import { promptPublishProj } from "@/wab/client/components/modals/UpgradeDepModal";
import { showTemporaryPrompt } from "@/wab/client/components/quick-modals";
import { Matcher } from "@/wab/client/components/view-common";
import {
  IFrameAwareDropdownMenu,
  Spinner,
} from "@/wab/client/components/widgets";
import Button from "@/wab/client/components/widgets/Button";
import { Modal } from "@/wab/client/components/widgets/Modal";
import { VERT_MENU_ICON } from "@/wab/client/icons";
import PlasmicLeftVersionsPanel from "@/wab/client/plasmic/plasmic_kit/PlasmicLeftVersionsPanel";
import { promptTagsAndDesc } from "@/wab/client/prompts";
import { StudioCtx, useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { MaybeWrap, swallowClick } from "@/wab/commons/components/ReactUtil";
import { ApiUser, BranchId } from "@/wab/shared/ApiSchema";
import { getUserEmail } from "@/wab/shared/ApiSchemaUtil";
import { PkgVersionInfoMeta } from "@/wab/shared/SharedApi";
import { Alert, Form, Menu, Spin, Tag, Tooltip } from "antd";
import L from "lodash";
import { observer } from "mobx-react";
import moment from "moment";
import React from "react";

async function publishProject(
  studioCtx: StudioCtx,
  setIsPublishing: (b: boolean) => void
) {
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
interface ItemData {
  id: string;
  sortIndex: number;
  title: string;
  tags: string[];
  release: PkgVersionInfoMeta;
  user?: ApiUser;
}

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
  const matcher = new Matcher(query);
  const readOnly = studioCtx.getLeftTabPermission("versions") === "readable";

  const { data: userById } = useUsersMap(
    studioCtx.releases.map((r) => r.createdById)
  );

  const items: ItemData[] = userById
    ? studioCtx.releases.map((release) => {
        return {
          id: release.id,
          sortIndex: moment(release.createdAt).valueOf(),
          title: `${release.version} : ${
            release.description ??
            moment(release.createdAt).format("MMMM Do YYYY, h:mm:ss a")
          }`,
          tags: release.tags ?? [],
          release,
          user: release.createdById ? userById[release.createdById] : undefined,
        };
      })
    : [];
  // In reverse chronological order
  const sortedItems = L.reverse(L.sortBy(items, [(o) => o.sortIndex]));
  const filteredItems = sortedItems.filter((i) => matcher.matches(i.title));

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
              onClick: async () =>
                await publishProject(studioCtx, setIsPublishing),
            }
      }
      content={
        <>
          <div className="overflow-scroll-y">
            {!userById ? (
              <Spinner />
            ) : (
              <VersionsList
                studioCtx={studioCtx}
                matcher={matcher}
                items={filteredItems}
                isPublishing={isPublishing}
              />
            )}
          </div>
        </>
      }
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

const dateTimeFormat = new Intl.DateTimeFormat(undefined, {
  dateStyle: "short",
  timeStyle: "short",
});

const VersionsList = observer(function VersionsList(props: {
  studioCtx: StudioCtx;
  matcher: Matcher;
  items: ItemData[];
  isPublishing: boolean;
}) {
  const { studioCtx, matcher, items, isPublishing } = props;
  const [selectedId, setSelectedId] = React.useState<string>("");

  const onSelect = async (data: ItemData) => {
    const answer =
      !studioCtx.needsSaving() ||
      !studioCtx.canEditProject() ||
      (await promptLoad());
    if (answer) {
      studioCtx.switchToBranchVersion(data.release);
      setSelectedId(data.id);
    }
  };
  const renderItem = (item) => {
    return (
      <VersionItem
        key={item.id}
        studioCtx={studioCtx}
        data={item}
        matcher={matcher}
        onSelect={onSelect}
        showOutline={!studioCtx.editMode && selectedId === item.id}
      />
    );
  };

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
    <>
      {isPublishing ? renderPublishingSkeleton() : null}
      {items.map(renderItem)}
    </>
  );
});

const VersionItem = function (props: {
  studioCtx: StudioCtx;
  matcher: Matcher;
  data: ItemData;
  onSelect: (data: ItemData) => Promise<void>;
  showOutline: boolean;
}) {
  const { studioCtx, matcher, data, onSelect, showOutline } = props;

  const renderMenu = () => {
    const builder = new MenuBuilder();
    builder.genSection(undefined, (push) => {
      push(
        <Menu.Item
          key="rename"
          onClick={async () => {
            const tagsAndDesc = await promptTagsAndDesc(
              data.release.description,
              data.release.tags ?? [],
              studioCtx
            );

            const { pkgId, version, branchId } = data.release;
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
      );

      push(
        <Menu.Item
          key="revert"
          onClick={async () => {
            const answer = await promptRevert(data);
            if (answer) {
              await studioCtx.revertToVersion(data.release);
            }
          }}
        >
          Revert to this version
        </Menu.Item>
      );
    });

    return builder.build({
      onMenuClick: (e) => e.domEvent.stopPropagation(),
      menuName: "version-item-menu",
    });
  };

  return (
    <MaybeWrap
      cond={showOutline}
      wrapper={(x) => (
        <div className="OutlineBox">{x as React.ReactElement}</div>
      )}
    >
      <WithContextMenu
        overlay={renderMenu}
        className={
          "SidebarSectionListItem hover-outline group pointer flex-fill"
        }
        onClick={() => onSelect(data)}
      >
        <div className="flex-fill pt-sm pb-sm vlist-gap-xsm">
          <div className="flex-fill text-ellipsis text-unselectable">
            {matcher.boldSnippets(data.title)}
          </div>
          {data.tags?.length > 0 && (
            <div>
              {data.tags.map((tag) => {
                return <Tag>{tag}</Tag>;
              })}
            </div>
          )}
          <div className="text-sm dimfg text-ellipsis">
            By <UserOnDate data={data} />
          </div>
        </div>
        <IFrameAwareDropdownMenu menu={renderMenu}>
          <div
            className="SidebarSectionListItem__actionIcon"
            onClick={swallowClick}
          >
            {VERT_MENU_ICON}
          </div>
        </IFrameAwareDropdownMenu>
      </WithContextMenu>
    </MaybeWrap>
  );
};

type RevertResponse = boolean;
const promptRevert = async (data: ItemData) => {
  return showTemporaryPrompt<RevertResponse>((onSubmit, onCancel) => (
    <Modal
      title={`Revert to version ${data.release.version}`}
      visible={true}
      footer={null}
      onCancel={() => onCancel()}
    >
      You are about to revert to version {data.release.version}, originally
      published by <UserOnDate data={data} />.
      <Alert
        type="warning"
        showIcon
        message={"This will discard any changes you have not yet published!"}
        className="mv-m"
        description={
          "If you want to save any unsaved changes, please publish a version first."
        }
      />
      <Form onFinish={() => onSubmit(true)}>
        <Form.Item>
          <Button
            className="mr-sm"
            type="primary"
            htmlType="submit"
            onClick={() => onSubmit(true)}
          >
            Revert
          </Button>
          <Button onClick={() => onCancel()}>Cancel</Button>
        </Form.Item>
      </Form>
    </Modal>
  ));
};

type LoadResponse = boolean;
const promptLoad = async () => {
  return showTemporaryPrompt<LoadResponse>((onSubmit, onCancel) => (
    <Modal
      title={`Load version`}
      visible={true}
      footer={null}
      onCancel={() => onCancel()}
    >
      <Alert
        type="warning"
        showIcon
        message={"Changes you made may not be saved."}
        className="mv-m"
        description={
          "Consider saving your changes before loading another version.\n" +
          "Are you sure you want to proceed?"
        }
      />

      <Form onFinish={() => onSubmit(true)}>
        <Form.Item>
          <Button
            className="mr-sm"
            type="primary"
            htmlType="submit"
            onClick={() => onSubmit(true)}
          >
            Yes
          </Button>
          <Button onClick={() => onCancel()}>Cancel</Button>
        </Form.Item>
      </Form>
    </Modal>
  ));
};

/** Renders "Firstname Lastname on 8/15/22, 12:00 AM" */
const UserOnDate = function ({ data }: { data: ItemData }) {
  return (
    <span>
      {data.user ? (
        <Tooltip title={getUserEmail(data.user)}>
          {data.user.firstName} {data.user.lastName}
        </Tooltip>
      ) : (
        "Unknown User"
      )}{" "}
      on {dateTimeFormat.format(new Date(data.release.createdAt))}
    </span>
  );
};
