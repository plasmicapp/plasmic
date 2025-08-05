import { ComponentBundle } from "../api";
import { ComponentConfig, PlasmicContext, ProjectConfig } from "./config-utils";
import { defaultResourcePath, writeFileContent } from "./file-utils";

export async function syncRscFiles(
  context: PlasmicContext,
  project: ProjectConfig,
  bundle: ComponentBundle,
  compConfig: ComponentConfig,
  opts: {
    shouldRegenerate: boolean;
  }
) {
  const rscMetadata = bundle.rscMetadata;
  if (rscMetadata) {
    if (!compConfig.rsc) {
      compConfig.rsc = {
        serverModulePath: "",
        clientModulePath: "",
      };
    }

    const serverModuleFilePath = defaultResourcePath(
      context,
      project,
      rscMetadata.pageWrappers.server.fileName
    );
    compConfig.rsc.serverModulePath = serverModuleFilePath;

    await writeFileContent(
      context,
      serverModuleFilePath,
      rscMetadata.pageWrappers.server.module,
      {
        force: true,
      }
    );

    const clientModuleFilePath = compConfig.importSpec.modulePath.replace(
      /\.tsx$/,
      "-client.tsx"
    );
    compConfig.rsc.clientModulePath = clientModuleFilePath;

    if (opts.shouldRegenerate) {
      await writeFileContent(
        context,
        clientModuleFilePath,
        rscMetadata.pageWrappers.client.module,
        {
          force: false,
        }
      );
    }
  }
}
