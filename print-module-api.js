/**
 * The purpose of this script is to allow for easy reviewing of how a module's change affected its API.
 *
 * The script should be run every time a module is updated (i.e. run this script in "postbuild").
 * The script's output should be saved and checked-in to a file in version control.
 */

if (process.argv.length < 3) {
  throw new Error("missing input file");
}

trickNodeRequire();

const file = process.argv[2];
const mod = require(file);

Object.keys(mod)
  .sort()
  .forEach((exportedSymbol) => {
    // TODO: It would be nice if we read and normalize our TypeScript files instead.
    // But that would require much more complicated code, though maybe there's a library for it?
    console.log(exportedSymbol);
  });

/**
 * Our code sometimes uses the "server-only" package, a poison-pill package that errors out if imported outside an RSC environment.
 * https://beta.nextjs.org/docs/rendering/server-and-client-components#keeping-server-only-code-out-of-client-components-poisoninge
 *
 * This script is not an RSC environment, so "server-only" package would fail this script.
 * The workaround is to trick Node into loading an empty module for "server-only".
 */
function trickNodeRequire() {
  // 1. Trick Node into thinking there's a local file called "server-only".
  const Module = require("module");
  const realResolve = Module._resolveFilename;
  Module._resolveFilename = function fakeResolve(request, parent) {
    if (request === "server-only") {
      return request;
    }
    return realResolve(request, parent);
  };

  // 2. Inject an empty module for "server-only" into the cache.
  require.cache["server-only"] = {};
}
