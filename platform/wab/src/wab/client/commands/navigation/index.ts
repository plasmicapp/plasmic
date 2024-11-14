import {
  SwitchArenaCommand,
  SwitchArenaCommandParams,
} from "@/wab/client/commands/navigation/switchArena";
import { CommandRegistry } from "@/wab/client/commands/registry";

export function registerNavigationCommands(registry: CommandRegistry) {
  registry.register(new SwitchArenaCommand());
}

export type NavigationNamepsace = {
  switchArena: SwitchArenaCommandParams;
};
