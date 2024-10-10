// This package is for bundling packages that should run in the canvas frames.
// Those packages need to use the same React as the code components, provided by
// artboardWindow.__Sub.React, so we bundle all those packages here taking
// __Sub.React and __Sub.ReactDOM globals as parameters with rollup, and
// evaluate the generated javascript when each frame loads (but we can fetch the
// code only once when the project loads and store it as a string).

import { toPng } from "html-to-image";
import ResizeObserver from "resize-observer-polyfill";
import * as slate from "slate";
import * as slateReact from "slate-react";
import { GenericErrorBoundary } from "./error-boundary";
import { createModal } from "./modals";

(window as any).__CanvasPkgs = {
  ResizeObserver,
  GenericErrorBoundary,
  slate,
  slateReact,
  localElement: typeof window !== "undefined" ? Element : undefined,
  createModal,
  createThumbnail: toPng,
};
