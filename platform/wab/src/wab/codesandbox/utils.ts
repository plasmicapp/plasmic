import { Component, Site } from "@/wab/classes";
import {
  deleteModule,
  getSandbox,
  updateFileContent,
  uploadContents,
  uploadSandbox,
} from "@/wab/codesandbox/api";
import parseSandbox from "@/wab/codesandbox/parse-sandbox";
import uploadFiles from "@/wab/codesandbox/parse-sandbox/upload-files";
import { ensure } from "@/wab/common";
import { CodeComponentConfig } from "@/wab/components";
import { getImageAssetVarName } from "@/wab/image-assets";
import {
  getImageFilename,
  IconAssetExport,
} from "@/wab/shared/codegen/image-assets";
import {
  ComponentExportOutput,
  ExportOpts,
  ProjectConfig,
  StyleConfig,
} from "@/wab/shared/codegen/types";
import { toClassName, toVarName } from "@/wab/shared/codegen/util";
import { GlobalVariantConfig } from "@/wab/shared/codegen/variants";
import { allImageAssets } from "@/wab/sites";
import {
  IModule,
  INormalizedModules,
  ISandbox,
  ISandboxDirectory,
  ISandboxFile,
} from "codesandbox-import-util-types";
import createSandbox from "codesandbox-import-utils/lib/create-sandbox";
import denormalize from "codesandbox-import-utils/lib/utils/files/denormalize";
import latestVersion from "latest-version";
import L from "lodash";

const CURRENT_VERSION = "1.0.0";
const revisionFilePath = "revision.txt";
const versionFilename = "version.txt";
const sandboxBasePath = "sandboxBase";

interface CodesandboxOpts {
  pathOfAutoGenDirInSrc: string;
  pathOfAutoGenDir: string;
  pathOfImplDirInSrc: string;
  pathOfImplDir: string;
  codegenOpts: ExportOpts;
}

export const getCodesandboxOpts = (version: string | null): CodesandboxOpts => {
  if (version === "1.0.0") {
    const pathOfAutoGenDirInSrc = "components/plasmic";
    const pathOfImplDirInSrc = "components";
    return {
      pathOfAutoGenDirInSrc,
      pathOfAutoGenDir: `src/${pathOfAutoGenDirInSrc}`,
      pathOfImplDirInSrc,
      pathOfImplDir: `src/${pathOfImplDirInSrc}`,
      codegenOpts: {
        lang: "ts",
        platform: "react",
        relPathFromImplToManagedDir: "./plasmic",
        relPathFromManagedToImplDir: "../",
        imageOpts: { scheme: "public-files" },
        stylesOpts: { scheme: "css" },
        codeOpts: { reactRuntime: "classic" },
        fontOpts: { scheme: "import" },
        codeComponentStubs: false,
        skinnyReactWeb: false,
        skinny: false,
        importHostFromReactWeb: true,
        hostLessComponentsConfig: "package",
        useComponentSubstitutionApi: false,
        useGlobalVariantsSubstitutionApi: false,
        useCodeComponentHelpersRegistry: false,
        useCustomFunctionsStub: false,
        targetEnv: "codegen",
      },
    };
  } else if (!version) {
    const pathOfAutoGenDirInSrc = "plasmic/gen";
    const pathOfImplDirInSrc = "plasmic/impl";
    return {
      pathOfAutoGenDirInSrc,
      pathOfAutoGenDir: `src/${pathOfAutoGenDirInSrc}`,
      pathOfImplDirInSrc,
      pathOfImplDir: `src/${pathOfImplDirInSrc}`,
      codegenOpts: {
        lang: "ts",
        platform: "react",
        relPathFromImplToManagedDir: "../gen",
        relPathFromManagedToImplDir: "../impl",
        imageOpts: { scheme: "public-files" },
        stylesOpts: { scheme: "css" },
        codeOpts: { reactRuntime: "classic" },
        fontOpts: { scheme: "import" },
        codeComponentStubs: false,
        skinnyReactWeb: false,
        importHostFromReactWeb: true,
        skinny: false,
        hostLessComponentsConfig: "package",
        useComponentSubstitutionApi: false,
        useGlobalVariantsSubstitutionApi: false,
        useCodeComponentHelpersRegistry: false,
        useCustomFunctionsStub: false,
        targetEnv: "codegen",
      },
    };
  }

  throw new Error(`Got an invalid value for version.txt ${version}`);
};

export const getVersionTxt = (existingSandbox: ISandbox) => {
  const module = existingSandbox.modules.find(
    (m) => m.title === versionFilename
  );
  const version = module ? module.code : null;
  return version;
};

export const createNewSandbox = async (projectName: string, token: string) => {
  const fileData = await parseSandbox(sandboxBasePath);
  let finalFiles = fileData.files;

  // Upload binary files to codesandbox.io, and make content refer to its URL.
  if (Object.keys(fileData.uploads).length) {
    const uploadedFiles = await uploadFiles(token, fileData.uploads);

    finalFiles = { ...finalFiles, ...uploadedFiles };
  }
  const packageJson = finalFiles["package.json"] as IModule;
  packageJson.content = packageJson.content.replace(
    "@PACKAGE_NAME@",
    L.kebabCase(toClassName(projectName))
  );

  // Add a version.txt file to embody the sandbox version
  finalFiles[versionFilename] = {
    content: CURRENT_VERSION,
    isBinary: false,
    type: "file",
  };

  // Create the denormalized representation of the files.
  const sandbox: ISandbox = await createSandbox(finalFiles);
  const sandboxData = await uploadSandbox(token, sandbox);
  return sandboxData.id as string;
};

function makeModuleFileName(
  dirs: ISandboxDirectory[],
  module: ISandboxFile | ISandboxDirectory
) {
  const findPath = (
    file: ISandboxFile | ISandboxDirectory
  ): (ISandboxFile | ISandboxDirectory)[] => {
    if (!file.directoryShortid) {
      return [file];
    }
    const dir = dirs.find((d) => d.shortid === file.directoryShortid);
    return [...findPath(dir!), file];
  };
  const path = findPath(module);
  return path.map((p) => p.title).join("/");
}

function genComponentConfigMeta(component: Component) {
  const variantParams = component.variantGroups.map((vg) => vg.param);
  return {
    id: component.uuid,
    name: component.name,
    params: [
      ...component.variantGroups.map((group) => ({
        name: toVarName(group.param.variable.name),
        type: group.multi ? "multi" : "select",
        enums: group.variants.map((v) => toVarName(v.name)),
      })),
      ...component.params
        .filter((p) => !variantParams.includes(p as any))
        .map((param) => {
          if (param.enumValues.length > 0) {
            return {
              name: toVarName(param.variable.name),
              type: "select",
              enums: param.enumValues.map((v) => `${v}`),
            };
          } else {
            return {
              name: toVarName(param.variable.name),
              type:
                param.type.name === "num"
                  ? "num"
                  : param.type.name === "bool"
                  ? "bool"
                  : "string",
            };
          }
        }),
    ],
  };
}

// Required because CSB needs an actual image content, but we allow empty images.
const BLANK_IMAGE =
  "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";

async function uploadSandboxImages(token: string, site: Site) {
  const images: INormalizedModules[] = [];

  for (const image of site.imageAssets) {
    const result = await uploadFiles(token, {
      [`public/${getImageFilename(image)}`]: image.dataUri || BLANK_IMAGE,
    });
    images.push(result);
  }
  return images.map((result) => denormalize(result));
}

const RE_ASSETTSXREF_ALL = /Plasmic_Image_([^)\s]+)__Ref/g;

function replaceImageReferences(
  site: Site,
  componentName: string,
  code: string
) {
  const assetsMap = Object.fromEntries(
    allImageAssets(site, { includeDeps: "all" }).map((image) => [
      image.uuid,
      image,
    ])
  );
  return code.replace(RE_ASSETTSXREF_ALL, (_, assetId) => {
    if (assetsMap[assetId]) {
      return `/${getImageFilename(assetsMap[assetId])}`;
    }
    throw new Error(
      `Image asset not found but required in component ${componentName}: ${assetId}`
    );
  });
}

const createUpdatedSandbox = async (
  site: Site,
  project: {
    components: ComponentExportOutput[];
    projectConfig: ProjectConfig;
    globalVariants: GlobalVariantConfig[];
    usedTokens: {};
    styleConfig: StyleConfig;
    iconAssets: IconAssetExport[];
  },
  opts: CodesandboxOpts,
  scheme: "direct" | "blackbox",
  existingModules: L.Dictionary<ISandboxFile>
) => {
  const noramlized: INormalizedModules = {};
  const createFile = (path: string, content: string) => {
    return (noramlized[path] = {
      content: content,
      type: "file",
      isBinary: false,
    });
  };
  const createFileIfNotExist = (path: string, content: string) => {
    if (!existingModules[path]) {
      createFile(path, content);
    }
  };
  createFile(
    `src/ComponentMakers.tsx`,
    `/** This file will be overwritten by Plasmic. Don't edit. */
import React from "react";
import {ComponentItem} from "./ComponentGallery";
${project.components
  .map(
    (c) =>
      `import ${c.componentName} from "./${opts.pathOfImplDirInSrc}/${c.componentName}";`
  )
  .join("\n")}

export const components: Array<ComponentItem> = [
${project.components
  .map(
    (c) =>
      `  {Component: ${c.componentName}, meta: ${JSON.stringify(
        genComponentConfigMeta(
          ensure(
            site.components.find((comp) => comp.uuid === c.id),
            "Expected to find component " + c.id
          )
        )
      )}}`
  )
  .join(",\n")}
];`
  );
  createFile(
    `src/images.css`,
    `/** This file will be overwritten by Plasmic. Don't edit. */
    :root {
      ${site.imageAssets
        .map(
          (asset) =>
            `${getImageAssetVarName(asset)}: url("/${getImageFilename(asset)}")`
        )
        .join(";\n")}
    }`
  );
  const sc = project.styleConfig;
  createFile(
    `${opts.pathOfAutoGenDir}/${sc.defaultStyleCssFileName}`,
    sc.defaultStyleCssRules
  );
  const newModuleByComp = new Map<ComponentExportOutput, IModule>();
  for (const c of project.components) {
    createFile(`${opts.pathOfAutoGenDir}/${c.cssFileName}`, c.cssRules);
    createFile(
      `${opts.pathOfAutoGenDir}/${c.renderModuleFileName}`,
      replaceImageReferences(site, c.componentName, c.renderModule)
    );
    const newModule = createFile(
      `${opts.pathOfImplDir}/${c.skeletonModuleFileName}`,
      c.skeletonModule
    );
    newModuleByComp.set(c, newModule);
  }

  createFile(
    `${opts.pathOfAutoGenDir}/${project.projectConfig.cssFileName}`,
    project.projectConfig.cssRules
  );
  for (const gv of project.globalVariants) {
    createFile(
      `${opts.pathOfAutoGenDir}/${gv.contextFileName}`,
      gv.contextModule
    );
  }
  for (const icon of project.iconAssets) {
    createFile(`${opts.pathOfAutoGenDir}/${icon.fileName}`, icon.module);
  }
  createFile(
    `${opts.pathOfAutoGenDir}/plasmic-tokens.theo.json`,
    JSON.stringify(project.usedTokens)
  );
  if (scheme === "direct") {
    createFile(revisionFilePath, `${project.projectConfig.revision}`);
  }
  const packageJson = existingModules["package.json"].code;
  const json = JSON.parse(packageJson);
  json["dependencies"]["@plasmicapp/react-web"] = await latestVersion(
    "@plasmicapp/react-web"
  );
  createFile("package.json", JSON.stringify(json, undefined, 2));
  noramlized["src"] = { type: "directory" };
  noramlized["public"] = { type: "directory" };
  noramlized[opts.pathOfAutoGenDir] = { type: "directory" };
  noramlized[opts.pathOfImplDir] = { type: "directory" };
  return denormalize(noramlized);
};

export const updateSandbox = async (
  site: Site,
  token: string,
  sandboxId: string,
  opts: CodesandboxOpts,
  project: {
    components: ComponentExportOutput[];
    codeComponentMetas: CodeComponentConfig[];
    projectConfig: ProjectConfig;
    globalVariants: GlobalVariantConfig[];
    usedTokens: {};
    styleConfig: StyleConfig;
    iconAssets: IconAssetExport[];
  },
  scheme: "direct" | "blackbox"
) => {
  const existingSandbox = (await getSandbox(token, sandboxId)) as ISandbox;
  const existingModules = L.keyBy(existingSandbox.modules, (m) =>
    makeModuleFileName(existingSandbox.directories, m)
  );
  // Create a new sandbox
  const newSandbox = await createUpdatedSandbox(
    site,
    project,
    opts,
    scheme,
    existingModules
  );

  const images = await uploadSandboxImages(token, site);
  images.map(({ modules, directories }) => {
    newSandbox.modules.push(...modules);
    newSandbox.directories.push(...directories);
  });

  const existingDirs = L.keyBy(existingSandbox.directories, (m) =>
    makeModuleFileName(existingSandbox.directories, m)
  );
  const new2existing: Record<string, string> = {};
  const newDirs: ISandboxDirectory[] = [];
  for (const dir of newSandbox.directories) {
    const newDirName = makeModuleFileName(newSandbox.directories, dir);
    if (newDirName in existingDirs) {
      new2existing[dir.shortid] = existingDirs[newDirName].shortid;
    } else {
      newDirs.push(dir);
    }
  }

  const revisionModule = existingModules[revisionFilePath];
  const newModules: ISandboxFile[] = [];
  for (const module of newSandbox.modules) {
    const newModuleName = makeModuleFileName(newSandbox.directories, module);
    if (newModuleName in existingModules) {
      // We update the component file too in direct mode, for now.
      if (
        scheme === "blackbox" &&
        project.components.find(
          (c) =>
            `${opts.pathOfImplDir}/${c.componentName}.tsx` === newModuleName
        )
      ) {
        // skip updating component file which may have been edited.
        continue;
      }

      const existingModule = existingModules[newModuleName];
      if (module.code === existingModule.code) {
        continue;
      }
      // package.json is not deletable.
      if (
        revisionModule &&
        scheme === "direct" &&
        newModuleName !== "package.json"
      ) {
        // Potentially user edited file. We need to forcefully update it by
        // deleting it first.
        await deleteModule(token, sandboxId, existingModule.shortid);
        newModules.push(module);
      } else {
        const r = await updateFileContent(
          token,
          sandboxId,
          existingModule.shortid,
          module.code
        );
      }
    } else {
      newModules.push(module);
    }
  }

  if (newDirs.length > 0 || newModules.length > 0) {
    for (const f of [...newDirs, ...newModules]) {
      if (f.directoryShortid && f.directoryShortid in new2existing) {
        f.directoryShortid = new2existing[f.directoryShortid];
      }
    }
    await uploadContents(token, sandboxId, newModules, newDirs);
  }

  return sandboxId;
};
