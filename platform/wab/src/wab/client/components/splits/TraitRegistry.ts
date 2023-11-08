import { TraitRegistration } from "@plasmicapp/host";
import memoizeOne from "memoize-one";
import { uncheckedCast } from "../../../common";

export class TraitRegistry {
  constructor(private win: Window) {}

  getRegisteredTraits = memoizeOne(() => {
    const registeredTraits: TraitRegistration[] =
      uncheckedCast<any>(this.win).__PlasmicTraitRegistry ?? [];
    return registeredTraits;
  });
}
