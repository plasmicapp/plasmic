import child_process from "child_process";

// We are whitelisting these because they are flagged as unused but we actually use them.
// However this list mainly focuses on dependencies, didn't go through devDependencies.
// passport-local is still being flagged as unused despite being whitelisted here.

const ignores = `
@fortawesome/fontawesome-free # react-icons
@sentry/browser
@thi.ng/iterators # unused but handy
coffeescript # for pegcoffee
cryptr # false alarm
font-awesome # react-icons
jquery-serializejson # used via make.bash
keyboardjs # react-use
material-design-icons # react-icons
passport-local # false alarm
pg-hstore # used by sequelize
rebound # react-use
@types/jqueryui # for $.ui types
`
  .trim()
  .split("\n")
  .map((line) => line.split(/ *#/)[0])
  .join(",");

console.log("Ignoring:", ignores);

child_process.spawnSync("yarn", ["depcheck", "--ignores", ignores], {
  stdio: [process.stdin, process.stdout, process.stderr],
});
