import path from "upath";
import * as logger from "./logger";
import { Substitutions } from "./types";

function substituteComponents(
  componentsDir: string,
  config: any,
  substitutions: Substitutions["components"]
) {
  if (!substitutions) {
    return;
  }
  const componentsMap = Object.fromEntries(
    substitutions.map((elem) => [elem.name, elem])
  );
  const seenComponents: Record<string, boolean> = {};
  const markAsSeen = (name: string) => {
    if (seenComponents[name]) {
      logger.error(
        `Component ${name} found in multiple projects. Please specify the project id!`
      );
      process.exit(1);
    }
    seenComponents[name] = true;
  };
  config.projects.forEach((project: any) => {
    project.components.forEach((component: any) => {
      if (!componentsMap[component.name]) {
        return;
      }
      const { projectId, path: componentPath } = componentsMap[component.name];

      if (projectId && projectId !== project.projectId) {
        return;
      }
      if (!projectId) {
        markAsSeen(component.name);
      }
      component.importSpec.modulePath = path.relative(
        componentsDir,
        path.resolve(componentPath)
      );
    });
  });
}

export function registerSubstitutions(
  plasmicDir: string,
  config: any,
  substitutions: Substitutions
) {
  const componentsDir = path.join(plasmicDir, "components");
  substituteComponents(componentsDir, config, substitutions.components);
}
