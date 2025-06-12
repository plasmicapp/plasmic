import type { RepeatedElementFnType } from "@/wab/client/components/canvas/repeatedElement";
import type * as PlasmicDataSourcesContext from "@plasmicapp/data-sources-context";
import type {
  DataContext,
  DataCtxReader,
  DataProvider,
  PageParamsProvider,
  PlasmicCanvasContext,
  useDataEnv,
  useGlobalActions,
} from "@plasmicapp/host";
import type * as ReactWeb from "@plasmicapp/react-web";
import type * as PlasmicDataSources from "@plasmicapp/react-web/lib/data-sources";
import type * as PlasmicQuery from "@plasmicapp/react-web/lib/query";
import type domAlign from "dom-align";
import type $ from "jquery";
import type React from "react";
import type ReactDOM from "react-dom";
import type ReactDOMClient from "react-dom/client";
import type * as jsxDevRuntime from "react/jsx-dev-runtime";
import type * as jsxRuntime from "react/jsx-runtime";
import type ResizeObserver from "resize-observer-polyfill";
import type * as slate from "slate";
import type * as slateReact from "slate-react";

export const tags = [
  // HTML
  "a",
  "abbr",
  "address",
  "area",
  "article",
  "aside",
  "audio",
  "b",
  "base",
  "bdi",
  "bdo",
  "big",
  "blockquote",
  "body",
  "br",
  "button",
  "canvas",
  "caption",
  "cite",
  "code",
  "col",
  "colgroup",
  "data",
  "datalist",
  "dd",
  "del",
  "details",
  "dfn",
  "dialog",
  "div",
  "dl",
  "dt",
  "em",
  "embed",
  "fieldset",
  "figcaption",
  "figure",
  "footer",
  "form",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "head",
  "header",
  "hgroup",
  "hr",
  "html",
  "i",
  "iframe",
  "img",
  "input",
  "ins",
  "kbd",
  "keygen",
  "label",
  "legend",
  "li",
  "link",
  "main",
  "map",
  "mark",
  "menu",
  "menuitem",
  "meta",
  "meter",
  "nav",
  "noindex",
  "noscript",
  "object",
  "ol",
  "optgroup",
  "option",
  "output",
  "p",
  "param",
  "picture",
  "pre",
  "progress",
  "q",
  "rp",
  "rt",
  "ruby",
  "s",
  "samp",
  "slot",
  "script",
  "section",
  "select",
  "small",
  "source",
  "span",
  "strong",
  "style",
  "sub",
  "summary",
  "sup",
  "table",
  "template",
  "tbody",
  "td",
  "textarea",
  "tfoot",
  "th",
  "thead",
  "time",
  "title",
  "tr",
  "track",
  "u",
  "ul",
  "var",
  "video",
  "wbr",
  "webview",

  // SVG
  "svg",

  "animate",
  "animateMotion",
  "animateTransform",
  "circle",
  "clipPath",
  "defs",
  "desc",
  "ellipse",
  "feBlend",
  "feColorMatrix",
  "feComponentTransfer",
  "feComposite",
  "feConvolveMatrix",
  "feDiffuseLighting",
  "feDisplacementMap",
  "feDistantLight",
  "feDropShadow",
  "feFlood",
  "feFuncA",
  "feFuncB",
  "feFuncG",
  "feFuncR",
  "feGaussianBlur",
  "feImage",
  "feMerge",
  "feMergeNode",
  "feMorphology",
  "feOffset",
  "fePointLight",
  "feSpecularLighting",
  "feSpotLight",
  "feTile",
  "feTurbulence",
  "filter",
  "foreignObject",
  "g",
  "image",
  "line",
  "linearGradient",
  "marker",
  "mask",
  "metadata",
  "mpath",
  "path",
  "pattern",
  "polygon",
  "polyline",
  "radialGradient",
  "rect",
  "stop",
  "switch",
  "symbol",
  "text",
  "textPath",
  "tspan",
  "use",
  "view",
] as const;

export interface SubDeps {
  hostVersion: string | undefined;
  React: typeof React;
  ReactDOM: typeof ReactDOM;
  ReactDOMClient?: typeof ReactDOMClient;
  jsxRuntime?: typeof jsxRuntime;
  jsxDevRuntime?: typeof jsxDevRuntime;
  ResizeObserver: typeof ResizeObserver;
  slate: typeof slate;
  slateReact: typeof slateReact;
  localElement: typeof Element;
  createThumbnail: (
    element: HTMLElement,
    opts?: {
      canvasWidth?: number;
      canvasHeight?: number;
      quality?: number;
      filter?: (elem: HTMLElement) => boolean;
      includeQueryParams?: boolean;
    }
  ) => Promise<string>;
  setPlasmicRootNode: (node: React.ReactElement | null) => void;
  repeatedElement: RepeatedElementFnType;
  setRepeatedElementFn?: (fn: RepeatedElementFnType) => void;
  GenericErrorBoundary: React.ComponentType<{ className?: string }>;
  PlasmicCanvasContext?: typeof PlasmicCanvasContext;
  PlasmicQuery?: typeof PlasmicQuery;
  PageParamsProvider: typeof PageParamsProvider;
  DataProvider: typeof DataProvider;
  DataContext: typeof DataContext;
  useDataEnv: typeof useDataEnv;
  createModal: (
    props: Pick<ModalProps, InternalModalProps>
  ) => (restProps: Omit<ModalProps, InternalModalProps>) => JSX.Element;
  DataCtxReader: typeof DataCtxReader;
  reactWeb: typeof ReactWeb;
  dataSources?: typeof PlasmicDataSources;
  dataSourcesContext: typeof PlasmicDataSourcesContext;
  useGlobalActions?: typeof useGlobalActions;
}

type InternalModalProps =
  | "title"
  | "$"
  | "containerSelector"
  | "studioDocument"
  | "domAlign"
  | "popupWidth";

interface ModalProps {
  children?: React.ReactNode;
  title: string;
  containerSelector: string;
  $: typeof $;
  studioDocument: Document;
  onClose: () => void;
  show?: boolean;
  domAlign: typeof domAlign;
  popupWidth?: number;
}
