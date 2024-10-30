import { Icon } from "@/wab/client/components/widgets/Icon";
import AreaInputIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__AreaInput";
import ArrowBottomIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__ArrowBottom";
import ArrowLeftIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__ArrowLeft";
import ArrowRightIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__ArrowRight";
import ArrowTopIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__ArrowTop";
import ButtonInputIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__ButtonInput";
import CodeIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Code";
import ComponentIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Component";
import CopyIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Copy";
import CreateIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Create";
import DotsVerticalIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__DotsVertical";
import EyeIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Eye";
import EyeClosedIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__EyeClosed";
import FetchIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Fetch";
import FrameIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Frame";
import GridIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Grid";
import HeadingIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Heading";
import HStackBlockIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__HStackBlock";
import ImageBlockIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__ImageBlock";
import LinkIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Link";
import PassInputIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__PassInput";
import SearchIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Search";
import SlotIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Slot";
import TextBlockIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__TextBlock";
import TokenIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Token";
import TriangleBottomIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__TriangleBottom";
import TriangleRightIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__TriangleRight";
import VStackBlockIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__VStackBlock";
import EyeNoneIcon from "@/wab/client/plasmic/plasmic_kit_design_system/icons/PlasmicIcon__EyeNone";
import PageIcon from "@/wab/client/plasmic/plasmic_kit_design_system/icons/PlasmicIcon__Page";
import BlockIcon from "@/wab/client/plasmic/plasmic_kit_design_system/PlasmicIcon__Block";
import CombinationIcon from "@/wab/client/plasmic/plasmic_kit_design_system/PlasmicIcon__Combination";
import GroupIcon from "@/wab/client/plasmic/plasmic_kit_design_system/PlasmicIcon__Group";
import TextInputIcon from "@/wab/client/plasmic/plasmic_kit_design_system/PlasmicIcon__TextInput";
import ChevronDownsvgIcon from "@/wab/client/plasmic/plasmic_kit_icons/icons/PlasmicIcon__ChevronDownSvg";
import ChevronLeftsvgIcon from "@/wab/client/plasmic/plasmic_kit_icons/icons/PlasmicIcon__ChevronLeftSvg";
import ChevronRightsvgIcon from "@/wab/client/plasmic/plasmic_kit_icons/icons/PlasmicIcon__ChevronRightSvg";
import ChevronUpsvgIcon from "@/wab/client/plasmic/plasmic_kit_icons/icons/PlasmicIcon__ChevronUpSvg";
import TableRowsPageSectionIcon from "@/wab/client/plasmic/plasmic_kit_icons/icons/PlasmicIcon__TableRowsPageSection";
import { TplVisibility } from "@/wab/shared/visibility-utils";
import React from "react";
import { MdError } from "react-icons/md";

export const TEXT_ICON = <Icon icon={TextBlockIcon} />;
export const COMPONENT_ICON = <Icon icon={ComponentIcon} />;
export const VERT_STACK_ICON = <Icon icon={VStackBlockIcon} />;
export const HORIZ_STACK_ICON = <Icon icon={HStackBlockIcon} />;
export const FREE_CONTAINER_ICON = <Icon icon={BlockIcon} />;
export const CONTENT_LAYOUT_ICON = <Icon icon={TableRowsPageSectionIcon} />;
export const IMAGE_ICON = <Icon icon={ImageBlockIcon} />;
export const GRID_CONTAINER_ICON = <Icon icon={GridIcon} />;
export const LINK_ICON = <Icon icon={LinkIcon} />;
export const BUTTON_ICON = <Icon icon={ButtonInputIcon} />;
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
export const TOKEN_ICON = <Icon icon={TokenIcon} />;

export const VISIBLE_ICON = <Icon icon={EyeIcon} />;
export const HIDDEN_ICON = <Icon icon={EyeClosedIcon} />;
export const NOT_RENDERED_ICON = <Icon icon={EyeNoneIcon} />;
export const CUSTOM_CODE_ICON = <Icon icon={CodeIcon} />;

export const VERT_MENU_ICON = <Icon icon={DotsVerticalIcon} />;
export const SEARCH_ICON = <Icon icon={SearchIcon} />;

export const ERROR_ICON = <MdError />;

export const ARROW_TOP_ICON = <Icon icon={ArrowTopIcon} />;
export const ARROW_LEFT_ICON = <Icon icon={ArrowLeftIcon} />;
export const ARROW_RIGHT_ICON = <Icon icon={ArrowRightIcon} />;
export const ARROW_BOTTOM_ICON = <Icon icon={ArrowBottomIcon} />;
export const CHEVRON_TOP_ICON = <Icon icon={ChevronUpsvgIcon} />;
export const CHEVRON_LEFT_ICON = <Icon icon={ChevronLeftsvgIcon} />;
export const CHEVRON_RIGHT_ICON = <Icon icon={ChevronRightsvgIcon} />;
export const CHEVRON_BOTTOM_ICON = <Icon icon={ChevronDownsvgIcon} />;
export const COPY_ICON = <Icon icon={CopyIcon} />;
export const CREATE_ICON = <Icon icon={CreateIcon} />;
export const FETCH_ICON = <Icon icon={FetchIcon} />;
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
