import { Command } from "@/wab/client/commands/command";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { AnyArena } from "@/wab/shared/Arenas";

export class SwitchArenaCommand extends Command {
  readonly id = "studio.navigation.switchArena";
  readonly title = "Switch Arena";
  readonly description = "Navigate to a different arena in the studio";

  async execute({
    studioCtx,
    arena,
  }: {
    studioCtx: StudioCtx;
    arena: AnyArena;
  }) {
    try {
      await studioCtx.change(({ success }) => {
        studioCtx.switchToArena(arena);
        return success();
      });

      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
      };
    }
  }
}
