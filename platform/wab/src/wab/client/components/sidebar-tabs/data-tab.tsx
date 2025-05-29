import { ValueViewer } from "@/wab/client/components/coding/ValueViewer";
import { MaybeWrap } from "@/wab/commons/components/ReactUtil";
import { cx } from "@/wab/shared/common";
import { summarizeVal } from "@/wab/shared/core/vals";
import { isKnownRenderExpr, isKnownTplNode } from "@/wab/shared/model/classes";
import { Tooltip } from "antd";
import L from "lodash";
import * as React from "react";
import * as US from "underscore.string";

export const richSummarizeVal = function (val) {
  if (val == null) {
    return "(nothing)";
  } else if (L.isString(val)) {
    return US.quote(val);
  } else if (L.isNumber(val) || L.isDate(val) || L.isBoolean(val)) {
    return `${val}`;
  } else if (
    isKnownRenderExpr(val) ||
    isKnownTplNode(val) ||
    (Array.isArray(val) && val.length > 0 && isKnownTplNode(val[0]))
  ) {
    return "(renderable)";
  } else if (Array.isArray(val)) {
    if (val.length === 0) {
      return "(empty collection)";
    } else {
      return <ValueViewer value={val} />;
    }
  } else if (val instanceof Error) {
    return `ERROR: ${val}`;
  } else if (L.isObject(val)) {
    return <ValueViewer value={val} />;
  } else {
    throw new Error(`unknown value of type ${val.constructor.name}`);
  }
};

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
