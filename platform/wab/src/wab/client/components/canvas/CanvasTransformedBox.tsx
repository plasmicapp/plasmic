import $ from "jquery";
import { omit } from "lodash";
import { observer } from "mobx-react-lite";
import * as React from "react";
import { ReactNode } from "react";
import { unexpected } from "../../../common";
import { frameToScalerRect } from "../../coords";
import { hasLayoutBox } from "../../dom";
import { cssPropsForInvertTransform } from "../../studio-ctx/StudioCtx";
import { ViewCtx } from "../../studio-ctx/view-ctx";
import { recomputeBounds } from "./HoverBox";

export const CanvasTransformedBox = observer(function CanvasTransformedBox({
  relativeTo,
  $elt,
  viewCtx,
  className,
  style,
  children,
  keepDims,
}: {
  relativeTo: "arena" | "frame";
  $elt: JQuery<HTMLElement>;
  viewCtx: ViewCtx;
  className?: string;
  style?: React.CSSProperties;
  children?: ReactNode;
  keepDims?: boolean;
}) {
  const elt = $elt.get().filter(hasLayoutBox);
  if (elt.length === 0 || !elt[0].isConnected) {
    return null;
  }
  const eltRect = recomputeBounds($(elt)).rect();
  const scalerRect =
    relativeTo === "arena"
      ? frameToScalerRect(eltRect, viewCtx)
      : relativeTo === "frame"
      ? eltRect
      : unexpected();
  const cssProps = cssPropsForInvertTransform(
    viewCtx.studioCtx.zoom,
    scalerRect
  );
  const cssPropsForJqElt = {
    ...(scalerRect ? scalerRect : {}),
    ...cssProps,
  };

  return (
    <div
      className={"CanvasTransformedBox " + className}
      data-original-width={scalerRect ? scalerRect.width : undefined}
      data-original-height={scalerRect ? scalerRect.height : undefined}
      style={omit(
        {
          ...cssPropsForJqElt,
          ...style,
        },
        keepDims ? ["width", "height", "transform"] : []
      )}
    >
      {children}
    </div>
  );
});
