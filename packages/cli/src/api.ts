import axios, { AxiosError } from "axios";
import socketio from "socket.io-client";
import {
  AuthConfig,
  CodeConfig,
  CustomFunctionConfig,
  DEFAULT_HOST,
  FontConfig,
  I18NConfig,
  ImagesConfig,
  StyleConfig,
} from "./utils/config-utils";
import { HandledError } from "./utils/error";
import { Metadata } from "./utils/get-context";

export class AppServerError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export interface ComponentBundle {
  renderModule: string;
  skeletonModule: string;
  cssRules: string;
  renderModuleFileName: string;
  skeletonModuleFileName: string;
  cssFileName: string;
  componentName: string;
  id: string;
  scheme: "blackbox" | "plain";
  nameInIdToUuid: Array<[string, string]>;
  isPage: boolean;
  path?: string;
  plumeType?: string;
  rscMetadata?: {
    // When we generate code for RSC, we generate two additional files per page, those files are used to increment the user experience,
    // it's added one managed server file which is responsible for performing the server actions and one skeleton file which allows the
    // user to add client side logic to the page (the `renderModule` will contain a server component for entry point allowing the user to
    // perform additional server operations).
    pageWrappers: Record<
      "client" | "server",
      {
        module: string;
        fileName: string;
      }
    >;
  };
}

export interface GlobalVariantBundle {
  id: string;
  name: string;
  contextModule: string;
  contextFileName: string;
}

export interface GlobalContextBundle {
  id: string;
  contextModule: string;
}

export interface SplitsProviderBundle {
  id: string;
  module: string;
}

export interface JsBundleTheme {
  themeFileName: string;
  themeModule: string;
  bundleName: string;
}

export interface ProjectMetaBundle {
  projectId: string;
  projectName: string;
  cssFileName: string;
  cssRules: string;
  jsBundleThemes?: JsBundleTheme[];
  globalContextBundle?: GlobalContextBundle;
  splitsProviderBundle?: SplitsProviderBundle;
  // A list of files that are exported from the project and *can* be used by the user
  reactWebExportedFiles?: Array<{
    fileName: string;
    content: string;
  }>;
}

export interface IconBundle {
  id: string;
  name: string;
  module: string;
  fileName: string;
}

export interface ImageBundle {
  id: string;
  name: string;
  blob: string;
  fileName: string;
}

export interface ProjectVersionMeta {
  projectId: string;
  branchName: string;
  projectApiToken: string;
  version: string;
  projectName: string;
  componentIds: string[];
  dependencies: {
    [projectId: string]: string;
  };
  indirect: boolean;
}

export interface VersionResolution {
  projects: ProjectVersionMeta[];
  dependencies: ProjectVersionMeta[];
  conflicts: ProjectVersionMeta[];
}

export interface RequiredPackages {
  "@plasmicapp/loader": string;
  "@plasmicapp/cli": string;
  "@plasmicapp/host": string;
  "@plasmicapp/react-web": string;
  "@plasmicapp/react-web-runtime": string;
}

export interface ProjectMetaInfo {
  id: string;
  name: string;
  workspaceId?: string;
  hostUrl?: string;
  lastPublishedVersion?: string;
}

export interface ProjectBundle {
  components: ComponentBundle[];
  codeComponentMetas: CodeComponentMeta[];
  customFunctionMetas: CustomFunctionConfig[];
  projectConfig: ProjectMetaBundle;
  globalVariants: GlobalVariantBundle[];
  usedTokens: StyleTokensMap;
  iconAssets: IconBundle[];
  imageAssets: ImageBundle[];
  checksums: ChecksumBundle;
  usedNpmPackages: string[];
  externalCssImports: string[];
}

export type ProjectMeta = Omit<ProjectBundle, "projectConfig">;

export interface StyleConfigResponse {
  defaultStyleCssFileName: string;
  defaultStyleCssRules: string;
}

export interface StyleTokensMap {
  props: {
    name: string;
    type: string;
    value: string | number;
    meta: {
      projectId: string;
      id: string;
    };
  }[];
  global: {
    meta: {
      source: "plasmic.app";
    };
  };
}

export interface ChecksumBundle {
  // List of checksums as [ComponentBundle.id, checksum]
  renderModuleChecksums: Array<[string, string]>;
  // List of checksums as [ComponentBundle.id, checksum]
  cssRulesChecksums: Array<[string, string]>;
  // List of checksums as [imageBundle.id, checksum]
  imageChecksums: Array<[string, string]>;
  // List of checksums as [IconBundle.id, checksum]
  iconChecksums: Array<[string, string]>;
  // List of checksums as [GlobalVariant.id, checksum]
  globalVariantChecksums: Array<[string, string]>;
  // Checksum of projectCss file
  projectCssChecksum: string;
  // Checksum of project global contexts
  globalContextsChecksum: string;
  // Checksum of project splits provider
  splitsProviderChecksum: string;
}

export interface CodeComponentMeta {
  id: string; // component uuid
  name: string;
  displayName: string;
  importPath: string;
  helper?: {
    name: string;
    importPath: string;
  };
}

export interface ProjectIconsResponse {
  version: string;
  icons: IconBundle[];
}

export interface ProjectIdAndToken {
  projectId: string;
  projectApiToken?: string;
}

export class PlasmicApi {
  private codegenVersion?: string;
  constructor(private auth: AuthConfig) {}

  async genStyleConfig(styleOpts?: StyleConfig): Promise<StyleConfigResponse> {
    const result = await this.post(
      `${this.codegenHost}/api/v1/code/style-config`,
      styleOpts
    );
    return result.data as StyleConfigResponse;
  }

  /**
   * Sync resolution - Given a fuzzy idea of what the user wants,
   * (i.e. a versionRange and component names),
   * ask the server for the exact references for a later call to `projectComponents`
   * - For components specified in the parameters - the server will return the latest version that satisfies the versionRange
   * - Any conflicting versions will be returned in `conflicts`, and should cause the client's sync to abort
   * @param projects
   * @param recursive
   */
  async resolveSync(
    projects: {
      projectId: string;
      branchName: string;
      versionRange?: string;
      componentIdOrNames: readonly string[] | undefined;
      projectApiToken?: string;
    }[],
    recursive?: boolean
  ): Promise<VersionResolution> {
    const resp: any = await this.post(
      `${this.codegenHost}/api/v1/code/resolve-sync`,
      {
        projects,
        recursive,
      }
    );
    const versionResolution = resp.data as VersionResolution;
    return { ...versionResolution };
  }

  async getCurrentUser() {
    return await axios.get(`${this.studioHost}/api/v1/auth/self`, {
      headers: this.makeHeaders(),
    });
  }

  async requiredPackages(): Promise<RequiredPackages> {
    const resp = await this.post(
      `${this.codegenHost}/api/v1/code/required-packages`
    );
    return { ...resp.data } as RequiredPackages;
  }

  async latestCodegenVersion(): Promise<string> {
    if (!this.codegenVersion) {
      const resp = await this.post(
        `${this.codegenHost}/api/v1/code/latest-codegen-version`
      );
      this.codegenVersion = resp.data as string;
    }
    return this.codegenVersion;
  }

  /**
   * Code-gen endpoint.
   * This will fetch components from a given branch at an exact specified version.
   * If you don't know what version should be used, call `resolveSync` first.
   * @param projectId
   * @param branchName
   * @param cliVersion
   * @param reactWebVersion
   * @param newCompScheme
   * @param existingCompScheme
   * @param componentIdOrNames
   * @param version
   */
  async projectComponents(
    projectId: string,
    branchName: string,
    opts: {
      platform: string;
      platformOptions: {
        nextjs?: {
          appDir: boolean;
        };
      };
      componentIdOrNames: readonly string[] | undefined;
      version: string;
      imageOpts: ImagesConfig;
      fontOpts?: FontConfig;
      stylesOpts: StyleConfig;
      i18nOpts?: I18NConfig;
      codeOpts: CodeConfig;
      checksums: ChecksumBundle;
      indirect: boolean;
      wrapPagesWithGlobalContexts: boolean;
      metadata?: Metadata;
    }
  ): Promise<ProjectBundle> {
    const result = await this.post(
      `${this.codegenHost}/api/v1/projects/${projectId}/code/components?branchName=${branchName}`,
      {
        ...opts,
      }
    );
    return result.data as ProjectBundle;
  }
  /**
   * Code-gen endpoint.
   * This will fetch components from a given branch at an exact specified version
   * using the "plain" scheme
   */
  async exportProject(
    projectId: string,
    branchName: string,
    opts: {
      platform: string;
      platformOptions: {
        nextjs?: {
          appDir: boolean;
        };
      };
      version: string;
      imageOpts: ImagesConfig;
      stylesOpts: StyleConfig;
      i18nOpts?: I18NConfig;
      codeOpts: Pick<CodeConfig, "lang">;
      indirect: boolean;
      wrapPagesWithGlobalContexts: boolean;
      metadata?: Metadata;
    }
  ): Promise<ProjectBundle> {
    const result = await this.post(
      `${this.codegenHost}/api/v1/projects/${projectId}/code/components?branchName=${branchName}&export=true`,
      {
        ...opts,
      }
    );
    return result.data as ProjectBundle;
  }

  async projectMeta(projectId: string) {
    const result = await this.post(
      `${this.codegenHost}/api/v1/projects/${projectId}/code/meta`
    );
    return result.data as ProjectMetaInfo;
  }

  async genLocalizationStrings(
    projects: readonly string[],
    format: "po" | "json" | "lingui",
    keyScheme: "content" | "hash" | "path",
    tagPrefix: string | undefined,
    projectIdsAndTokens: ProjectIdAndToken[],
    excludeDeps: boolean | undefined
  ) {
    const params = new URLSearchParams(
      [
        ["format", format],
        ["keyScheme", keyScheme],
        ["preview", "true"],
        ...projects.map((p) => ["projectId", p]),
        tagPrefix ? ["tagPrefix", tagPrefix] : undefined,
        excludeDeps ? ["excludeDeps", "true"] : undefined,
      ].filter((x): x is [string, string] => !!x)
    );
    const result = await this.get(
      `${this.codegenHost}/api/v1/localization/gen-texts?${params.toString()}`,
      undefined,
      {
        "x-plasmic-api-project-tokens": projectIdsAndTokens
          .map(
            ({ projectId, projectApiToken }) =>
              `${projectId}:${projectApiToken}`
          )
          .join(","),
      }
    );
    return result.data as string;
  }

  async uploadBundle(
    projectId: string,
    bundleName: string,
    bundleJs: string,
    css: string[],
    metaJson: string,
    genModulePath: string | undefined,
    genCssPaths: string[],
    pkgVersion: string | undefined,
    extraPropMetaJson: string | undefined,
    themeProviderWrapper: string | undefined,
    themeModule: string | undefined
  ): Promise<StyleTokensMap> {
    const result = await this.post(
      `${this.codegenHost}/api/v1/projects/${projectId}/jsbundle/upload`,
      {
        projectId,
        bundleName,
        bundleJs,
        css,
        metaJson,
        genModulePath,
        genCssPaths,
        pkgVersion,
        extraPropMetaJson,
        themeProviderWrapper,
        themeModule,
      }
    );
    return result.data as StyleTokensMap;
  }

  async projectStyleTokens(
    projectId: string,
    branchName: string,
    versionRange?: string
  ): Promise<StyleTokensMap> {
    const result = await this.post(
      `${this.codegenHost}/api/v1/projects/${projectId}/code/tokens?branchName=${branchName}`,
      { versionRange }
    );
    return result.data as StyleTokensMap;
  }

  async projectIcons(
    projectId: string,
    branchName: string,
    versionRange?: string,
    iconIds?: string[]
  ): Promise<ProjectIconsResponse> {
    const result = await this.post(
      `${this.codegenHost}/api/v1/projects/${projectId}/code/icons?branchName=${branchName}`,
      { versionRange, iconIds }
    );
    return result.data as ProjectIconsResponse;
  }

  connectSocket(): ReturnType<typeof socketio> {
    const socket = socketio(this.studioHost, {
      path: `/api/v1/socket`,
      transportOptions: {
        polling: {
          extraHeaders: this.makeHeaders(),
        },
      },
    });
    return socket;
  }

  // If rethrowAppError is true, we will throw an exception with the error
  // message
  private async post(url: string, data?: any, rethrowAppError?: boolean) {
    try {
      return await axios.post(
        url,
        { projectIdsAndTokens: this.projectIdsAndTokens, ...data },
        {
          headers: this.makeHeaders(),
        }
      );
    } catch (e) {
      const error = e as AxiosError;
      const errorMsg = this.makeErrorMessage(error);

      if (rethrowAppError) {
        throw new AppServerError(errorMsg);
      }

      if (!errorMsg) {
        throw e;
      }

      throw new HandledError(errorMsg);
    }
  }

  private async get(url: string, rethrowAppError?: boolean, extraHeaders?: {}) {
    try {
      return await axios.get(url, {
        headers: { ...this.makeHeaders(), ...(extraHeaders ?? {}) },
      });
    } catch (e) {
      const error = e as AxiosError;
      const errorMsg = this.makeErrorMessage(error);

      if (rethrowAppError) {
        throw new AppServerError(errorMsg);
      }

      if (!errorMsg) {
        throw e;
      }

      throw new HandledError(errorMsg);
    }
  }

  private makeErrorMessage(error: AxiosError) {
    const response = error.response;
    if (!response) {
      return undefined;
    }
    if (response.status === 403) {
      return `Incorrect Plasmic credentials; please check your .plasmic.auth file or your project API tokens.`;
    }
    if (response.data?.error?.message) {
      return response.data.error.message;
    } else if (response.data) {
      return `Error: request failed with status code ${response.status}. The response is
  ${response.data}`;
    } else {
      return undefined;
    }
  }

  private makeHeaders() {
    const headers: Record<string, string> = {
      "x-plasmic-api-user": this.auth.user,
      "x-plasmic-api-token": this.auth.token,
    };

    if (this.auth.basicAuthUser && this.auth.basicAuthPassword) {
      const authString = Buffer.from(
        `${this.auth.basicAuthUser}:${this.auth.basicAuthPassword}`
      ).toString("base64");
      headers["Authorization"] = `Basic ${authString}`;
    }

    return headers;
  }

  private projectIdsAndTokens?: ProjectIdAndToken[];
  attachProjectIdsAndTokens(idsAndTokens: ProjectIdAndToken[]) {
    this.projectIdsAndTokens = idsAndTokens;
  }

  private get studioHost() {
    return this.auth.host;
  }

  private get codegenHost() {
    if (!this.auth.host || this.auth.host === DEFAULT_HOST) {
      return "https://codegen.plasmic.app";
    } else {
      return this.auth.host;
    }
  }
}
