/**
 * Plasmic options passed at the plugin level.
 */
export type PlasmicOpts = {
  dir: string;
  plasmicDir: string;
  pageDir: string;
  projects: string[];
  watch: boolean;
  initArgs: Record<string, string>;
  substitutions: Substitutions;
};

export type PluginOptions = Partial<PlasmicOpts> & { projects: string[] };

/**
 * Component substitution options.
 */
export type Substitutions = {
  components?: Array<{ name: string; projectId?: string; path: string }>;
};

/**
 * Configuration found in plasmic-loader.json
 */
export type PlasmicLoaderConfig = {
  aboutThisFile: string;
  projects: Array<{
    projectId: string;
    projectApiToken?: string;
  }>;
  watch: boolean;
  dir: string;
  plasmicDir: string;
  pageDir: string;
  initArgs: Record<string, string>;
  substitutions?: Substitutions;
};
