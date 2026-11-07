import type { Interaction } from "@/wab/shared/model/classes";
import * as React from "react";

// Keep this context separate from DataPicker to avoid its sidebar import cycle.
export const DataPickerRunCodeActionContext = React.createContext<
  | {
      interaction: Interaction;
      stepValue: any;
    }
  | undefined
>(undefined);
