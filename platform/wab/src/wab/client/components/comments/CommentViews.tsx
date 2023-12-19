import { Popover, Tooltip } from "antd";
import EmojiPicker, { Emoji } from "emoji-picker-react";
import { groupBy, sortBy } from "lodash";
import moment from "moment/moment";
import React, { ReactNode, useState } from "react";
import { mutate } from "swr";
import { ObjInst } from "../../../classes";
import {
  ensure,
  ensureString,
  jsonClone,
  maybe,
  mkUuid,
  xGroupBy,
} from "../../../common";
import { OnClickAway } from "../../../commons/components/OnClickAway";
import { Stated } from "../../../commons/components/Stated";
import {
  ApiComment,
  CommentData,
  CommentThreadId,
} from "../../../shared/ApiSchema";
import { fullName } from "../../../shared/ApiSchemaUtil";
import { mkSemVerSiteElement } from "../../../shared/site-diffs";
import { isTplNamable } from "../../../tpls";
import { apiKey } from "../../api";
import { useAppCtx } from "../../contexts/AppContexts";
import PlasmicCommentPost from "../../plasmic/plasmic_kit_comments/PlasmicCommentPost";
import PlasmicCommentPostForm from "../../plasmic/plasmic_kit_comments/PlasmicCommentPostForm";
import PlasmicReactionButton from "../../plasmic/plasmic_kit_comments/PlasmicReactionButton";
import PlasmicThreadComments from "../../plasmic/plasmic_kit_comments/PlasmicThreadComments";
import { StudioCtx } from "../../studio-ctx/StudioCtx";
import { ViewCtx } from "../../studio-ctx/view-ctx";
import { Avatar } from "../studio/Avatar";

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

  const allComments = sortBy(
    commentsReal.comments.filter(commentIsValid),
    (c) => +c.createdAt
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

  function commentIsValid(comment: ApiComment) {
    const subject = bundler.objByAddr(comment.data.location.subject);
    return !!subject;
  }

  function renderComment(
    comment: ApiComment,
    subjectLabel?: ReactNode,
    threadRepliesLabel?: string,
    onClick?: () => any
  ) {
    const author = ensure(userMap.get(ensureString(comment.createdById)), "");
    const reactionsByEmoji =
      maybe(reactionsByCommentId.get(comment.id), (xs) =>
        groupBy(xs, (x) => x.data.emojiName)
      ) ?? {};
    return (
      <Stated defaultValue={false}>
        {(showPicker, setShowPicker) => (
          <>
            <PlasmicCommentPost
              onClick={onClick}
              thread={!!threadRepliesLabel}
              repliesLink={{
                children: threadRepliesLabel,
              }}
              subjectLabel={{ children: subjectLabel }}
              avatarContainer={{ children: <Avatar user={author} /> }}
              userFullName={fullName(author)}
              timestamp={moment(comment.createdAt).fromNow()}
              body={comment.data.body}
              btnAddReaction={{
                render: (props, Comp) => (
                  <Popover
                    trigger={[]}
                    visible={showPicker}
                    onVisibleChange={(x) => setShowPicker(x)}
                    overlayClassName={"NoPaddingPopover"}
                    content={
                      <div>
                        <OnClickAway onDone={() => setShowPicker(false)}>
                          <div>
                            <EmojiPicker
                              onEmojiClick={async (e) => {
                                await api.addReactionToComment(comment.id, {
                                  emojiName: e.unified,
                                });
                                await refresh();
                                setShowPicker(false);
                              }}
                            />
                          </div>
                        </OnClickAway>
                      </div>
                    }
                  >
                    <Comp
                      {...props}
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowPicker(true);
                      }}
                    />
                  </Popover>
                ),
              }}
              reactionsContainer={{
                children: Object.entries(reactionsByEmoji).map(
                  ([emojiName, reactions]) => {
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
                  }
                ),
              }}
            />
          </>
        )}
      </Stated>
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
