const { createProxyMiddleware } = require("http-proxy-middleware");

const port = process.env.BACKEND_PORT || 3004;
module.exports = function (app) {
  console.log("Creating proxy");
  app.use(
    createProxyMiddleware(
      // We filter pathname here, instead of using app.use("/api"), because
      // we use ws:true for our own websocket connections, but setting it to
      // true seems to leads webpack dev server to also proxy /ws requests
      // to our server for some reason 🙄 (/ws is for webpack hot reloading)
      (pathname) => pathname.startsWith("/api"),
      {
        target: `http://localhost:${port}/`,
        xfwd: true,
        ws: true,
      }
    )
  );
};
