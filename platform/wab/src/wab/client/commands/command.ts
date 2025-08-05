import { renameArenaCommand } from "@/wab/client/commands/arena/renameArena";
import { addNewStateVariableCommand } from "@/wab/client/commands/component/addNewStateVariable";
import { changeStateInitialValueCommand } from "@/wab/client/commands/component/changeStateInitialValue";
import { changeStateVariableAccessTypeCommand } from "@/wab/client/commands/component/changeStateVariableAccessType";
import { changeStateVariableNameCommand } from "@/wab/client/commands/component/changeStateVariableName";
import { changeStateVariableTypeCommand } from "@/wab/client/commands/component/changeStateVariableType";
import { removeStateVariableCommand } from "@/wab/client/commands/component/removeStateVariable";
import { resetStateValueCommand } from "@/wab/client/commands/component/resetStateValue";
import { setEditableByContentEditorCommand } from "@/wab/client/commands/component/settings/setEditableByContentEditor";
import { setHiddenFromContentEditorCommand } from "@/wab/client/commands/component/settings/setHiddenFromContentEditor";
import { setTrapFocusCommand } from "@/wab/client/commands/component/settings/setTrapFocus";
import { renameCommand } from "@/wab/client/commands/element/rename";
import { switchArenaCommand } from "@/wab/client/commands/navigation/switchArena";
import { addTokenCommand } from "@/wab/client/commands/token/addToken";
import { Command } from "@/wab/client/commands/types";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";

export const COMMANDS = {
  navigation: {
    switchArena: switchArenaCommand,
  },
  arena: {
    renameArena: renameArenaCommand,
  },
  component: {
    addNewStateVariable: addNewStateVariableCommand,
    removeStateVariable: removeStateVariableCommand,
    resetStateValue: resetStateValueCommand,
    changeStateInitialValue: changeStateInitialValueCommand,
    changeStateVariableName: changeStateVariableNameCommand,
    changeStateVariableType: changeStateVariableTypeCommand,
    changeStateVariableAccessType: changeStateVariableAccessTypeCommand,
    settings: {
      setHiddenFromContentEditor: setHiddenFromContentEditorCommand,
      setEditableByContentEditor: setEditableByContentEditorCommand,
      setTrapFocus: setTrapFocusCommand,
    },
  },
  element: {
    rename: renameCommand,
  },
  token: {
    addToken: addTokenCommand,
  },
};

export const expandCommand = async <Args, Context, Result, Error>(
  studioCtx: StudioCtx,
  command: Command<Args, Context, Result, Error>
): Promise<Command<Args, Context, Result, Error>[]> => {
  const commandContext = command.context(studioCtx);
  if (!commandContext.length) {
    return [];
  }
  return commandContext.map(
    (context): Command<Args, Context, Result, Error> => ({
      ...command,
      context: () => [context],
      meta: () => command.meta({ ...context, studioCtx }),
      execute: (sc: StudioCtx, args: Args, c: Context) =>
        command.execute(sc, args, c),
    })
  );
};

export const getAvailableCommands = async (
  studioCtx: StudioCtx
): Promise<Command[]> => {
  const commandsList: Command[] = [];

  const processCommands = async (obj: any) => {
    for (const key in obj) {
      const value = obj[key];
      if (typeof value === "object" && !value.execute) {
        await processCommands(value);
        continue;
      }
      const command = value as Command;

      const expandedCommands = await expandCommand(studioCtx, command);
      commandsList.push(...(expandedCommands as Command[]));
    }
  };

  await processCommands(COMMANDS);
  return commandsList;
};
