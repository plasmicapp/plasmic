import RootComment from "@/wab/client/components/comments/RootComment";
import {
  CommentFilter,
  FilterValueToLabel,
  getThreadsFromFocusedComponent,
} from "@/wab/client/components/comments/utils";
import { useViewCtxMaybe } from "@/wab/client/contexts/StudioContexts";
import {
  DefaultCommentsTabProps,
  PlasmicCommentsTab,
} from "@/wab/client/plasmic/plasmic_kit_comments/PlasmicCommentsTab";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { isTplNamable } from "@/wab/shared/core/tpls";
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
  const viewCtx = useViewCtxMaybe();

  let focusedTpl = viewCtx?.focusedTpl();
  if (!isTplNamable(focusedTpl)) {
    focusedTpl = null;
  }

  const currentComponent = studioCtx.currentComponent;

  const commentsCtx = studioCtx.commentsCtx;

  if (!currentComponent) {
    return null;
  }

  const threads = commentsCtx.filteredThreads();

  const { focusedComponentThreads, otherComponentsThreads } =
    getThreadsFromFocusedComponent(threads, currentComponent, focusedTpl);

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
          name: currentComponent.name,
          type: currentComponent.type,
          showCount: true,
          count: `${focusedComponentThreads.length}`,
        }}
        currentThreads={{
          noComments: focusedComponentThreads.length === 0,
          threads: {
            children: focusedComponentThreads.map((threadComment) => (
              <RootComment
                key={threadComment.id}
                commentThread={threadComment}
                onThreadSelect={(threadId) =>
                  commentsCtx.openCommentThreadDialog(threadId)
                }
              />
            )),
          },
        }}
        restHeader={{
          wrap: (node) => otherComponentsThreads.length > 0 && node,
          props: {
            count: `${otherComponentsThreads.length}`,
          },
        }}
        restThreads={{
          wrap: (node) => otherComponentsThreads.length > 0 && node,
          props: {
            threads: {
              children: otherComponentsThreads.map((commentThread) => (
                <RootComment
                  key={commentThread.id}
                  commentThread={commentThread}
                  onThreadSelect={(threadId) =>
                    commentsCtx.openCommentThreadDialog(threadId)
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
