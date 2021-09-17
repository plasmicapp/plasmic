import { LoaderBundleOutput } from '@plasmicapp/loader-core';
import type { initPlasmicLoader as initPlasmicLoaderReact } from '@plasmicapp/loader-react';
import path from 'path';
import { serverRequireFs } from './server-require';

export class FileCache {
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

export function makeCache(opts: Parameters<typeof initPlasmicLoaderReact>[0]) {
  const cacheDir = path.resolve(process.cwd(), '.next', '.plasmic');
  const cachePath = path.join(
    cacheDir,
    `plasmic-${[...opts.projects.map((p) => `${p.id}@${p.version ?? ''}`)]
      .sort()
      .join('-')}${opts.preview ? '-preview' : ''}-cache.json`
  );
  return new FileCache(cachePath);
}
