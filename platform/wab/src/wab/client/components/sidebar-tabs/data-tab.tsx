import { ValueViewer } from "@/wab/client/components/coding/ValueViewer";
import { cx } from "@/wab/shared/common";
import { MaybeWrap } from "@/wab/commons/components/ReactUtil";
import { ExprCtx, asCode, isDynamicExpr } from "@/wab/shared/core/exprs";
import { tryEvalExpr } from "@/wab/shared/eval";
import {
  Expr,
  isKnownRenderExpr,
  isKnownTplNode,
} from "@/wab/shared/model/classes";
import { hashExpr } from "@/wab/shared/site-diffs";
import { summarizeVal } from "@/wab/shared/core/vals";
import { Tooltip } from "antd";
import L from "lodash";
import * as React from "react";
import * as US from "underscore.string";

// function DownRightArrow() {
//   return (
//     <svg
//       xmlns="http://www.w3.org/2000/svg"
//       shapeRendering="geometricPrecision"
//       textRendering="geometricPrecision"
//       imageRendering="optimizeQuality"
//       fillRule="evenodd"
//       clipRule="evenodd"
//       viewBox="0 0 500 511.61"
//     >
//       <path
//         fillRule="nonzero"
//         d="m281.46 249.66-15.5-101.27c-.57-3.8.47-7.81 3.19-10.93 4.92-5.64
//   13.5-6.24 19.14-1.32l207.07 180.38 1.53 1.59c4.77 5.76 3.96 14.32-1.8 19.08L288.02 508.53c-2.99 2.41-6.96 3.59-11.03
//   2.87-7.34-1.32-12.23-8.36-10.91-15.69l15.44-85.83c-17.98-2.09-37.59-6.57-57.77-13.36-52.66-17.69-109.96-51.41-153.32-100.33C26.64
//   246.79-3.02 181.98.25 102.58 1.42 73.66 7 42.84 17.88 10.23 19.22 4.95 23.7.78 29.43.1c7.44-.88 14.19 4.44 15.06 11.87
//   11.93 100.08 50.53 158.11 98.25 191.8 42.65 30.12 93.19 41.35 138.72 45.89z"
//       />
//     </svg>
//   );
// }
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

export function getEvaluatedExpr(
  expr: Expr | undefined,
  exprCtx: ExprCtx,
  env?: Record<string, any>
) {
  const evaluated = React.useMemo(
    () =>
      expr && env && exprCtx && isDynamicExpr(expr)
        ? tryEvalExpr(asCode(expr, exprCtx).code, env)
        : undefined,
    [expr && exprCtx ? hashExpr(expr, exprCtx) : undefined, env]
  );
  return evaluated;
}

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
