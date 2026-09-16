import path from "upath";
import { ComponentBundle } from "../api";
import { maybeConvertTsxToJsx } from "./code-utils";
import { ComponentConfig, PlasmicContext, ProjectConfig } from "./config-utils";
import {
  defaultResourcePath,
  fileExists,
  stripExtension,
  writeFileContent,
} from "./file-utils";

export function makeRscClientModulePath(
  context: PlasmicContext,
  skeletonPath: string,
) {
  const ext = context.config.code.lang === "js" ? "jsx" : "tsx";
  return `${stripExtension(skeletonPath)}-client.${ext}`;
}

export async function syncRscFiles(
  context: PlasmicContext,
  project: ProjectConfig,
  bundle: ComponentBundle,
  compConfig: ComponentConfig,
  opts: {
    shouldRegenerate: boolean;
  },
) {
  const rscMetadata = bundle.rscMetadata;
  if (!rscMetadata) {
    return;
  }

  let serverModuleFilePath = defaultResourcePath(
    context,
    project,
    rscMetadata.pageWrappers.server.fileName,
  );
  let serverModuleContent = rscMetadata.pageWrappers.server.module;
  if (context.config.code.lang === "js") {
    [serverModuleFilePath, serverModuleContent] = await maybeConvertTsxToJsx(
      serverModuleFilePath,
      serverModuleContent,
    );
  }
  if (compConfig.rsc?.serverModulePath) {
    serverModuleFilePath = path.join(
      path.dirname(compConfig.rsc.serverModulePath),
      path.basename(serverModuleFilePath),
    );
  }
  await writeFileContent(context, serverModuleFilePath, serverModuleContent, {
    force: true,
  });

  const existingClientPath = compConfig.rsc?.clientModulePath;
  const clientModuleFilePath =
    existingClientPath ||
    makeRscClientModulePath(context, compConfig.importSpec.modulePath);
  if (opts.shouldRegenerate || !fileExists(context, clientModuleFilePath)) {
    let clientModuleContent = rscMetadata.pageWrappers.client.module;
    if (context.config.code.lang === "js") {
      [, clientModuleContent] = await maybeConvertTsxToJsx(
        rscMetadata.pageWrappers.client.fileName,
        clientModuleContent,
      );
    }
    await writeFileContent(context, clientModuleFilePath, clientModuleContent, {
      force: false,
    });
  }

  compConfig.rsc = {
    serverModulePath: serverModuleFilePath,
    clientModulePath: clientModuleFilePath,
  };
}
