import { CodegenOutputBundle } from "@/wab/server/workers/codegen";
import { stripExtension, toVarName } from "@/wab/shared/codegen/util";
import { promises as fs } from "fs";
import { uniq } from "lodash";
import path from "path";

export async function writeCodeBundlesToDisk(
  dir: string,
  outputs: CodegenOutputBundle[]
) {
  // Create a fake package.json
  await fs.writeFile(path.join(dir, "package.json"), `{}`);

  // Install @plasmicapp/react-web so it is baked into the generated bundle.
  const nodeModulesPath = path.resolve(
    path.join(process.cwd(), "..", "loader-bundle-env", "node_modules")
  );
  console.log("Using node_modules at", nodeModulesPath);
  await fs.symlink(nodeModulesPath, path.join(dir, "node_modules"));

  // Write the generated output
  for (const output of outputs) {
    await writeCodeBundleToDisk(dir, output);
  }

  // Write a file that just imports and exports PlasmicRootProvider fromr eact-web
  await fs.writeFile(
    path.join(dir, "root-provider.tsx"),
    `
import {PlasmicRootProvider} from "@plasmicapp/react-web/skinny";
export default PlasmicRootProvider;
    `
  );

  // entrypoint.tsx exports all the generated components, variants, and
  // root-provider.
  await fs.writeFile(
    path.join(dir, "entrypoint.tsx"),
    `
export const root_provider = import("./root-provider");
${outputs
  .flatMap((output) =>
    output.components.map(
      (comp) =>
        `export const comp__${toVarName(comp.id)} = import("./${stripExtension(
          comp.isPage ? comp.renderModuleFileName : comp.skeletonModuleFileName
        )}");`
    )
  )
  .join("\n")}
${outputs
  .map((output) =>
    output.projectConfig.globalContextBundle
      ? `export const context__${makeGlobalContextsProviderImportName(
          output.projectConfig.projectId
        )} = import("./${makeGlobalContextsProviderFileName(
          output.projectConfig.projectId
        )}");`
      : ""
  )
  .join("\n")}
${outputs
  .flatMap((output) =>
    output.globalVariants.map(
      (v) =>
        `export const variant__${toVarName(v.id)} = import("./${stripExtension(
          v.contextFileName
        )}");`
    )
  )
  .join("\n")}
`
  );

  // We use postcss to bundle up "common", non-component css into one css chunk.
  // Unfortunately, when postcss plugin tries to figure out the right order
  // to write the different css files, it just randomly uses the first entry point.
  // So we need to make sure that the first entrypoint actually contains the right
  // ordering of css files :-/
  await fs.writeFile(
    path.join(dir, "css-entrypoint.tsx"),
    `
    ${uniq(outputs.flatMap((output) => output.externalCssImports))
      .map((i) => `import "${i}";`)
      .join("\n")}
    import "@plasmicapp/react-web/lib/plasmic.css";
    import "./${outputs[0].defaultStyles.defaultStyleCssFileName}";
    ${outputs
      .map((output) => `import "./${output.projectConfig.cssFileName}";`)
      .join("\n")}
    `
  );
}

async function writeCodeBundleToDisk(dir: string, output: CodegenOutputBundle) {
  for (const comp of output.components) {
    await fs.writeFile(
      path.join(dir, comp.renderModuleFileName),
      comp.renderModule
    );
    await fs.writeFile(
      path.join(dir, comp.skeletonModuleFileName),
      comp.skeletonModule
    );
    await fs.writeFile(path.join(dir, comp.cssFileName), comp.cssRules);

    if (comp.rscMetadata?.serverQueriesExecFunc) {
      await fs.writeFile(
        path.join(dir, comp.rscMetadata!.serverQueriesExecFunc.fileName),
        comp.rscMetadata!.serverQueriesExecFunc.module
      );
    }
  }

  for (const icon of output.iconAssets) {
    await fs.writeFile(path.join(dir, icon.fileName), icon.module);
  }

  for (const img of output.imageAssets) {
    await fs.writeFile(
      path.join(dir, img.fileName),
      Buffer.from(img.blob, "base64")
    );
  }

  for (const globalVariant of output.globalVariants) {
    await fs.writeFile(
      path.join(dir, globalVariant.contextFileName),
      globalVariant.contextModule
    );
  }

  await fs.writeFile(
    path.join(dir, output.projectConfig.cssFileName),
    output.projectConfig.cssRules
  );
  await fs.writeFile(
    path.join(dir, output.defaultStyles.defaultStyleCssFileName),
    output.defaultStyles.defaultStyleCssRules
  );
  if (output.projectConfig.globalContextBundle) {
    await fs.writeFile(
      path.join(
        dir,
        makeGlobalContextsProviderFileName(output.projectConfig.projectId)
      ),
      output.projectConfig.globalContextBundle.contextModule
    );
  }
}

export function makeGlobalContextsProviderImportName(projectId: string) {
  return `global__${projectId}`;
}

export function makeGlobalContextsProviderFileName(projectId: string) {
  return `global__${projectId}.tsx`;
}
