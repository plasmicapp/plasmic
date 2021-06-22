const replace = require('@rollup/plugin-replace');

module.exports = {
  rollup(config, options) {
    config.plugins.push(
      replace({
        preventAssignment: true,
        values: {
          'process.env.PLASMIC_HOST': JSON.stringify(
            process.env.PLASMIC_HOST ?? 'https://studio.plasmic.app'
          ),
        },
      })
    );
    return config;
  },
};
