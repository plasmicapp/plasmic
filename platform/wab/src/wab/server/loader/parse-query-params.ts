import { GlobalVariantSpec } from "@plasmicapp/loader-react";
import { isArray } from "lodash";

export const parseComponentProps = (rawComponentProps?: any) => {
  if (!rawComponentProps) {
    return undefined;
  }
  try {
    const componentProps = JSON.parse(rawComponentProps);
    console.log(componentProps);
    if (!componentProps || isArray(componentProps)) {
      throw null;
    }
    return componentProps;
  } catch (e) {
    throw new Error("Invalid componentProps value");
  }
};

export const parseGlobalVariants = (rawGlobalVariants?: any) => {
  if (!rawGlobalVariants) {
    return undefined;
  }
  try {
    const globalVariants = JSON.parse(rawGlobalVariants);
    if (isArray(globalVariants)) {
      for (const variant of globalVariants) {
        if (!variant.name || !variant.value) {
          throw null;
        }
      }
      return globalVariants as GlobalVariantSpec[];
    } else {
      throw null;
    }
  } catch (e) {
    throw new Error("Invalid globalVariants value");
  }
};
