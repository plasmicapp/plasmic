export const CHAKRA_UI_IMPORT_PATH = "@chakra-ui/react";

export const getPlasmicComponentName = (componentName: string) =>
  `chakra-ui-${componentName}`;

export const getDisplayComponentName = (componentName: string) =>
  `Chakra-UI ${componentName}`;

export const getComponentNameAndImportMeta = (
  componentName: string,
  parentComponentName?: string,
  opts?: {
    displayName?: string;
    importPath?: string;
  }
) => ({
  name: getPlasmicComponentName(componentName),
  displayName: opts?.displayName ?? getDisplayComponentName(componentName),
  importPath: opts?.importPath ?? CHAKRA_UI_IMPORT_PATH,
  importName: componentName,
  ...(parentComponentName
    ? { parentComponentName: getPlasmicComponentName(parentComponentName) }
    : {}),
});
