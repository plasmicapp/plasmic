// Live preview is injected by Studio. This URL is retained for published hosts, and for Studio
// tabs opened before the deploy that removed SystemJS: they still drive it, so ask them to
// reload. The promise never settles, so they neither render nor report an error.
window.System = window.SystemJS = {
  resolveSync: function (name) {
    return name;
  },
  newModule: function (mod) {
    return mod;
  },
  set: function () {},
  refreshXModules: function () {
    var Sub = window.__Sub;
    Sub.hostUtils.setPlasmicRootNode(
      Sub.React.createElement(
        "div",
        { style: { padding: 16 } },
        "Plasmic Studio was updated. Please reload this browser tab to use live preview."
      )
    );
    return new Promise(function () {});
  },
};
