import { uncheckedCast } from "@/wab/shared/common";
import { TraitRegistration } from "@plasmicapp/host";
import memoizeOne from "memoize-one";

export class TraitRegistry {
  constructor(private win: Window) {}

  getRegisteredTraits = memoizeOne(() => {
    const registeredTraits: TraitRegistration[] =
      uncheckedCast<any>(this.win).__PlasmicTraitRegistry ?? [];
    return registeredTraits;
  });
}
