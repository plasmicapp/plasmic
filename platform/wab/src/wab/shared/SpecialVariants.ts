import { mkParam } from "@/wab/shared/core/lang";
import { typeFactory } from "@/wab/shared/model/model-util";
import { mkGlobalVariantGroup, VariantGroupType } from "@/wab/shared/Variants";

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
