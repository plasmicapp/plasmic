global.analytics = {
  // eslint-disable-next-line no-undef
  track: () => console.log("track", arguments),
};
global.PUBLICPATH = "/";
global.DEPLOYENV = "test";
