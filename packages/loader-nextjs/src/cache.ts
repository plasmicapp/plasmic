import { LoaderBundleOutput } from '@plasmicapp/loader-core';
import type { InitOptions } from '@plasmicapp/loader-react/react-server-conditional';
import type { PlasmicRemoteChangeWatcher as Watcher } from '@plasmicapp/watcher';
import path from 'path';
import { serverRequire, serverRequireFs } from './server-require';

class FileCache {
  constructor(private filePath: string) {
    console.log('USING cache', this.filePath);
  }

  async get() {
    const fs = serverRequireFs();
    try {
      await fs.promises.mkdir(path.dirname(this.filePath), { recursive: true });
      const data = (await fs.promises.readFile(this.filePath)).toString();
      return JSON.parse(data);
    } catch {
      return undefined;
    }
  }

  async set(data: LoaderBundleOutput) {
    const fs = serverRequireFs();
    try {
      await fs.promises.writeFile(this.filePath, JSON.stringify(data));
    } catch (err) {
      console.warn(`Error writing to Plasmic cache: ${err}`);
    }
  }

  clear() {
    const fs = serverRequireFs();
    try {
      fs.unlinkSync(this.filePath);
    } catch (err) {}
  }
}

function makeCache(opts: InitOptions) {
  const cacheDir = path.resolve(process.cwd(), '.next', '.plasmic');
  const cachePath = path.join(
    cacheDir,
    `plasmic-${[...opts.projects.map((p) => `${p.id}@${p.version ?? ''}`)]
      .sort()
      .join('-')}${opts.preview ? '-preview' : ''}-cache.json`
  );
  return new FileCache(cachePath);
}

export function initPlasmicLoaderWithCache<
  T extends {
    clearCache(): void;
  }
>(initFn: (opts: InitOptions) => T, opts: InitOptions): T {
  const isBrowser = typeof window !== 'undefined';
  const isProd = process.env.NODE_ENV === 'production';
  const cache = isBrowser || isProd ? undefined : makeCache(opts);
  const loader = initFn({
    onClientSideFetch: 'warn',
    ...opts,
    cache,
    platform: 'nextjs',
    // For Nextjs 12, revalidate may in fact re-use an existing instance
    // of PlasmicComponentLoader that's already in memory, so we need to
    // make sure we don't re-use the data cached in memory.
    // We also enforce this for dev mode, so that we don't have to restart
    // the dev server, in case getStaticProps() re-uses the same PlasmicComponentLoader
    alwaysFresh: !isBrowser,
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
      if (process.env.PLASMIC_WATCHED !== 'true') {
        process.env.PLASMIC_WATCHED = 'true';
        console.log(`Subscribing to Plasmic changes...`);

        // Import using serverRequire, so webpack doesn't bundle us into client bundle
        const PlasmicRemoteChangeWatcher = serverRequire('@plasmicapp/watcher')
          .PlasmicRemoteChangeWatcher as typeof Watcher;
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
      }
    } else {
      cache.clear();
      loader.clearCache();
    }
  }
  return loader;
}
