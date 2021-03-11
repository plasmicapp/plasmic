import L from "lodash";
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
export const valid = (v: string) =>
  isLatest(v) ? latestTag : semverlib.valid(v);
export const inc = (v: string, release: semverlib.ReleaseType) =>
  isLatest(v) ? latestTag : semverlib.inc(v, release);
export const prerelease = (v: string) =>
  isLatest(v) ? [] : semverlib.prerelease(v);
export const major = (v: string) =>
  isLatest(v) ? latestTag : semverlib.major(v);
export const minor = (v: string) =>
  isLatest(v) ? latestTag : semverlib.minor(v);
export const patch = (v: string) =>
  isLatest(v) ? latestTag : semverlib.patch(v);
export const eq = (v1: string, v2: string) =>
  (isLatest(v1) && isLatest(v2)) ||
  (!isLatest(v1) && !isLatest(v2) && semverlib.eq(v1, v2));
export const gt = (v1: string, v2: string) =>
  (isLatest(v1) && !isLatest(v2)) ||
  (!isLatest(v1) && !isLatest(v2) && semverlib.gt(v1, v2));
export const lt = (v1: string, v2: string) =>
  (!isLatest(v1) && isLatest(v2)) ||
  (!isLatest(v1) && !isLatest(v2) && semverlib.lt(v1, v2));
export const validRange = (range: string) =>
  isLatest(range) ? latestTag : semverlib.validRange(range);
export const satisfies = (v: string, range: string) =>
  (isLatest(range) && !!valid(v)) ||
  (!isLatest(v) && !isLatest(range) && semverlib.satisfies(v, range));
export const toTildeRange = (v: string) =>
  isLatest(v) ? latestTag : !!semverlib.valid(v) ? "~" + v : null;
export const toCaretRange = (v: string) =>
  isLatest(v) ? latestTag : !!semverlib.valid(v) ? "^" + v : null;
export const gte = (v1: string, v2: string) => eq(v1, v2) || gt(v1, v2);
export const lte = (v1: string, v2: string) => eq(v1, v2) || lt(v1, v2);
export const neq = (v1: string, v2: string) => !eq(v1, v2);
export const sortAsc = (versions: string[]) =>
  L.cloneDeep(versions).sort((v1, v2) =>
    gt(v1, v2) ? +1 : eq(v1, v2) ? 0 : -1
  );
export const sortDesc = (versions: string[]) => sortAsc(versions).reverse();
export const minSatisfying = (versions: string[], range: string) =>
  sortAsc(versions).find((v) => satisfies(v, range)) ?? null;
export const maxSatisfying = (versions: string[], range: string) =>
  sortDesc(versions).find((v) => satisfies(v, range)) ?? null;
export const coerce = (v: string) =>
  isLatest(v) ? latestTag : semverlib.coerce(v)?.version;
export const gtr = (version: string, range: string) =>
  (isLatest(version) && !isLatest(range)) ||
  (!isLatest(version) && !isLatest(range) && semverlib.gtr(version, range));
export const ltr = (version: string, range: string) =>
  (!isLatest(version) && isLatest(range)) ||
  (!isLatest(version) && !isLatest(range) && semverlib.ltr(version, range));
export const outside = (version: string, range: string, hilo?: ">" | "<") =>
  (hilo === ">" && gtr(version, range)) ||
  (hilo === "<" && ltr(version, range)) ||
  (!hilo && (gtr(version, range) || ltr(version, range)));
