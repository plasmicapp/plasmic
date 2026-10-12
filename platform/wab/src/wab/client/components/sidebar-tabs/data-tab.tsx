import { MaybeWrap } from "@/wab/commons/components/ReactUtil";
import { cx } from "@/wab/shared/common";
import { summarizeVal } from "@/wab/shared/core/vals";
import { Tooltip } from "antd";
import * as React from "react";

type ValuePreviewProps = {
  appearsEditable?: boolean;
  onClick?: () => void;
  val?: any;
  err?: Error;
  isLoading?: boolean;
};

export function ValuePreview(props: ValuePreviewProps) {
  const isLoading = props.isLoading && !props.val && !props.err;
  const Tag = props.onClick ? "a" : "div";
  return (
    <Tag
      onClick={(e) => {
        if (props.onClick) {
          e.preventDefault();
          e.stopPropagation();
          props.onClick();
        }
      }}
      className={cx({
        "value-preview": true,
        "value-preview--error": !props.val && props.err,
        "value-preview--loading": isLoading,
        "value-preview--clickable": !!props.onClick,
        "value-preview--editable": props.appearsEditable,
      })}
    >
      {isLoading ? (
        "Loading..."
      ) : props.err ? (
        <Tooltip title={props.err.message ?? `${props.err}`}>
          <span>Error: {props.err.message ?? `${props.err}`}</span>
        </Tooltip>
      ) : (
        <MaybeWrap
          cond={!!props.onClick}
          wrapper={(x) => <Tooltip title="Inspect data">{x}</Tooltip>}
        >
          {summarizeVal(props.val ?? props.err)}
        </MaybeWrap>
      )}
    </Tag>
  );
}
