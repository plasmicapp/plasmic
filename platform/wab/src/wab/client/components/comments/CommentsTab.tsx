import RootComment from "@/wab/client/components/comments/RootComment";
import {
  CommentFilter,
  FilterValueToLabel,
  partitionThreadsForComponents,
} from "@/wab/client/components/comments/utils";
import {
  DefaultCommentsTabProps,
  PlasmicCommentsTab,
} from "@/wab/client/plasmic/plasmic_kit_comments/PlasmicCommentsTab";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { isDedicatedArena } from "@/wab/shared/Arenas";
import { Dropdown, Menu } from "antd";
import { observer } from "mobx-react";
import * as React from "react";

export const DEFAULT_NOTIFICATION_LEVEL = "mentions-and-replies";
export const notifyAboutKeyToLabel = {
  all: "Everything",
  "mentions-and-replies": "Mentions and replies",
  none: "None",
} as const;

export type CommentsTabProps = DefaultCommentsTabProps;

export const CommentsTab = observer(function CommentsTab(
  props: CommentsTabProps
) {
  const studioCtx = useStudioCtx();

  const currentArena = studioCtx.currentArena;
  if (!currentArena) {
    return null;
  }

  const isDedicatedCurrentArena = isDedicatedArena(currentArena);

  const commentsCtx = studioCtx.commentsCtx;

  const threads = commentsCtx.filteredThreads();

  const { currentComponents, name, type } = React.useMemo(() => {
    if (isDedicatedCurrentArena) {
      return {
        name: currentArena.component.name,
        type: currentArena.component.type,
        currentComponents: [currentArena.component],
      };
    } else {
      return {
        name: currentArena.name,
        type: "Arena",
        currentComponents: currentArena.children.map(
          (child) => child.container.component
        ),
      };
    }
  }, [currentArena]);

  const { current, other } = partitionThreadsForComponents(
    threads,
    currentComponents
  );

  const projectId = studioCtx.siteInfo.id;
  const branchId = studioCtx.branchInfo()?.id;

  const currentNotificationLevel =
    commentsCtx.selfNotificationSettings()?.notifyAbout ??
    DEFAULT_NOTIFICATION_LEVEL;

  return (
    <div
      className={"comments-tab flex-even"}
      style={{
        overflow: "scroll",
      }}
    >
      <PlasmicCommentsTab
        {...props}
        notificationsButton={{
          wrap: (node) => (
            <Dropdown
              overlay={
                <Menu selectedKeys={[currentNotificationLevel]}>
                  <Menu.ItemGroup title={"Notify me about"}>
                    {Object.entries(notifyAboutKeyToLabel).map(
                      ([key, label]) => (
                        <Menu.Item
                          key={key}
                          onClick={async () => {
                            await studioCtx.appCtx.api.updateNotificationSettings(
                              projectId,
                              branchId,
                              {
                                ...commentsCtx.selfNotificationSettings(),
                                notifyAbout: key as any,
                              }
                            );
                            await commentsCtx.fetchComments();
                          }}
                        >
                          {label}
                        </Menu.Item>
                      )
                    )}
                  </Menu.ItemGroup>
                </Menu>
              }
            >
              {node}
            </Dropdown>
          ),
        }}
        filterButton={{
          props: {
            children: FilterValueToLabel[commentsCtx.commentsFilter()],
          },
          wrap: (node) => (
            <Dropdown
              overlay={
                <Menu selectedKeys={[commentsCtx.commentsFilter()]}>
                  {Object.entries(FilterValueToLabel).map(([key, label]) => (
                    <Menu.Item
                      key={key}
                      onClick={async () => {
                        commentsCtx.setCommentsFilter(key as CommentFilter);
                      }}
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
        currentHeader={{
          name,
          type,
          showCount: true,
          count: `${current.length}`,
        }}
        currentThreads={{
          noComments: current.length === 0,
          threads: {
            children: current.map((threadComment) => (
              <RootComment
                key={threadComment.id}
                commentThread={threadComment}
                onThreadSelect={(threadId, openedViewCtx) =>
                  commentsCtx.openCommentThreadDialog(threadId, openedViewCtx)
                }
              />
            )),
          },
        }}
        restHeader={{
          wrap: (node) => other.length > 0 && node,
          props: {
            count: `${other.length}`,
          },
        }}
        restThreads={{
          wrap: (node) => other.length > 0 && node,
          props: {
            threads: {
              children: other.map((commentThread) => (
                <RootComment
                  key={commentThread.id}
                  commentThread={commentThread}
                  onThreadSelect={(threadId, openedViewCtx) =>
                    commentsCtx.openCommentThreadDialog(threadId, openedViewCtx)
                  }
                />
              )),
            },
          },
        }}
      />
    </div>
  );
});

export default CommentsTab;
