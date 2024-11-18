import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";

type CommandName = "navigation.switchArena";

export interface Command<T = unknown> {
  name: CommandName;
  title: string;
  description: string;
  execute: (studioCtx: StudioCtx, arg: T) => any;
}
