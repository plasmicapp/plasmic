import { LoaderBundleOutput } from "@plasmicapp/loader-core";
import type { InitOptions } from "@plasmicapp/loader-react/react-server-conditional";
import type * as Watcher from "@plasmicapp/watcher";
import { PHASE_PRODUCTION_BUILD } from "next/constants";
import path from "path";
import { serverRequire, serverRequireFs } from "./server-require";
import type { NextInitOptions } from "./shared-exports";

class FileCache {
  constructor(private filePath: string) {}

  async get() {
    const fs = await serverRequireFs();
    try {
      await fs.promises.mkdir(path.dirname(this.filePath), { recursive: true });
      const data = (await fs.promises.readFile(this.filePath)).toString();
      return JSON.parse(data);
    } catch {
      return undefined;
    }
  }

  async set(data: LoaderBundleOutput) {
    const fs = await serverRequireFs();
    try {
      await fs.promises.writeFile(this.filePath, JSON.stringify(data));
    } catch (err) {
      console.warn(`Error writing to Plasmic cache: ${err}`);
    }
  }

  async clear() {
    const fs = await serverRequireFs();
    try {
      await fs.promises.unlink(this.filePath);
    } catch (err) {
      // noop
    }
  }
}

function hashString(str: string) {
  let h = 0,
    i = 0;
  for (; i < str.length; h &= h) h = 31 * h + str.charCodeAt(i++);
  return Math.abs(h);
}

function makeCache(opts: InitOptions) {
  const cacheDir = path.resolve(process.cwd(), ".next", ".plasmic");
  const cachePath = path.join(
    cacheDir,
    `plasmic-${hashString(
      [...opts.projects.map((p) => `${p.id}@${p.version ?? ""}`)]
        .sort()
        .join("-")
    )}${opts.preview ? "-preview" : ""}-cache.json`
  );
  return new FileCache(cachePath);
}

export function initPlasmicLoaderWithCache<
  T extends {
    clearCache(): void;
  }
>(
  initFn: (opts: InitOptions) => T,
  { nextNavigation, ...opts }: NextInitOptions
): T {
  const isBrowser = typeof window !== "undefined";
  const isProd = process.env.NODE_ENV === "production";
  const isBuildPhase = process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD;
  const cache = isBrowser || isProd ? undefined : makeCache(opts);
  const loader = initFn({
    onClientSideFetch: "warn",
    ...opts,
    cache,
    platform: "nextjs",
    platformOptions: {
      nextjs: {
        appDir: !!nextNavigation,
      },
    },
    // For Nextjs 12, revalidate may in fact re-use an existing instance
    // of PlasmicComponentLoader that's already in memory, so we need to
    // make sure we don't re-use the data cached in memory.
    // We also enforce this for dev mode, so that we don't have to restart
    // the dev server, in case getStaticProps() re-uses the same PlasmicComponentLoader
    // We also enforce that during build phase, we re-use the data cached in memory
    // to avoid re-fetching the data from Plasmic servers.
    alwaysFresh: !isBuildPhase && !isBrowser,
  });

  if (!isProd) {
    const stringOpts = JSON.stringify(opts);

    if (process.env.PLASMIC_OPTS && process.env.PLASMIC_OPTS !== stringOpts) {
      console.warn(
        `PLASMIC: We detected that you created a new PlasmicLoader with different configurations. You may need to restart your dev server.\n`
      );
    }

    process.env.PLASMIC_OPTS = stringOpts;
  }

  if (cache) {
    if (!isProd) {
      if (process.env.PLASMIC_WATCHED !== "true") {
        (async () => {
          process.env.PLASMIC_WATCHED = "true";
          console.log(`Subscribing to Plasmic changes...`);

          // Import using serverRequire, so webpack doesn't bundle us into client bundle
          try {
            const PlasmicRemoteChangeWatcher = (
              await serverRequire<typeof Watcher>("@plasmicapp/watcher")
            ).PlasmicRemoteChangeWatcher;
            const watcher = new PlasmicRemoteChangeWatcher({
              projects: opts.projects,
              host: opts.host,
            });

            const clearCache = () => {
              cache.clear();
              loader.clearCache();
            };

            watcher.subscribe({
              onUpdate: () => {
                if (opts.preview) {
                  clearCache();
                }
              },
              onPublish: () => {
                if (!opts.preview) {
                  clearCache();
                }
              },
            });
          } catch (e) {
            console.warn("Couldn't subscribe to Plasmic changes", e);
          }
        })();
      }
    } else {
      cache.clear();
      loader.clearCache();
    }
  }
  return loader;
}
