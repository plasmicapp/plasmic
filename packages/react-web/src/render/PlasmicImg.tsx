/**
 * Responsive `<img/>` replacement, based on `next/image`
 */

import classNames from "classnames";
import React from "react";
import { ensure, pick } from "../common";
import { mergeRefs } from "../react-utils";

export type ImageLoader = (opts: {
  src: string;
  width: number;
  quality?: number;
  format?: "webp";
}) => string;

type ImgTagProps = Omit<
  React.ComponentProps<"img">,
  "src" | "srcSet" | "ref" | "width" | "height" | "style"
>;

// Default image sizes to snap to
// TODO: make this configurable?
const IMG_SIZES = [16, 32, 48, 64, 96, 128, 256, 384];
const DEVICE_SIZES = [640, 750, 828, 1080, 1200, 1920, 2048, 3840];
const ALL_SIZES = [...IMG_SIZES, ...DEVICE_SIZES];

export interface PlasmicImgProps extends ImgTagProps {
  /**
   * Either an object with the src string, and its full width and height,
   * or just a src string with unknown intrinsic dimensions.
   */
  src: string | { src: string; fullHeight: number; fullWidth: number };

  /**
   * className applied to the wrapper element if one is used.
   */
  className?: string;

  /**
   * css width
   */
  width?: number | string;

  /**
   * css height
   */
  height?: number | string;

  /**
   * For variable quality formats like jpg, the quality from 0 to 100
   */
  quality?: number;

  /**
   * ImageLoader to use for loading different dimensions of the image.
   * If none specified, will not attempt to load different dimensions.
   */
  loader?: "plasmic" | ImageLoader;

  /**
   * Style applied to the wrapper element. objectFit and objectPosition
   * rules are applied to the img element.
   */
  style?: React.CSSProperties;

  /**
   * Ref for the wrapper element.  The normal <PlasmicImg ref={...} />
   * prop gives you the wrap to the img element.
   */
  containerRef?: React.Ref<HTMLDivElement>;
}

export const PlasmicImg = React.forwardRef(function PlasmicImg(
  props: PlasmicImgProps,
  outerRef: React.Ref<HTMLImageElement>
) {
  const {
    src,
    className,
    width,
    height,
    quality,
    loader,
    containerRef,
    style,
    ...rest
  } = props;

  const { fullWidth, fullHeight } =
    typeof src === "string"
      ? { fullWidth: undefined, fullHeight: undefined }
      : src;
  const srcStr = typeof src === "string" ? src : src.src;
  const { sizes, widthDescs } = getWidths(width, fullWidth);
  const isAutoHeight = height == null || height === "" || height === "auto";
  const imageLoader = getImageLoader(loader);

  const onImgRef = (img: HTMLImageElement | null) => {
    // Called when the img has been mounted
    if (!img) {
      return;
    }
    if (img.complete) {
      // If img has already been loaded (via pre-loading, or just has
      // loaded before hydration completed), then immediately call
      // handleImageLoaded
      handleImageLoaded(img);
    } else {
      // Otherwise, do so onload
      img.addEventListener("load", () => handleImageLoaded(img));
    }
  };
  const spacerRef = React.useRef<HTMLDivElement>(null);
  const ref = mergeRefs(onImgRef, outerRef);

  // We use a spacer if the height is not specified and must be
  // proportional to the width.  We can only do so if we know the
  // original width/height (so we can compute the aspect ratio), and
  // the width is specified.
  const useSpacer = isAutoHeight && !!fullWidth && !!fullHeight && !!width;

  const handleImageLoaded = (img: HTMLImageElement) => {
    if (img.clientWidth === 0) {
      // If we find that the image has been loaded but the img clientWidth
      // is 0, then we are likely somewhere in the DOM where we have 0 width.
      // This can happen if we are using the spacer to reserve space for
      // aspect ratio -- the img is now absolutely positioned, and so does
      // not take up intrinsic width.
      // See https://coda.io/d/Plasmic-Wiki_dHQygjmQczq/Image-Optimization_suOOu#_lu5OU
      // In that case, it is better to show the image and cause a layout
      // shift than to hide the image, so we hide the spacer and make the
      // img relatively instead of absolutely positioned, so that it does
      // take up the necessary space.
      if (spacerRef.current) {
        spacerRef.current.style.display = "none";
      }
      img.style.position = "relative";
    }
  };

  if (useSpacer) {
    // If we are using spacer to reserve height by its aspect ratio,
    // we use a wrapper containing a spacer, and have the img be
    // absolutely positioned covering the wrapper (and taking up the
    // same amount of space as the spacer)
    const aspectRatio = ensure(fullHeight) / ensure(fullWidth);
    return (
      <div
        className={classNames("__wab_img-wrapper", className)}
        style={{
          ...style,
          width,
          height,
        }}
        ref={containerRef}
      >
        <div
          className="__wab_img-spacer"
          style={{
            paddingTop: `${aspectRatio * 100}%`,
          }}
          ref={spacerRef}
        />
        {makePicture({
          imageLoader,
          widthDescs,
          sizes,
          src: srcStr,
          quality,
          ref,
          style: style ? pick(style, "objectFit", "objectPosition") : undefined,
          imgProps: rest,
          className: "__wab_img",
        })}
      </div>
    );
  } else {
    // Otherwise, just make the usual <picture/> without a wrapper.
    return makePicture({
      imageLoader,
      widthDescs,
      sizes,
      src: srcStr,
      quality,
      ref,
      style,
      imgProps: rest,
      className,
    });
  }
});

function makePicture(opts: {
  imageLoader?: ImageLoader;
  widthDescs: WidthDesc[];
  sizes?: string;
  src: string;
  quality?: number;
  style?: React.CSSProperties;
  className?: string;
  imgProps: ImgTagProps;
  ref?: React.Ref<HTMLImageElement>;
}) {
  // If imageLoader is undefined, then this renders to just a normal
  // <img />.  Else it will render to a <picture> with a <source> for
  // webp, and srcSet/sizes set according to width requirements.
  const {
    imageLoader,
    widthDescs,
    src,
    quality,
    style,
    className,
    sizes,
    imgProps,
    ref,
  } = opts;
  return (
    <picture className="__wab_picture">
      {imageLoader && (
        <source
          type="image/webp"
          srcSet={widthDescs
            .map(
              (wd) =>
                `${imageLoader({
                  src,
                  quality,
                  width: wd.width,
                  format: "webp",
                })} ${wd.desc}`
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
          imageLoader
            ? imageLoader({
                src,
                quality,
                width: widthDescs[widthDescs.length - 1].width,
              })
            : src
        }
        srcSet={
          imageLoader
            ? widthDescs
                .map(
                  (wd) =>
                    `${imageLoader({
                      src,
                      quality,
                      width: wd.width,
                    })} ${wd.desc}`
                )
                .join(", ")
            : undefined
        }
        sizes={imageLoader ? sizes : undefined}
        style={style ? pick(style, "objectFit", "objectPosition") : undefined}
      />
    </picture>
  );
}

interface WidthDesc {
  width: number;
  desc: string;
}

function getClosestPresetSize(width: number) {
  return ALL_SIZES.find((w) => w >= width) ?? ALL_SIZES[ALL_SIZES.length - 1];
}

/**
 * Computes the appropriate srcSet and sizes to use
 */
function getWidths(
  width: number | string | undefined,
  fullWidth: number | undefined
): { sizes: string | undefined; widthDescs: WidthDesc[] } {
  const pixelWidth = getPixelWidth(width);
  if (pixelWidth != null) {
    // If there's an exact width, then we just need to display it at 1x and 2x density
    return {
      widthDescs: [
        {
          width: getClosestPresetSize(pixelWidth),
          desc: "1x",
        },
        {
          width: getClosestPresetSize(pixelWidth * 2),
          desc: "2x",
        },
      ],
      sizes: undefined,
    };
  }
  // Otherwise we don't know what sizes we'll end up, so we just cap it at
  // device width.  TODO: do better!
  const usefulSizes = DEVICE_SIZES.filter(
    (size) => !fullWidth || size < fullWidth
  );
  if (!!fullWidth && usefulSizes.length === 0) {
    // image fullWidth is smaller than all device sizes.  So all we can do
    // is offer 1x
    return {
      widthDescs: [
        {
          width: getClosestPresetSize(fullWidth),
          desc: "1x",
        },
      ],
      sizes: undefined,
    };
  }
  return {
    widthDescs: usefulSizes.map((size) => ({
      width: size,
      desc: `${size}w`,
    })),
    sizes: "100vw",
  };
}

function getPixelWidth(width: number | string | undefined) {
  if (width == null || width == "") {
    return undefined;
  }

  if (typeof width === "number") {
    return width;
  }

  const parsed = parseNumeric(width);
  if (parsed && (!parsed.units || parsed.units === "px")) {
    return parsed.num;
  }

  return undefined;
}

function parseNumeric(val: string) {
  // Parse strings like "30", "30px", "30%", "30px /* blah blah */"
  const res = val.match(
    /^\s*(-?(?:\d+\.\d*|\d*\.\d+|\d+))\s*([a-z]*|%)\s*(?:\/\*.*)?$/i
  );
  if (res == null) {
    return undefined;
  }
  const num = res[1];
  const units = res[2];
  return { num: +num, units };
}

function getImageLoader(loader: "plasmic" | ImageLoader | undefined) {
  if (loader == null) {
    return undefined;
  } else if (loader === "plasmic") {
    return PLASMIC_IMAGE_LOADER;
  } else {
    return loader;
  }
}

const PLASMIC_IMAGE_LOADER: ImageLoader = (opts) => {
  return `${opts.src}?w=${opts.width}&q=${opts.quality ?? 75}${
    opts.format ? `&f=${opts.format}` : ""
  }`;
};
