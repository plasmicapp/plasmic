/**
 * Plasmic options passed at the plugin level.
 */
export type PlasmicOpts = {
  dir: string;
  plasmicDir: string;
  pageDir: string;
  projects: string[];
  watch?: boolean;
  initArgs?: Record<string, string>;
  substitutions?: Substitutions;
};

/**
 * Component substitution options.
 */
export type Substitutions = {
  components?: Array<{ name: string; projectId?: string; path: string }>;
};
