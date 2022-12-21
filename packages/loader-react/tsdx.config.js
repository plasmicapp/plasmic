const banner = require('rollup-plugin-banner2');

// TSDX docs: https://tsdx.io/customization
module.exports = {
  // Rollup docs: https://rollupjs.org/guide/en/#rolluprollup
  rollup(config, options) {
    const lastFileNameAndExtension = /\/([^./]+)([^/]*)$/;

    const inputMatch = options.input.match(lastFileNameAndExtension);
    if (!inputMatch) {
      throw new Error(`unexpected input: ${options.input}`);
    }
    const subpath = inputMatch[1];

    return {
      ...config,
      // TODO: Replace with banner option when terser supports "use client" directive https://github.com/terser/terser/issues/1320
      plugins: [
        ...config.plugins,
        subpath !== 'index-react-server' && banner(() => "'use client';"),
      ],
    };
  },
};
