/**
 * Responsive `<img/>` replacement, based on `next/image`
 */

import classNames from "classnames";
import React, { CSSProperties } from "react";
import { pick } from "../../common";
import { mergeRefs } from "../../react-utils";

export interface ImageLoader {
  supportsUrl: (url: string) => boolean;
  transformUrl: (opts: {
    src: string;
    width?: number;
    quality?: number;
    format?: PlasmicImgFormat;
  }) => string;
}

type ImgTagProps = Omit<
  React.ComponentProps<"img">,
  "src" | "srcSet" | "ref" | "style"
>;

const IMG_OPTIMIZER_HOST = "https://img.plasmic.app";

// Default image sizes to snap to
// TODO: make this configurable?
const IMG_SIZES = [16, 32, 48, 64, 96, 128, 256, 384];
const DEVICE_SIZES = [640, 750, 828, 1080, 1200, 1920, 2048, 3840];
const ALL_SIZES = [...IMG_SIZES, ...DEVICE_SIZES];

export type PlasmicImgFormat = "avif" | "jpeg" | "png" | "webp";

export interface PlasmicImgProps extends ImgTagProps {
  /**
   * Either an object with the src string, and its full width and height,
   * or just a src string with unknown intrinsic dimensions.
   */
  src?:
    | string
    | {
        src:
          | string
          | {
              src: string;
              height: number;
              width: number;
              blurDataURL?: string;
            };
        fullHeight: number;
        fullWidth: number;
        // We might also get a more precise aspectRatio for SVGs
        // instead of relyiing on fullWidth / fullHeight, because
        // those values might be rounded and not so accurate.
        aspectRatio?: number;
      };

  /**
   * className applied to the wrapper element if one is used.
   */
  className?: string;

  /**
   * css width
   */
  displayWidth?: number | string;

  /**
   * css height
   */
  displayHeight?: number | string;

  /**
   * css min-width
   */
  displayMinWidth?: number | string;

  /**
   * css min-height
   */
  displayMinHeight?: number | string;

  /**
   * css max-width
   */
  displayMaxWidth?: number | string;

  /**
   * css max-height
   */
  displayMaxHeight?: number | string;

  /**
   * For variable quality formats like jpg, the quality from 0 to 100
   */
  quality?: number;

  /**
   * Choose the output image format.
   */
  format?: PlasmicImgFormat;

  /**
   * ImageLoader to use for loading different dimensions of the image.
   * "plasmic" uses Plasmic's image optimizer, and a URL string uses the image
   * optimizer hosted at that base URL.
   * If none specified, will not attempt to load different dimensions.
   */
  loader?: "plasmic" | string | ImageLoader;

  /**
   * Style applied to the wrapper element. objectFit and objectPosition
   * rules are applied to the img element.
   */
  style?: React.CSSProperties;

  /**
   * Ref for the img element.  The normal <PlasmicImg ref={...} />
   * prop gives the root element instead, which may be the img element
   * or a wrapper element
   */
  imgRef?: React.Ref<HTMLImageElement>;
}

export const PlasmicImg = React.forwardRef(function PlasmicImg(
  props: PlasmicImgProps,
  outerRef: React.Ref<HTMLElement>,
) {
  const {
    src,
    className,
    displayWidth: requestedWidth,
    displayHeight,
    displayMinWidth,
    displayMinHeight,
    displayMaxWidth,
    displayMaxHeight,
    quality,
    format,
    loader,
    imgRef,
    style,
    loading,
    ...rest
  } = props;

  const imgProps = Object.assign({}, rest, {
    // Default loading to "lazy" if not specified (which is different from the
    // html img, which defaults to eager!)
    loading: loading ?? "lazy",
  });

  const { fullWidth, fullHeight, aspectRatio } = !src
    ? { fullWidth: undefined, fullHeight: undefined, aspectRatio: undefined }
    : typeof src === "string"
      ? getImageSizeData(
          getPixelLength(props.width),
          getPixelLength(props.height),
        )
      : src;
  const srcStr = src
    ? typeof src === "string"
      ? src
      : typeof src.src === "string"
        ? src.src
        : src.src.src
    : "";

  // Assume external image if either dimension is null and use usual <img>
  if (fullHeight == null || fullWidth == null) {
    return (
      <img
        src={srcStr}
        className={className}
        style={style}
        {...imgProps}
        loading={loading}
        ref={mergeRefs(imgRef, outerRef) as any}
      />
    );
  }

  const displayWidth =
    isSvg(srcStr) &&
    (displayHeight == null || displayHeight === "auto") &&
    (requestedWidth == null || requestedWidth === "auto")
      ? "100%"
      : requestedWidth;

  let computedDisplayWidth = displayWidth;
  if (
    fullWidth &&
    fullHeight &&
    (!displayWidth || displayWidth === "auto") &&
    !!getPixelLength(displayHeight)
  ) {
    // If there's a pixel length specified for displayHeight but not displayWidth,
    // then we can derive the pixel length for displayWidth.  Having an explicit
    // displayWidth makes this a fixed-size image, which makes it possible for us to
    // generate better markup!
    if (!isSvg(srcStr)) {
      // We shouldn't do it for SVGs though, because `fullWidth` and
      // `fullHeight` might have rounded values so the final
      // `displayWidth` could differ by 1px or so.
      computedDisplayWidth =
        (getPixelLength(displayHeight)! * fullWidth) / fullHeight;
    }
  }

  let spacerWidth = fullWidth;
  let spacerHeight = fullHeight;
  if (aspectRatio && Number.isFinite(aspectRatio) && isSvg(srcStr)) {
    // For SVGs, fullWidth and fullHeight can be rounded values, which would
    // cause some discrepancy between the actual aspect ratio and the aspect
    // ratio from those values. So, for those cases, we size the spacer from
    // the aspect ratio instead. The height isn't rounded, because even at this
    // width rounding it changes the rendered height by a fraction of a pixel.
    spacerWidth = DEFAULT_SVG_WIDTH;
    spacerHeight = spacerWidth / aspectRatio;
  }

  const { sizes, widthDescs } = getWidths(computedDisplayWidth, fullWidth, {
    minWidth: displayMinWidth,
  });
  const transformUrl = getImageTransform(loader, srcStr);
  const spacerSvg = `<svg width="${spacerWidth}" height="${spacerHeight}" xmlns="http://www.w3.org/2000/svg" version="1.1"/>`;
  const spacerSvgBase64 =
    // if btoa exists, use btoa, as it works in browser and in
    // cloudflare edge workers.  For node, use Buffer.from().
    typeof globalThis.btoa === "function"
      ? globalThis.btoa(spacerSvg)
      : Buffer.from(spacerSvg).toString("base64");

  const wrapperStyle: CSSProperties = { ...(style || {}) };
  const spacerStyle: CSSProperties = {
    ...pick(style || {}, "objectFit", "objectPosition"),
  };

  if (displayWidth != null && displayWidth !== "auto") {
    // If width is set, set it on the wrapper along with min/max width
    // and just use `width: 100%` on the spacer
    spacerStyle.width = "100%";
    // Rely on the styles set by `classname` on the wrapper:
    // wrapperStyle.width = displayWidth;
    // wrapperStyle.minWidth = displayMinWidth;
    // wrapperStyle.maxWidth = displayMaxWidth;
  } else {
    // Otherwise, we want auto sizing from the spacer, so set width there.
    //
    // But if we have min/max width, it should be set in the wrapper and it
    // can be percentage values (and we add corresponding min/max width to
    // 100% in the spacer). In general it ends up with the correct effect,
    // but some edge cases might make `min-width: 100%` shrink the image more
    // than it should.
    spacerStyle.width = displayWidth;
    wrapperStyle.width = "auto";
    if (displayMinWidth) {
      spacerStyle.minWidth = "100%";
      // Rely on min-width set by `classname` on the wrapper:
      // wrapperStyle.minWidth = displayMinWidth;
    }
    if (displayMaxWidth != null && displayMaxWidth !== "none") {
      spacerStyle.maxWidth = "100%";
      // Rely on max-width set by `classname` on the wrapper:
      // wrapperStyle.maxWidth = displayMaxWidth;
    }
  }

  if (displayHeight != null && displayHeight !== "auto") {
    spacerStyle.height = "100%";
    // wrapperStyle.height = displayHeight;
    // wrapperStyle.minHeight = displayMinHeight;
    // wrapperStyle.maxHeight = displayMaxHeight;
  } else {
    spacerStyle.height = displayHeight;
    wrapperStyle.height = "auto";
    if (displayMinHeight) {
      spacerStyle.minHeight = "100%";
      // wrapperStyle.minHeight = displayMinHeight;
    }
    if (displayMaxHeight != null && displayMaxHeight !== "none") {
      spacerStyle.maxHeight = "100%";
      // wrapperStyle.maxHeight = displayMaxHeight;
    }
  }

  return (
    <div
      className={classNames(className, "__wab_img-wrapper")}
      ref={outerRef as any}
      style={wrapperStyle}
    >
      <img
        alt=""
        aria-hidden
        className="__wab_img-spacer-svg"
        src={`data:image/svg+xml;base64,${spacerSvgBase64}`}
        style={spacerStyle}
      />
      {makePicture({
        transformUrl,
        widthDescs,
        sizes,
        src: srcStr,
        quality,
        format,
        ref: imgRef,
        style: style ? pick(style, "objectFit", "objectPosition") : undefined,
        imgProps,
        className: "__wab_img",
      })}
    </div>
  );
});

function makePicture(opts: {
  transformUrl?: ImageLoader["transformUrl"];
  widthDescs: WidthDesc[];
  sizes?: string;
  src: string;
  quality?: number;
  format?: PlasmicImgFormat;
  style?: React.CSSProperties;
  className?: string;
  imgProps: ImgTagProps;
  ref?: React.Ref<HTMLImageElement>;
}) {
  const {
    transformUrl,
    widthDescs,
    src,
    quality,
    format,
    style,
    className,
    sizes,
    imgProps,
    ref,
  } = opts;
  return (
    <picture className="__wab_picture">
      {transformUrl && !format && (
        <source
          type="image/webp"
          srcSet={widthDescs
            .map(
              (wd) =>
                `${transformUrl({
                  src,
                  quality,
                  width: wd.width,
                  format: "webp",
                })} ${wd.desc}`,
            )
            .join(", ")}
        />
      )}
      <img
        {...imgProps}
        ref={ref}
        className={className}
        decoding="async"
        src={
          transformUrl
            ? transformUrl({
                src,
                quality,
                format,
                width: widthDescs[widthDescs.length - 1].width,
              })
            : src
        }
        srcSet={
          transformUrl
            ? widthDescs
                .map(
                  (wd) =>
                    `${transformUrl({
                      src,
                      quality,
                      format,
                      width: wd.width,
                    })} ${wd.desc}`,
                )
                .join(", ")
            : undefined
        }
        sizes={transformUrl ? sizes : undefined}
        style={{
          ...(style ? pick(style, "objectFit", "objectPosition") : {}),
          width: 0,
          height: 0,
        }}
      />
    </picture>
  );
}

const DEFAULT_SVG_WIDTH = 10000;

function isSvg(src: string) {
  return src.endsWith(".svg") || src.startsWith("data:image/svg");
}

interface WidthDesc {
  width?: number;
  desc: string;
}

function getClosestPresetSize(width: number, fullWidth: number) {
  const nextBiggerIndex =
    ALL_SIZES.findIndex((w) => w >= width) ?? ALL_SIZES.length - 1;
  const nextBigger = ALL_SIZES[nextBiggerIndex];
  if (nextBigger >= fullWidth) {
    // If the requested width is larger than the fullWidth,
    // we just use the original width instead. It's impossible
    // to make an image bigger than fullWidth!
    return undefined;
  } else if (
    nextBiggerIndex + 1 < ALL_SIZES.length &&
    fullWidth <= ALL_SIZES[nextBiggerIndex + 1]
  ) {
    // If the fullWidth is just between nextBigger and the one after that,
    // then also might as well just use the original size (so, width is 30,
    // nextBigger is 32, then we just use the original as long as fullWidth is
    // less than 48)
    return undefined;
  }

  return nextBigger;
}

/**
 * Computes the appropriate srcSet and sizes to use
 */
function getWidths(
  width: number | string | undefined,
  fullWidth: number,
  extra?: { minWidth: string | number | undefined },
): { sizes: string | undefined; widthDescs: WidthDesc[] } {
  const minWidth = extra?.minWidth;
  const pixelWidth = getPixelLength(width);
  const pixelMinWidth = getPixelLength(minWidth);
  if (pixelWidth != null && (!minWidth || pixelMinWidth != null)) {
    // If there's an exact width, then we just need to display it at 1x and 2x density
    return {
      widthDescs: [
        {
          width: getClosestPresetSize(
            Math.max(pixelWidth, pixelMinWidth ?? 0),
            fullWidth,
          ),
          desc: "1x",
        },
        {
          width: getClosestPresetSize(
            Math.max(pixelWidth, pixelMinWidth ?? 0) * 2,
            fullWidth,
          ),
          desc: "2x",
        },
      ],
      sizes: undefined,
    };
  }
  // Otherwise we don't know what sizes we'll end up, so we just cap it at
  // device width.  TODO: do better!
  const usefulSizes = DEVICE_SIZES.filter(
    (size) => !fullWidth || size < fullWidth,
  );
  if (!!fullWidth && usefulSizes.length === 0) {
    // image fullWidth is smaller than all device sizes.  So all we can do
    // is offer 1x
    return {
      widthDescs: [
        {
          width: getClosestPresetSize(fullWidth, fullWidth),
          desc: "1x",
        },
      ],
      sizes: undefined,
    };
  }
  return {
    widthDescs: usefulSizes.map((size) => ({
      width: getClosestPresetSize(size, fullWidth),
      // If this is the last (buggest) useful width, but it is
      // still within the bounds set by DEVICE_SIZES, then just
      // use the original, unresized image.  This means if we match
      // the largest size, we use unresized and best quality image.
      // We only do this, though, if fullWidth is "reasonable" --
      // smaller than the largest size we would consider.
      // i === usefulSizes.length - 1 &&
      // fullWidth < DEVICE_SIZES[DEVICE_SIZES.length - 1]
      //   ? undefined
      //   : size,
      desc: `${size}w`,
    })),
    sizes: "100vw",
  };
}

function getPixelLength(length: number | string | undefined) {
  if (length == null || length == "") {
    return undefined;
  }

  if (typeof length === "number") {
    return length;
  }

  const parsed = parseNumeric(length);
  if (parsed && (!parsed.units || parsed.units === "px")) {
    return parsed.num;
  }

  return undefined;
}

function parseNumeric(val: string) {
  // Parse strings like "30", "30px", "30%", "30px /* blah blah */"
  const res = val.match(
    /^\s*(-?(?:\d+\.\d*|\d*\.\d+|\d+))\s*([a-z]*|%)\s*(?:\/\*.*)?$/i,
  );
  if (res == null) {
    return undefined;
  }
  const num = res[1];
  const units = res[2];
  return { num: +num, units };
}

function getImageSizeData(
  width: number | undefined,
  height: number | undefined,
) {
  const aspectRatio = width && height ? width / height : undefined;
  return {
    fullWidth: width,
    fullHeight: height,
    aspectRatio:
      aspectRatio && Number.isFinite(aspectRatio) ? aspectRatio : undefined,
  };
}

function getImageTransform(
  loader: PlasmicImgProps["loader"],
  src: string,
): ImageLoader["transformUrl"] | undefined {
  if (typeof loader !== "string") {
    return loader?.supportsUrl(src)
      ? loader.transformUrl.bind(loader)
      : undefined;
  }

  const host =
    loader === "plasmic" ? IMG_OPTIMIZER_HOST : loader.replace(/\/+$/, "");
  let key = src;
  if (/^https?:\/\//i.test(src)) {
    try {
      const url = new URL(src);
      if (
        url.hostname !== "site-assets.plasmic.app" &&
        url.hostname !== "img.plasmic.app" &&
        url.origin !== new URL(host).origin
      ) {
        return undefined;
      }
      key = url.pathname.split("/").pop() ?? "";
    } catch {
      return undefined;
    }
  }
  if (!/^[a-f0-9]{32}\.[a-z0-9]{1,16}$/i.test(key) || /\.svg$/i.test(key)) {
    return undefined;
  }
  return ({ width, quality, format }) => {
    const params = [
      width ? `w=${width}` : undefined,
      `q=${quality ?? 75}`,
      format ? `f=${format}` : undefined,
    ].filter(Boolean);
    return `${host}/i/${key}?${params.join("&")}`;
  };
}
