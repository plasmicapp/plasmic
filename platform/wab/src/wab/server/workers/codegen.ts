import { toOpaque } from "@/wab/commons/types";
import { uploadDataUriToS3 } from "@/wab/server/cdn/images";
import {
  ensureDbConnections,
  getDefaultConnection,
} from "@/wab/server/db/DbCon";
import { DbMgr, SUPER_USER } from "@/wab/server/db/DbMgr";
import { withSpan } from "@/wab/server/util/apm-util";
import { md5 } from "@/wab/server/util/hash";
import { getHostlessPackageNpmVersion } from "@/wab/server/util/hostless-pkg-util";
import { ensureDevFlags } from "@/wab/server/workers/worker-utils";
import { Bundler } from "@/wab/shared/bundler";
import { componentToReferenced } from "@/wab/shared/cached-selectors";
import {
  IconAssetExport,
  PictureAssetExport,
  exportPictureAsset,
  extractUsedPictureAssetsForComponents,
} from "@/wab/shared/codegen/image-assets";
import {
  exportProjectConfig,
  exportStyleConfig,
} from "@/wab/shared/codegen/react-p";
import { exportSiteComponents } from "@/wab/shared/codegen/react-p/gen-site-bundle";
import {
  ActiveSplit,
  exportActiveSplitsConfig,
} from "@/wab/shared/codegen/splits";
import { TheoTokensOutput } from "@/wab/shared/codegen/style-tokens";
import {
  ChecksumBundle,
  ComponentExportOutput,
  CustomFunctionConfig,
  ExportOpts,
  ProjectConfig,
  StyleConfig,
  emptyChecksumBundle,
} from "@/wab/shared/codegen/types";
import { GlobalVariantConfig } from "@/wab/shared/codegen/variants";
import { UnexpectedTypeError, ensure, withoutNils } from "@/wab/shared/common";
import {
  CodeComponentConfig,
  isPageComponent,
} from "@/wab/shared/core/components";
import { ImageAssetType } from "@/wab/shared/core/image-asset-type";
import { allComponents } from "@/wab/shared/core/sites";
import { initBuiltinActions } from "@/wab/shared/core/states";
import { deepTrackComponents } from "@/wab/shared/core/tpls";
import { asDataUrl } from "@/wab/shared/data-urls";
import { isAdminTeamEmail } from "@/wab/shared/devflag-utils";
import { DEVFLAGS, getProjectFlags } from "@/wab/shared/devflags";
import { Site } from "@/wab/shared/model/classes";
import S3 from "aws-sdk/clients/s3";
import fs from "fs";
import type { OverrideProperties, SetOptional } from "type-fest";
import { ConnectionOptions } from "typeorm";

/**
 * Cached codegen output. Use this type if you changed the output structure
 * in a backward-compatible way that does not require cache busting.
 *
 * This can be reset if LOADER_CACHE_BUST is incremented.
 */
export type CachedCodegenOutputBundle =
  | CodegenOutputBundle
  | OverrideProperties<
      CodegenOutputBundle,
      {
        projectConfig: SetOptional<
          ProjectConfig,
          | "hasStyleTokenOverrides"
          | "projectModuleBundle"
          | "styleTokensProviderBundle"
        >;
      }
    >;

/**
 * Codegen output for a project.
 *
 * This can be cached in external storage, so the data structure may differ
 * from a freshly generated output unless you increment LOADER_CACHE_BUST.
 */
export interface CodegenOutputBundle {
  components: ComponentExportOutput[];
  iconAssets: IconAssetExport[];
  imageAssets: PictureAssetExport[];
  globalVariants: GlobalVariantConfig[];
  projectConfig: ProjectConfig;
  codeComponentMetas: CodeComponentConfig[];
  customFunctionMetas: CustomFunctionConfig[];
  usedTokens: TheoTokensOutput;
  defaultStyles: StyleConfig;
  usedNpmPackages: string[];
  externalCssImports: string[];
  activeSplits: ActiveSplit[];
}

export interface ComponentReference {
  id: string;
  name: string;
  projectId: string;
  projectName: string;
}

interface CodegenOpts {
  connectionOptions: ConnectionOptions;
  projectId: string;
  exportOpts: ExportOpts;
  componentIdOrNames?: string[];
  maybeVersionOrTag?: string;
  existingChecksums?: ChecksumBundle;
  // if we are generating code for the loader, we don't need the checksums
  skipChecksums?: boolean;
  // indirect=true means that projectId was not directly synced, but is
  // imported by a project that was synced. It is used to avoid generating
  // pages for such projects.
  indirect: boolean;
  scheme: "blackbox" | "plain";
}

export async function workerGenCode(opts: CodegenOpts) {
  await ensureDbConnections(opts.connectionOptions);
  const connection = await getDefaultConnection();
  try {
    return await connection.transaction(async () => {
      // Note that we are assuming SUPER_USER, so any permission
      // checks should've already happened before this worker is
      // invoked.
      const mgr = new DbMgr(connection.createEntityManager(), SUPER_USER);
      await ensureDevFlags(mgr);
      return await doGenCode(mgr, opts);
    });
  } finally {
    if (connection.isConnected) {
      await connection.close();
    }
  }
}

export async function doGenCode(
  mgr: DbMgr,
  opts: Omit<CodegenOpts, "connectionOptions">
) {
  const {
    projectId,
    exportOpts,
    componentIdOrNames,
    maybeVersionOrTag,
    indirect,
  } = opts;
  const project = await mgr.getProjectById(projectId);
  const bundler = new Bundler();
  const { site, unbundledAs, revisionNumber, revisionId, version } =
    await mgr.tryGetPkgVersionByProjectVersionOrTag(
      bundler,
      projectId,
      maybeVersionOrTag
    );

  // TODO: We need to populate some weak maps in tpls.ts mapping component
  // root to components, so that things like getTplOwnerComponent() will work.
  deepTrackComponents(site);

  const s3ImageLinks = Object.fromEntries(
    site.imageAssets
      .filter((asset) => asset.dataUri && asset.dataUri.startsWith("http"))
      .map((asset) => [asset.uuid, asset.dataUri as string])
  );

  // Just using the default DEVFLAGS here
  if (isAdminTeamEmail(project.createdBy?.email, DEVFLAGS)) {
    exportOpts.isPlasmicTeamUser = true;
  }
  // List of checksums as [image id, checksum]
  // We compute them beforehand to avoid downloading from S3
  const imageAssetChecksums: Array<[string, string]> = [];
  const existingImageChecksums = new Map(
    opts.existingChecksums?.imageChecksums ?? []
  );
  const imagesToFilter = new Set<string>();

  if (opts.exportOpts.imageOpts.scheme !== "cdn") {
    site.imageAssets.forEach((image) => {
      if (image.type === ImageAssetType.Picture && image.dataUri) {
        const i = exportPictureAsset(image, {
          ...opts.exportOpts,
          data: image.dataUri,
        });
        const imageChecksum = md5(JSON.stringify(i));
        if (!opts.skipChecksums) {
          imageAssetChecksums.push([i.id, imageChecksum]);
        }
        // Note that when image scheme is "inlined", we always need to
        // download images from S3 in order to inline them in the code.
        if (
          imageChecksum === existingImageChecksums.get(i.id) &&
          opts.exportOpts.imageOpts.scheme !== "inlined"
        ) {
          imagesToFilter.add(i.id);
        }
      }
    });
  }

  // Fetch images that contain links to our S3 bucket
  if (opts.exportOpts.imageOpts.scheme === "cdn") {
    await ensureImageAssetsOnS3(site);
  } else if (opts.exportOpts.imageOpts.scheme === "inlined") {
    // For inlined, we always have to download the images from S3
    // so we can inline it into generated code
    await fetchImageAssetsFromS3(site);
  } else {
    // We used to fetch image assets from S3 on the server, and send the
    // blobs down to the cli. But for projects with a lot of images,
    // this often trips our 3-minute time limit for codegen. So instead,
    // we send down urls to the cli, and let cli do the fetching.
  }

  const projectConfig = await withSpan(
    "loader-export-project-config",
    async () =>
      exportProjectConfig(
        site,
        project.name,
        projectId,
        revisionNumber,
        revisionId,
        version,
        exportOpts,
        indirect,
        opts.scheme
      ),
    `Project ${projectId}`
  );

  if (project.workspace?.teamId) {
    projectConfig.teamId = project.workspace?.teamId;
  }

  const projectDomains = await mgr.getDomainsForProject(toOpaque(projectId));
  // This may not be accurate, it only means that the user registered a domain in the project
  const isPlasmicHosted = projectDomains.length > 0;

  const appAuthConfig = await mgr.getPublicAppAuthConfig(projectId);

  const forceAllCsr = !!appAuthConfig;
  const appAuthProvider = appAuthConfig?.provider;

  initBuiltinActions({
    projectId,
    platform: exportOpts.platform,
    projectFlags: getProjectFlags(site),
    inStudio: false,
  });

  try {
    const {
      componentBundles,
      codeComponentMetas,
      globalVariantBundles,
      tokens,
      iconAssets,
      imageAssets,
      customFunctionMetas,
    } = exportSiteComponents(site, {
      scheme: opts.scheme,
      projectConfig,
      componentIdOrNames,
      componentExportOpts: exportOpts,
      s3ImageLinks,
      imagesToFilter,
      includePages: !indirect,
      isPlasmicHosted,
      forceAllCsr,
      appAuthProvider,
    });

    // Register that project has been synced
    await tryCreateEmptyProjectSyncMetadata(
      mgr,
      projectId,
      projectConfig.revision,
      projectConfig.projectRevId
    );

    // TODO: remove iconAssets from return value. CLI is already configured to explicitly retrieve icons after sync resolution
    const output: CodegenOutputBundle = {
      components: componentBundles,
      codeComponentMetas,
      customFunctionMetas,
      projectConfig,
      globalVariants: globalVariantBundles,
      usedTokens: tokens,
      iconAssets,
      imageAssets,
      defaultStyles: exportStyleConfig(opts.exportOpts),
      externalCssImports: site.hostLessPackageInfo?.cssImport ?? [],
      usedNpmPackages: makeNpmPackagesWithVersions(site) ?? [],
      activeSplits: exportActiveSplitsConfig(site, projectId),
    };

    const existingChecksums = opts.existingChecksums ?? emptyChecksumBundle();
    const newChecksums = emptyChecksumBundle();
    if (!opts.skipChecksums) {
      newChecksums.imageChecksums = imageAssetChecksums;
      filterAndUpdateChecksums(
        output,
        existingChecksums,
        newChecksums,
        imagesToFilter
      );
    }

    const componentRefs: ComponentReference[] = site.components.map((c) => {
      return {
        id: c.uuid,
        name: c.name,
        projectId,
        projectName: project.name,
      };
    });
    return {
      output,
      site,
      checksums: newChecksums,
      componentDeps: getComponentDeps(site, appAuthProvider),
      componentRefs,
    };
  } catch (error) {
    if (
      error instanceof UnexpectedTypeError &&
      global &&
      !(global as any).badExport
    ) {
      (global as any).badExport = { bundler, site };
      const { model } = await mgr.tryGetPkgVersionByProjectVersionOrTag(
        bundler,
        projectId,
        maybeVersionOrTag,
        true
      );
      if (model) {
        fs.writeFileSync(
          `/tmp/corrupt-unbundle-${projectId}--${unbundledAs}.json`,
          JSON.stringify(JSON.parse(model), undefined, 2)
        );
      }
    }
    throw error;
  }
}

function getComponentDeps(site: Site, appAuthProvider?: string) {
  const componentDeps: Record<string, string[]> = Object.fromEntries(
    allComponents(site).map((c) => {
      let depComps = componentToReferenced(c);

      // A super component always references its subcomponents,
      // so say a Select always pulls in Select.Option, even if
      // it's not using it
      if (c.subComps.length > 0) {
        depComps = [...depComps, ...c.subComps];
      }

      if (
        isPageComponent(c) &&
        appAuthProvider &&
        site.defaultComponents.unauthorized
      ) {
        depComps = [...depComps, site.defaultComponents.unauthorized];
      }
      return [c.uuid, depComps.map((d) => d.uuid)];
    })
  );
  return componentDeps;
}

async function tryCreateEmptyProjectSyncMetadata(
  mgr: DbMgr,
  projectId: string,
  revision: number,
  projectRevId: string
) {
  const projectSyncMetadata = await mgr.tryGetProjectSyncMetadata(
    projectId,
    revision
  );
  if (!projectSyncMetadata) {
    await mgr.createProjectSyncMetadata(
      projectId,
      revision,
      projectRevId,
      "[]"
    );
  }
}

function filterAndUpdateChecksums(
  output: CodegenOutputBundle,
  previousChecksums: ChecksumBundle,
  currentChecksums: ChecksumBundle,
  imagesToFilter: Set<string>
) {
  const renderModuleChecksums = new Map(
    previousChecksums.renderModuleChecksums
  );
  const cssRulesChecksums = new Map(previousChecksums.cssRulesChecksums);
  const iconChecksums = new Map(previousChecksums.iconChecksums);
  const globalVariantChecksums = new Map(
    previousChecksums.globalVariantChecksums
  );

  output.components = withoutNils(
    output.components.map((c) => {
      // const renderModuleChecksum = md5(c.renderModule);
      // const cssRulesChecksum = md5(c.cssRules);

      // For now, we generate only one checksum with all component data.
      // TODO: filter just the file content, but still send the component data
      // even if the files didn't change, as we might need it e.g. when changing
      // the page path.
      const componentChecksum = md5(JSON.stringify(c));
      currentChecksums.renderModuleChecksums.push([c.id, componentChecksum]);
      currentChecksums.cssRulesChecksums.push([c.id, componentChecksum]);
      if (
        componentChecksum === renderModuleChecksums.get(c.id) &&
        componentChecksum === cssRulesChecksums.get(c.id)
      ) {
        return undefined;
      }
      return c;
    })
  );

  output.iconAssets = withoutNils(
    output.iconAssets.map((i) => {
      const iconChecksum = md5(JSON.stringify(i));
      currentChecksums.iconChecksums.push([i.id, iconChecksum]);
      if (iconChecksum === iconChecksums.get(i.id)) {
        return undefined;
      }
      return i;
    })
  );

  output.imageAssets = output.imageAssets.filter(
    (i) => !imagesToFilter.has(i.id)
  );

  output.globalVariants = withoutNils(
    output.globalVariants.map((gv) => {
      const variantChecksum = md5(JSON.stringify(gv));
      currentChecksums.globalVariantChecksums.push([gv.id, variantChecksum]);
      if (variantChecksum === globalVariantChecksums.get(gv.id)) {
        return undefined;
      }
      return gv;
    })
  );

  const cssChecksum = md5(output.projectConfig.cssRules);
  currentChecksums.projectCssChecksum = cssChecksum;
  if (
    previousChecksums.projectCssChecksum &&
    previousChecksums.projectCssChecksum === cssChecksum
  ) {
    output.projectConfig.cssRules = "";
  }

  if (output.projectConfig.projectModuleBundle) {
    const projectModuleChecksum = md5(
      output.projectConfig.projectModuleBundle.module
    );
    if (previousChecksums.projectModuleChecksum === projectModuleChecksum) {
      // TODO: handle checksum equal on CLI
      //output.projectConfig.projectModuleBundle.module = "";
    }
    currentChecksums.projectModuleChecksum = projectModuleChecksum;
  }

  if (output.projectConfig.styleTokensProviderBundle) {
    const styleTokensProviderChecksum = md5(
      output.projectConfig.styleTokensProviderBundle.module
    );
    if (
      previousChecksums.styleTokensProviderChecksum ===
      styleTokensProviderChecksum
    ) {
      // TODO: handle checksum equal on CLI
      //output.projectConfig.styleTokensProviderBundle.module = "";
    }
    currentChecksums.styleTokensProviderChecksum = styleTokensProviderChecksum;
  }

  if (output.projectConfig.dataTokensBundle) {
    const dataTokensChecksum = md5(
      output.projectConfig.dataTokensBundle.module
    );
    if (previousChecksums.dataTokensChecksum === dataTokensChecksum) {
      // TODO: handle checksum equal on CLI
      //output.projectConfig.dataTokensBundle.module = "";
    }
    currentChecksums.dataTokensChecksum = dataTokensChecksum;
  }

  if (output.projectConfig.globalContextBundle) {
    const globalContextsChecksum = md5(
      output.projectConfig.globalContextBundle.contextModule
    );
    if (previousChecksums.globalContextsChecksum === globalContextsChecksum) {
      output.projectConfig.globalContextBundle = undefined;
    }
    currentChecksums.globalContextsChecksum = globalContextsChecksum;
  }

  if (output.projectConfig.splitsProviderBundle) {
    const splitsProviderChecksum = md5(
      output.projectConfig.splitsProviderBundle.module
    );
    if (previousChecksums.splitsProviderChecksum === splitsProviderChecksum) {
      output.projectConfig.splitsProviderBundle = undefined;
    }
    currentChecksums.splitsProviderChecksum = splitsProviderChecksum;
  }
}

async function ensureImageAssetsOnS3(site: Site) {
  return Promise.all(
    site.imageAssets
      .filter((x) => x.type === "picture" && x.dataUri)
      .map(async (asset) => {
        const res = await uploadDataUriToS3(
          ensure(asset.dataUri, "Data URI must not be nullish")
        );
        if (!res.result.isError) {
          asset.dataUri = res.result.value;
        }
      })
  );
}

const siteAssetsBucket = process.env.SITE_ASSETS_BUCKET as string;
/**
 * Converts ImageAsset.uri from s3 link to data:, MUTATING the data object!
 * Includes all referenced ImageAssets from site -- INCLUDING imported ones!
 */
async function fetchImageAssetsFromS3(site: Site) {
  const usedAssets = extractUsedPictureAssetsForComponents(
    site,
    site.components,
    { includeRuleSets: true, expandMixins: true }
  );
  await Promise.all(
    Array.from(usedAssets).map(async (i) => {
      if (!i.dataUri || i.dataUri.startsWith("data:")) {
        return;
      }
      const storagePath = new URL(i.dataUri).pathname.replace(/^\//, "");
      const res = await new S3({ endpoint: process.env.S3_ENDPOINT })
        .getObject({
          Bucket: siteAssetsBucket,
          Key: storagePath,
        })
        .promise();
      i.dataUri = asDataUrl(
        Buffer.from(
          ensure(res.Body, "Unexpected null body response") as string
        ),
        ensure(res.ContentType, "Unexpected response with no contentType")
      );
    })
  );
}

function makeNpmPackagesWithVersions(site: Site) {
  return site.hostLessPackageInfo?.npmPkg?.map((pkg) => {
    const version = getHostlessPackageNpmVersion(pkg);
    if (version) {
      return `${pkg}@${version}`;
    } else {
      return pkg;
    }
  });
}
