import * as semverlib from "semver";

/**
 * Wrap `semver` with support for understanding "latest"
 * - "latest" is both a version and a range
 * - "latest" range will match any valid version number
 * - "latest" version will only match "latest" version range
 **/

export type Version = semverlib.SemVer | "latest";
export const latestTag = "latest";
export const isLatest = (v: string) => v === latestTag;
export const gt = (v1: string, v2: string) =>
  (isLatest(v1) && !isLatest(v2)) ||
  (!isLatest(v1) && !isLatest(v2) && semverlib.gt(v1, v2));
