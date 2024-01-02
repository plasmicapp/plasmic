import { ClickStopper } from "@/wab/client/components/widgets";
import {
  DefaultCommentPostProps,
  PlasmicCommentPost,
} from "@/wab/client/plasmic/plasmic_kit_comments/PlasmicCommentPost";
import { OnClickAway } from "@/wab/commons/components/OnClickAway";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import Popover from "antd/lib/popover";
import EmojiPicker, { EmojiClickData } from "emoji-picker-react";
import * as React from "react";

export interface CommentPostProps extends DefaultCommentPostProps {
  onClick?: () => void;
  repliesLinkLabel?: React.ReactNode;
  subjectLabel?: React.ReactNode;
  avatarContainer?: React.ReactNode;
  userFullName?: string;
  timestamp?: string;
  body?: string;
  reactionsContainer?: React.ReactNode;
  moreMenu?: React.ReactNode;
  onAddEmoji?: (e: EmojiClickData) => Promise<void>;
}

function CommentPost_(props: CommentPostProps, ref: HTMLElementRefOf<"div">) {
  const {
    repliesLinkLabel,
    subjectLabel,
    avatarContainer,
    reactionsContainer,
    onAddEmoji,
    moreMenu,
    ...rest
  } = props;

  const [showPicker, setShowPicker] = React.useState(false);

  return (
    <PlasmicCommentPost
      root={{ ref }}
      {...rest}
      repliesLink={{ children: repliesLinkLabel }}
      subjectLabel={{ children: subjectLabel }}
      avatarContainer={{ children: avatarContainer }}
      reactionsContainer={{ children: reactionsContainer }}
      btnAddReaction={{
        render: (innerProps, Comp) => (
          <Popover
            trigger={[]}
            open={showPicker}
            onOpenChange={(x) => setShowPicker(x)}
            overlayClassName={"NoPaddingPopover"}
            content={
              <div>
                <OnClickAway onDone={() => setShowPicker(false)}>
                  <div>
                    <EmojiPicker
                      onEmojiClick={async (e) => {
                        await onAddEmoji?.(e);
                        setShowPicker(false);
                      }}
                    />
                  </div>
                </OnClickAway>
              </div>
            }
          >
            <Comp
              {...innerProps}
              onClick={(e) => {
                e.stopPropagation();
                setShowPicker(true);
              }}
            />
          </Popover>
        ),
      }}
      btnMore={{
        wrap: (node) => <ClickStopper preventDefault>{node}</ClickStopper>,
        props: {
          menu: moreMenu,
        },
      }}
    />
  );
}

const CommentPost = React.forwardRef(CommentPost_);
export default CommentPost;
