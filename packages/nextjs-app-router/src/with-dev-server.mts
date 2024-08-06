#!/usr/bin/env node

import { type ChildProcess } from "child_process";
import { spawn } from "cross-spawn";
import fkill from "fkill";
import getPort from "get-port";
import process from "process";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

async function startDevServer(
  command: string,
  port: number,
  opts?: {
    verbose?: boolean;
  }
) {
  console.log(
    `Plasmic: starting prepass dev server at http://localhost:${port} via "npm run ${command}"...`
  );

  const devServerProcess = spawn(`npm`, ["run", command], {
    env: {
      PLASMIC_PREPASS_SERVER: "true",
      ...process.env,
      PORT: `${port}`,
    },
  });

  let started = false;
  return new Promise<ChildProcess>((resolve, reject) => {
    devServerProcess.stdout?.on("data", (data: any) => {
      if (!started && data.toString().toLowerCase().includes("ready")) {
        started = true;
        console.log(`Plasmic: Dev server started`);
        resolve(devServerProcess);
      }
      if (opts?.verbose) {
        console.log(data.toString());
      }
    });
    devServerProcess.stderr?.on("data", (data) => {
      if (data.toString().toLowerCase().includes("error")) {
        console.log(`Plasmic: Dev server failed to start`);
        reject(new Error(`Error starting dev server: ${data.toString()}`));
      }
      if (opts?.verbose) {
        console.error(data.toString());
      }
    });
  });
}

async function main() {
  const argv = await yargs(hideBin(process.argv))
    .option("command", {
      alias: "c",
      default: "dev",
      type: "string",
      description:
        "The name of the command script to run to start the dev server, as defined in your package.json; it will be invoked with `npm run COMMAND`.",
    })
    .option("verbose", {
      alias: "v",
      type: "boolean",
      default: false,
      description:
        "Make the operation more talkative, include logs from the dev server.",
    })
    .parse();

  const port = await getPort();
  const devProcess = await startDevServer(argv.command ?? "dev", port, {
    verbose: argv.verbose,
  });

  const killDevServer = () => {
    devProcess.kill("SIGKILL");
    return fkill(`:${port}`, { force: true }).catch((err) => {
      console.error(`Plasmic: Failed to kill dev server: ${err}`);
    });
  };

  const command = argv._.map((x) => `${x}`);
  console.log(`Plasmic: Running command: ${command.join(" ")}`);
  const commandProcess = spawn(command[0], command.slice(1), {
    env: {
      ...process.env,
      PLASMIC_PREPASS_HOST: `http://localhost:${port}`,
    },
  });
  console.log(`Plasmic: Command running with pid ${commandProcess.pid}`);
  commandProcess.stdout?.pipe(process.stdout);
  commandProcess.stderr?.pipe(process.stderr);
  commandProcess.on("error", (err: any) => {
    console.error(`Plasmic: Command error: ${err}`);
    killDevServer().then(() => {
      process.exit(commandProcess.exitCode ?? undefined);
    });
  });
  commandProcess.on("exit", () => {
    console.log(`Plasmic: Command finished; killing prepass dev server...`);
    killDevServer().then(() => {
      process.exit(undefined);
    });
  });
}

if (require.main === module) {
  main();
}
