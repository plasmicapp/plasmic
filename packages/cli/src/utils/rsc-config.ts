import { ComponentBundle } from "../api";
import { maybeConvertTsxToJsx } from "./code-utils";
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

    let serverModuleFilePath = defaultResourcePath(
      context,
      project,
      rscMetadata.pageWrappers.server.fileName
    );
    let serverModuleContent = rscMetadata.pageWrappers.server.module;

    if (context.config.code.lang === "js") {
      const [convertedFileName, convertedContent] = await maybeConvertTsxToJsx(
        serverModuleFilePath,
        serverModuleContent
      );
      serverModuleFilePath = convertedFileName;
      serverModuleContent = convertedContent;
    }
    compConfig.rsc.serverModulePath = serverModuleFilePath;

    await writeFileContent(context, serverModuleFilePath, serverModuleContent, {
      force: true,
    });

    let clientModuleFilePath = compConfig.importSpec.modulePath.replace(
      /\.(tsx|jsx)$/,
      "-client.tsx"
    );
    let clientModuleContent = rscMetadata.pageWrappers.client.module;

    if (context.config.code.lang === "js") {
      const [convertedFileName, convertedContent] = await maybeConvertTsxToJsx(
        clientModuleFilePath,
        clientModuleContent
      );
      clientModuleFilePath = convertedFileName;
      clientModuleContent = convertedContent;
    }

    compConfig.rsc.clientModulePath = clientModuleFilePath;

    if (opts.shouldRegenerate) {
      await writeFileContent(
        context,
        clientModuleFilePath,
        clientModuleContent,
        {
          force: false,
        }
      );
    }
  }
}
