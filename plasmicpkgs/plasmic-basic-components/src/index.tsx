import registerComponent from "@plasmicapp/host/registerComponent";
import React from "react";

type VideoProps = Pick<
  React.ComponentProps<"video">,
  | "autoPlay"
  | "controls"
  | "loop"
  | "muted"
  | "playsInline"
  | "poster"
  | "preload"
  | "src"
>;

const Video = React.forwardRef<HTMLVideoElement, VideoProps>(
  (props: VideoProps, ref) => {
    return <video ref={ref} {...props} />;
  }
);

registerComponent(Video, {
  name: "Video",
  importPath: "@plasmicpkgs/plasmic-basic-components",
  props: {
    src: {
      type: "string",
      defaultValue:
        "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.webm",
      displayName: "Source URL",
      description: "URL to a video file.",
    },
    autoPlay: {
      type: "boolean",
      displayName: "Auto Play",
      description:
        "Whether the video show automatically start playing when the player loads",
    },
    controls: {
      type: "boolean",
      displayName: "Show Controls",
      description: "Whether the video player controls should be displayed",
    },
    playsInline: {
      type: "boolean",
      displayName: "Plays inline",
      description:
        "Usually on mobile, when tilted landscape, videos can play fullscreen. Turn this on to prevent that.",
    },
    loop: {
      type: "boolean",
      displayName: "Loop",
      description: "Whether the video should be played again after it finishes",
    },
    muted: {
      type: "boolean",
      displayName: "Muted",
      description: "Whether audio should be muted",
    },
    // TODO enable this once image is a type
    // poster: {
    //   type: "image",
    //   displayName: "Poster (placeholder) image",
    //   description:
    //     "Image to show while video is downloading",
    // },
    preload: {
      type: "choice",
      options: ["none", "metadata", "auto"],
      displayName: "Preload",
      description:
        "Whether to preload nothing, metadata only, or the full video",
    },
  },
  isDefaultExport: true,
  defaultStyles: {
    height: "390px",
    width: "640px",
    maxWidth: "100%",
  },
});

export default Video;
