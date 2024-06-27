import { apiKey } from "@/wab/client/api";
import CommentPost from "@/wab/client/components/comments/CommentPost";
import { getCommentsWithModelMetadata } from "@/wab/client/components/comments/utils";
import { Avatar } from "@/wab/client/components/studio/Avatar";
import { useAppCtx } from "@/wab/client/contexts/AppContexts";
import PlasmicCommentPostForm from "@/wab/client/plasmic/plasmic_kit_comments/PlasmicCommentPostForm";
import PlasmicReactionButton from "@/wab/client/plasmic/plasmic_kit_comments/PlasmicReactionButton";
import PlasmicThreadComments from "@/wab/client/plasmic/plasmic_kit_comments/PlasmicThreadComments";
import {
  isUserProjectEditor,
  StudioCtx,
} from "@/wab/client/studio-ctx/StudioCtx";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import {
  ensure,
  ensureString,
  jsonClone,
  maybe,
  mkUuid,
  spawn,
  xGroupBy,
} from "@/wab/shared/common";
import {
  ApiComment,
  CommentData,
  CommentThreadId,
} from "@/wab/shared/ApiSchema";
import { fullName } from "@/wab/shared/ApiSchemaUtil";
import { ObjInst } from "@/wab/shared/model/classes";
import { mkSemVerSiteElement } from "@/wab/shared/site-diffs";
import { isTplNamable } from "@/wab/shared/core/tpls";
import { Menu, Tooltip } from "antd";
import { Emoji } from "emoji-picker-react";
import { groupBy, sortBy } from "lodash";
import moment from "moment/moment";
import React, { ReactNode, useState } from "react";
import { mutate } from "swr";

export function useCommentViews(
  studioCtx: StudioCtx,
  viewCtx: ViewCtx | undefined
) {
  const appCtx = useAppCtx();
  const api = appCtx.api;
  const projectId = studioCtx.siteInfo.id;
  const branchId = studioCtx.dbCtx().branchInfo?.id;

  const [body, setBody] = useState("");
  const bundler = studioCtx.bundler();

  const commentsData = studioCtx.commentsData;

  if (!commentsData) {
    return undefined;
  }

  const [commentsReal, userMapReal] = commentsData;

  const allComments = getCommentsWithModelMetadata(
    bundler,
    commentsReal.comments
  );

  const userMap = userMapReal;

  const reactionsByCommentId = xGroupBy(
    sortBy(commentsReal.reactions, (r) => +r.createdAt),
    (reaction) => reaction.commentId
  );

  function isValidComment() {
    return body.trim().length > 0;
  }

  let focusedTpl = viewCtx?.focusedTpl();
  if (!isTplNamable(focusedTpl)) {
    focusedTpl = null;
  }

  function renderComment(
    comment: ApiComment,
    subjectLabel?: ReactNode,
    threadRepliesLabel?: string,
    onClick?: () => any,
    isThread?: boolean
  ) {
    const author = ensure(userMap.get(ensureString(comment.createdById)), "");
    const reactionsByEmoji =
      maybe(reactionsByCommentId.get(comment.id), (xs) =>
        groupBy(xs, (x) => x.data.emojiName)
      ) ?? {};
    const isEditor = isUserProjectEditor(
      appCtx.selfInfo,
      studioCtx.siteInfo,
      studioCtx.siteInfo.perms
    );
    const moreMenu = (isEditor ||
      appCtx.selfInfo?.id === comment.createdById) && (
      <Menu>
        <Menu.Item
          key="remove"
          onClick={() => {
            const deleteComment = async () => {
              if (isThread) {
                await api.deleteThread(
                  projectId,
                  branchId,
                  comment.data.threadId
                );
              } else {
                await api.deleteComment(projectId, branchId, comment.id);
              }
            };

            spawn(deleteComment());
          }}
        >
          Delete {isThread ? "thread" : "comment"}
        </Menu.Item>
      </Menu>
    );
    return (
      <CommentPost
        onClick={onClick}
        thread={!!threadRepliesLabel}
        repliesLinkLabel={threadRepliesLabel}
        subjectLabel={subjectLabel}
        avatarContainer={<Avatar user={author} />}
        userFullName={fullName(author)}
        timestamp={moment(comment.createdAt).fromNow()}
        body={comment.data.body}
        onAddEmoji={async (e) => {
          await api.addReactionToComment(comment.id, {
            emojiName: e.unified,
          });
          await refresh();
        }}
        moreMenu={moreMenu}
        reactionsContainer={
          <>
            {Object.entries(reactionsByEmoji).map(([emojiName, reactions]) => {
              const currentUsersReaction = reactions.find(
                (r) => r.createdById === appCtx.selfInfo?.id
              );
              return (
                <Tooltip
                  title={reactions
                    .map((r) =>
                      fullName(
                        ensure(userMap.get(ensure(r.createdById, "")), "")
                      )
                    )
                    .join(", ")}
                >
                  <PlasmicReactionButton
                    includesSelf={!!currentUsersReaction}
                    emoji={<Emoji size={20} unified={emojiName} />}
                    count={<>{reactions.length}</>}
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (currentUsersReaction) {
                        await api.removeReactionFromComment(
                          currentUsersReaction.id
                        );
                      } else {
                        await api.addReactionToComment(comment.id, {
                          emojiName,
                        });
                      }
                      await refresh();
                    }}
                  />
                </Tooltip>
              );
            })}
          </>
        }
      />
    );
  }

  function deriveLabel(subject: ObjInst) {
    const item = mkSemVerSiteElement(subject as any);
    const typeName = item.type;
    const objName = item.name;
    const label = (
      <>
        {objName ? (
          <>
            {typeName} <strong>{objName}</strong>
          </>
        ) : (
          "Unnamed " + typeName
        )}
      </>
    );
    return label;
  }

  function renderFullThread(
    threadComments: ApiComment[],
    threadId: CommentThreadId
  ) {
    return (
      <PlasmicThreadComments
        commentsList={{
          children: threadComments.map((_comment) => {
            return renderComment(_comment);
          }),
        }}
        replyForm={{
          render: () => renderPostForm(threadId),
        }}
      />
    );
  }

  function getCurrentVariants() {
    return viewCtx
      ? sortBy(
          [
            ...viewCtx.currentComponentStackFrame().getPinnedVariants().keys(),
            ...viewCtx.currentComponentStackFrame().getTargetVariants(),
          ],
          (v) => bundler.addrOf(v).iid
        )
      : [];
  }

  function refresh() {
    return mutate(apiKey("getComments", projectId, branchId));
  }

  function renderPostForm(threadId?: CommentThreadId) {
    return (
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const location = threadId
            ? jsonClone(
                ensure(
                  allComments.find((c) => c.data.threadId === threadId),
                  ""
                ).data.location
              )
            : {
                subject: bundler.addrOf(ensure(focusedTpl, "")),
                variants: getCurrentVariants().map((pv) => bundler.addrOf(pv)),
              };
          const commentData: CommentData = {
            body,
            threadId: threadId ?? (mkUuid() as CommentThreadId),
            location,
          };
          setBody("");
          await api.postComment(projectId, branchId, commentData);
          await refresh();
        }}
      >
        <PlasmicCommentPostForm
          bodyInput={{
            name: "comment",
            placeholder: `${
              threadId ? "Reply to this thread" : "Post a comment"
            }`,
            value: body,
            onChange: (e) => setBody(e.target.value),
          }}
          submitButton={{
            htmlType: "submit",
            disabled: !isValidComment(),
          }}
        />
      </form>
    );
  }

  return {
    bundler,
    allComments,
    userMap,
    deriveLabel,
    renderComment,
    renderFullThread,
    renderPostForm,
    getCurrentVariants,
  };
}
