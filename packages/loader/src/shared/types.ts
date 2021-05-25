/*
 * Defines some central types that may be reused across loader.
 *
 * Keep changes to this file documented as it will be used to generate user-facing schemas,
 * like the one for `plasmic-loader.json`.
 */

type PluginProjects = {
  /**
   * An array of project IDs. To specify a version constraint, add `@` after the ID.
   *
   * Example: projectId@>1.0
   */
  projects: string[];
};

export type Substitutions = {
  components?: Array<{
    name: string;
    projectId?: string;
    /**
     * This path can be absolute, or relative to your current working directory.
     */
    path: string;
  }>;
};

type ConfigProjects = {
  projects: Array<{
    /**
     * The project ID. To specify a version constraint, add `@` after the ID.
     *
     * Example: projectId@>1.0
     */
    projectId: string;

    /**
     * This API token allows you to access this project's assets without having
     * to authenticate to Plasmic.
     */
    projectApiToken?: string;
  }>;
};

type ConfigAboutThisFile = {
  /**
   * A link to this file's documentation.
   */
  aboutThisFile?: string;
};

/**
 * Base configuration, shared by `plasmic-loader.json` and our plugin options.
 */
type PlasmicBase = {
  /**
   * Whether plasmic should watch for changes in your project after syncing the code.
   *
   * Default: `true` when `NODE_ENV` equals `"development"`. `false` otherwise.
   */
  watch: boolean;

  /**
   * The root directory of your project.
   *
   * Default: Current working directory, given by `process.cwd()`.
   */
  dir: string;

  /**
   * The directory where loader will store the generated assets.
   *
   * Default: depends on the environment (`.cache/.plasmic` in Gatsby, `.plasmic` in next).
   */
  plasmicDir: string;

  /**
   * The directory where loader will store the generated pages.
   *
   * Default: `${plasmicDir}/pages`
   */
  pageDir: string;

  /**
   * Extra init arguments to use while initializing plasmic. Use these
   * to have more control about the language, the location to store
   * medias, etc. For a list of values, refer to our CLI docs:
   *
   * https://docs.plasmic.app/learn/cli/
   */
  initArgs: Record<string, string>;

  /**
   * Allows you to specify substitutions in Plasmic.
   *
   * Currently, only substituting components is allowed.
   */
  substitutions?: Substitutions;
};

/**
 * Plasmic options used internally.
 */
export type PlasmicOpts = PlasmicBase & PluginProjects;

/**
 * Plasmic options passed at the plugin level.
 */
export type PluginOptions = Partial<PlasmicBase> & PluginProjects;

/**
 * Configuration used internally.
 */
export type PlasmicLoaderConfig = PlasmicBase &
  ConfigProjects &
  ConfigAboutThisFile;

/**
 * Configuration found in plasmic-loader.json.
 */
export type UserPlasmicLoaderConfig = Partial<PlasmicBase> &
  ConfigProjects &
  ConfigAboutThisFile;
