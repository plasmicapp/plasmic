export const MAX_HOSTING_TEXT_BYTES = 512 * 1024;

/** Absolute URL path to a .txt file, e.g. /robots.txt or /.well-known/security.txt */
const TEXT_FILE_PATH = /^(\/[\w.-]+)+\.txt$/;

/** Postgres jsonb stores neither NUL nor an unpaired surrogate. */
const UNSTORABLE_TEXT =
  /\0|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;

export function parseHostingTextFiles(value: unknown): HostingTextFiles {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new HostingTextFilesError(
      "textFiles must be an object mapping paths to text"
    );
  }
  const result: HostingTextFiles = {};
  let bytes = 0;
  for (const [path, content] of Object.entries(value)) {
    // Hosting looks files up by normalized URL pathname, so /a/../b.txt is unreachable.
    if (
      !TEXT_FILE_PATH.test(path) ||
      new URL(path, "http://x").pathname !== path
    ) {
      throw new HostingTextFilesError(
        `${path} must be an absolute path to a .txt file, like /robots.txt`
      );
    }
    if (typeof content !== "string") {
      throw new HostingTextFilesError(`Contents of ${path} must be a string`);
    }
    if (UNSTORABLE_TEXT.test(content)) {
      throw new HostingTextFilesError(
        `Contents of ${path} must be text without null bytes`
      );
    }
    bytes += new TextEncoder().encode(path + content).byteLength;
    if (bytes > MAX_HOSTING_TEXT_BYTES) {
      throw new HostingTextFilesError(
        "Text files must total at most 512 KiB in UTF-8"
      );
    }
    result[path] = content;
  }
  return result;
}

export class HostingTextFilesError extends Error {}

/** Text served verbatim at each URL path. */
export type HostingTextFiles = Record<string, string>;

export interface HostingFavicon {
  url: string;
  mimeType?: string;
}

export interface PlasmicHostingSettings {
  /** Replaces all custom text files when supplied; {} clears them. */
  textFiles?: HostingTextFiles;
  favicon?: HostingFavicon;
}

/** Public metadata returned by WAB's project-token-for-domain endpoint. */
export interface HostingMetadata {
  projectId?: string;
  token?: string;
  showBadge: boolean;
  favicon?: HostingFavicon;
  hasAppAuth: boolean;
  allowRobots: boolean;
  /** Contents at the requested textFilePath, if configured. */
  textFile?: string;
}

/** WAB's request to the hosting app's /api/revalidate endpoint. */
export interface HostingRevalidateRequest {
  urlPaths: string[];
}
