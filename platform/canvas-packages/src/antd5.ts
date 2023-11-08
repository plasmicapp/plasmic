// Really need to find a better way to do this!
// This is all needed to ensure that antd5 is actually shared by the other packages like plasmic-rich-components,
// since canvas-packages bundles each of these packages into separate IIFEs, so by default
// plasmic-rich-components would have its own copy of antd5 (even though we share the same node_modules dir).

import { registerAll } from "@plasmicpkgs/antd5";

import * as _antd_ from "antd";
import _antd_es_anchor_style_ from "antd/es/anchor/style";
import _antd_es_avatar_style_ from "antd/es/avatar/style";
import _antd_es_badge_style_ from "antd/es/badge/style";
import _antd_es_breadcrumb_style_ from "antd/es/breadcrumb/style";
import _antd_es_button_ from "antd/es/button";
import _antd_es_card_style_ from "antd/es/card/style";
import _antd_es_cascader_style_ from "antd/es/cascader/style";
import _antd_es_checkbox_style_ from "antd/es/checkbox/style";
import _antd_es_date_picker_style_ from "antd/es/date-picker/style";
import _antd_es_descriptions_style_ from "antd/es/descriptions/style";
import _antd_es_divider_style_ from "antd/es/divider/style";
import _antd_es_drawer_style_ from "antd/es/drawer/style";
import _antd_es_dropdown_ from "antd/es/dropdown";
import _antd_es_dropdown_style_ from "antd/es/dropdown/style";
import * as _antd_es_form_context_ from "antd/es/form/context";
import _antd_es_form_ErrorList_ from "antd/es/form/ErrorList";
import _antd_es_form_Form_ from "antd/es/form/Form";
import _antd_es_form_hooks_useFormInstance_ from "antd/es/form/hooks/useFormInstance";
import _antd_es_form_style_ from "antd/es/form/style";
import _antd_es_image_style_ from "antd/es/image/style";
import _antd_es_input_number_style_ from "antd/es/input-number/style";
import _antd_es_input_style_ from "antd/es/input/style";
import _antd_es_layout_style_ from "antd/es/layout/style";
import _antd_es_list_style_ from "antd/es/list/style";
import _antd_es_locale_zh_CN_ from "antd/es/locale/zh_CN";
import _antd_es_menu_style_ from "antd/es/menu/style";
import _antd_es_message_style_ from "antd/es/message/style";
import _antd_es_modal_style_ from "antd/es/modal/style";
import _antd_es_popover_style_ from "antd/es/popover/style";
import _antd_es_progress_style_ from "antd/es/progress/style";
import _antd_es_radio_ from "antd/es/radio";
import _antd_es_radio_style_ from "antd/es/radio/style";
import _antd_es_rate_style_ from "antd/es/rate/style";
import _antd_es_row_style_ from "antd/es/row/style";
import _antd_es_segmented_style_ from "antd/es/segmented/style";
import _antd_es_select_ from "antd/es/select";
import _antd_es_select_style_ from "antd/es/select/style";
import _antd_es_skeleton_style_ from "antd/es/skeleton/style";
import _antd_es_slider_style_ from "antd/es/slider/style";
import _antd_es_space_style_ from "antd/es/space/style";
import _antd_es_spin_style_ from "antd/es/spin/style";
import _antd_es_statistic_style_ from "antd/es/statistic/style";
import _antd_es_steps_style_ from "antd/es/steps/style";
import _antd_es_switch_style_ from "antd/es/switch/style";
import _antd_es_table_hooks_useLazyKVMap_ from "antd/es/table/hooks/useLazyKVMap";
import _antd_es_table_hooks_usePagination_ from "antd/es/table/hooks/usePagination";
import _antd_es_table_hooks_useSelection_ from "antd/es/table/hooks/useSelection";
import _antd_es_table_style_ from "antd/es/table/style";
import _antd_es_tabs_style_ from "antd/es/tabs/style";
import * as _antd_es_theme_interface_ from "antd/es/theme/interface";
import * as _antd_es_theme_internal_ from "antd/es/theme/internal";
import _antd_es_theme_themes_default_ from "antd/es/theme/themes/default";
import _antd_es_tooltip_style_ from "antd/es/tooltip/style";
import _antd_es_tree_select_style_ from "antd/es/tree-select/style";
import _antd_es_typography_style_ from "antd/es/typography/style";
import _antd_es_upload_style_ from "antd/es/upload/style";

export function register() {
  registerAll();

  Object.assign((globalThis as any).__Sub, {
    _antd_,
    _antd_es_anchor_style_,
    _antd_es_avatar_style_,
    _antd_es_badge_style_,
    _antd_es_breadcrumb_style_,
    _antd_es_button_,
    _antd_es_card_style_,
    _antd_es_cascader_style_,
    _antd_es_checkbox_style_,
    _antd_es_date_picker_style_,
    _antd_es_descriptions_style_,
    _antd_es_divider_style_,
    _antd_es_drawer_style_,
    _antd_es_dropdown_,
    _antd_es_dropdown_style_,
    _antd_es_form_ErrorList_,
    _antd_es_form_Form_,
    _antd_es_form_context_,
    _antd_es_form_hooks_useFormInstance_,
    _antd_es_form_style_,
    _antd_es_image_style_,
    _antd_es_input_number_style_,
    _antd_es_input_style_,
    _antd_es_layout_style_,
    _antd_es_list_style_,
    _antd_es_locale_zh_CN_,
    _antd_es_menu_style_,
    _antd_es_message_style_,
    _antd_es_modal_style_,
    _antd_es_popover_style_,
    _antd_es_progress_style_,
    _antd_es_radio_,
    _antd_es_radio_style_,
    _antd_es_rate_style_,
    _antd_es_row_style_,
    _antd_es_segmented_style_,
    _antd_es_select_,
    _antd_es_select_style_,
    _antd_es_skeleton_style_,
    _antd_es_slider_style_,
    _antd_es_space_style_,
    _antd_es_spin_style_,
    _antd_es_statistic_style_,
    _antd_es_steps_style_,
    _antd_es_switch_style_,
    _antd_es_table_hooks_useLazyKVMap_,
    _antd_es_table_hooks_usePagination_,
    _antd_es_table_hooks_useSelection_,
    _antd_es_table_style_,
    _antd_es_tabs_style_,
    _antd_es_theme_interface_,
    _antd_es_theme_internal_,
    _antd_es_theme_themes_default_,
    _antd_es_tooltip_style_,
    _antd_es_tree_select_style_,
    _antd_es_typography_style_,
    _antd_es_upload_style_,
  });
}

register();
