import {
  DeleteOutlined,
  PlusOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";
import { ButtonProps } from "@react-awesome-query-builder/antd";
import Button, { ButtonType } from "antd/lib/button";
import React from "react";

export function ActionButton(props: React.Attributes & ButtonProps) {
  const { type, onClick, label, readonly } = props;

  const typeToIcon = {
    addRule: <PlusOutlined />,
    addGroup: <UnorderedListOutlined />,
    delRule: <DeleteOutlined />, //?
    delGroup: <DeleteOutlined />,
    delRuleGroup: <DeleteOutlined />,
    addRuleGroup: <PlusOutlined />,
  };

  const typeToClass = {
    addRule: "action action--ADD-RULE",
    addGroup: "action action--ADD-GROUP",
    delRule: "action action--DELETE", //?
    delGroup: "action action--DELETE",
    delRuleGroup: "action action--DELETE",
    // addRuleGroup: <PlusOutlined />,
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
