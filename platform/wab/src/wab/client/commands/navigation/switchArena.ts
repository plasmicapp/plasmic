import { Commands } from "@/wab/client/commands/command";
import { Command } from "@/wab/client/commands/types";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { AnyArena } from "@/wab/shared/Arenas";

export type SwitchArenaCommandParams = {
  studioCtx: StudioCtx;
  arena: AnyArena;
};

export class SwitchArenaCommand
  implements Command<"navigation", "switchArena">
{
  readonly id = "navigation.switchArena";
  readonly title = "Switch Arena";
  readonly description = "Navigate to a different arena in the studio";

  execute = async ({ studioCtx, arena }: SwitchArenaCommandParams) => {
    const commands = Commands.getInstance();
    await commands.test.consoleLog({
      message: `Switching to Arena ${arena.uid}`,
    });

    await studioCtx.change(({ success }) => {
      studioCtx.switchToArena(arena);
      return success();
    });
  };
}
