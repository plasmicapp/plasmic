import { Site } from "@/wab/shared/model/classes";
import { OperationCtx } from "@/wab/shared/site-operation/OperationCtx";

/**
 * In-memory implementation that's easy to use in /shared
 * when we don't want to update all ancestors of a call-site.
 *
 * In the future, this should be moved to /test for tests only.
 *
 * @deprecated Prefer using ClientOperationCtx or ServerOperationCtx
 */
export class MemoryOperationCtx implements OperationCtx {
  constructor(private readonly _site: Site) {}

  site(): Site {
    return this._site;
  }

  mutableSite(): Site {
    return this._site;
  }
}
