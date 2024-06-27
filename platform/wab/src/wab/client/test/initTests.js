global.analytics = {
  // eslint-disable-next-line no-undef
  track: (...args) => console.log("analytics.track", ...args),
};
global.PUBLICPATH = "/";
global.DEPLOYENV = "test";
