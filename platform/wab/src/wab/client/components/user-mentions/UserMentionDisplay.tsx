import {
  DefaultUserMentionDisplayProps,
  PlasmicUserMentionDisplay,
} from "@/wab/client/plasmic/plasmic_kit_user_mentions/PlasmicUserMentionDisplay";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { getUniqueUsersFromApiPermissions } from "@/wab/shared/perms";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import * as React from "react";

export interface UserMentionDisplayProps
  extends DefaultUserMentionDisplayProps {
  email: string;
  defaultEmailDisplay: React.ReactNode;
}

function UserMentionDisplay_(
  props: UserMentionDisplayProps,
  ref: HTMLElementRefOf<"div">
) {
  const { email, defaultEmailDisplay, ...plasmicProps } = props;

  const studioCtx = useStudioCtx();
  const users = getUniqueUsersFromApiPermissions(studioCtx.siteInfo.perms);
  const mentionedUser = users.find((user) => user.email === email);

  if (!mentionedUser) {
    return defaultEmailDisplay;
  }

  return (
    <PlasmicUserMentionDisplay
      root={{
        ref,
      }}
      {...plasmicProps}
      children={`${mentionedUser.firstName} ${mentionedUser.lastName}`}
    />
  );
}

export const UserMentionDisplay = React.forwardRef(UserMentionDisplay_);
