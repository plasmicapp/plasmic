import {
  DefaultOmnibarAddItemProps,
  PlasmicOmnibarAddItem,
} from "@/wab/client/plasmic/plasmic_kit_omnibar/PlasmicOmnibarAddItem";
import * as React from "react";
import { CSSProperties } from "react";

interface OmnibarAddItemProps extends DefaultOmnibarAddItemProps {
  hoverText?: string;
  style?: CSSProperties;
  "data-test-id"?: string;
}

function OmnibarAddItem({
  hoverText,
  "data-test-id": dataTestId,
  ...props
}: OmnibarAddItemProps) {
  return (
    <PlasmicOmnibarAddItem
      {...props}
      text={hoverText}
      root={{
        props: {
          "data-test-id": dataTestId,
        } as any,
      }}
    />
  );
}

export default OmnibarAddItem;
