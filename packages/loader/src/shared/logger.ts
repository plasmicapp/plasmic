import chalk from "chalk";
import { captureException } from "./sentry";

const prefixes = {
  cliInfo: `${chalk.blueBright("info")} ${chalk.green("plasmic-cli")}`,
  cliError: `${chalk.red("error")} ${chalk.green("plasmic-cli")}`,
  info: `${chalk.blueBright("info")} ${chalk.green("plasmic-loader")}`,
  warn: `${chalk.yellow("warn")} ${chalk.green("plasmic-loader")}`,
  error: `${chalk.red("error")} ${chalk.green("plasmic-loader")}`,
};

export function cliInfo(message: string) {
  console.log(`${prefixes.cliInfo} - ${message}`);
}

export function cliError(message: string) {
  console.log(`${prefixes.cliError} - ${message}`);
}

export function info(message: string) {
  console.log(`${prefixes.info} - ${message}`);
}

export function warn(message: string) {
  console.warn(`${prefixes.warn} - ${message}`);
}

export function error(message: string) {
  console.error(`${prefixes.error} - ${message}`);
}

export function crash(message: string, err?: Error) {
  error(message);
  if (err) {
    console.error(err);
    captureException(err).then(() => process.exit(1));
    return;
  }
  process.exit(1);
}
