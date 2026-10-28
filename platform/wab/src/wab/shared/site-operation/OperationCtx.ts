import type { Site } from "@/wab/shared/model/classes";

export interface OperationCtx {
  site(): Site;
  mutableSite(): Site;
}
