import * as React from "react";
import { pick } from "../common";
import {
  AnyPlasmicClass,
  PlasmicClassArgs,
  PlasmicClassOverrides,
  PlasmicClassVariants,
} from "./plume-utils";

export interface StyleProps {
  className?: string;
  style?: React.CSSProperties;
}

export function getStyleProps<P extends StyleProps>(props: P): StyleProps {
  return pick(props, "className", "style");
}

export function getDefaultPlasmicProps<C extends AnyPlasmicClass>(
  plasmicClass: C,
  props: Record<string, any>
) {
  return {
    plasmicProps: {
      variants: pick(
        props,
        ...plasmicClass.internalVariantProps
      ) as PlasmicClassVariants<C>,
      args: pick(
        props,
        ...plasmicClass.internalArgProps
      ) as PlasmicClassArgs<C>,
      overrides: {} as PlasmicClassOverrides<C>,
    },
  };
}
