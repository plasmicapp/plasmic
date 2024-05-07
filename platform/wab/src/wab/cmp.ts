import { meta } from "@/wab/classes-metas";
import { BaseRuntime } from "@/wab/model/model-meta";
import { instUtil } from "@/wab/shared/core/InstUtil";

// Equality comparator that uses class metadata to guide its crawling
export class Comparator {
  _rt: BaseRuntime;
  constructor(rt = meta) {
    this._rt = rt;
  }
  deepEq(x, y) {
    return instUtil.deepEquals(x, y);
  }
}
