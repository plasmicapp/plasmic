import { Menu } from "antd";
import React from "react";
import { FrameSize, frameSizeGroups } from "../../../shared/responsiveness";
import sty from "./FrameSizeMenu.module.sass";
import { StudioCtx } from "../../studio-ctx/StudioCtx";

export function makeFrameSizeMenu({
  onClick,
  studioCtx,
}: {
  onClick: (size: FrameSize) => void;
  studioCtx: StudioCtx;
}) {
  return (
    <Menu>
      {frameSizeGroups.map((group) => (
        <Menu.SubMenu
          key={group.groupName}
          title={<span>{group.groupName}</span>}
        >
          {group.sizes.map((size) => (
            <Menu.Item
              key={size.name}
              className={sty.screenSizeMenuItem}
              onClick={() => onClick(size)}
            >
              {size.name}{" "}
              <div className={sty.screenSizeDims}>
                {size.width} x {size.height}
              </div>
            </Menu.Item>
          ))}
        </Menu.SubMenu>
      ))}
      <Menu.Divider />
      <Menu.Item
        onClick={() =>
          studioCtx.switchLeftTab("responsiveness", {
            highlight: true,
          })
        }
      >
        Edit breakpoints
      </Menu.Item>
    </Menu>
  );
}
