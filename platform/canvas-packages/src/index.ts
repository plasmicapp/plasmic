// This package is for bundling packages that should run in the canvas frames.
// Those packages need to use the same React as the code components, provided by
// artboardWindow.__Sub.React, so we bundle all those packages here taking
// __Sub.React and __Sub.ReactDOM globals as parameters with rollup, and
// evaluate the generated javascript when each frame loads (but we can fetch the
// code only once when the project loads and store it as a string).

import type domAlign from "dom-align";
import { toPng } from "html-to-image";
import type React from "react";
import ResizeObserver from "resize-observer-polyfill";
import * as slate from "slate";
import * as slateReact from "slate-react";
import { GenericErrorBoundary } from "./error-boundary";
import { createModal } from "./modals";

// Types copied from subdeps.ts to verify compatibility
// TODO: wab should depend on canvas-packages
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

const __CanvasPkgs: CanvasPkgs = {
  ResizeObserver,
  GenericErrorBoundary,
  slate,
  slateReact,
  localElement: typeof window !== "undefined" ? Element : undefined,
  createModal,
  createThumbnail: toPng,
};

(window as any).__CanvasPkgs = __CanvasPkgs;
