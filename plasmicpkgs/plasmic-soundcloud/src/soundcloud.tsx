import { usePlasmicCanvasContext } from "@plasmicapp/host";
import { CodeComponentMeta } from "@plasmicapp/host/registerComponent";

import React from "react";

export function ensure<T>(x: T | null | undefined): T {
  if (x === null || x === undefined) {
    // eslint-disable-next-line no-debugger
    debugger;
    throw new Error(`Value must not be undefined or null`);
  } else {
    return x;
  }
}

const modulePath = "@plasmicpkgs/plasmic-soundcloud";

interface SoundCloudProps {
  url: string;
  visual: boolean;
  autoPlay: boolean;
  color: string;
  showComments: boolean;
  showUser: boolean;
  showRelated: boolean;
  showTeaser: boolean;
  className: string;
}

export const SoundCloudMeta: CodeComponentMeta<SoundCloudProps> = {
  name: "hostless-soundcloud",
  displayName: "SoundCloud",
  importName: "SoundCloud",
  importPath: modulePath,
  providesData: true,
  description: "SoundCloud Player",
  props: {
    url: {
      type: "string",
      displayName: "URL",
      description: "Track URL",
      defaultValue:
        "https://soundcloud.com/vautdiscovery/ed-sheeran-thinking-out-loud-live-on-jools-holland",
    },
    visual: {
      type: "boolean",
      displayName: "Visual",
      description: "Visual or Classic player",
      defaultValue: true,
    },
    autoPlay: {
      type: "boolean",
      displayName: "AutoPlay",
      description: "AutoPlay track",
      defaultValue: false,
    },
    color: {
      type: "color",
      displayName: "Color",
      description: "Widget color,should be in hex format",
    },
    showUser: {
      type: "boolean",
      displayName: "Author",
      description: "Show/Hide the uploader name",
      defaultValue: false,
    },
    showRelated: {
      type: "boolean",
      displayName: "Related",
      description: "Show/Hide related songs",
      defaultValue: false,
    },
    showTeaser: {
      type: "boolean",
      displayName: "Teaser",
      description: "Show/Hide the teaser",
      defaultValue: false,
    },
    showComments: {
      type: "boolean",
      displayName: "Comments",
      description: "Show/Hide the comments",
      defaultValue: false,
    },
  },
};

export function SoundCloud({
  className,
  url,
  autoPlay,
  color,
  showComments,
  showRelated,
  showTeaser,
  showUser,
  visual,
}: SoundCloudProps) {
  const inEditor = usePlasmicCanvasContext();

  const play = inEditor ? false : autoPlay;
  const query = new URL(url);
  const parameters = new URLSearchParams(query.search);
  parameters.set("url", encodeURIComponent(url));
  parameters.set("show_comments", showComments.toString());
  parameters.set("show_user", showUser.toString());
  parameters.set("visual", visual.toString());
  parameters.set("auto_play", play.toString());
  parameters.set("show_teaser", showTeaser.toString());
  parameters.set("hide_related", (!showRelated).toString());
  parameters.set("color", color);

  return (
    <iframe
      frameBorder="0"
      scrolling="no"
      width="600px"
      height="400px"
      src={`https://w.soundcloud.com/player?${parameters.toString()}`}
      allow="autoplay"
      className={className}
    />
  );
}
