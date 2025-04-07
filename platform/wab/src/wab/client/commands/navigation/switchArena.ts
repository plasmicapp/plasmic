import { Command, choicePrompt } from "@/wab/client/commands/types";
import { AnyArena } from "@/wab/shared/Arenas";

export const switchArenaCommand: Command<{
  arena: AnyArena;
}> = {
  meta: ({ studioCtx }) => {
    const arenas = [
      ...studioCtx.getSortedMixedArenas(),
      ...studioCtx.getSortedPageArenas(),
      ...studioCtx.getSortedComponentArenas(),
    ];

    return {
      id: "navigation.switchArena",
      name: "navigation.switchArena",
      title: "Switch Arena",
      description: "Navigate between Arenas, Pages, and Components",
      args: {
        arena: choicePrompt<AnyArena>({
          options: arenas.map((arena) => {
            switch (arena.typeTag) {
              case "Arena": {
                return {
                  id: arena.uid,
                  label: `Arena - ${arena.name}`,
                  value: arena,
                };
              }
              case "ComponentArena": {
                return {
                  id: arena.uid,
                  label: `Component - ${arena.component.name}`,
                  value: arena,
                };
              }
              case "PageArena": {
                return {
                  id: arena.uid,
                  label: `Page - ${arena.component.name}`,
                  value: arena,
                };
              }
            }
          }),
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
