var MediaQueryDispatch = require("./MediaQueryDispatch");
const isBrowser =
  typeof window !== "undefined" &&
  window != null &&
  typeof window.document !== "undefined";
module.exports = isBrowser ? new MediaQueryDispatch() : undefined;
