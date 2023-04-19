const esbuild = require('esbuild');

// This transforms TypeScript to JavaScript for Jest.
// We use esbuild here for speed and consistency with our actual builds.
// https://jestjs.io/docs/code-transformation
module.exports = {
  process: (sourceText, sourcePath, _options) => {
    const { code, map } = esbuild.transformSync(sourceText, {
      format: 'cjs',
      loader: 'ts',
      sourcefile: sourcePath,
      sourcemap: 'both',
      target: `node${process.versions.node}`,
    });
    return { code, map };
  },
};
