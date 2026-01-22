import registerComponent, {
  CodeComponentMeta,
} from "@plasmicapp/host/registerComponent";
import React, { ComponentProps } from "react";
import { Follow, Timeline, Tweet } from "react-twitter-widgets";

//
// This module registers Timeline, Tweet, and Follow, but not yet the Hashtag /
// Mention / Share components (would be easy additions).
//
// The components auto-size their heights by default, so it's actually
// sufficient to rely on just layout out an enclosing div.
//

export function TimelineWrapper({
  className,
  url,
  tweetLimit,
  chrome,
  theme,
}: {
  className?: string;
  url?: string;
  tweetLimit?: number;
  chrome?: string;
  theme?: string;
}) {
  if (!url) {
    throw new Error("Timeline component requires a URL");
  }
  return (
    <div className={className}>
      <Timeline
        dataSource={{ sourceType: "url", url }}
        options={{
          tweetLimit: tweetLimit,
          chrome: chrome,
          theme: theme,
        }}
      />
    </div>
  );
}

export const timelineWrapper: CodeComponentMeta<
  ComponentProps<typeof TimelineWrapper>
> = {
  name: "hostless-react-twitter-widgets-timeline",
  displayName: "Timeline",
  importName: "TimelineWrapper",
  importPath: "@plasmicpkgs/react-twitter-widgets",
  props: {
    url: {
      type: "string",
      description: "URL to a Twitter user or list",
      defaultValue: "https://twitter.com/plasmicapp",
    },
    tweetLimit: {
      type: "number",
      description: "Number of tweets to be displayed. Between 1 and 20",
      min: 1,
      max: 20,
    },
    chrome: {
      type: "choice",
      description: "Toggle the display of design elements in the widget",
      multiSelect: true,
      options: [
        "noheader",
        "nofooter",
        "noborders",
        "transparent",
        "noscrollbar",
      ],
    },
    theme: {
      type: "choice",
      description: "Toggle the default color scheme",
      options: ["dark", "light"],
      defaultValueHint: "light",
    },
  },
  defaultStyles: {
    display: "flex",
    flexDirection: "column",
    overflowY: "auto",
  },
};

export function registerTimelineWrapper(
  loader?: { registerComponent: typeof registerComponent },
  customTimelineWrapper?: CodeComponentMeta<
    ComponentProps<typeof TimelineWrapper>
  >
) {
  if (loader) {
    loader.registerComponent(
      TimelineWrapper,
      customTimelineWrapper ?? timelineWrapper
    );
  } else {
    registerComponent(
      TimelineWrapper,
      customTimelineWrapper ?? timelineWrapper
    );
  }
}

export function TweetWrapper({
  className,
  tweetId,
  theme,
}: {
  className?: string;
  tweetId?: string;
  theme?: string;
}) {
  if (!tweetId) {
    throw new Error("Tweet component requires a tweetId");
  }
  return (
    <div className={className}>
      <Tweet tweetId={tweetId} options={{ theme: theme }} />
    </div>
  );
}

export const tweetWrapper: CodeComponentMeta<
  ComponentProps<typeof TweetWrapper>
> = {
  name: "hostless-react-twitter-widgets-tweet",
  displayName: "Tweet",
  importName: "TweetWrapper",
  importPath: "@plasmicpkgs/react-twitter-widgets",
  props: {
    tweetId: {
      type: "string",
      description: "The tweet ID",
      defaultValue: "1381980305305694209",
    },
    theme: {
      type: "choice",
      description: "Toggle the default color scheme",
      options: ["dark", "light"],
      defaultValueHint: "light",
    },
  },
  defaultStyles: {
    display: "flex",
    flexDirection: "column",
    overflowY: "auto",
  },
};

export function registerTweetWrapper(
  loader?: { registerComponent: typeof registerComponent },
  customTweetWrapper?: CodeComponentMeta<ComponentProps<typeof TweetWrapper>>
) {
  if (loader) {
    loader.registerComponent(TweetWrapper, customTweetWrapper ?? tweetWrapper);
  } else {
    registerComponent(TweetWrapper, customTweetWrapper ?? tweetWrapper);
  }
}

export function FollowWrapper({
  className,
  username,
  large,
}: {
  className?: string;
  username?: string;
  large?: boolean;
}) {
  if (!username) {
    throw new Error("Follow component requires a username");
  }
  return (
    <div className={className}>
      <Follow
        username={username}
        options={{ size: large ? "large" : undefined }}
      />
    </div>
  );
}

export const followWrapper: CodeComponentMeta<
  ComponentProps<typeof FollowWrapper>
> = {
  name: "hostless-react-twitter-widgets-follow",
  displayName: "Follow",
  importName: "FollowWrapper",
  importPath: "@plasmicpkgs/react-twitter-widgets",
  props: {
    username: {
      type: "string",
      description: "Twitter username to follow",
      defaultValue: "plasmicapp",
    },
    large: {
      type: "boolean",
      description: "Toggle the button size",
    },
  },
};

export function registerFollowWrapper(
  loader?: { registerComponent: typeof registerComponent },
  customFollowWrapper?: CodeComponentMeta<ComponentProps<typeof FollowWrapper>>
) {
  if (loader) {
    loader.registerComponent(
      FollowWrapper,
      customFollowWrapper ?? followWrapper
    );
  } else {
    registerComponent(FollowWrapper, customFollowWrapper ?? followWrapper);
  }
}
