import chalk from "chalk";
import L from "lodash";
import wrapAnsi from "wrap-ansi";
import { logger } from "../deps";
import { PlasmicContext } from "./config-utils";
import { ensure } from "./lang-utils";

function wrap(str: string) {
  return wrapAnsi(str, 60);
}

export function printFirstSyncInfo(context: PlasmicContext) {
  const config = context.config;
  if (config.code.scheme === "blackbox" && config.projects.length > 0) {
    const project = ensure(L.last(config.projects));
    logger.info(
      `\nYour Plasmic project "${project.projectName}" has now been synced to disk.`
    );
    const exampleComponent = project.components[0];
    if (exampleComponent) {
      logger.info(
        `

${chalk.bold("Using Plasmic Components")}
${chalk.bold("------------------------")}

${wrap(
  `For each component, Plasmic generates two React components in two files.  For example, for component ${chalk.bold(
    exampleComponent.name
  )}, there are:`
)}

* A ${chalk.bold("blackbox")} component at ${chalk.bold.underline(
          exampleComponent.renderModuleFilePath
        )}
${wrap(
  `This is a blackbox, purely-presentational library component that you can use to render your designs.  This file is owned by Plasmic, and you should not edit it -- it will be overwritten when the component design is updated. This component should only be used by the "wrapper" component (below).`
)}

* A ${chalk.bold("wrapper")} component at ${chalk.bold.underline(
          exampleComponent.importSpec.modulePath
        )}
${wrap(
  `This component is owned and edited by you to instantiate the Plasmic${exampleComponent.name} component with desired variants, states, event handlers, and data.  You have complete control over this file, and this is the actual component that should be used by the rest of the codebase.`
)}

Learn more at https://www.plasmic.app/learn/codegen-guide/
`
      );
    }

    const exampleIcon = project.icons[0];
    if (exampleIcon) {
      logger.info(
        `
${chalk.bold("Using Icons")}
${chalk.bold("-----------")}

${wrap(
  `For each SVG icon, Plasmic also generates a React component. The component takes in all the usual props that you can pass to an svg element, and defaults to width/height of 1em.`
)}

For example, for the ${chalk.bold(
          exampleIcon.name
        )} icon at ${chalk.bold.underline(exampleIcon.moduleFilePath)},
instantiate it like:

    ${chalk.green(`<${exampleIcon.name} color="red" />`)}

Learn more at https://www.plasmic.app/learn/other-assets/#icons
`
      );
    }
  }
}
