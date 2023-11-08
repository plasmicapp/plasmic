const { Client } = require("pg");
const { exec: _exec } = require("child_process");

function runCommand(command) {
  console.log(command);
  return new Promise((resolve, reject) => {
    _exec(command, (err, stdout) => {
      console.log(stdout ?? "");
      console.error(err ?? "");
      return err ? reject(err) : resolve(stdout);
    });
  });
}

exports.exec = function exec(...commands) {
  return commands.reduce(
    (prev, command) => prev.then(() => runCommand(command)),
    Promise.resolve()
  );
};

exports.runDbQueries = function runDbQueries(...queries) {
  const client = new Client();

  return client
    .connect()
    .then(() =>
      queries.reduce(
        (prev, q) => prev.then(() => client.query(q)).catch(console.error),
        Promise.resolve()
      )
    )
    .then(() => client.end());
};
