// This is a skeleton starter React component generated by Plasmic.
// This file is owned by you, feel free to edit as you see fit.
import {
  DefaultThreadHistoryProps,
  PlasmicThreadHistory,
} from "@/wab/client/plasmic/plasmic_kit_comments/PlasmicThreadHistory";
import { ApiCommentThreadHistory } from "@/wab/shared/ApiSchema";

import { Avatar } from "@/wab/client/components/studio/Avatar";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { fullName } from "@/wab/shared/ApiSchemaUtil";
import { ensure, ensureString } from "@/wab/shared/common";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import moment from "moment";
import * as React from "react";

export interface ThreadHistoryProps extends DefaultThreadHistoryProps {
  history: ApiCommentThreadHistory;
}

function ThreadHistory_(
  props: ThreadHistoryProps,
  ref: HTMLElementRefOf<"div">
) {
  const { history, ...rest } = props;

  const studioCtx = useStudioCtx();

  const commentsCtx = studioCtx.commentsCtx;

  const author = ensure(
    commentsCtx.computedData().usersMap.get(ensureString(history.createdById)),
    `Author of comment ${history.createdById} should be present in usersMap`
  );

  return (
    <PlasmicThreadHistory
      root={{ ref }}
      timestamp={moment(history.createdAt).fromNow()}
      userFullName={fullName(author)}
      avatarContainer={{ children: <Avatar user={author} /> }}
      isResolved={history.resolved}
      {...rest}
    />
  );
}

export const ThreadHistory = React.forwardRef(ThreadHistory_);
