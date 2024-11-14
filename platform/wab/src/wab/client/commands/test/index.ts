import { CommandRegistry } from "@/wab/client/commands/registry";
import {
  ConsoleLogCommand,
  ConsoleLogCommandParams,
} from "@/wab/client/commands/test/consoleLog";

export function registerTestCommands(registry: CommandRegistry) {
  registry.register(new ConsoleLogCommand());
}

export type TestNamespace = {
  consoleLog: ConsoleLogCommandParams;
};
