import { Command } from "@/wab/client/commands/types";

export type ConsoleLogCommandParams = {
  message: string;
};

export class ConsoleLogCommand implements Command<"test", "consoleLog"> {
  readonly id = "test.consoleLog";
  readonly title = "Switch Arena";
  readonly description = "Navigate to a different arena in the studio";

  execute = async ({ message }: ConsoleLogCommandParams) => {
    console.log("DEBUGGING:", message);
  };
}
