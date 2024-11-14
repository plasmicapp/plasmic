import {
  Command,
  CommandId,
  extractCommandName,
  extractNamespace,
  Namespace,
  NamespaceCommandFunctions,
  NamespaceCommandRecord,
  NamespaceCommands,
} from "@/wab/client/commands/types";

export class CommandRegistry {
  private static instance: CommandRegistry;
  private commands = new Map<CommandId, Command<any, any>>();
  private namespaces = new Map<Namespace, NamespaceCommandRecord[Namespace]>();

  static getInstance() {
    if (!CommandRegistry.instance) {
      CommandRegistry.instance = new CommandRegistry();
    }
    return CommandRegistry.instance;
  }

  register<N extends Namespace, C extends NamespaceCommands<N>>(
    command: Command<N, C>
  ) {
    const namespace = extractNamespace(command.id);
    const commandName = extractCommandName<N>(command.id);

    if (this.commands.has(command.id)) {
      return;
    }

    this.commands.set(command.id, command);

    const existingNamespace = (this.namespaces.get(namespace) ||
      {}) as NamespaceCommandRecord[N];
    this.namespaces.set(namespace, {
      ...existingNamespace,
      [commandName]: command,
    } as NamespaceCommandRecord[N]);
  }

  getNamespace<N extends Namespace>(namespace: N) {
    const commands = this.namespaces.get(namespace);
    if (!commands) {
      throw new Error(`Namespace ${namespace} not found`);
    }

    return Object.entries(commands).reduce((acc, [key, command]) => {
      acc[key as NamespaceCommands<N>] = (params: any) =>
        command.execute(params);
      return acc;
    }, {} as NamespaceCommandFunctions<N>);
  }
}
