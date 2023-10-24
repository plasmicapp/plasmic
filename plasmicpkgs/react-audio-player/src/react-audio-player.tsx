import { CodeComponentMeta, usePlasmicCanvasContext } from "@plasmicapp/host";
import ReactAudioPlayer from "react-audio-player";

import React from "react";

export function ensure<T>(x: T | null | undefined): T {
  if (x === null || x === undefined) {
    debugger;
    throw new Error(`Value must not be undefined or null`);
  } else {
    return x;
  }
}

const modulePath = "@plasmicpkgs/react-audio-player";

interface AudioPlayerProps {
  className?: string;
  src?: string;
  autoPlay?: boolean;
  controls?: boolean;

  loop?: boolean;
  muted?: boolean;
  volume?: number;
}

export const AudioPlayerMeta: CodeComponentMeta<AudioPlayerProps> = {
  name: "hostless-react-audio-player",
  displayName: "AudioPlayer",
  importName: "AudioPlayer",
  importPath: modulePath,
  providesData: true,
  description: "React Audio Player to embed audio",
  defaultStyles: {
    width: "600px",
    height: "700px",
  },
  props: {
    src: {
      type: "string",
      displayName: "URL",
      description: "The URL of the audio to embed",
      defaultValue: "https://on.soundcloud.com/hS668",
    },
    autoPlay: {
      type: "boolean",
      displayName: "AutoPlay",
      description:
        "If true, the audio will automatically begin playback as soon as it can do so, without waiting for the entire audio file to finish downloading.",
      defaultValue: false,
    },
    controls: {
      type: "boolean",
      displayName: "Controls",
      description:
        "The browser will offer controls to allow the user to control audio playback, including volume, seeking, and pause/resume playback",
      defaultValue: false,
    },

    loop: {
      type: "boolean",
      displayName: "Loop",
      description:
        "If true, the audio player will automatically seek back to the start upon reaching the end of the audio.",
      defaultValue: false,
    },
    muted: {
      type: "boolean",
      displayName: "Muted",
      description:
        "A Boolean attribute that indicates whether the audio will be initially silenced",
      defaultValue: false,
    },
    volume: {
      type: "number",
      displayName: "Volume",
      description: "Volume of the audio",
      defaultValue: 1.0,
    },
  },
};

export function AudioPlayer({
  className,
  src,
  autoPlay,
  controls,
  loop,
  muted,
  volume,
}: AudioPlayerProps) {
  if (!src) {
    return <div>Please specify the URL of the audio to embed</div>;
  }
  const inEditor = !!usePlasmicCanvasContext();
  const isAutoPlay = inEditor ? false : autoPlay;

  return (
    <ReactAudioPlayer
      src={src}
      autoPlay={isAutoPlay}
      controls={controls}
      loop={loop}
      muted={muted}
      volume={volume}
      className={className}
    />
  );
}
