import type { Site } from "@/wab/shared/model/classes";
import type { Safe } from "@/wab/shared/site-operation/safe";

export interface OperationCtx {
  site(): Safe<Site>;
  mutableSite(): Site;
}
