import { CodeComponentMeta } from "@plasmicapp/host";
import { Map, Marker } from "pigeon-maps";
import React from "react";

export function ensure<T>(x: T | null | undefined): T {
  if (x === null || x === undefined) {
    debugger;
    throw new Error(`Value must not be undefined or null`);
  } else {
    return x;
  }
}

const modulePath = "@plasmicpkgs/plasmic-pigeon-maps";

interface PigeonMapsProps {
  provider?: string;
  latitude?: number;
  longitude?: number;
  zoomLevel?: number;
  width?: number;
  height?: number;
  animate?: boolean;
  zoomSnap?: boolean;
  metaWheelZoom?: boolean;
  twoFingerDrag?: boolean;
  className?: string;
}

export const PigeonMapsMeta: CodeComponentMeta<PigeonMapsProps> = {
  name: "hostless-pigeon-maps",
  displayName: "Pigeon Maps",
  importName: "PigeonMaps",
  importPath: modulePath,
  providesData: true,
  defaultStyles: {
    width: "400px",
    height: "600px",
  },
  props: {
    latitude: {
      type: "number",
      displayName: "Latitude",
      description: "Latitude",
      defaultValue: 41.2825125,
    },
    longitude: {
      type: "number",
      displayName: "Longitude",
      description: "Longitude",
      defaultValue: 69.139281,
    },
    zoomLevel: {
      type: "number",
      displayName: "Zoom",
      description: "Current zoom level [1...18]",
      defaultValue: 10,
    },
    animate: {
      type: "boolean",
      displayName: "Animations",
      description: "Animations enabled",
      defaultValue: true,
    },
    zoomSnap: {
      type: "boolean",
      displayName: "Zoom Snap",
      description:
        "Snap to discrete zoom increments (14, 15, 16, etc) when scrolling with the mouse or pinching with touch events",
      defaultValue: true,
    },
    metaWheelZoom: {
      type: "boolean",
      displayName: "Meta Wheel Zoom",
      description:
        "Zooming with the mouse wheel only works when you hold down the cmd or ctrl keys",
      defaultValue: false,
    },
    twoFingerDrag: {
      type: "boolean",
      displayName: "Two Finger Drag",
      description: "Moving the map requires touching with two fingers",
      defaultValue: false,
    },
  },
};

export function PigeonMaps({
  latitude,
  longitude,
  zoomLevel,
  animate,
  zoomSnap,
  metaWheelZoom,
  twoFingerDrag,
  className,
}: PigeonMapsProps) {
  const [zoom, setZoom] = React.useState(zoomLevel);

  return (
    <div className={className}>
      <Map
        defaultCenter={[latitude!, longitude!]}
        zoom={zoom}
        animate={animate}
        zoomSnap={zoomSnap}
        onBoundsChanged={({ zoom }) => {
          setZoom(zoom);
        }}
        metaWheelZoom={metaWheelZoom}
        twoFingerDrag={twoFingerDrag}
      >
        <Marker
          width={50}
          anchor={[latitude!, longitude!]}
          style={{ filter: "none" }}
        />
      </Map>
    </div>
  );
}
