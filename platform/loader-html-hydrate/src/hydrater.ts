import {
  hydrateFromElement,
  initPlasmicLoader,
} from "@plasmicapp/loader-react";

export class PlasmicHtmlHydrater {
  async hydrateElement(element: HTMLElement) {
    const projectId = element.getAttribute("data-plasmic-project-id");
    const version = element.getAttribute("data-plasmic-project-version");
    const component = element.getAttribute("data-plasmic-component");
    const token = element.getAttribute("data-plasmic-project-token");
    const componentDataString = element.getAttribute(
      "data-plasmic-component-data"
    );

    const noData = !(token || componentDataString);
    if (!(projectId && component) || noData) {
      return;
    }

    const componentProps = JSON.parse(
      element.getAttribute("data-plasmic-component-props") || "{}"
    );
    const globalVariants = JSON.parse(
      element.getAttribute("data-plasmic-global-variants") || "[]"
    );

    const prefetchedQueryData = JSON.parse(
      element.getAttribute("data-plasmic-prefetched-query-data") || "{}"
    );

    const loader = initPlasmicLoader({
      projects: [
        {
          id: projectId,
          version: version ?? undefined,
          token: token ?? "",
        },
      ],
    });

    element.setAttribute("data-plasmic-hydrating", "true");
    const data = componentDataString
      ? JSON.parse(componentDataString)
      : await loader.fetchComponentData({ name: component, projectId });
    await hydrateFromElement(
      loader,
      element,
      { name: component, projectId },
      {
        prefetchedData: data,
        globalVariants,
        componentProps,
        prefetchedQueryData,
      }
    );
    element.setAttribute("data-plasmic-hydrating", "false");
    element.setAttribute("data-plasmic-hydrated", "true");
  }

  async hydrateAll() {
    const elements = Array.from(
      document.querySelectorAll(`[data-plasmic-component]`)
    ).filter(
      (elt) =>
        !elt.getAttribute("data-plasmic-hydrating") &&
        !elt.getAttribute("data-plasmic-hydrated")
    );

    return await Promise.all(
      elements.map((elt) => this.hydrateElement(elt as HTMLElement))
    );
  }
}
