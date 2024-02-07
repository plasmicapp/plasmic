import {
  DefaultNewComponentItemProps,
  PlasmicNewComponentItem,
  PlasmicNewComponentItem__OverridesType,
} from "@/wab/client/plasmic/plasmic_kit_new_component/PlasmicNewComponentItem";
import { Tooltip } from "antd";
import * as React from "react";

interface NewComponentItemProps
  extends DefaultNewComponentItemProps,
    PlasmicNewComponentItem__OverridesType {
  onClick: () => void;
  imgUrl?: string;
  title: React.ReactNode;
  tooltip?: React.ReactNode;
}

function NewComponentItem(props: NewComponentItemProps) {
  const { onClick, imgUrl, title, tooltip, ...rest } = props;
  return (
    <PlasmicNewComponentItem
      root={{
        props: {
          onClick,
          type: "button",
          style: {
            flexShrink: 0,
          },
        },
        ...(tooltip && {
          wrap: (root) => <Tooltip title={tooltip}>{root}</Tooltip>,
        }),
      }}
      title={title}
      image={
        imgUrl
          ? {
              style: {
                backgroundImage: `url("${imgUrl}")`,
                backgroundSize: "100%",
              },
            }
          : undefined
      }
      {...rest}
    />
  );
}

export default NewComponentItem;
