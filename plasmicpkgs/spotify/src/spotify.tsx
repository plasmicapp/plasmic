import { CodeComponentMeta } from "@plasmicapp/host/registerComponent";

import React from "react";
export function ensure<T>(x: T | null | undefined): T {
  if (x === null || x === undefined) {
    debugger;
    throw new Error(`Value must not be undefined or null`);
  } else {
    return x;
  }
}

const modulePath = "@plasmicpkgs/plasmic-spotify";

interface SpotifyProps {
  theme?: boolean;
  url?: string;
  className?: string;
}

export const SpotifyMeta: CodeComponentMeta<SpotifyProps> = {
  name: "hostless-spotify",
  displayName: "Spotify",
  importName: "Spotify",
  importPath: modulePath,
  providesData: true,
  description: "Spotify Player",
  props: {
    url: {
      type: "string",
      displayName: "URL",
      description: "Song URL",
      defaultValue:
        "https://open.spotify.com/embed/track/3rmo8F54jFF8OgYsqTxm5d",
    },
    theme: {
      type: "boolean",
      displayName: "Theme",
      description: "Theme",
    },
  },
};

export function Spotify({ className, url, theme }: SpotifyProps) {
  const value = theme ? "1" : "0";
  const query = `${url}?utm_source=generator&theme=${value}`;
  return (
    <iframe
      src={query}
      frameBorder="0"
      scrolling="no"
      width="400"
      height="166"
      className={className}
    />
  );
}
