import { CodeComponentMeta } from "@plasmicapp/host";

import React from "react";

export function ensure<T>(x: T | null | undefined): T {
  if (x === null || x === undefined) {
    debugger;
    throw new Error(`Value must not be undefined or null`);
  } else {
    return x;
  }
}

const modulePath = "@plasmicpkgs/plasmic-google-maps";

interface GoogleMapsProps {
  className?: string;
  coordinates?: string;
}

export const GoogleMapsMeta: CodeComponentMeta<GoogleMapsProps> = {
  name: "GoogleMaps",
  displayName: "Google Maps ",
  importName: "GoogleMaps",
  importPath: modulePath,
  providesData: true,
  description: "Shows Google Maps",
  defaultStyles: {
    maxWidth: "100%",
  },
  props: {
    coordinates: {
      type: "string",
      displayName: "Coordinates",
      description: `The latitude, longitude of the map location.Learn how to get latitude and longitude ("https://support.google.com/maps/answer/18539")`,
      defaultValue: "51.51634532635064, -0.1332152112055726",
      helpText:`You can get latitude and longitude of your location from this website ("https://www.gps-coordinates.net/")`
    },
  },
};

export function GoogleMaps({ coordinates, className }: GoogleMapsProps) {
  if (!coordinates) {
    return <div>Please enter your coordinates</div>;
  }
  const query = `https://maps.google.com/maps?q=${coordinates}&t=&z=13&ie=UTF8&iwloc=&output=embed`;

  return (
    <iframe
      title="google"
      width="100%"
      height="600"
      id="gmap_canvas"
      src={query}
      className={className}
      frameBorder="0"
      marginHeight={0}
      marginWidth={0}
      scrolling="no"
    />
  );
}
