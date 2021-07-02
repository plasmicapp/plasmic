const vue = require("rollup-plugin-vue");

module.exports = {
  rollup(config) {
    config.plugins.push(vue());
    return config;
  },
};
