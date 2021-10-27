import registerComponent from "@plasmicapp/host/registerComponent";
import React from "react";
import YouTubeImpl, {
  PlayerVars,
  YouTubeProps as YouTubeImplProps,
} from "react-youtube";

export type YouTubeProps = YouTubeImplProps &
  {
    [prop in keyof PlayerVars]:
      | PlayerVars[prop]
      | (prop extends typeof booleanParams[number] ? boolean : never);
  };
const playerParams = [
  "autoplay",
  "cc_load_policy",
  "color",
  "controls",
  "disablekb",
  "enablejsapi",
  "end",
  "fs",
  "hl",
  "iv_load_policy",
  "list",
  "listType",
  "loop",
  "modestbranding",
  "origin",
  "playlist",
  "playsinline",
  "rel",
  "showinfo",
  "start",
  "mute",
] as const;

const booleanParams = [
  "autoplay",
  "cc_load_policy",
  "controls",
  "disablekb",
  "fs",
  "loop",
  "modestbranding",
  "playsinline",
  "rel",
] as const;

const booleanParamsSet = new Set<string>(booleanParams);

const YouTube = React.forwardRef<YouTubeImpl, YouTubeProps>(
  (props: YouTubeProps, ref) => {
    for (const prop of playerParams) {
      if (prop in props) {
        const value = props[prop];
        delete props[prop];
        if (!props.opts) {
          props.opts = {};
        }
        if (!props.opts.playerVars) {
          props.opts.playerVars = {};
        }
        if (booleanParamsSet.has(prop)) {
          if (prop === "cc_load_policy" || prop === "modestbranding") {
            // undefined or 1
            if (value) {
              props.opts.playerVars[prop] = 1;
            } else {
              delete props.opts.playerVars[prop];
            }
          } else {
            // 0 or 1
            props.opts.playerVars[prop] = (value ? 1 : 0) as any;
          }
        } else {
          props.opts.playerVars[prop] = value as any;
        }
      }
    }
    return <YouTubeImpl ref={ref} {...props} />;
  }
);

registerComponent(YouTube, {
  name: "YouTube",
  importPath: "@plasmicpkgs/react-youtube",
  props: {
    videoId: {
      type: "string",
      defaultValue: "R6MeLqRQzYw",
      displayName: "Video ID",
      description: "The ID for the YouTube video.",
    },
    autoplay: {
      type: "boolean",
      displayName: "Auto Play",
      description:
        "Whether the video show automatically start playing when the player loads",
    },
    cc_load_policy: {
      type: "boolean",
      displayName: "Show Captions",
      description:
        "Whether the captions should be shown by default, even if the user has turned captions off",
    },
    start: {
      type: "number",
      displayName: "Start",
      description:
        "The video should begin at this amount of seconds from the start of the video",
    },
    end: {
      type: "number",
      displayName: "End",
      description:
        "Stop playing the video after this amount of seconds (measured from the start of the video)",
    },
    color: {
      type: "choice",
      displayName: "Color",
      options: ["red", "white"],
      description:
        "The color used in the display bar to highlight how much of the video the viewer has already seen",
    },
    controls: {
      type: "boolean",
      displayName: "Show Controls",
      description:
        "Whether the YouTube video player controls should be displayed",
    },
    disablekb: {
      type: "boolean",
      displayName: "Disable Keyboard",
      description: "Whether the keyboard controls should be disabled",
    },
    fs: {
      type: "boolean",
      displayName: "FullScreen Button",
      description: "Whether the fullscreen button should be displayed",
    },
    loop: {
      type: "boolean",
      displayName: "Loop",
      description: "Whether the video should be played again after it finishes",
    },
    modestbranding: {
      type: "boolean",
      displayName: "Hide Logo",
      description: "Hide the YouTube logo",
    },
    playsinline: {
      type: "boolean",
      displayName: "Play Inline",
      description:
        "Whether the video should be played inline or fullscreen on iOS",
    },
    rel: {
      type: "boolean",
      displayName: "Related Videos",
      description:
        "Whether it should show related videos when the video ends (if false, it shows other videos from the same channel)",
    },
  },
  isDefaultExport: true,
  defaultStyles: {
    height: "390px",
    width: "640px",
    maxHeight: "100%",
    maxWidth: "100%",
  },
});

export default YouTube;
