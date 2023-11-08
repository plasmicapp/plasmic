import {
  registerFollowWrapper,
  registerTimelineWrapper,
  registerTweetWrapper,
} from "@plasmicpkgs/react-twitter-widgets";
export function register() {
  registerTweetWrapper();
  registerTimelineWrapper();
  registerFollowWrapper();
}

register();
