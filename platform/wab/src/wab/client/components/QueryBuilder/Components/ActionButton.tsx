import { Icon } from "@/wab/client/components/widgets/Icon";
import PlussvgIcon from "@/wab/client/plasmic/q_4_icons/icons/PlasmicIcon__Plussvg";
import TrashsvgIcon from "@/wab/client/plasmic/q_4_icons/icons/PlasmicIcon__Trashsvg";
import UnorderedListsvgIcon from "@/wab/client/plasmic/q_4_icons/icons/PlasmicIcon__UnorderedListsvg";
import { ButtonProps } from "@react-awesome-query-builder/antd";
import Button, { ButtonType } from "antd/lib/button";
import React from "react";

export function ActionButton(props: React.Attributes & ButtonProps) {
  const { type, onClick, label, readonly } = props;

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

  const btnLabel = type === "addRuleGroup" ? "" : label;
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
