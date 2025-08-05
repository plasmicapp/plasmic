import { getArenaChoices } from "@/wab/client/commands/arena-utils";
import {
  choicePrompt,
  Command,
  stringPrompt,
} from "@/wab/client/commands/types";
import { Arena, ComponentArena, PageArena } from "@/wab/shared/model/classes";

export interface RenameArenaProps {
  newName: string;
  arena: Arena | PageArena | ComponentArena;
}

export const renameArenaCommand: Command<RenameArenaProps> = {
  meta: ({ studioCtx }) => {
    return {
      id: "arena.renameArena",
      name: "arena.renameArena",
      title: "Rename Arena",
      description: "Update the name of a component, page, or arena.",
      args: {
        newName: stringPrompt({}),
        arena: choicePrompt<Arena | PageArena | ComponentArena>({
          options: getArenaChoices(studioCtx),
        }),
      },
    };
  },
  context: () => {
    // This command doesn't need any context but to make the context truthy(fulfilled) we have to add an empty object.
    return [{}];
  },
  execute: async (studioCtx, args) => {
    return await studioCtx.change(({ success }) => {
      studioCtx.siteOps().tryRenameArenas([args]);
      return success();
    });
  },
};
