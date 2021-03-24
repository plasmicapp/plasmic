import chalk from "chalk";

const prefixes = {
  cliInfo: `${chalk.blueBright("info")} ${chalk.green("plasmic-cli")}`,
  info: `${chalk.blueBright("info")} ${chalk.green("plasmic-loader")}`,
  warn: `${chalk.yellow("warn")} ${chalk.green("plasmic-loader")}`,
  error: `${chalk.red("error")} ${chalk.green("plasmic-loader")}`,
};

export function cliInfo(message: string) {
  console.log(`${prefixes.cliInfo} - ${message}`);
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
