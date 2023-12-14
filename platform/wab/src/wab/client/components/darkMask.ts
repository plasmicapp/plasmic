import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ensure } from "@/wab/common";
import { standardSides } from "@/wab/geom";
import $ from "jquery";

export function createDarkMask(studioCtx: StudioCtx) {
  // clear so there's only one dark mask
  clearDarkMask();

  const studio = $(".studio");
  const elt = $(".over-dark-mask");
  if (studioCtx.isLiveMode || !elt.get().length) {
    // No alert banner
    studio.append(`<div class="dark-mask" />`);
    $(".dark-mask").css({
      top: 0,
      left: 0,
      height: ensure($(window).height(), () => `window must have height`),
      width: ensure($(window).width(), () => `window must have width`),
    });
    return;
  }

  const topLeftOffset = ensure(elt.offset(), () => `elt must have offset`);
  const height = ensure(elt.outerHeight(), () => `elt must have height`);
  const width = ensure(elt.outerWidth(), () => `elt must have width`);
  const offset = {
    ...topLeftOffset,
    right:
      ensure($(window).width(), () => `window must have width`) -
      topLeftOffset.left -
      width,
    bottom:
      ensure($(window).height(), () => `window must have height`) -
      topLeftOffset.top -
      height,
  };
  // top
  studio.append(`<div class="dark-mask-top" />`);
  $(".dark-mask-top").css({
    top: 0,
    left: 0,
    height: offset.top,
    width: offset.left + offset.right + width,
  });
  // left
  studio.append(`<div class="dark-mask-left" />`);
  $(".dark-mask-left").css({
    top: offset.top,
    left: 0,
    height,
    width: offset.left,
  });
  // bottom
  studio.append(`<div class="dark-mask-bottom" />`);
  $(".dark-mask-bottom").css({
    top: offset.top + height,
    left: 0,
    height: offset.bottom,
    width: offset.left + offset.right + width,
  });
  // right
  studio.append(`<div class="dark-mask-right" />`);
  $(".dark-mask-right").css({
    top: offset.top,
    right: 0,
    height,
    width: offset.right,
  });
}

export function clearDarkMask() {
  [".dark-mask", ...standardSides.map((s) => ".dark-mask-" + s)].forEach(
    (cls) => $(cls).remove()
  );
}
