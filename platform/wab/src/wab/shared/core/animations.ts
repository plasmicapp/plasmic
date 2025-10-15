import { assert } from "@/wab/shared/common";
import { DefinedIndicatorType } from "@/wab/shared/defined-indicator";
import { Animation } from "@/wab/shared/model/classes";
import L from "lodash";

export function getAnimationsFromDefinedIndicatorType(
  definedIndicator: DefinedIndicatorType
): Animation[] {
  switch (definedIndicator.source) {
    case "none":
      return [];

    case "set": {
      const targetSource = definedIndicator.targetSource;
      assert(
        targetSource.type === "style",
        "Expected targetSource to be style"
      );
      return targetSource.animations ?? [];
    }

    case "otherVariants": {
      const lastSource = L.last(definedIndicator.stack);
      assert(lastSource?.type === "style", "Expected targetSource to be style");
      return lastSource.animations ?? [];
    }

    default:
      throw new Error(
        `Unsupported defined indicator source for animation: ${definedIndicator.source}`
      );
  }
}
