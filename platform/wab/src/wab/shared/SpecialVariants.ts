import { mkParam } from "../lang";
import { typeFactory } from "./core/model-util";
import { mkGlobalVariantGroup, VariantGroupType } from "./Variants";

export const mkScreenVariantGroup = () => {
  return mkGlobalVariantGroup({
    param: mkParam({
      name: "Screen",
      paramType: "globalVariantGroup",
      type: typeFactory.text(),
    }),
    variants: [],
    type: VariantGroupType.GlobalScreen,
    multi: true,
  });
};
