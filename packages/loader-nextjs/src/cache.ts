import { LoaderBundleOutput } from '@plasmicapp/loader-core';
import path from 'path';
import { serverRequireFs } from './server-require';

export class FileCache {
  private filePath: string;
  constructor(dir: string) {
    this.filePath = path.join(dir, 'plasmic-cache.json');
    console.log('USING cache', this.filePath);
  }

  async get() {
    const fs = serverRequireFs();
    try {
      await fs.mkdir(path.dirname(this.filePath), { recursive: true });
      const data = (await fs.readFile(this.filePath)).toString();
      return JSON.parse(data);
    } catch {
      return undefined;
    }
  }

  async set(data: LoaderBundleOutput) {
    const fs = serverRequireFs();
    try {
      await fs.writeFile(this.filePath, JSON.stringify(data));
    } catch (err) {
      console.warn(`Error writing to Plasmic cache: ${err}`);
    }
  }

  async clear() {
    const fs = serverRequireFs();
    try {
      await fs.unlink(this.filePath);
    } catch (err) {}
  }
}

export function makeCache() {
  const cacheDir = path.resolve(process.cwd(), '.next', '.plasmic');
  return new FileCache(cacheDir);
}
