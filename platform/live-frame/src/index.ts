import "@plasmicapp/react-web/lib/plasmic.css";
import "./live.css";
import { createPreview } from "./preview";
import { createRenderer } from "./render";
import { createLiveRuntime } from "./runtime";
import type { LiveFrame, WindowWithLiveFrame } from "./types";

const w = window as any;
const Sub = w.__Sub;

const runtime = createLiveRuntime({
  react: Sub.React,
  "react-dom": Sub.ReactDOM,
  "@plasmicapp/host": Sub,
  "@plasmicapp/react-web": w.__PlasmicReactWebBundle,
  "@plasmicapp/data-sources-context": w.__PlasmicDataSourcesContextBundle,
  // The import at the top of this file already inserted the real CSS.
  "@plasmicapp/react-web/lib/plasmic.css": {},
  ...(Sub.PlasmicQuery && {
    "@plasmicapp/query": Sub.PlasmicQuery,
    "@plasmicapp/react-web/lib/data-sources": w.__PlasmicDataSourcesBundle,
  }),
});

const renderer = createRenderer(Sub);
const preview = createPreview(Sub, runtime.require, renderer.renderRoot);

const live: LiveFrame = {
  ...renderer,
  setProps: preview.setProps,
  setGlobals: preview.setGlobals,
  async update(modules, render) {
    runtime.update(modules);
    if (render) {
      await preview.render(render);
    }
  },
};
(window as WindowWithLiveFrame).__plasmicLive = live;
