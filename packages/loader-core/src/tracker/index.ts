// Intentionally no imports – this module is now a strict no-op while
// preserving the public API surface.

/**
 * @deprecated Built-in tracking is disabled. This type remains only for
 * compatibility and will be removed in a future release.
 */
export interface TrackerOptions {
  projectIds: string[];
  platform?: string;
  preview?: boolean;
  nativeFetch?: boolean;
}

// Internal event types removed along with implementation details.

/**
 * @deprecated Built-in tracking is disabled. This type remains only for
 * compatibility and will be removed in a future release.
 */
export interface TrackerRenderProperties {
  rootProjectId?: string;
  rootComponentId?: string;
  rootComponentName?: string;
  teamIds: string[];
  projectIds: string[];
}

/**
 * @deprecated Built-in tracking is disabled. This type remains only for
 * compatibility and will be removed in a future release.
 */
export interface TrackRenderOptions {
  renderCtx?: TrackerRenderProperties;
  variation?: Record<string, string>;
}

/**
 * @deprecated Built-in tracking is disabled. This class remains only for
 * compatibility and will be removed in a future release.
 *
 * All methods are strict no-ops.
 */
export class PlasmicTracker {
  // Preserve constructor signature for compatibility, but do not retain
  // instance state to avoid unused-property diagnostics.
  constructor(_opts: TrackerOptions) {}

  /**
   * @deprecated No-op.
   */
  public trackRender(_opts?: TrackRenderOptions): void {}

  /**
   * @deprecated No-op.
   */
  public trackFetch(): void {}

  /**
   * @deprecated No-op.
   */
  public trackConversion(_value: number = 0): void {}
}
