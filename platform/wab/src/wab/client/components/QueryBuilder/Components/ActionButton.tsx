import { Icon } from "@/wab/client/components/widgets/Icon";
import PlussvgIcon from "@/wab/client/plasmic/plasmic_kit_icons/icons/PlasmicIcon__PlusSvg";
import TrashsvgIcon from "@/wab/client/plasmic/plasmic_kit_icons/icons/PlasmicIcon__TrashSvg";
import UnorderedListsvgIcon from "@/wab/client/plasmic/plasmic_kit_icons/icons/PlasmicIcon__UnorderedListSvg";
import { ButtonProps } from "@react-awesome-query-builder/antd";
import Button, { ButtonType } from "antd/lib/button";
import React from "react";

// This component is used as a custom action button in our RAQB implementation
// The primary purpose for using a custom action button is design system consistency - we want use icon sets that are consistent with the Studio
// This code mirrors (and modifies) the RAQB default action button code https://github.com/ukrbublik/react-awesome-query-builder/blob/aea340c077060ef82926469009a66d4082277e7b/packages/antd/modules/widgets/core/Button.jsx
export function ActionButton(props: React.Attributes & ButtonProps) {
  const { type, onClick, label, readonly } = props;

  const hideLabelsFor = {
    addSubRuleSimple: true,
    delGroup: true,
    delRuleGroup: true,
    delRule: true,
  };

  const typeToIcon = {
    addRule: <Icon icon={PlussvgIcon} />,
    addGroup: <Icon icon={UnorderedListsvgIcon} />,
    delRule: <Icon icon={TrashsvgIcon} />, //?
    delGroup: <Icon icon={TrashsvgIcon} />,
    delRuleGroup: <Icon icon={TrashsvgIcon} />,
    addRuleGroup: <Icon icon={PlussvgIcon} />,
  };

  const typeToClass = {
    addRule: "action action--ADD-RULE",
    addGroup: "action action--ADD-GROUP",
    delRule: "action action--DELETE", //?
    delGroup: "action action--DELETE",
    delRuleGroup: "action action--DELETE",
  };

  const typeToType = {
    // delRule: "danger",
    // delGroup: "danger",
    // delRuleGroup: "danger",
  };

  const btnLabel = hideLabelsFor[type] ? "" : label;
  const buttonType = typeToType[type as keyof typeof typeToType] as ButtonType;

  return (
    <Button
      key={type}
      type={buttonType || "default"}
      icon={typeToIcon[type]}
      className={`qb-button ${typeToClass[type as keyof typeof typeToClass]}`}
      onClick={onClick}
      size="small"
      disabled={readonly}
    >
      {btnLabel}
    </Button>
  );
}
