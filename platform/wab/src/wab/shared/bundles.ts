import { spawn, unexpected } from "@/wab/shared/common";
import { isArray, isPlainObject } from "lodash";

export type BundledInst = {
  [field: string]: any;
  __type: string;
};

/**
 * Bundles are identified by UUIDs just like its internal objects.
 * Addrs are references to objects across bundles, {uuid: UUID, iid: UUID}.
 *
 * To make changes to the bundles, see bundle migrations in dev-setup.md
 */
export type Bundle = {
  root: string;
  map: { [id: string]: BundledInst };
  deps: string[]; // the uuid of external bundles that this bundle references
  version: string;
};

export type HasBundle = { model: string } | { data: string };

export type UnsafeBundle = Omit<Bundle, "version"> & { version?: string };

export type EmptyBundle = { version?: string };

export class OutdatedBundleError extends Error {
  name = "OutdatedBundleError";
  message = "Project data is outdated. Please refresh the page.";

  constructor(message: string) {
    super(message);
    if (message) {
      this.message = message;
    }
  }
}

export function isEmptyBundle(bundle: any): bundle is EmptyBundle {
  return Object.values(bundle).length < 4;
}

export function parseBundle(obj: HasBundle): UnsafeBundle {
  try {
    if ("model" in obj) {
      return JSON.parse(obj.model);
    }
    if ("data" in obj) {
      return JSON.parse(obj.data);
    }
  } catch {
    throw new Error("Unable to read project data. Please refresh the page.");
  }
  unexpected();
}

export function getSerializedBundleSize(obj: HasBundle): number {
  if ("model" in obj) {
    return obj.model.length;
  }
  if ("data" in obj) {
    return obj.data.length;
  }
  throw new Error(`Unable to get bundle size of object ${JSON.stringify(obj)}`);
}

export function setBundle(obj: HasBundle, bundle: Bundle) {
  if ("model" in obj) {
    obj.model = JSON.stringify(bundle);
    return;
  }
  if ("data" in obj) {
    obj.data = JSON.stringify(bundle);
    return;
  }
  throw new Error(`Unable to set bundle to object ${JSON.stringify(obj)}`);
}

export function isExpectedBundleVersion(
  bundle: UnsafeBundle,
  expectedVersion: string
): bundle is Bundle {
  return bundle.version === expectedVersion;
}

export function getBundle(obj: HasBundle, expectedVersion: string): Bundle {
  const bundle = parseBundle(obj);
  if (isExpectedBundleVersion(bundle, expectedVersion)) {
    return bundle;
  }

  // Temporally log the error to sentry. We'll trigger an uncaught promise error
  // as this code runs in both browser and the server.
  spawn(
    (async function fn() {
      throw new OutdatedBundleError(
        `Bundle with version ${bundle.version} is not up to date. Expected version: ${expectedVersion}`
      );
    })()
  );

  return bundle as Bundle;
}

export function swapXrefs(bundle: Bundle, mapping: Record<string, string>) {
  const getXrefId = (id: string) => {
    return mapping[id] ?? id;
  };

  const fixXref = (obj: any) => {
    if (isArray(obj)) {
      obj.forEach(fixXref);
    } else if (isPlainObject(obj)) {
      if (obj.__xref) {
        obj.__xref.uuid = getXrefId(obj.__xref.uuid);
      } else {
        Object.values(obj).forEach(fixXref);
      }
    }
  };

  Object.values(bundle.map).forEach(fixXref);
  bundle.deps = bundle.deps.map((x) => getXrefId(x));
}
