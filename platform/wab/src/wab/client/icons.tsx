import { Icon, SvgIcon } from "@/wab/client/components/widgets/Icon";
import AreaInputIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__AreaInput";
import ButtonInputIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__ButtonInput";
import CodeIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Code";
import ComponentIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Component";
import DotsVerticalIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__DotsVertical";
import EyeIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Eye";
import EyeClosedIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__EyeClosed";
import FrameIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Frame";
import GridIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Grid";
import HStackBlockIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__HStackBlock";
import HeadingIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Heading";
import ImageBlockIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__ImageBlock";
import LinkIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Link";
import PassInputIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__PassInput";
import SlotIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Slot";
import TextBlockIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__TextBlock";
import TriangleBottomIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__TriangleBottom";
import TriangleRightIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__TriangleRight";
import VStackBlockIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__VStackBlock";
import BlockIcon from "@/wab/client/plasmic/plasmic_kit_design_system/PlasmicIcon__Block";
import CombinationIcon from "@/wab/client/plasmic/plasmic_kit_design_system/PlasmicIcon__Combination";
import GroupIcon from "@/wab/client/plasmic/plasmic_kit_design_system/PlasmicIcon__Group";
import TextInputIcon from "@/wab/client/plasmic/plasmic_kit_design_system/PlasmicIcon__TextInput";
import EyeNoneIcon from "@/wab/client/plasmic/plasmic_kit_design_system/icons/PlasmicIcon__EyeNone";
import PageIcon from "@/wab/client/plasmic/plasmic_kit_design_system/icons/PlasmicIcon__Page";
import BracesIcon from "@/wab/client/plasmic/plasmic_kit_icons/icons/PlasmicIcon__Braces";
import DatabaseSvgIcon from "@/wab/client/plasmic/plasmic_kit_icons/icons/PlasmicIcon__DatabaseSvg";
import DownloadsvgIcon from "@/wab/client/plasmic/plasmic_kit_icons/icons/PlasmicIcon__DownloadSvg";
import FunctionSvgIcon from "@/wab/client/plasmic/plasmic_kit_icons/icons/PlasmicIcon__FunctionSvg";
import InputFieldSvgIcon from "@/wab/client/plasmic/plasmic_kit_icons/icons/PlasmicIcon__InputFieldSvg";
import LinkSvgIcon from "@/wab/client/plasmic/plasmic_kit_icons/icons/PlasmicIcon__LinkSvg";
import SettingsSlidersSvgIcon from "@/wab/client/plasmic/plasmic_kit_icons/icons/PlasmicIcon__SettingsSlidersSvg";
import TableRowsPageSectionIcon from "@/wab/client/plasmic/plasmic_kit_icons/icons/PlasmicIcon__TableRowsPageSection";
import type { TplType } from "@/wab/shared/core/tpls";
import { TplVisibility } from "@/wab/shared/visibility-utils";
import React from "react";
import { MdError } from "react-icons/md";

export const TEXT_ICON = <Icon icon={TextBlockIcon} />;
export const COMPONENT_ICON = <Icon icon={ComponentIcon} />;
export const VERT_STACK_ICON = <Icon icon={VStackBlockIcon} />;
export const HORIZ_STACK_ICON = <Icon icon={HStackBlockIcon} />;
export const FREE_CONTAINER_ICON = <Icon icon={BlockIcon} />;
export const CONTENT_LAYOUT_ICON = <Icon icon={TableRowsPageSectionIcon} />;
export const GRID_CONTAINER_ICON = <Icon icon={GridIcon} />;
export const INPUT_ICON = <Icon icon={TextInputIcon} />;
export const PASSWORD_INPUT_ICON = <Icon icon={PassInputIcon} />;
export const TEXTAREA_ICON = <Icon icon={AreaInputIcon} />;
export const HEADING_ICON = <Icon icon={HeadingIcon} />;
export const SLOT_ICON = <Icon icon={SlotIcon} />;
export const FRAME_ICON = <Icon icon={FrameIcon} />;
export const PAGE_ICON = <Icon icon={PageIcon} />;
export const EXPANDER_EXPANDED_ICON = <Icon icon={TriangleBottomIcon} />;
export const EXPANDER_COLLAPSED_ICON = <Icon icon={TriangleRightIcon} />;
export const GROUP_ICON = <Icon icon={GroupIcon} />;
export const COMBINATION_ICON = <Icon icon={CombinationIcon} />;
export const FUNCTION_ICON = <Icon icon={FunctionSvgIcon} />;

export const VISIBLE_ICON = <Icon icon={EyeIcon} />;
export const HIDDEN_ICON = <Icon icon={EyeClosedIcon} />;
export const NOT_RENDERED_ICON = <Icon icon={EyeNoneIcon} />;
export const CUSTOM_CODE_ICON = <Icon icon={CodeIcon} />;

export const VERT_MENU_ICON = <Icon icon={DotsVerticalIcon} />;

export const ERROR_ICON = <MdError />;

export const DOWNLOAD_ICON = <Icon icon={DownloadsvgIcon} />;

export function iconForTplType(type: TplType): SvgIcon {
  switch (type) {
    case "text":
      return TextBlockIcon;
    case "heading":
      return HeadingIcon;
    case "image":
      return ImageBlockIcon;
    case "link":
      return LinkIcon;
    case "input":
      return TextInputIcon;
    case "passwordInput":
      return PassInputIcon;
    case "button":
      return ButtonInputIcon;
    case "textarea":
      return AreaInputIcon;
    case "slot":
      return SlotIcon;
    case "component":
      return ComponentIcon;
    case "freeContainer":
      return BlockIcon;
    case "vertStack":
      return VStackBlockIcon;
    case "horizStack":
      return HStackBlockIcon;
    case "grid":
      return GridIcon;
    case "contentLayout":
      return TableRowsPageSectionIcon;
  }
}

export function getVisibilityIcon(visibility: TplVisibility) {
  if (visibility === TplVisibility.DisplayNone) {
    return HIDDEN_ICON;
  } else if (visibility === TplVisibility.NotRendered) {
    return NOT_RENDERED_ICON;
  } else if (visibility === TplVisibility.CustomExpr) {
    return CUSTOM_CODE_ICON;
  } else {
    return VISIBLE_ICON;
  }
}

export const DataTokenIcon: SvgIcon = BracesIcon;
export const DataQueryIcon: SvgIcon = DatabaseSvgIcon;
export const StateIcon: SvgIcon = InputFieldSvgIcon;
export const PropIcon: SvgIcon = SettingsSlidersSvgIcon;
export const UrlIcon: SvgIcon = LinkSvgIcon;
