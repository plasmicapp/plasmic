import {
  DefaultOmnibarAddItemProps,
  PlasmicOmnibarAddItem,
} from "@/wab/client/plasmic/plasmic_kit_omnibar/PlasmicOmnibarAddItem";
import * as React from "react";
import { CSSProperties } from "react";

interface OmnibarAddItemProps extends DefaultOmnibarAddItemProps {
  style?: CSSProperties;
  "data-test-id"?: string;
}

function OmnibarAddItem({
  "data-test-id": dataTestId,
  ...props
}: OmnibarAddItemProps) {
  return (
    <PlasmicOmnibarAddItem
      {...props}
      root={{
        props: {
          "data-test-id": dataTestId,
        } as any,
      }}
      img={{
        draggable: false,
      }}
    />
  );
}

export default OmnibarAddItem;
