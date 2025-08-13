import { logger } from "@/wab/server/observability";
import { BadRequestError } from "@/wab/shared/ApiErrors/errors";
import { GlobalVariantSpec } from "@plasmicapp/loader-react";
import { isArray } from "lodash";

export const parseComponentProps = (rawComponentProps?: any) => {
  if (!rawComponentProps) {
    return undefined;
  }
  try {
    const componentProps = JSON.parse(rawComponentProps);
    logger().info("Parsed props", componentProps);
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
  const globalVariants = JSON.parse(rawGlobalVariants);
  if (isArray(globalVariants)) {
    for (const variant of globalVariants) {
      if (!variant.name || !variant.value) {
        throw new BadRequestError(
          "Invalid globalVariants.name or globalVariants.value"
        );
      }
    }
    return globalVariants as GlobalVariantSpec[];
  } else {
    throw new BadRequestError("globalVariants must be an array of objects");
  }
};
