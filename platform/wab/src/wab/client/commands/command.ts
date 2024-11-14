import { registerNavigationCommands } from "@/wab/client/commands/navigation";
import { CommandRegistry } from "@/wab/client/commands/registry";
import { registerTestCommands } from "@/wab/client/commands/test";

export class Commands {
  private static instance: Commands;
  private registry: CommandRegistry;

  private constructor() {
    this.registry = CommandRegistry.getInstance();
    this.registerCommands();
  }

  static getInstance() {
    if (!Commands.instance) {
      Commands.instance = new Commands();
    }
    return Commands.instance;
  }

  private registerCommands() {
    registerTestCommands(this.registry);
    registerNavigationCommands(this.registry);
  }

  get navigation() {
    return this.registry.getNamespace("navigation");
  }

  get test() {
    return this.registry.getNamespace("test");
  }
}
