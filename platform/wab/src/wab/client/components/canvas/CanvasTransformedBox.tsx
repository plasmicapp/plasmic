import { frameToScalerRect } from "@/wab/client/coords";
import { hasLayoutBox } from "@/wab/client/dom";
import { cssPropsForInvertTransform } from "@/wab/client/studio-ctx/StudioCtx";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { unexpected } from "@/wab/common";
import $ from "jquery";
import { omit } from "lodash";
import { observer } from "mobx-react";
import * as React from "react";
import { ReactNode } from "react";
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
