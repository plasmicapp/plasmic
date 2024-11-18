import { Command } from "@/wab/client/commands/types";
import { AnyArena } from "@/wab/shared/Arenas";

export const switchArenaCommand: Command<AnyArena> = {
  name: "navigation.switchArena",
  title: "Switch Arena",
  description: "Navigate between Arenas, Pages, and Components",
  execute: async (studioCtx, selectedArena) => {
    if (selectedArena) {
      await studioCtx.change(({ success }) => {
        studioCtx.switchToArena(selectedArena);
        return success();
      });
    }
  },
};
