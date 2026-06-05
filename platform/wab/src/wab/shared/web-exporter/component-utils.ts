import { ProjectId } from "@/wab/shared/ApiSchema";
import { toVarName } from "@/wab/shared/codegen/util";
import { Component, Site, TplComponent } from "@/wab/shared/model/classes";

/**
 * Builds the `data-plasmic-*` identity attributes for a `<plasmic-component>`
 * tag from a TplComponent. `data-plasmic-project` is only included when the
 * component comes from an imported project, and `data-plasmic-name` only when
 * the instance is named.
 */
export function serializePlasmicTplComponent(
  site: Site,
  tplComponent: TplComponent
): {
  id: string;
  "data-plasmic-component": string;
  "data-plasmic-project"?: string;
  "data-plasmic-name"?: string;
} {
  const component = tplComponent.component;
  const depProjectId = getDataPlasmicProject(site, component);
  return {
    id: tplComponent.uuid,
    "data-plasmic-component": toVarName(component.name),
    ...(depProjectId ? { "data-plasmic-project": depProjectId } : {}),
    ...(tplComponent.name ? { "data-plasmic-name": tplComponent.name } : {}),
  };
}

/**
 * Resolves the Component referenced by a `<plasmic-component>` tag's attributes.
 *
 * Without `data-plasmic-project` the lookup is restricted to the site's own
 * components. To reference a component from an imported project, the attributes
 * must include `data-plasmic-project`, which scopes the lookup to that single
 * direct dependency.
 */
export function deserializePlasmicComponentAttrs(
  site: Site,
  attrs: {
    "data-plasmic-component": string;
    "data-plasmic-project"?: ProjectId;
  }
): Component | undefined {
  const componentName = attrs["data-plasmic-component"];
  const depProjectId = attrs["data-plasmic-project"];

  let components = site.components;
  if (depProjectId) {
    const dep = site.projectDependencies.find(
      (d) => d.projectId === depProjectId
    );
    components = dep?.site?.components ?? [];
  }

  return components.find(
    (c: Component) => toVarName(c.name) === toVarName(componentName)
  );
}

/**
 * The id of the imported project a component comes from, or undefined when it's
 * defined in the current site. Only direct dependencies are resolved, matching
 * how the component is looked up on use.
 */
function getDataPlasmicProject(
  site: Site,
  component: Component
): string | undefined {
  if (site.components.includes(component)) {
    return undefined;
  }
  return site.projectDependencies.find((dep) =>
    dep.site.components.includes(component)
  )?.projectId;
}
