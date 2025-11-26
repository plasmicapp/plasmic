import registerComponent, {
  ComponentMeta,
} from "@plasmicapp/host/registerComponent";
import React, { useImperativeHandle, useRef } from "react";

export type VideoProps = Pick<
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

interface VideoActions {
  play(): void;
  pause(): void;
}

export const Video = React.forwardRef<VideoActions, VideoProps>(
  (props: VideoProps, ref) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    useImperativeHandle(
      ref,
      () => {
        return {
          play() {
            videoRef.current?.play();
          },
          pause() {
            videoRef.current?.pause();
          },
        };
      },
      []
    );

    return <video ref={videoRef} {...props} />;
  }
);

export const videoMeta: ComponentMeta<VideoProps> = {
  name: "hostless-html-video",
  importName: "Video",
  displayName: "HTML Video",
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
        "Whether the video show automatically start playing when the player loads. Chrome and other browsers require 'muted' to also be set for 'autoplay' to work.",
      helpText: "Requires 'Muted' to also be set for 'Auto Play' to work.",
    },
    controls: {
      type: "boolean",
      displayName: "Show Controls",
      description: "Whether the video player controls should be displayed",
      defaultValue: true,
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
    poster: {
      type: "imageUrl",
      displayName: "Poster (placeholder) image",
      description: "Image to show while video is downloading",
    },
    preload: {
      type: "choice",
      options: ["none", "metadata", "auto"],
      displayName: "Preload",
      description:
        "Whether to preload nothing, metadata only, or the full video",
    },
  },
  defaultStyles: {
    height: "hug",
    width: "640px",
    maxWidth: "100%",
  },
  refActions: {
    play: {
      description: "Play the video",
      argTypes: [],
    },
    pause: {
      description: "Pause the video",
      argTypes: [],
    },
  },
};

export function registerVideo(
  loader?: { registerComponent: typeof registerComponent },
  customVideoMeta?: ComponentMeta<VideoProps>
) {
  if (loader) {
    loader.registerComponent(Video, customVideoMeta ?? videoMeta);
  } else {
    registerComponent(Video, customVideoMeta ?? videoMeta);
  }
}
