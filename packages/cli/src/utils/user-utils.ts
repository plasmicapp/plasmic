import inquirer from "inquirer";

/**
 * Provide a standardized way to ask user to continue
 * @param message
 * @param yes - If true, always return true without prompting.
 * @param default - Override the default value returned if the user presses enter
 */
export async function confirmWithUser(
  message: string,
  yes?: boolean,
  defaultAnswer?: "y" | "n"
): Promise<boolean> {
  if (!!yes) {
    if (!process.env.QUIET) {
      console.log(`${message} (Y/n): y`);
    }
    return true;
  }

  defaultAnswer = defaultAnswer ?? "y";
  const isDefaultYes = defaultAnswer === "y";
  const choices = `(${isDefaultYes ? "Y" : "y"}/${isDefaultYes ? "n" : "N"})`;
  const res = await inquirer.prompt([
    {
      name: "continue",
      message: `${message} ${choices}`,
      default: defaultAnswer,
    },
  ]);
  return ["y", "yes"].includes(res.continue.toLowerCase());
}
