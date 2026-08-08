/**
 * Imports a TypeScript module by absolute path.
 *
 * The backend runs TypeScript through esbuild-register, which hooks require();
 * vitest runs it through vite, which hooks import(). Neither loader can read
 * the other's modules, so pick whichever one is installed.
 */
export function importByPath(file: string): Promise<any> {
  return require.extensions[".ts"]
    ? Promise.resolve(require(file))
    : import(/* @vite-ignore */ file);
}
