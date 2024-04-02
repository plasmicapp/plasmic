import { MenuItemContent } from "@/wab/client/components/menu-builder";
import {
  ClickStopper,
  IFrameAwareDropdownMenu,
} from "@/wab/client/components/widgets";
import PlasmicZoomButton from "@/wab/client/plasmic/plasmic_kit_top_bar/PlasmicZoomButton";
import { getComboForAction } from "@/wab/client/shortcuts/studio/studio-shortcuts";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { mkUuid } from "@/wab/common";
import { InputNumber, Menu } from "antd";
import { observer } from "mobx-react";
import * as React from "react";

const ZoomSpinner = observer(ZoomSpinner_);
function ZoomSpinner_() {
  const studioCtx = useStudioCtx();
  return (
    <ClickStopper>
      <InputNumber
        value={+(studioCtx.zoom * 100).toFixed(0)}
        className="form-control textboxlike"
        formatter={(v) => `${v}%`}
        parser={(v) => +`${v}`.replace("%", "")}
        // Specifying a random key here forces autoFocus every time
        // the menu is opened
        key={mkUuid()}
        autoFocus
        precision={0}
        onChange={(pct) =>
          studioCtx.tryZoomWithScale(+`${pct}`.replace("%", "") / 100)
        }
        style={{ border: "none", boxShadow: "none" }}
      />
    </ClickStopper>
  );
}

export const ZoomButton = observer(function ZoomButton() {
  const studioCtx = useStudioCtx();
  const menu = () => (
    <Menu>
      <Menu.Item className="ant-dropdown-menu-item--not-selectable">
        <ZoomSpinner />
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item onClick={() => studioCtx.tryZoomWithDirection(1)}>
        <MenuItemContent shortcut={getComboForAction("ZOOM_IN")}>
          Zoom in
        </MenuItemContent>
      </Menu.Item>
      <Menu.Item onClick={() => studioCtx.tryZoomWithDirection(-1)}>
        <MenuItemContent shortcut={getComboForAction("ZOOM_OUT")}>
          Zoom out
        </MenuItemContent>
      </Menu.Item>
      <Menu.Item onClick={() => studioCtx.tryZoomToFitArena()}>
        <MenuItemContent shortcut={getComboForAction("ZOOM_TO_FIT")}>
          Zoom to fit all
        </MenuItemContent>
      </Menu.Item>
      <Menu.Item onClick={() => studioCtx.tryZoomToFitSelection()}>
        <MenuItemContent shortcut={getComboForAction("ZOOM_TO_SELECTION")}>
          Zoom to fit selection
        </MenuItemContent>
      </Menu.Item>
      <Menu.Item onClick={() => studioCtx.tryZoomWithScale(1)}>
        <MenuItemContent shortcut={getComboForAction("ZOOM_RESET")}>
          Zoom to 100%
        </MenuItemContent>
      </Menu.Item>
    </Menu>
  );

  return (
    <IFrameAwareDropdownMenu menu={menu}>
      <PlasmicZoomButton
        children={`${Math.round(studioCtx.zoom * 100)}%`}
        disabled={studioCtx.currentArenaEmpty}
      />
    </IFrameAwareDropdownMenu>
  );
});

export default ZoomButton;
