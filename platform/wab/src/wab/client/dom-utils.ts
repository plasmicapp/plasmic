import { AppCtx } from "@/wab/client/app-ctx";
import { getImageSize } from "@/wab/client/image/metadata";
import { ensure, ensureHTMLElt, ensureString } from "@/wab/shared/common";
import {
  ImageBackground,
  mkBackgroundLayer,
} from "@/wab/shared/core/bg-styles";
import { ImageAssetType } from "@/wab/shared/core/image-asset-type";
import { ASPECT_RATIO_SCALE_FACTOR } from "@/wab/shared/core/tpls";
import {
  SVG_MEDIA_TYPE as SVG_CONTENT_TYPE,
  SVG_MEDIA_TYPE,
  asSvgDataUrl,
  getParsedDataUrlBuffer,
  getParsedDataUrlData,
  imageDataUriToBlob,
  parseDataUrl,
  parseSvgXml,
} from "@/wab/shared/data-urls";
import { Rect } from "@/wab/shared/geom";
import {
  clearExplicitColors,
  convertSvgToTextSized,
  gatherSvgColors,
  isSVG,
} from "@/wab/shared/svg-utils";
import { notification } from "antd";
import * as downscale from "downscale";
import { fileTypeFromBlob } from "file-type-browser";
import $ from "jquery";
import { isString } from "lodash";
import isFunction from "lodash/isFunction";
import memoize from "lodash/memoize";
import React from "react";
import intersection from "rectangle-overlap";
import defer = setTimeout;

const MaxImageDim = 4096;

// When the image data url size exceeds this number, we start downscaling - the
// downscaling may compress the image to a smaller one.
const DownscaleImageSizeThreshold = 4 * 1024 * 1024;

export const readUploadedFileAsDataUrl = (file: File): Promise<string> => {
  const r = new FileReader();
  return new Promise<string>((resolve, reject) => {
    r.onerror = () => {
      r.abort();
      reject(ensure(r.error, `Unexpected undefined error.`));
    };
    r.onload = () => {
      resolve(ensureString(r.result));
    };
    r.readAsDataURL(file);
  });
};

export const readUploadedFileAsText = (file: File): Promise<string> => {
  const r = new FileReader();
  return new Promise<string>((resolve, reject) => {
    r.onerror = () => {
      r.abort();
      reject(ensure(r.error, `Unexpected undefined error.`));
    };
    r.onload = () => {
      resolve(ensureString(r.result));
    };
    r.readAsText(file);
  });
};

/**
 * Checks if dataUrl is an animated GIF.
 *
 * This came from:
 * https://gist.github.com/zakirt/faa4a58cec5a7505b10e3686a226f285?permalink_comment_id=3736530#gistcomment-3736530
 */
export function isAnimatedGif(dataUrl: string) {
  const base64 = dataUrl.replace(/^[^,]*,/, "");
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const buffer = bytes.buffer;

  const HEADER_LEN = 6; // offset bytes for the header section
  const LOGICAL_SCREEN_DESC_LEN = 7; // offset bytes for logical screen description section

  // Start from last 4 bytes of the Logical Screen Descriptor
  const dv = new DataView(buffer, HEADER_LEN + LOGICAL_SCREEN_DESC_LEN - 3);
  let offset = 0;
  const globalColorTable = dv.getUint8(0); // aka packet byte
  let globalColorTableSize = 0;

  // check first bit, if 0, then we don't have a Global Color Table
  if (globalColorTable & 0x80) {
    // grab the last 3 bits, to calculate the global color table size -> RGB * 2^(N+1)
    // N is the value in the last 3 bits.
    globalColorTableSize = 3 * 2 ** ((globalColorTable & 0x7) + 1);
  }

  // move on to the Graphics Control Extension
  offset = 3 + globalColorTableSize;

  const extensionIntroducer = dv.getUint8(offset);
  const graphicsConrolLabel = dv.getUint8(offset + 1);
  let delayTime = 0;

  // Graphics Control Extension section is where GIF animation data is stored
  // First 2 bytes must be 0x21 and 0xF9
  if (extensionIntroducer & 0x21 && graphicsConrolLabel & 0xf9) {
    // skip to the 2 bytes with the delay time
    delayTime = dv.getUint16(offset + 4);
  }

  return delayTime > 0;
}

export class ResizableImage {
  constructor(
    public url: string,
    public width: number,
    public height: number,
    private aspectRatio: number | undefined
  ) {}

  get scaledRoundedAspectRatio() {
    if (this.aspectRatio) {
      return Math.round(ASPECT_RATIO_SCALE_FACTOR * this.aspectRatio);
    }
    return this.aspectRatio;
  }

  get actualAspectRatio() {
    return this.aspectRatio;
  }

  tryDownscale = async () => {
    if (
      this.width < MaxImageDim &&
      this.height < MaxImageDim &&
      this.url.length < DownscaleImageSizeThreshold
    ) {
      return;
    }

    const targetWidth =
      this.width > this.height ? Math.min(this.width, MaxImageDim) : 0;
    const targetHeight =
      this.width <= this.height ? Math.min(this.height, MaxImageDim) : 0;

    const sizeBeforeDownscale = this.url.length;
    try {
      this.url = await downscale(this.url, targetWidth, targetHeight);
      const size = await getImageSize(
        getParsedDataUrlBuffer(parseDataUrl(this.url))
      );
      console.log(
        `downscaled from ${sizeBeforeDownscale / 1024}KB to ${
          this.url.length / 1024
        }KB, ${this.width}X${this.height} to ${size.width}X${size.height}.`
      );
      this.width = size.width;
      this.height = size.height;
    } catch (e) {
      console.log(
        `failed to downscale ${sizeBeforeDownscale / 1024}KB, ${this.width}X${
          this.height
        }`,
        e
      );
    }
  };
}

export type ImageAssetOpts = {
  type: ImageAssetType;
  iconColor?: string;
  name?: string;
};

export const isDescendant = ({
  parent,
  child,
}: {
  parent: HTMLElement;
  child: HTMLElement;
}) => {
  let node = child.parentNode;

  while (node !== null) {
    if (node === parent) {
      return true;
    }

    node = node.parentNode;
  }

  return false;
};

export const isContextMenuDescendant = (child: HTMLElement) => {
  let node = child.parentNode;

  const canvasEditorEl = document.querySelector(".canvas-editor");

  // Not a context menu item, as it's located inside the canvas-editor
  if (
    canvasEditorEl &&
    isDescendant({ parent: canvasEditorEl as HTMLElement, child })
  ) {
    return false;
  }

  while (node !== null) {
    if ((node as HTMLElement).getAttribute?.("role") === "menu") {
      return true;
    }

    node = node.parentNode;
  }

  return false;
};

export async function readAndSanitizeFileAsImage(
  appCtx: AppCtx,
  fileOrDataUrl: File | string
): Promise<ResizableImage | undefined> {
  const dataUrl = isString(fileOrDataUrl)
    ? fileOrDataUrl
    : await readUploadedFileAsDataUrl(fileOrDataUrl);

  const parsed = parseDataUrl(dataUrl);
  if (parsed && parsed.mediaType === SVG_MEDIA_TYPE) {
    return await readAndSanitizeSvgXmlAsImage(
      appCtx,
      getParsedDataUrlData(parsed)
    );
  }

  const size = await getImageSize(getParsedDataUrlBuffer(parsed));
  const img = new ResizableImage(dataUrl, size.width, size.height, undefined);
  return Promise.resolve(img);
}

export async function readAndSanitizeSvgXmlAsImage(
  appCtx: AppCtx,
  svgXml: string
) {
  const sanitized = await appCtx.api.processSvg({ svgXml });
  if (sanitized.status === "failure") {
    return undefined;
  }
  const url = asSvgDataUrl(sanitized.result.xml);
  return new ResizableImage(
    url,
    sanitized.result.width,
    sanitized.result.height,
    sanitized.result.aspectRatio
  );
}

export async function maybeUploadImage(
  appCtx: AppCtx,
  image: ResizableImage,
  type?: ImageAssetType,
  file?: File | string
) {
  const res = deriveImageAssetTypeAndUri(image, { type });
  if (!res) {
    return {};
  }
  let imageResult: ResizableImage;
  if (res.type === ImageAssetType.Picture) {
    const blob = imageDataUriToBlob(res.dataUri);
    const uploadedImage = await appCtx.api.uploadImageFile({
      imageFile: blob,
    });
    if (uploadedImage.warning) {
      notification.warn({ message: uploadedImage.warning, duration: 0 });
    }
    imageResult = new ResizableImage(
      uploadedImage.dataUri,
      uploadedImage.width ?? image.width,
      uploadedImage.height ?? image.height,
      uploadedImage.aspectRatio ?? image.actualAspectRatio
    );
  } else {
    imageResult = new ResizableImage(
      res.dataUri,
      image.width,
      image.height,
      image.actualAspectRatio
    );
    await imageResult.tryDownscale();
  }
  const opts: ImageAssetOpts = {
    type: res.type,
    iconColor: res.iconColor,
    name: file instanceof File ? file?.name : file,
  };

  return { imageResult, opts };
}

export const getUploadedFile = (
  f: (content: string) => void | Promise<void>
) => {
  const $input = $(".hidden-file-selector");
  const handleFileChange = async () => {
    const files = $input.prop("files") as FileList | null;
    if (files && files.length > 0) {
      const data = await readUploadedFileAsText(files[0]);
      await f(data);
    }
    $input.unbind("change", handleFileChange);
    // Clear files so next time file selection will trigger change event
    $input.val("");
  };
  $input.change(handleFileChange);
  $input.trigger("click");
};

async function getFileType(buffer: ArrayBuffer) {
  const blob = new Blob([buffer]);
  let fileType = await fileTypeFromBlob(blob);
  if ((!fileType || fileType?.mime === "application/xml") && isSVG(buffer)) {
    fileType = {
      mime: "image/svg+xml",
      ext: "svg",
    };
  }
  return fileType;
}

export async function parseImage(
  appCtx: AppCtx,
  base64: string
): Promise<ResizableImage | undefined> {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const meta = await getImageSize(bytes);
  const fileType = ensure(
    await getFileType(bytes.buffer),
    "Unexpected undefined file type"
  );

  if (fileType.mime === SVG_MEDIA_TYPE) {
    const svgXml =
      typeof window === "undefined"
        ? Buffer.from(base64).toString("utf8")
        : window.atob(base64);
    return await readAndSanitizeSvgXmlAsImage(appCtx, svgXml);
  } else {
    return new ResizableImage(
      `data:${fileType.mime};base64,${base64}`,
      meta.width,
      meta.height,
      undefined
    );
  }
}

export function getBackgroundImageProps(url: string) {
  return {
    background: mkBackgroundLayer(new ImageBackground({ url })).showCss(),
  };
}

export function getClippingParent(
  element: HTMLElement | null
): HTMLElement | undefined {
  if (!element) {
    return undefined;
  }

  if (
    element.parentElement &&
    element.parentElement.scrollHeight > element.parentElement.offsetHeight
  ) {
    return element.parentElement;
  }

  return getClippingParent(element.parentElement);
}

export function getVisibleBoundingClientRect(element: HTMLElement): Rect {
  const scrollableParent = getClippingParent(element);

  if (
    scrollableParent &&
    !(scrollableParent instanceof Document) &&
    getComputedStyle(scrollableParent).overflow !== "visible"
  ) {
    const sty = getComputedStyle(scrollableParent);
    const clipsX = sty.overflowX !== "visible";
    const clipsY = sty.overflowY !== "visible";
    const elementRect = element.getBoundingClientRect();

    if (clipsX || clipsY) {
      const parentRect = scrollableParent?.getBoundingClientRect();
      const overlap = intersection(elementRect, parentRect);

      if (!overlap) {
        return new DOMRect(0, 0, 0, 0);
      }

      const left = clipsX ? overlap.x : elementRect.left;
      const width = clipsX ? overlap.width : elementRect.width;
      const top = clipsY ? overlap.y : elementRect.top;
      const height = clipsY ? overlap.height : elementRect.height;
      return { top, left, width, height };
    } else {
      return elementRect;
    }
  }

  return element.getBoundingClientRect();
}

export function getElementVisibleBounds(node: JQuery | HTMLElement) {
  const elt = ensure($(node).get(0), `Unexpected undefined query ${node}.`);
  return getVisibleBoundingClientRect(elt);
}

export function getElementBounds(node: JQuery | HTMLElement) {
  const elt = ensure($(node).get(0), `Unexpected undefined query ${node}.`);
  return elt.getBoundingClientRect();
}

export function deriveImageAssetTypeAndUri(
  image: ResizableImage,
  opts: { type?: ImageAssetType }
) {
  let dataUri = image.url;
  const parsed = parseDataUrl(dataUri);
  if (!parsed) {
    notification.error({
      message: "Error loading image",
    });
    return undefined;
  }

  const contentType: string = parsed.contentType;
  const type = opts.type;

  if (type === ImageAssetType.Picture) {
    // Anything goes for pictures! Though we should probably verify that this is
    // a valid picture...
    return { dataUri, type };
  }

  // Now we're just dealing with ImageAssetType.Icon, or unknown type

  if (contentType === SVG_CONTENT_TYPE) {
    const svgElt = parseSvgXml(atob(parsed.data));
    const colors = gatherSvgColors(svgElt);
    const shouldBeIcon =
      // Explicitly requested to be icon
      type === ImageAssetType.Icon ||
      // If the svg has a currentcolor set, then we assume this svg was purposely
      // built to be colored, even if there are multiple colors in the svg.
      colors.has("currentcolor") ||
      // Else, if there's only one or 0 color in the svg, then we rewrite that
      // color to currentcolor
      (colors.size <= 1 &&
        (colors.size === 0 ||
          [...colors.values()].every((v) => !v.startsWith("url"))));
    if (shouldBeIcon) {
      convertSvgToTextSized(svgElt);
      if (!colors.has("currentcolor") && colors.size <= 1) {
        // No currentcolor reference and only one color, so explicitly rewrite
        clearExplicitColors(svgElt);
      }
      dataUri = asSvgDataUrl(new XMLSerializer().serializeToString(svgElt));
      const color = colors.size === 1 ? [...colors.values()][0] : undefined;
      return {
        dataUri,
        type: ImageAssetType.Icon,
        iconColor: color === "currentcolor" ? undefined : color,
      };
    } else {
      // Else, this is a multi-colored svg
      if (!type) {
        // If no previos type, then we just derive this as a Picture
        return { dataUri, type: ImageAssetType.Picture };
      } else {
        notification.error({
          message: "Can only use svg images with one color as icons",
        });
        return undefined;
      }
    }
  } else {
    if (!type) {
      // Deriving this as Picture type
      return { dataUri, type: ImageAssetType.Picture };
    } else {
      // Cannot upload non-svg for icons
      notification.error({
        message: "Can only use svg images as icons",
      });
      return undefined;
    }
  }
}

/**
 * Sets the argument styles directly on argument element.  You should use this
 * instead of jquery.css() if you are working on performance-sensitive code.
 */
export function setElementStyles(
  elt: HTMLElement,
  styles: Partial<CSSStyleDeclaration>
) {
  for (const key in styles) {
    elt.style[key] = styles[key] ?? "";
  }
}

/**
 * A hook for detecting when a DOM element toggles between "visible" and
 * "invisible" by some ancestor's display being set to "none" or not.  Note the
 * detection is purely by
 * `display`, not by whether it is on/off screen, etc.
 */
export function useToggleDisplayed(
  getDom:
    | React.MutableRefObject<HTMLElement | null>
    | (() => HTMLElement | undefined | null),
  callback: (visible: boolean) => void
) {
  const wasVisibleRef = React.useRef(false);

  React.useEffect(() => {
    const dom = isFunction(getDom) ? getDom() : getDom.current;
    if (!dom) {
      return;
    }
    const checkVisible = () => {
      if (dom) {
        // If in a display:none parent, then offsetParent is null
        const isVisible = !!dom.offsetParent;
        if (wasVisibleRef.current !== isVisible) {
          callback(isVisible);
        }
        wasVisibleRef.current = isVisible;
      }
    };
    const observer = new IntersectionObserver(() => {
      checkVisible();
    });

    observer.observe(dom);

    return () => observer.unobserve(dom);
  }, [getDom, callback]);
}

export function useDisplayed(
  getDom:
    | React.MutableRefObject<HTMLElement | null>
    | (() => HTMLElement | undefined | null)
) {
  const [visible, setVisible] = React.useState(false);
  useToggleDisplayed(getDom, setVisible);
  return visible;
}

/**
 * Hook for triggering focus for an HTMLInputElement if autoFocus is turned on.
 * Usually, autoFocus only works for the first time that an element is rendered,
 * and not subsequently.  This will trigger focus() whenever the element is
 * "visible", by which we mean "not in a display:none parent", rather than
 * "visible in current viewport".
 */
export function useFocusOnDisplayed(
  getInput:
    | React.MutableRefObject<HTMLInputElement | null>
    | (() => HTMLInputElement | undefined | null),
  autoFocus?: boolean
) {
  const callback = React.useCallback(
    (visible: boolean) => {
      const input = isFunction(getInput) ? getInput() : getInput.current;
      if (input && visible && autoFocus) {
        input.focus();
      }
    },
    [getInput]
  );
  useToggleDisplayed(getInput, callback);
}

/**
 * Calls `onScroll` whenever an ancestor of the `ref` has been scrolled
 */
export function useOnContainerScroll(opts: {
  ref: React.RefObject<HTMLElement>;
  onScroll: (container: HTMLElement) => void;
  disabled?: boolean;
}) {
  const { ref, onScroll, disabled } = opts;

  React.useEffect(() => {
    if (disabled) {
      return;
    }

    const handler = (e: Event) => {
      // Ignore if scrolling an scrollable region outside the trigger's tree.
      const target = e.target as HTMLElement;
      if (!ref.current || !target.contains(ref.current)) {
        return;
      }

      onScroll(target);
    };

    window.addEventListener("scroll", handler, true);
    return () => {
      window.removeEventListener("scroll", handler, true);
    };
  }, [ref, onScroll, disabled]);
}

export function isCanvasIframeEvent(e: UIEvent) {
  return e.view?.location.hash.match(/\bcanvas=true\b/);
}

export function cachedJQSelector(selector: string) {
  let $cached: JQuery | undefined = undefined;
  return () => {
    if (!$cached || $cached.length === 0 || !$cached[0].isConnected) {
      $cached = $(selector);
    }
    return $cached;
  };
}

export function upsertJQSelector(
  selector: string,
  insert: () => void,
  context: JQuery
) {
  let sel = $(selector, context);
  if (sel.length === 0) {
    insert();
    sel = $(selector, context);
  }
  return sel;
}

export function downloadBlob(blob: Blob, fileName: string) {
  const $link = $("<a />").css("display", "none").appendTo("body");
  // Data URL has a size limit. However, object url doesn't.
  const downloadUrl = URL.createObjectURL(blob);
  $link.attr("href", downloadUrl);
  $link.attr("download", fileName);
  $link[0].click();
  $link.remove();
  // Note that the URL created by URL.createObjectURL(blob) won't be
  // released until the document is unloaded or the URL is explicitly
  // released. So here we release it explicitly.
  URL.revokeObjectURL(downloadUrl);
}

export function fixStudioIframePositionAndOverflow() {
  // Make the studio iframe span the full viewport. You don't know what
  // default margins etc. the host app has.
  const elt = ensureHTMLElt(
    ensure(
      window.parent,
      `Unexpected undefined parent in ${window}`
    ).document.querySelector(".__wab_studio-frame")
  );
  elt.style.position = "absolute";
  elt.style.top = "0";
  elt.style.left = "0";
  document.body.style.overflow = "hidden";
}

export const getTextWidth = memoize(
  (text: string | undefined, className: string = "") => {
    if (!globalThis.document?.createElement) {
      return 0;
    }

    const simulationElement = document.createElement("div");

    simulationElement.className = className;
    simulationElement.style.visibility = "hidden";
    simulationElement.style.position = "absolute";
    simulationElement.style.display = "inline-block";
    simulationElement.style.top = "0px";
    simulationElement.style.left = "0px";
    simulationElement.style.right = "unset";
    simulationElement.style.width = "unset";
    simulationElement.innerText = text ?? "";

    document.body.appendChild(simulationElement);
    defer(() => document.body.removeChild(simulationElement));

    const { width } = simulationElement.getBoundingClientRect();
    return Math.round(width);
  }
);

/**
 * Executing a block of code by injecting a <script/> tag to the
 * argument window.
 */
export function scriptExec(window: Window, code: string) {
  const doc = window.document;
  const script = doc.createElement("script");
  script.text = code;
  let err: Error | undefined = undefined;
  const errorHandler = (error: ErrorEvent) => {
    err = error.error;
  };
  window.addEventListener("error", errorHandler);
  doc.head.appendChild(script);
  doc.head.removeChild(script);
  window.removeEventListener("error", errorHandler);
  if (err) {
    throw err;
  }
}

export function hasAncestorElement(
  target: HTMLElement,
  pred: (element: HTMLElement) => boolean
) {
  let cur: HTMLElement | null = target;
  while (cur) {
    if (pred(cur)) {
      return cur;
    }
    cur = cur.parentElement;
  }
  return false;
}

/**
 * Returns a Promise that resolves when the `popup` is closed. You don't
 * have to use this if you have a popup with the same origin; you can
 * just listen to the onbeforeunload event instead. You only need this if
 * the popup is of a different origin.
 */
export async function untilClosed(popup: Window) {
  return new Promise<void>((resolve) => {
    if (popup.closed) {
      resolve();
    }

    const timer = window.setInterval(() => {
      if (popup.closed) {
        window.clearInterval(timer);
        resolve();
      }
    }, 1000);
  });
}
