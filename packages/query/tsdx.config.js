const banner = require('rollup-plugin-banner2');

// TSDX docs: https://tsdx.io/customization
module.exports = {
  // Rollup docs: https://rollupjs.org/guide/en/#rolluprollup
  rollup(config, _options) {
    return {
      ...config,
      // TODO: Replace with banner option when terser supports "use client" directive https://github.com/terser/terser/issues/1320
      plugins: [...config.plugins, banner(() => "'use client';")],
    };
  },
};
