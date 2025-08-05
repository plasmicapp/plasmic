import { getArenaChoices } from "@/wab/client/commands/arena-utils";
import { Command, choicePrompt } from "@/wab/client/commands/types";
import { AnyArena } from "@/wab/shared/Arenas";

export const switchArenaCommand: Command<{
  arena: AnyArena;
}> = {
  meta: ({ studioCtx }) => {
    return {
      id: "navigation.switchArena",
      name: "navigation.switchArena",
      title: "Switch Arena",
      description: "Navigate between Arenas, Pages, and Components",
      args: {
        arena: choicePrompt<AnyArena>({
          options: getArenaChoices(studioCtx),
        }),
      },
    };
  },
  context: () => {
    // This command doesn't need any context but to make the context truthy(fulfilled) we have to add an empty object.
    return [{}];
  },
  execute: async (studioCtx, { arena }) => {
    return await studioCtx.change(({ success }) => {
      studioCtx.switchToArena(arena);
      return success();
    });
  },
};
