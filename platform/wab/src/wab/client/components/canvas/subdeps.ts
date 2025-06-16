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

// Most (not all) of these deps are provided by @plasmicapp/host.
// TODO: Clearly indicate where each dep comes from.
export type SubDeps = {
  hostVersion: string | undefined;
  React: typeof React;
  ReactDOM: typeof ReactDOM;
  // Only available in @plasmicapp/host@>=2.0.0
  ReactDOMClient?: typeof ReactDOMClient;
  jsxRuntime?: typeof jsxRuntime;
  jsxDevRuntime?: typeof jsxDevRuntime;
  setPlasmicRootNode: (node: React.ReactElement | null) => void;
  repeatedElement: RepeatedElementFnType;
  setRepeatedElementFn?: (fn: RepeatedElementFnType) => void;
  PlasmicCanvasContext?: typeof PlasmicCanvasContext;
  PlasmicQuery?: typeof PlasmicQuery;
  PageParamsProvider: typeof PageParamsProvider;
  DataProvider: typeof DataProvider;
  DataContext: typeof DataContext;
  useDataEnv: typeof useDataEnv;
  DataCtxReader: typeof DataCtxReader;
  reactWeb: typeof ReactWeb;
  dataSources?: typeof PlasmicDataSources;
  dataSourcesContext: typeof PlasmicDataSourcesContext;
  useGlobalActions?: typeof useGlobalActions;
} & CanvasPkgs;

// Make sure this matches the type in canvas-packages/src/index.ts
interface CanvasPkgs {
  ResizeObserver: typeof ResizeObserver;
  GenericErrorBoundary: React.ComponentType<{ className?: string }>;
  slate: typeof slate;
  slateReact: typeof slateReact;
  localElement?: typeof Element;
  createModal: (
    props: Pick<ModalProps, InternalModalProps>
  ) => (restProps: Omit<ModalProps, InternalModalProps>) => JSX.Element;
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
