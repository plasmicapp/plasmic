import { NavigationNamepsace } from "@/wab/client/commands/navigation";
import { TestNamespace } from "@/wab/client/commands/test";

export type Namespaces = {
  navigation: NavigationNamepsace;
  test: TestNamespace;
};

export type Namespace = keyof Namespaces;
export type NamespaceCommands<N extends Namespace = Namespace> =
  keyof Namespaces[N] & string;

export type CommandId = {
  [N in Namespace]: {
    [C in NamespaceCommands<N>]: `${N}.${C}`;
  }[NamespaceCommands<N>];
}[Namespace];

export type ExtractParams<
  N extends Namespace,
  C extends NamespaceCommands<N>
> = Namespaces[N][C];

export type NamespaceCommandRecord = {
  [N in Namespace]: {
    [C in NamespaceCommands<N>]: Command<N, C>;
  };
};

export type ExecuteFunction<
  N extends Namespace,
  C extends NamespaceCommands<N>
> = (params: Namespaces[N][C]) => Promise<void>;

export type NamespaceCommandFunctions<N extends Namespace> = {
  [C in NamespaceCommands<N>]: ExecuteFunction<N, C>;
};

export interface Command<N extends Namespace, C extends NamespaceCommands<N>> {
  readonly id: CommandId;
  readonly title: string;
  readonly description: string;
  execute: ExecuteFunction<N, C>;
}

export function extractNamespace(id: CommandId) {
  return id.split(".")[0] as Namespace;
}

export function extractCommandName<N extends Namespace>(id: CommandId) {
  return id.split(".")[1] as NamespaceCommands<N>;
}
