import path from "upath";

export type Substitutions = {
  components?: {
    [key: string]: { projectId?: string; path: string };
  };
};

function substituteComponents(
  componentsDir: string,
  config: any,
  substitutions: Substitutions["components"]
) {
  if (!substitutions) {
    return;
  }
  const seenComponents: Record<string, boolean> = {};
  const markAsSeen = (name: string) => {
    if (seenComponents[name]) {
      console.info(
        `Component ${name} found in multiple projects. Please specify the project id!`
      );
      process.exit(1);
    }
    seenComponents[name] = true;
  };
  config.projects.forEach((project: any) => {
    project.components.forEach((component: any) => {
      if (!substitutions[component.name]) {
        return;
      }
      const { projectId, path: componentPath } = substitutions[component.name];

      if (projectId && projectId !== project.projectId) {
        return;
      }
      if (!projectId) {
        markAsSeen(component.name);
      }
      component.importSpec.modulePath = path.relative(
        componentsDir,
        componentPath
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
