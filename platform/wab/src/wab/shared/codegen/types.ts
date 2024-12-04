import { FontUsage } from "@/wab/shared/codegen/fonts";
import { LocalizationKeyScheme } from "@/wab/shared/localization";

export interface ImageExportOpts {
  scheme: "inlined" | "files" | "public-files" | "cdn";
}

export interface GlobalContextBundle {
  id: string;
  contextModule: string;
}

export interface SplitsProviderBundle {
  id: string;
  module: string;
}

export interface ProjectConfig {
  // Project-wide css
  cssFileName: string;
  cssRules: string;
  fontUsages: FontUsage[];

  projectId: string;
  projectName: string;
  teamId?: string;
  indirect: boolean;

  revision: number;
  version: string;
  projectRevId: string;

  globalContextBundle?: GlobalContextBundle;
  splitsProviderBundle?: SplitsProviderBundle;
  reactWebExportedFiles?: Array<{
    fileName: string;
    content: string;
  }>;
}

export interface ChecksumBundle {
  // List of checksums as [component uuid, checksum]
  renderModuleChecksums: Array<[string, string]>;
  // List of checksums as [component uuid, checksum]
  cssRulesChecksums: Array<[string, string]>;
  // List of checksums as [image id, checksum]
  imageChecksums: Array<[string, string]>;
  // List of checksums as [icon id, checksum]
  iconChecksums: Array<[string, string]>;
  // List of checksums as [GlobalVariant.id, checksum]
  globalVariantChecksums: Array<[string, string]>;
  // Checksum of projectCss file
  projectCssChecksum: string;
  // List of checksums as [theme.bundleName, checksum]
  themeChecksums: Array<[string, string]>;
  // Checksum of globalContexts file
  globalContextsChecksum: string;
  // Checksum of splits provider file
  splitsProviderChecksum: string;
}

export function emptyChecksumBundle(): ChecksumBundle {
  return {
    renderModuleChecksums: [],
    cssRulesChecksums: [],
    imageChecksums: [],
    iconChecksums: [],
    globalVariantChecksums: [],
    projectCssChecksum: "",
    themeChecksums: [],
    globalContextsChecksum: "",
    splitsProviderChecksum: "",
  };
}

export type ExportPlatform = "react" | "nextjs" | "gatsby";

export type ExportPlatformOptions = {
  nextjs?: {
    appDir: boolean;
  };
};

export interface ExportOpts {
  lang: "ts";
  // The relative path from the skeleton file to the dir of Plasmic managed
  // file (i.e. render module, css module).
  relPathFromImplToManagedDir?: string;
  // The relative path from Plasmic managed file (i.e. render module, css module.) to
  // the dir of skeleton file.
  relPathFromManagedToImplDir?: string;

  // Generate and reference files based on unique ids
  idFileNames?: boolean;

  // Target platform where generated code will run on
  platform: ExportPlatform;
  // Platform-specific options
  platformOptions?: ExportPlatformOptions;

  // If true, then all props are exported as React component props, including those
  // marked as Internal or ToolsOnly
  forceAllProps?: boolean;

  // If true, then the root component's disabled attribute will be set to true
  // by default
  forceRootDisabled?: boolean;

  // If true, then will set the uncontrolled version of props instead.
  // This is for powering "live" mode, where you'd want to be able to interact with
  // the form elements.
  // This only happens for props we know about -- value => defaultValue for tags.
  uncontrolledProps?: boolean;

  // If true, we transform the writable states into private states. (this is for "live" mode)
  // If we're previewing a component with writable states, we need to make them private
  // since this component don't have a parent so it won't receive a valueProp
  shouldTransformWritableStates?: boolean;

  // Options for how image assets are exported
  imageOpts: ImageExportOpts;

  stylesOpts: {
    scheme: "css" | "css-modules";
    skipGlobalCssImport?: boolean;
    useCssFlexGap?: boolean;
  };

  codeOpts: {
    reactRuntime: "classic" | "automatic";
  };

  // Scheme for referencing remote fonts from css
  fontOpts: {
    // "import" generates `@import url(...)`
    // "none" doesn't generate anything; you need to load the font somehow yourself.
    scheme: "import" | "none";
  };

  // If true, generates files for code component stubs; used by PlasmicLoader
  codeComponentStubs: boolean;

  // If true, uses @plasmicapp/react-web/skinny instead
  skinnyReactWeb: boolean;

  // If true, imports host from @plasmicapp/react-web/lib/host; else
  // imports from @plasmicapp/host
  importHostFromReactWeb: boolean;

  // If true, remove most machinery around the generated components.
  // Used by loader
  skinny: boolean;

  // Whether we should generate code component stubs for host-less components,
  // or actually import the package
  hostLessComponentsConfig: "stub" | "package";

  // Should be true when the loader version doesn't support host-less components
  defaultExportHostLessComponents?: boolean;

  // If true, define the css variables for the imported tokens
  // Used by live preview
  includeImportedTokens?: boolean;

  // Configuration around localization
  localization?: {
    keyScheme: LocalizationKeyScheme;
    tagPrefix: string | undefined;
  };

  // If true, will wrap the page skeleton component with the Global Contexts
  // when available
  wrapPagesWithGlobalContexts?: boolean;

  // If true, the component wrappers should export the component substitution
  // api for loader (`getPlasmicComponent`)
  useComponentSubstitutionApi: boolean;

  // If true, we import the code component helpers from the runtime registry.
  useCodeComponentHelpersRegistry: boolean;
  // Similarly to the component substitution API, indicates whether we should
  // use the substitution API for global variants in order to swap them
  // in loader.
  useGlobalVariantsSubstitutionApi: boolean;

  // If true, the owner of the project being generated is a @plasmic.app user.
  isPlasmicTeamUser?: boolean;

  // Wether or not we are generating code for the live preview in studio.
  isLivePreview?: boolean;

  // If true, we won't generate head tags for the page
  skipHead?: boolean;

  // Output text using white-space: normal instead of white-space: pre-wrap
  whitespaceNormal?: boolean;

  // Import custom functions from a stub file instead of `importPath`
  useCustomFunctionsStub: boolean;

  // What environment we're generating code for
  targetEnv: TargetEnv;
}

export type TargetEnv = "loader" | "preview" | "codegen" | "canvas";

export interface StyleConfig {
  defaultStyleCssFileName: string;
  defaultStyleCssRules: string;
}

export interface PageMetadata {
  path: string;
  title?: string | null;
  description?: string | null;
  openGraphImageUrl?: string | null;
  canonical?: string | null;
}

export type CodegenScheme = "blackbox" | "plain";

export interface ComponentExportOutput {
  // component uuid
  id: string;

  // component name
  componentName: string;

  // Normalized name of component as it is set in Plasmic. Differs from
  // componentName; componentName refers to the name the component should
  // be imported as, which may differ from Plasmic component.name for
  // code components
  plasmicName: string;

  // Un-normalized name of the component
  displayName: string;

  // Code for the blackbox presentational module to be imported by user components
  renderModule: string;

  // Code for the skeleton module for the actual user component
  skeletonModule: string;

  // css classes
  cssRules: string;

  // File names for the code modules
  renderModuleFileName: string;
  skeletonModuleFileName: string;
  cssFileName: string;

  scheme: CodegenScheme;
  nameInIdToUuid: Record<string, string>;
  isPage: boolean;

  plumeType?: string;

  isCode?: boolean;
  isGlobalContextProvider: boolean;

  path: string | undefined;

  pageMetadata?: PageMetadata;

  metadata: { [key: string]: string };
}

export interface CustomFunctionConfig {
  id: string;
  name: string;
  namespace?: string | null;
  importPath: string;
  defaultExport: boolean;
}
