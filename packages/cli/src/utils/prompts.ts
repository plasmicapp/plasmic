import inquirer from "inquirer";

export function askChoice<T>(question: {
  message: string;
  choices: T[];
  defaultAnswer: T;
  hidePrompt: boolean;
}) {
  if (question.hidePrompt) {
    return question.defaultAnswer;
  }
  return inquirer
    .prompt([
      {
        name: "answer",
        type: "list",
        message: question.message,
        choices: question.choices,
      },
    ])
    .then((answer) => answer.answer as T);
}
