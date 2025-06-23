import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";

export function getArenaChoices(studioCtx: StudioCtx) {
  const arenas = [
    ...studioCtx.getSortedMixedArenas(),
    ...studioCtx.getSortedPageArenas(),
    ...studioCtx.getSortedComponentArenas(),
  ];
  return arenas.map((arena) => {
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
  });
}
