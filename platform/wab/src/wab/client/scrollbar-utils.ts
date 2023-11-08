import { ensure, parsePx } from "../common";
import { JQ } from "../deps";
import { ClientRect } from "../geom";

export class ScrollbarMetadata {
  parentSize: number;
  minSize: number;
  constructor(readonly $dom: JQ, readonly isHorizontal: boolean) {
    this.parentSize = isHorizontal
      ? ensure($dom.parent().width(), () => "Couldn't compute width")
      : ensure($dom.parent().height(), () => "Couldn't compute height");
    this.minSize = isHorizontal
      ? parsePx($dom.css("min-width"))
      : parsePx($dom.css("min-height"));
  }
}

export const doFixManualScrollbar = (
  scrollbar: ScrollbarMetadata,
  containerLocStart: number,
  containerLocEnd: number,
  contentLocStart: number,
  contentLocEnd: number
) => {
  const lenBefore = Math.max(containerLocStart - contentLocStart, 0);
  const lenAfter = Math.max(contentLocEnd - containerLocEnd, 0);
  if (lenBefore === 0 && lenAfter === 0) {
    // hide the scrollbar
    scrollbar.$dom.removeClass("manual__scrollbar-visible");
    return false;
  }
  const [trackSize, minScrollbarSize] = [
    scrollbar.parentSize,
    scrollbar.minSize,
  ];
  const containerSize = containerLocEnd - containerLocStart;
  const totalLength = lenBefore + lenAfter + containerSize;
  const start = (lenBefore * 100) / totalLength;
  const size = (containerSize * 100) / totalLength;
  const maxScrollable = ((trackSize - minScrollbarSize) / trackSize) * 100;
  const startProp = scrollbar.isHorizontal ? "left" : "top";
  const sizeProp = scrollbar.isHorizontal ? "width" : "height";
  if (start > maxScrollable) {
    scrollbar.$dom.css({
      [startProp]: `${maxScrollable}%`,
      [sizeProp]: `${100 - maxScrollable}%`,
    });
  } else {
    scrollbar.$dom.css({ [startProp]: `${start}%`, [sizeProp]: `${size}%` });
  }
  scrollbar.$dom.addClass("manual__scrollbar-visible");
  return true;
};

export const scrollAreaSize = (
  containerBB: ClientRect,
  contentBB: ClientRect | undefined
) => {
  if (contentBB === undefined) {
    return {
      width: containerBB.width,
      height: containerBB.height,
    };
  }
  const width =
    Math.max(containerBB.right, contentBB.right) -
    Math.min(containerBB.left, contentBB.left);
  const height =
    Math.max(containerBB.bottom, contentBB.bottom) -
    Math.min(containerBB.top, contentBB.top);
  return {
    width,
    height,
  };
};
