import { ComponentMeta } from "@plasmicapp/host";
import registerComponent from "@plasmicapp/host/registerComponent";
import React, { ComponentProps } from "react";
import { Follow, Timeline, Tweet } from "react-twitter-widgets";

//
// This module registers Timeline, Tweet, and Follow, but not yet the Hashtag /
// Mention / Share components (would be easy additions).
//

export function TimelineWrapper({
  className,
  url,
}: {
  className?: string;
  url?: string;
}) {
  if (!url) {
    throw new Error("Timeline component requires a URL");
  }
  return (
    <div className={className}>
      <Timeline
        dataSource={{ sourceType: "url", url }}
        options={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}

export const timelineWrapper: ComponentMeta<
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
  },
};

export function registerTimelineWrapper(
  loader?: { registerComponent: typeof registerComponent },
  customTimelineWrapper?: ComponentMeta<ComponentProps<typeof TimelineWrapper>>
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
}: {
  className?: string;
  tweetId?: string;
}) {
  if (!tweetId) {
    throw new Error("Tweet component requires a tweetId");
  }
  return (
    <div className={className}>
      <Tweet tweetId={tweetId} options={{ width: "100%", height: "100%" }} />
    </div>
  );
}

export const tweetWrapper: ComponentMeta<
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
  },
};

export function registerTweetWrapper(
  loader?: { registerComponent: typeof registerComponent },
  customTweetWrapper?: ComponentMeta<ComponentProps<typeof TweetWrapper>>
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
}: {
  className?: string;
  username?: string;
}) {
  if (!username) {
    throw new Error("Follow component requires a username");
  }
  return (
    <div className={className}>
      <Follow username={username} />
    </div>
  );
}

export const followWrapper: ComponentMeta<
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
  },
};

export function registerFollowWrapper(
  loader?: { registerComponent: typeof registerComponent },
  customFollowWrapper?: ComponentMeta<ComponentProps<typeof FollowWrapper>>
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
