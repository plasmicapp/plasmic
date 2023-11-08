import { PlasmicHtmlHydrater } from "./hydrater";

const hydrater = (window as any).__plasmicHydrater ?? new PlasmicHtmlHydrater();
(window as any).__plasmicHydrater = hydrater;

if (window.document.readyState === "loading") {
  window.addEventListener("load", () => hydrater.hydrateAll());
} else {
  hydrater.hydrateAll();
}
