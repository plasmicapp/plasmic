export type CommandResult = {
  success: boolean;
  message?: string;
  data?: any;
};

export abstract class Command {
  abstract readonly id: string;
  abstract readonly title: string;
  abstract readonly description: string;

  abstract execute(params: any): Promise<CommandResult>;
}
