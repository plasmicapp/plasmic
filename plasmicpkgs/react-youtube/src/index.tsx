import registerComponent, {
  CodeComponentMeta,
} from "@plasmicapp/host/registerComponent";
import React from "react";
import YouTubeImpl, { YouTubeProps as YouTubeImplProps } from "react-youtube";
import type { Options } from "youtube-player/dist/types";

type PlayerVars = Exclude<Options["playerVars"], undefined>;
export type YouTubeProps = YouTubeImplProps & {
  [prop in keyof PlayerVars]:
    | PlayerVars[prop]
    | (prop extends (typeof booleanParams)[number] ? boolean : never);
} & { mute?: boolean };
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
  "start",
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
    const internalRef = React.useRef<YouTubeImpl | null>(null);

    const onRef = React.useCallback(
      (player: YouTubeImpl | null) => {
        internalRef.current = player;
        if (ref) {
          if (typeof ref === "function") {
            ref(player);
          } else {
            ref.current = player;
          }
        }
      },
      [ref]
    );

    React.useEffect(() => {
      if (props.mute !== undefined) {
        if (props.mute) {
          internalRef.current?.getInternalPlayer()?.mute();
        } else {
          internalRef.current?.getInternalPlayer()?.unMute();
        }
      }
    }, [props.mute, internalRef]);

    const finalProps = { ...props };
    for (const prop of playerParams) {
      if (prop in finalProps) {
        const value = finalProps[prop];
        delete finalProps[prop];
        if (!finalProps.opts) {
          finalProps.opts = {};
        }
        if (!finalProps.opts.playerVars) {
          finalProps.opts.playerVars = {};
        }
        if (booleanParamsSet.has(prop)) {
          if (prop === "cc_load_policy" || prop === "modestbranding") {
            // undefined or 1
            if (value) {
              finalProps.opts.playerVars[prop] = 1;
            } else {
              delete finalProps.opts.playerVars[prop];
            }
          } else {
            // 0 or 1
            finalProps.opts.playerVars[prop] = (value ? 1 : 0) as any;
          }
        } else {
          finalProps.opts.playerVars[prop] = value as any;
        }
      }
    }
    return (
      <YouTubeImpl
        ref={onRef}
        {...finalProps}
        iframeClassName={props.className}
      />
    );
  }
);

export const youtubeMeta: CodeComponentMeta<YouTubeProps> = {
  name: "hostless-youtube",
  displayName: "YouTube",
  importName: "YouTube",
  importPath: "@plasmicpkgs/react-youtube",
  props: {
    videoId: {
      type: "string",
      defaultValue: "R6MeLqRQzYw",
      displayName: "Video ID",
      description: "The ID for the YouTube video",
    },
    autoplay: {
      type: "boolean",
      displayName: "Auto Play",
      description:
        "Whether the video should automatically start playing when the player loads",
      defaultValueHint: false,
      hidden: (props) => !props.mute,
    },
    cc_load_policy: {
      type: "boolean",
      displayName: "Show Captions",
      description:
        "Whether the captions should be shown by default, even if the user has turned captions off",
      defaultValueHint: false,
    },
    start: {
      type: "number",
      displayName: "Start",
      description:
        "The video should begin at this amount of seconds from the start of the video",
      defaultValueHint: 0,
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
      defaultValueHint: "red",
    },
    controls: {
      type: "boolean",
      displayName: "Show Controls",
      description:
        "Whether the YouTube video player controls should be displayed",
      defaultValueHint: true,
    },
    disablekb: {
      type: "boolean",
      displayName: "Disable Keyboard",
      description: "Whether the keyboard controls should be disabled",
      defaultValueHint: false,
    },
    fs: {
      type: "boolean",
      displayName: "FullScreen Button",
      description: "Whether the fullscreen button should be displayed",
      defaultValueHint: true,
    },
    loop: {
      type: "boolean",
      displayName: "Loop",
      description: "Whether the video should be played again after it finishes",
      defaultValueHint: false,
    },
    modestbranding: {
      type: "boolean",
      displayName: "Hide Logo",
      description: "Hide the YouTube logo in the control bar",
      defaultValueHint: false,
    },
    mute: {
      type: "boolean",
      displayName: "Mute",
      description: "Whether the video should be muted",
      defaultValueHint: false,
    },
    playsinline: {
      type: "boolean",
      displayName: "Play Inline",
      description:
        "Whether the video should be played inline or fullscreen on iOS",
      defaultValueHint: false,
    },
    rel: {
      type: "boolean",
      displayName: "Related Videos",
      description:
        "Whether it should show related videos when the video ends (if false, it shows other videos from the same channel)",
      defaultValueHint: true,
    },
  },
  isDefaultExport: true,
  defaultStyles: {
    height: "390px",
    width: "640px",
    maxHeight: "100%",
    maxWidth: "100%",
  },
};

export function registerYouTube(
  loader?: { registerComponent: typeof registerComponent },
  customYouTubeMeta?: CodeComponentMeta<YouTubeProps>
) {
  if (loader) {
    loader.registerComponent(YouTube, customYouTubeMeta ?? youtubeMeta);
  } else {
    registerComponent(YouTube, customYouTubeMeta ?? youtubeMeta);
  }
}

export default YouTube;
